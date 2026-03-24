import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "solana.config.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const MAX_INPUT_BYTES = 1024;
const MAX_OUTPUT_BYTES = 2048;
const REQUEST_ACCOUNT_SIZE = 3313;

const connection = new Connection(config.solanaRpcUrl, "confirmed");
const programId = new PublicKey(config.solanaProgramId);

const relayerKeypairs = (config.solanaRelayerKeypairs || []).map((keypath) => {
  const resolved = path.resolve(keypath);
  const secret = JSON.parse(fs.readFileSync(resolved, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secret));
});

if (relayerKeypairs.length === 0) {
  throw new Error("solanaRelayerKeypairs must include at least one keypair path");
}

const payer = relayerKeypairs[0];

const citrateProvider = new ethers.JsonRpcProvider(config.citrateRpcUrl);
const citratePrivateKey = process.env.CITRATE_PRIVATE_KEY
  ? process.env.CITRATE_PRIVATE_KEY
  : config.citratePrivateKey;

if (!citratePrivateKey) {
  throw new Error("citratePrivateKey is required for Citrate transactions");
}

const citrateSigner = new ethers.Wallet(citratePrivateKey, citrateProvider);

const citrateRouterAbi = [
  "event InferenceRequested(uint256 indexed requestId,address indexed requester,bytes32 indexed modelHash)",
  "event InferenceCompleted(uint256 indexed requestId,address indexed provider,uint256 price)",
  "function requestInference(bytes32 modelHash, bytes inputData, uint256 maxPrice) payable returns (uint256)",
  "function getRequest(uint256 requestId) view returns (address requester, bytes32 modelHash, uint8 status, bytes outputData, uint256 pricePaid)"
];

const citrateRouter = new ethers.Contract(
  config.citrateRouterAddress,
  citrateRouterAbi,
  citrateSigner
);

const pending = new Set();

function readU32LE(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

function readU64LE(buffer, offset) {
  const low = buffer.readUInt32LE(offset);
  const high = buffer.readUInt32LE(offset + 4);
  return BigInt(high) << 32n | BigInt(low);
}

function readI64LE(buffer, offset) {
  const value = readU64LE(buffer, offset);
  return Number(BigInt.asIntN(64, value));
}

function parseRequestAccount(buffer) {
  let offset = 0;
  const status = buffer.readUInt8(offset);
  offset += 1;

  const requester = new PublicKey(buffer.slice(offset, offset + 32));
  offset += 32;

  const requestId = buffer.slice(offset, offset + 32);
  offset += 32;

  const modelHash = buffer.slice(offset, offset + 32);
  offset += 32;

  const inputHash = buffer.slice(offset, offset + 32);
  offset += 32;

  const inputLen = readU32LE(buffer, offset);
  offset += 4;

  const inputData = buffer.slice(offset, offset + MAX_INPUT_BYTES).slice(0, inputLen);
  offset += MAX_INPUT_BYTES;

  const maxPrice = readU64LE(buffer, offset);
  offset += 8;

  const deadline = readI64LE(buffer, offset);
  offset += 8;

  const citrateRequestId = readU64LE(buffer, offset);
  offset += 8;

  const outputHash = buffer.slice(offset, offset + 32);
  offset += 32;

  const outputLen = readU32LE(buffer, offset);
  offset += 4;

  const outputData = buffer.slice(offset, offset + MAX_OUTPUT_BYTES).slice(0, outputLen);
  offset += MAX_OUTPUT_BYTES;

  const citrateBlockHash = buffer.slice(offset, offset + 32);
  offset += 32;

  const citrateBlockNumber = readU64LE(buffer, offset);
  offset += 8;

  const citrateChainId = readU64LE(buffer, offset);

  return {
    status,
    requester,
    requestId,
    modelHash,
    inputHash,
    inputData,
    maxPrice,
    deadline,
    citrateRequestId,
    outputHash,
    outputData,
    citrateBlockHash,
    citrateBlockNumber,
    citrateChainId
  };
}

function encodeFinalizeInstruction(outputData, citrateRequestId, citrateBlockHash, citrateBlockNumber) {
  const variant = Buffer.from([2]);
  const outputLen = Buffer.alloc(4);
  outputLen.writeUInt32LE(outputData.length);
  const requestIdBuf = Buffer.alloc(8);
  requestIdBuf.writeBigUInt64LE(BigInt(citrateRequestId));
  const blockNumBuf = Buffer.alloc(8);
  blockNumBuf.writeBigUInt64LE(BigInt(citrateBlockNumber));
  return Buffer.concat([
    variant,
    outputLen,
    Buffer.from(outputData),
    requestIdBuf,
    Buffer.from(citrateBlockHash),
    blockNumBuf
  ]);
}

function encodeMarkFailedInstruction(citrateRequestId, citrateBlockHash, citrateBlockNumber) {
  const variant = Buffer.from([3]);
  const requestIdBuf = Buffer.alloc(8);
  requestIdBuf.writeBigUInt64LE(BigInt(citrateRequestId));
  const blockNumBuf = Buffer.alloc(8);
  blockNumBuf.writeBigUInt64LE(BigInt(citrateBlockNumber));
  return Buffer.concat([
    variant,
    requestIdBuf,
    Buffer.from(citrateBlockHash),
    blockNumBuf
  ]);
}

async function deriveConfigPda() {
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("config")],
    programId
  );
  return configPda;
}

