import { rpcCall } from "@/lib/sandbox/rpc";
import { enforceRateLimitShared } from "@/lib/security/rate-limit";

/** S5 — RPC method explorer: run an allowlisted read-only call against chain 40204. */
export async function POST(req: Request) {
  const limited = await enforceRateLimitShared(req, "sandbox:rpc", { limit: 30 }); // DOC-B-007
  if (limited) return limited;

  let method = "eth_chainId";
  let params: unknown[] = [];
  try {
    const b = (await req.json()) as { method?: string; params?: unknown[] };
    if (b.method) method = b.method;
    if (Array.isArray(b.params)) params = b.params;
  } catch {
    /* defaults */
  }
  const out = await rpcCall(method, params);
  return Response.json(out, { status: out.ok ? 200 : 502, headers: { "cache-control": "no-store" } });
}
