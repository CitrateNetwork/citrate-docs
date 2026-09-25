/**
 * Bounds for the sandbox `eth_getLogs` passthrough (PBA-L3c-036, EX-B-004 variant). Same rules as
 * citrate-explorer's `/api/v1?module=proxy&action=eth_getLogs` guard: exactly one filter, one contract
 * address, explicit hex fromBlock/toBlock spanning at most {@link MAX_SANDBOX_LOG_BLOCKS} blocks (or a
 * single blockHash), at most 4 topic positions of at most 4 alternatives, and no other keys. The
 * filter is rebuilt from the validated fields only.
 */
export const MAX_SANDBOX_LOG_BLOCKS = 1_000n;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const WORD_RE = /^0x[0-9a-fA-F]{64}$/;
const QUANTITY_RE = /^0x(0|[1-9a-fA-F][0-9a-fA-F]{0,15})$/;
const KEYS = new Set(["address", "fromBlock", "toBlock", "topics", "blockHash"]);

type Topic = string | null | string[];
export type LogParamsCheck = { ok: true; params: [Record<string, unknown>] } | { ok: false; error: string };

function topicsOk(t: unknown): t is Topic[] {
  if (!Array.isArray(t) || t.length > 4) return false;
  return t.every(
    (x) =>
      x === null ||
      (typeof x === "string" && WORD_RE.test(x)) ||
      (Array.isArray(x) && x.length >= 1 && x.length <= 4 && x.every((w) => typeof w === "string" && WORD_RE.test(w))),
  );
}

export function checkSandboxGetLogs(params: unknown[]): LogParamsCheck {
  const bad = (why: string): LogParamsCheck => ({ ok: false, error: `eth_getLogs ${why}` });
  if (params.length !== 1 || !params[0] || typeof params[0] !== "object" || Array.isArray(params[0])) {
    return bad("takes exactly one filter object");
  }
  const f = params[0] as Record<string, unknown>;
  for (const k of Object.keys(f)) if (!KEYS.has(k)) return bad(`does not accept "${k}"`);
  if (typeof f.address !== "string" || !ADDRESS_RE.test(f.address)) return bad("requires a single contract address");
  if (f.topics !== undefined && !topicsOk(f.topics)) return bad("allows at most 4 topic positions of at most 4 32-byte words");
  const out: Record<string, unknown> = { address: f.address };
  if (f.blockHash !== undefined) {
    if (f.fromBlock !== undefined || f.toBlock !== undefined) return bad("cannot combine blockHash with a range");
    if (typeof f.blockHash !== "string" || !WORD_RE.test(f.blockHash)) return bad("blockHash must be a 32-byte hash");
    out.blockHash = f.blockHash;
  } else {
    if (typeof f.fromBlock !== "string" || typeof f.toBlock !== "string" || !QUANTITY_RE.test(f.fromBlock) || !QUANTITY_RE.test(f.toBlock)) {
      return bad("requires explicit hex fromBlock and toBlock (no block tags)");
    }
    const from = BigInt(f.fromBlock);
    const to = BigInt(f.toBlock);
    if (to < from || to - from + 1n > MAX_SANDBOX_LOG_BLOCKS) return bad(`range must be 1 to ${MAX_SANDBOX_LOG_BLOCKS} blocks`);
    out.fromBlock = f.fromBlock;
    out.toBlock = f.toBlock;
  }
  if (f.topics !== undefined) out.topics = f.topics;
  return { ok: true, params: [out] };
}