async function deriveRequestPda(requestIdBytes) {
  const [requestPda] = await PublicKey.findProgramAddress(
    [Buffer.from("request"), requestIdBytes],
    programId
  );
  return requestPda;
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function handleRequest(requestAccountPubkey, request) {
  const requestIdHex = Buffer.from(request.requestId).toString("hex");
  if (pending.has(requestIdHex)) {
    return;
  }

  pending.add(requestIdHex);

  try {
    if (request.status !== 0) {
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    if (request.deadline <= now) {
      return;
    }

    const modelHash = `0x${Buffer.from(request.modelHash).toString("hex")}`;
    const inputData = `0x${Buffer.from(request.inputData).toString("hex")}`;
    const maxPrice = BigInt(request.maxPrice);

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

    const eventTopic = iface.getEvent("InferenceCompleted").topicHash;
    const requestIdTopic = ethers.zeroPadValue(ethers.toBeHex(citrateRequestId), 32);
    const logs = await citrateProvider.getLogs({
      address: config.citrateRouterAddress,
      fromBlock: requestReceipt.blockNumber,
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

    const configPda = await deriveConfigPda();
    const instructionData = statusValue === 2
      ? encodeFinalizeInstruction(
          Buffer.from(outputData.slice(2), "hex"),
          Number(citrateRequestId),
          Buffer.from(blockHash.slice(2), "hex"),
          blockNumber
        )
      : encodeMarkFailedInstruction(
          Number(citrateRequestId),
          Buffer.from(blockHash.slice(2), "hex"),
          blockNumber
        );

    const keys = [
      { pubkey: configPda, isSigner: false, isWritable: false },
      { pubkey: requestAccountPubkey, isSigner: false, isWritable: true }
    ];

    for (const keypair of relayerKeypairs) {
      keys.push({ pubkey: keypair.publicKey, isSigner: true, isWritable: false });
    }

    const ix = new TransactionInstruction({
      programId,
      keys,
      data: instructionData
    });

    const tx = new Transaction().add(ix);
    tx.feePayer = payer.publicKey;
    const { blockhash } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.partialSign(...relayerKeypairs);

    const signature = await connection.sendRawTransaction(tx.serialize());
    await connection.confirmTransaction(signature, "confirmed");
  } catch (error) {
    console.error(`Solana relayer error for request ${requestIdHex}:`, error);
  } finally {
    pending.delete(requestIdHex);
  }
}

async function pollPendingRequests() {
  const accounts = await connection.getProgramAccounts(programId);
  for (const account of accounts) {
    if (account.account.data.length !== REQUEST_ACCOUNT_SIZE) {
      continue;
    }

    const request = parseRequestAccount(Buffer.from(account.account.data));
    if (request.status !== 0) {
      continue;
    }

    await handleRequest(account.pubkey, request);
  }
}

console.log("Solana relayer running. Polling for pending requests...");

setInterval(() => {
  pollPendingRequests().catch((error) => {
    console.error("Solana relayer polling error:", error);
  });
}, config.pollIntervalMs || 2000);
