import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "config.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const sourceProvider = new ethers.JsonRpcProvider(config.sourceRpcUrl);
const citrateProvider = new ethers.JsonRpcProvider(config.citrateRpcUrl);

const envRelayerKeys = process.env.RELAYER_PRIVATE_KEYS
  ? process.env.RELAYER_PRIVATE_KEYS.split(",").map((key) => key.trim()).filter(Boolean)
  : [];

const relayerKeys = envRelayerKeys.length > 0
  ? envRelayerKeys
  : (config.relayerPrivateKeys || []);

const relayerWallets = relayerKeys.map(
  (key) => new ethers.Wallet(key, sourceProvider)
);

if (relayerWallets.length === 0) {
  throw new Error("relayerPrivateKeys must include at least one key");
}

const txSigner = relayerWallets[0];
const citratePrivateKey = process.env.CITRATE_PRIVATE_KEY
  ? process.env.CITRATE_PRIVATE_KEY
  : config.citratePrivateKey;

const citrateSigner = citratePrivateKey
  ? new ethers.Wallet(citratePrivateKey, citrateProvider)
  : new ethers.Wallet(relayerKeys[0], citrateProvider);

const gatewayAbi = [
  "event InferenceRequested(bytes32 indexed requestId,address indexed requester,bytes32 indexed modelHash,bytes32 inputHash,uint256 maxPrice,uint256 deadline,address callbackTarget,bytes4 callbackSelector)",
  "function getRequest(bytes32 requestId) view returns (address requester, bytes32 modelHash, bytes32 inputHash, bytes inputData, uint256 maxPrice, uint256 deadline, address callbackTarget, bytes4 callbackSelector, uint8 status, uint256 citrateRequestId, bytes32 outputHash, bytes outputData)",
  "function finalizeInferenceTyped(bytes32 requestId,uint256 citrateRequestId,bytes outputData,(bytes32 sourceRequestId,uint256 citrateRequestId,bytes32 modelHash,bytes32 inputHash,bytes32 outputHash,bytes32 citrateBlockHash,uint64 citrateBlockNumber,uint64 citrateChainId)[] attestations,bytes[] signatures)",
  "function markFailedTyped(bytes32 requestId,uint256 citrateRequestId,(bytes32 sourceRequestId,uint256 citrateRequestId,bytes32 modelHash,bytes32 inputHash,bytes32 outputHash,bytes32 citrateBlockHash,uint64 citrateBlockNumber,uint64 citrateChainId)[] attestations,bytes[] signatures)",
  "function ATTESTATION_TYPEHASH() view returns (bytes32)"
];

const citrateRouterAbi = [
  "event InferenceRequested(uint256 indexed requestId,address indexed requester,bytes32 indexed modelHash)",
  "event InferenceCompleted(uint256 indexed requestId,address indexed provider,uint256 price)",
  "function requestInference(bytes32 modelHash, bytes inputData, uint256 maxPrice) payable returns (uint256)",
  "function getRequest(uint256 requestId) view returns (address requester, bytes32 modelHash, uint8 status, bytes outputData, uint256 pricePaid)"
];

const gateway = new ethers.Contract(
  config.sourceGatewayAddress,
  gatewayAbi,
  txSigner
);

const gatewayRead = gateway.connect(sourceProvider);

const citrateRouter = new ethers.Contract(
  config.citrateRouterAddress,
  citrateRouterAbi,
  citrateSigner
);

const pending = new Set();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildAttestation(
  requestId,
  citrateRequestId,
  modelHash,
  inputHash,
  outputHash,
  blockHash,
  blockNumber,
  citrateChainId
) {
  return {
    sourceRequestId: requestId,
    citrateRequestId,
    modelHash,
    inputHash,
    outputHash,
    citrateBlockHash: blockHash,
    citrateBlockNumber: blockNumber,
    citrateChainId
  };
}

async function signAttestations(attestation, domain, types) {
  const signatures = [];
  const attestations = [];

  for (const wallet of relayerWallets) {
    const signature = await wallet.signTypedData(domain, types, attestation);
    signatures.push(signature);
    attestations.push(attestation);
  }

  return { attestations, signatures };
}

