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
import { MAX_INPUT_BYTES } from "./solana-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "solana.request.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));


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

async function main() {
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
}

main().catch((error) => {
  console.error("Solana request error:", error);
  process.exit(1);
});
