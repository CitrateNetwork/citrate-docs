import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Connection, PublicKey } from "@solana/web3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "solana.read.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const MAX_INPUT_BYTES = 1024;
const MAX_OUTPUT_BYTES = 2048;
const REQUEST_ACCOUNT_SIZE = 3313;

const connection = new Connection(config.solanaRpcUrl, "confirmed");
const programId = new PublicKey(config.solanaProgramId);

function parseHex32(label, value) {
  if (typeof value !== "string" || !value.startsWith("0x")) {
    throw new Error(`${label} must be a 0x-prefixed hex string`);
  }

  const buf = Buffer.from(value.slice(2), "hex");
  if (buf.length !== 32) {
    throw new Error(`${label} must be 32 bytes`);
  }
  return buf;
}

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

async function deriveRequestPda(requestId) {
  const [requestPda] = await PublicKey.findProgramAddress(
    [Buffer.from("request"), requestId],
    programId
  );
  return requestPda;
}

function statusLabel(status) {
  switch (status) {
    case 0:
      return "Pending";
    case 1:
      return "Completed";
    case 2:
      return "Failed";
    default:
      return `Unknown(${status})`;
  }
}

async function main() {
  const requestId = parseHex32("requestId", config.requestId);
  const requestPda = await deriveRequestPda(requestId);
  const accountInfo = await connection.getAccountInfo(requestPda);

  if (!accountInfo) {
    throw new Error("Request account not found");
  }

  if (accountInfo.data.length !== REQUEST_ACCOUNT_SIZE) {
    throw new Error("Request account size mismatch");
  }

  const request = parseRequestAccount(Buffer.from(accountInfo.data));

  console.log("Solana request:");
  console.log("  requestPda:", requestPda.toBase58());
  console.log("  status:", statusLabel(request.status));
  console.log("  requester:", request.requester.toBase58());
  console.log("  requestId:", `0x${Buffer.from(request.requestId).toString("hex")}`);
  console.log("  modelHash:", `0x${Buffer.from(request.modelHash).toString("hex")}`);
  console.log("  inputHash:", `0x${Buffer.from(request.inputHash).toString("hex")}`);
  console.log("  inputData:", `0x${Buffer.from(request.inputData).toString("hex")}`);
  console.log("  maxPrice:", request.maxPrice.toString());
  console.log("  deadline:", request.deadline);
  console.log("  citrateRequestId:", request.citrateRequestId.toString());
  console.log("  outputHash:", `0x${Buffer.from(request.outputHash).toString("hex")}`);
  console.log("  outputData:", `0x${Buffer.from(request.outputData).toString("hex")}`);
  console.log("  citrateBlockHash:", `0x${Buffer.from(request.citrateBlockHash).toString("hex")}`);
  console.log("  citrateBlockNumber:", request.citrateBlockNumber.toString());
  console.log("  citrateChainId:", request.citrateChainId.toString());
}

main().catch((error) => {
  console.error("Solana read error:", error);
  process.exit(1);
});
