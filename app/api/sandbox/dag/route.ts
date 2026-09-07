import { rpcCall } from "@/lib/sandbox/rpc";
import { enforceRateLimit } from "@/lib/security/rate-limit";

/** S5 — GhostDAG blue-score visualizer: live DAG state from chain 40204 (citrate_getDagStats + tips). */
export async function GET(req: Request) {
  const limited = enforceRateLimit(req, "sandbox:dag", { limit: 30 }); // DOC-B-007
  if (limited) return limited;

  const stats = await rpcCall("citrate_getDagStats", []);
  if (!stats.ok) {
    return Response.json({ ok: false, error: stats.error }, { status: 502, headers: { "cache-control": "no-store" } });
  }
  return Response.json({ ok: true, stats: stats.result, curl: stats.curl }, { headers: { "cache-control": "no-store" } });
}
