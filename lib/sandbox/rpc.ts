import "server-only";
import { checkSandboxGetLogs } from "./log-bounds";

/**
 * S5 — read-only RPC harness for the live sandboxes (chain 40204). Deny-by-default allowlist, fixed host
 * (no SSRF — the browser never picks the endpoint), 8s timeout, fail-closed on any error. No signing, no
 * write methods — structurally incapable of changing chain state (mirrors citrate-explorer's harness).
 */
const RPC_URL = process.env.CITRATE_RPC_URL || "https://rpc.citrate.ai";

/** Read-only methods reachable through the sandbox. Anything not here is rejected before transport. */
export const ALLOWED_METHODS = [
  "eth_chainId", "eth_blockNumber", "eth_gasPrice", "eth_getBalance", "eth_getCode",
  "eth_getBlockByNumber", "eth_getBlockByHash", "eth_getTransactionByHash", "eth_getTransactionReceipt",
  "eth_call", "eth_getLogs", "net_version", "web3_clientVersion",
  "citrate_getDagStats", "citrate_gasPrice", "citrate_getEconomicState", "citrate_getModels", "citrate_getToken",
  "chain_getTips", "chain_getHeight", "chain_getBlock", "chain_getTransaction",
] as const;

const ALLOW = new Set<string>(ALLOWED_METHODS);
const FORBID = new Set([
  "eth_sendRawTransaction", "eth_sendTransaction", "eth_sign", "eth_signTypedData", "eth_signTypedData_v4",
  "personal_sign", "personal_sendTransaction", "eth_accounts", "wallet_addEthereumChain",
]);

export interface RpcOutcome {
  ok: boolean;
  request: { method: string; params: unknown[] };
  result?: unknown;
  error?: string;
  curl: string;
}

export async function rpcCall(method: string, params: unknown[] = []): Promise<RpcOutcome> {
  const request = { method, params };
  const curl =
    `curl -s ${RPC_URL} -H 'content-type: application/json' ` +
    `-d '${JSON.stringify({ jsonrpc: "2.0", id: 1, method, params })}'`;

  if (FORBID.has(method) || !ALLOW.has(method)) {
    return { ok: false, request, error: `method not allowed (read-only sandbox): ${method}`, curl };
  }
  // PBA-L3c-036: an allowlisted read can still be an amplification vector; bound eth_getLogs.
  if (method === "eth_getLogs") {
    const checked = checkSandboxGetLogs(params);
    if (!checked.ok) return { ok: false, request, error: checked.error, curl };
    params = checked.params;
  }
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(RPC_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, request, error: `rpc HTTP ${res.status}`, curl };
    const j = (await res.json()) as { result?: unknown; error?: { message?: string } };
    if (j.error) return { ok: false, request, error: j.error.message || "rpc error", curl };
    return { ok: true, request, result: j.result, curl };
  } catch {
    return { ok: false, request, error: "endpoint unavailable (fail-closed)", curl };
  }
}
