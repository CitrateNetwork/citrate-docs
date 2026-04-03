import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Connection, PublicKey } from "@solana/web3.js";
import { REQUEST_ACCOUNT_SIZE, parseRequestAccount } from "./solana-utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.resolve(__dirname, "..", "solana.read.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));


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