async function handleRequest(requestId) {
  if (pending.has(requestId)) {
    return;
  }

  pending.add(requestId);

  try {
    const request = await gatewayRead.getRequest(requestId);
    const status = Number(request.status);

    if (status !== 0) {
      return;
    }

    const deadline = Number(request.deadline);
    const now = Math.floor(Date.now() / 1000);

    if (deadline <= now) {
      return;
    }

    const modelHash = request.modelHash;
    const inputData = request.inputData;
    const maxPrice = request.maxPrice;

    const requestTx = await citrateRouter.requestInference(modelHash, inputData, maxPrice, {
      value: maxPrice
    });

    const requestReceipt = await requestTx.wait();
    const iface = new ethers.Interface(citrateRouterAbi);

    let citrateRequestId = null;
    for (const log of requestReceipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed && parsed.name === "InferenceRequested") {
          citrateRequestId = parsed.args.requestId;
          break;
        }
      } catch (err) {
        continue;
      }
    }

    if (citrateRequestId === null) {
      throw new Error("Citrate request ID not found");
    }

    const startBlock = requestReceipt.blockNumber;
    let outputData = null;
    let statusValue = 0;

    while (true) {
      const result = await citrateRouter.getRequest(citrateRequestId);
      statusValue = Number(result.status);

      if (statusValue === 2 || statusValue === 3) {
        outputData = result.outputData;
        break;
      }

      await sleep(config.pollIntervalMs || 2000);
    }

    const citrusNetwork = await citrateProvider.getNetwork();
    const citrateChainId = Number(citrusNetwork.chainId);

    const outputHash = statusValue === 2 ? ethers.keccak256(outputData) : ethers.ZeroHash;

    const eventTopic = iface.getEvent("InferenceCompleted").topicHash;
    const requestIdTopic = ethers.zeroPadValue(ethers.toBeHex(citrateRequestId), 32);

    const logs = await citrateProvider.getLogs({
      address: config.citrateRouterAddress,
      fromBlock: startBlock,
      toBlock: "latest",
      topics: [eventTopic, requestIdTopic]
    });

    let blockNumber = await citrateProvider.getBlockNumber();
    let blockHash = (await citrateProvider.getBlock(blockNumber)).hash;

    if (logs.length > 0) {
      blockNumber = logs[0].blockNumber;
      blockHash = logs[0].blockHash;
    }

    const confirmationDepth = Number(config.confirmationDepth || 0);
    if (confirmationDepth > 0) {
      while ((await citrateProvider.getBlockNumber()) - blockNumber < confirmationDepth) {
        await sleep(config.pollIntervalMs || 2000);
      }
    }

    const attestation = await buildAttestation(
      requestId,
      citrateRequestId,
      modelHash,
      request.inputHash,
      outputHash,
      blockHash,
      blockNumber,
      citrateChainId
    );

    const sourceNetwork = await sourceProvider.getNetwork();
    const domain = {
      name: "CitrateCrossChainInference",
      version: "1",
      chainId: Number(sourceNetwork.chainId),
      verifyingContract: config.sourceGatewayAddress
    };

    const types = {
      Attestation: [
        { name: "sourceRequestId", type: "bytes32" },
        { name: "citrateRequestId", type: "uint256" },
        { name: "modelHash", type: "bytes32" },
        { name: "inputHash", type: "bytes32" },
        { name: "outputHash", type: "bytes32" },
        { name: "citrateBlockHash", type: "bytes32" },
        { name: "citrateBlockNumber", type: "uint64" },
        { name: "citrateChainId", type: "uint64" }
      ]
    };

    const { attestations, signatures } = await signAttestations(attestation, domain, types);

    if (statusValue === 2) {
      await gateway.finalizeInferenceTyped(
        requestId,
        citrateRequestId,
        outputData,
        attestations,
        signatures
      );
    } else {
      await gateway.markFailedTyped(requestId, citrateRequestId, attestations, signatures);
    }
  } catch (error) {
    console.error(`Relayer error for request ${requestId}:`, error);
  } finally {
    pending.delete(requestId);
  }
}

gatewayRead.on(
  "InferenceRequested",
  async (requestId) => {
    await handleRequest(requestId);
  }
);

console.log("Relayer running. Listening for InferenceRequested events...");
