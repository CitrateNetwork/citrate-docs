import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { ethers } from "ethers";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction
} from "@solana/web3.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "solana.flow.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

const MAX_INPUT_BYTES = 1024;
const MAX_OUTPUT_BYTES = 2048;
const REQUEST_ACCOUNT_SIZE = 3313;

const connection = new Connection(config.solanaRpcUrl, "confirmed");
const programId = new PublicKey(config.solanaProgramId);

const requesterKeypairPath = config.solanaRequesterKeypair
  ? path.resolve(config.solanaRequesterKeypair)
  : null;

if (!requesterKeypairPath) {
  throw new Error("solanaRequesterKeypair is required to submit requests");
}

const requesterSecret = JSON.parse(fs.readFileSync(requesterKeypairPath, "utf-8"));
const requester = Keypair.fromSecretKey(Uint8Array.from(requesterSecret));

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

function parseInputData(value) {
  if (typeof value !== "string") {
    throw new Error("inputData must be a string");
  }

  if (value.startsWith("0x")) {
    return Buffer.from(value.slice(2), "hex");
  }

  return Buffer.from(value, "utf-8");
}

function parseU64(label, value) {
  if (value === undefined || value === null) {
    throw new Error(`${label} is required`);
  }

  if (typeof value === "string" && value.startsWith("0x")) {
    return BigInt(value);
  }

  const asNumber = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(asNumber)) {
    throw new Error(`${label} must be a number or numeric string`);
  }

  if (asNumber < 0) {
    throw new Error(`${label} must be non-negative`);
  }

  return BigInt(asNumber);
}

function computeDeterministicRequestId(requesterPubkey, nonce, modelHash, inputHash, deadline, programId) {
  const nonceBuf = Buffer.alloc(8);
  nonceBuf.writeBigUInt64LE(BigInt(nonce));
  const deadlineBuf = Buffer.alloc(8);
  deadlineBuf.writeBigInt64LE(BigInt(deadline));

  const payload = Buffer.concat([
    Buffer.from(requesterPubkey.toBytes()),
    nonceBuf,
    modelHash,
    inputHash,
    deadlineBuf,
    Buffer.from(programId.toBytes())
  ]);

  const digest = ethers.keccak256(payload);
  return Buffer.from(digest.slice(2), "hex");
}

function encodeRequestInstruction(requestId, modelHash, inputData, maxPrice, deadline) {
  const variant = Buffer.from([1]);
  const inputLen = Buffer.alloc(4);
  inputLen.writeUInt32LE(inputData.length);
  const maxPriceBuf = Buffer.alloc(8);
  maxPriceBuf.writeBigUInt64LE(BigInt(maxPrice));
  const deadlineBuf = Buffer.alloc(8);
  deadlineBuf.writeBigInt64LE(BigInt(deadline));

  return Buffer.concat([
    variant,
    requestId,
    modelHash,
    inputLen,
    Buffer.from(inputData),
    maxPriceBuf,
    deadlineBuf
  ]);
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

async function deriveConfigPda() {
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("config")],
    programId
  );
  return configPda;
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

async function submitRequest() {
  const modelHash = parseHex32("modelHash", config.modelHash);
  const inputData = parseInputData(config.inputData || "");

  if (inputData.length === 0) {
    throw new Error("inputData must be non-empty");
  }

  if (inputData.length > MAX_INPUT_BYTES) {
    throw new Error(`inputData exceeds ${MAX_INPUT_BYTES} bytes`);
  }

  const maxPrice = config.maxPrice ?? "0";
  const deadline = Number(
    config.deadline ?? (Math.floor(Date.now() / 1000) + Number(config.deadlineSecondsFromNow ?? 600))
  );

  if (!Number.isFinite(deadline)) {
    throw new Error("deadline must be a unix timestamp");
  }

  const inputHash = Buffer.from(ethers.keccak256(inputData).slice(2), "hex");
  const deterministicEnabled = config.deterministicRequestId !== false;
  let requestId;

  if (config.requestId) {
    requestId = parseHex32("requestId", config.requestId);
  } else if (deterministicEnabled) {
    const nonce = parseU64("nonce", config.nonce);
    requestId = computeDeterministicRequestId(
      requester.publicKey,
      nonce,
      modelHash,
      inputHash,
      deadline,
      programId
    );
  } else {
    requestId = crypto.randomBytes(32);
  }

  const configPda = await deriveConfigPda();
  const requestPda = await deriveRequestPda(requestId);
  const instructionData = encodeRequestInstruction(requestId, modelHash, inputData, maxPrice, deadline);

  const keys = [
    { pubkey: requester.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPda, isSigner: false, isWritable: false },
    { pubkey: requestPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];

  const ix = new TransactionInstruction({
    programId,
    keys,
    data: instructionData
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = requester.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.sign(requester);

  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  console.log("Solana request submitted:");
  console.log("  requestId:", `0x${requestId.toString("hex")}`);
  console.log("  requestPda:", requestPda.toBase58());
  console.log("  signature:", signature);
  console.log("  inputHash:", `0x${inputHash.toString("hex")}`);

  return { requestId, requestPda, signature };
}

async function readRequest(requestId, requestPda) {
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

  return request;
}

async function main() {
  const { requestId, requestPda } = await submitRequest();

  if (config.readAfterSubmit === false) {
    return;
  }

  const delayMs = Number(config.readDelayMs ?? 2000);
  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  await readRequest(requestId, requestPda);
}

main().catch((error) => {
  console.error("Solana flow error:", error);
  process.exit(1);
});
