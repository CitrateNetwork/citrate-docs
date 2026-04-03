import { PublicKey } from "@solana/web3.js";

export const MAX_INPUT_BYTES = 1024;
export const MAX_OUTPUT_BYTES = 2048;
export const REQUEST_ACCOUNT_SIZE = 3313;

export function readU32LE(buffer, offset) {
  return buffer.readUInt32LE(offset);
}

export function readU64LE(buffer, offset) {
  const low = buffer.readUInt32LE(offset);
  const high = buffer.readUInt32LE(offset + 4);
  return (BigInt(high) << 32n) | BigInt(low);
}

export function readI64LE(buffer, offset) {
  const value = readU64LE(buffer, offset);
  return Number(BigInt.asIntN(64, value));
}

export function parseRequestAccount(buffer) {
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
