import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "evm.flow.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const provider = new ethers.JsonRpcProvider(config.sourceRpcUrl);
const requesterKey = config.requesterPrivateKey;

if (!requesterKey) {
  throw new Error("requesterPrivateKey is required");
}

const signer = new ethers.Wallet(requesterKey, provider);

const gatewayAbi = [
  "function requestInference(bytes32 modelHash, bytes inputData, uint256 maxPrice, uint256 deadline, address callbackTarget, bytes4 callbackSelector) returns (bytes32)",
  "function getRequest(bytes32 requestId) view returns (address requester, bytes32 modelHash, bytes32 inputHash, bytes inputData, uint256 maxPrice, uint256 deadline, address callbackTarget, bytes4 callbackSelector, uint8 status, uint256 citrateRequestId, bytes32 outputHash, bytes outputData)",
  "function requesterNonces(address requester) view returns (uint256)"
];

const gateway = new ethers.Contract(config.sourceGatewayAddress, gatewayAbi, signer);

function parseHex32(label, value) {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new Error(`${label} must be a 0x-prefixed hex string`);
  }

  const bytes = ethers.getBytes(value);
  if (bytes.length !== 32) {
    throw new Error(`${label} must be 32 bytes`);
  }
  return value;
}

function parseInputData(value) {
  if (typeof value !== "string") {
    throw new Error("inputData must be a string");
  }

  if (value.startsWith("0x")) {
    return ethers.getBytes(value);
  }

  return ethers.toUtf8Bytes(value);
}

function statusLabel(status) {
  switch (Number(status)) {
    case 0:
      return "Pending";
    case 1:
      return "Completed";
    case 2:
      return "Failed";
    case 3:
      return "Cancelled";
    default:
      return `Unknown(${status})`;
  }
}

async function computeRequestId(
  requester,
  nonce,
  modelHash,
  inputHash,
  deadline,
  chainId,
  gatewayAddress
) {
  const coder = ethers.AbiCoder.defaultAbiCoder();
  const encoded = coder.encode(
    ["address", "uint256", "bytes32", "bytes32", "uint256", "uint256", "address"],
    [requester, nonce, modelHash, inputHash, deadline, chainId, gatewayAddress]
  );
  return ethers.keccak256(encoded);
}

async function submitRequest() {
  const modelHash = parseHex32("modelHash", config.modelHash);
  const inputData = parseInputData(config.inputData || "");

  if (inputData.length === 0) {
    throw new Error("inputData must be non-empty");
  }

  const deadline = Number(
    config.deadline ?? (Math.floor(Date.now() / 1000) + Number(config.deadlineSecondsFromNow ?? 600))
  );

  if (!Number.isFinite(deadline)) {
    throw new Error("deadline must be a unix timestamp");
  }

  const maxPrice = config.maxPrice ?? 0;
  const callbackTarget = config.callbackTarget ?? ethers.ZeroAddress;
  const callbackSelector = config.callbackSelector ?? "0x00000000";

  if (callbackTarget === ethers.ZeroAddress && callbackSelector !== "0x00000000") {
    throw new Error("callbackSelector must be 0x00000000 when callbackTarget is zero");
  }

  if (callbackTarget !== ethers.ZeroAddress && callbackSelector === "0x00000000") {
    throw new Error("callbackSelector is required when callbackTarget is set");
  }

  const inputHash = ethers.keccak256(inputData);
  const chainId = Number((await provider.getNetwork()).chainId);
  const nonce = config.nonce ?? await gateway.requesterNonces(signer.address);
  const requestId = await computeRequestId(
    signer.address,
    nonce,
    modelHash,
    inputHash,
    deadline,
    chainId,
    config.sourceGatewayAddress
  );

  const tx = await gateway.requestInference(
    modelHash,
    inputData,
    maxPrice,
    deadline,
    callbackTarget,
    callbackSelector
  );
  const receipt = await tx.wait();

  console.log("EVM request submitted:");
  console.log("  requestId:", requestId);
  console.log("  txHash:", receipt.hash);
  console.log("  inputHash:", inputHash);

  return { requestId, receipt };
}

async function readRequest(requestId) {
  const request = await gateway.getRequest(requestId);

  console.log("EVM request:");
  console.log("  requestId:", requestId);
  console.log("  status:", statusLabel(request.status));
  console.log("  requester:", request.requester);
  console.log("  modelHash:", request.modelHash);
  console.log("  inputHash:", request.inputHash);
  console.log("  inputData:", ethers.hexlify(request.inputData));
  console.log("  maxPrice:", request.maxPrice.toString());
  console.log("  deadline:", request.deadline.toString());
  console.log("  callbackTarget:", request.callbackTarget);
  console.log("  callbackSelector:", request.callbackSelector);
  console.log("  citrateRequestId:", request.citrateRequestId.toString());
  console.log("  outputHash:", request.outputHash);
  console.log("  outputData:", ethers.hexlify(request.outputData));

  return request;
}

async function main() {
  const { requestId } = await submitRequest();

  if (config.readAfterSubmit === false) {
    return;
  }

  const pollIntervalMs = Number(config.readPollIntervalMs ?? 2000);
  const maxAttempts = Number(config.readPollMaxAttempts ?? 10);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await readRequest(requestId);
    if (attempt === maxAttempts - 1) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
}

main().catch((error) => {
  console.error("EVM flow error:", error);
  process.exit(1);
});
