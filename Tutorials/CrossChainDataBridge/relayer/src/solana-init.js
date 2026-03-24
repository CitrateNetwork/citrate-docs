import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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
  : path.resolve(__dirname, "..", "solana.config.json");

if (!fs.existsSync(configPath)) {
  throw new Error(`Config not found: ${configPath}`);
}

const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

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

function encodeInitialize(citrateChainId, quorum, relayers) {
  const variant = Buffer.from([0]);
  const chainIdBuf = Buffer.alloc(8);
  chainIdBuf.writeBigUInt64LE(BigInt(citrateChainId));
  const quorumBuf = Buffer.from([quorum]);
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(relayers.length);

  const relayerBufs = relayers.map((pk) => pk.toBytes());
  return Buffer.concat([
    variant,
    chainIdBuf,
    quorumBuf,
    lenBuf,
    ...relayerBufs.map((buf) => Buffer.from(buf))
  ]);
}

async function deriveConfigPda() {
  const [configPda] = await PublicKey.findProgramAddress(
    [Buffer.from("config")],
    programId
  );
  return configPda;
}

async function main() {
  const relayerPubkeys = relayerKeypairs.map((kp) => kp.publicKey);
  const quorum = config.solanaQuorum ? Number(config.solanaQuorum) : relayerPubkeys.length;
  const chainId = config.citrateChainId ? Number(config.citrateChainId) : 40204;
  const data = encodeInitialize(chainId, quorum, relayerPubkeys);
  const configPda = await deriveConfigPda();

  const keys = [
    { pubkey: payer.publicKey, isSigner: true, isWritable: true },
    { pubkey: configPda, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];

  const ix = new TransactionInstruction({
    programId,
    keys,
    data
  });

  const tx = new Transaction().add(ix);
  tx.feePayer = payer.publicKey;
  const { blockhash } = await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.sign(payer);

  const signature = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(signature, "confirmed");

  console.log("Config initialized:", configPda.toBase58());
}

main().catch((error) => {
  console.error("Solana init error:", error);
  process.exit(1);
});
