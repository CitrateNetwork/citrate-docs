import { canRead, type AuthSession, type Tier } from "@/prototype/fixtures";
import { retrieve, getSurface } from "@/lib/ai/corpus";

/**
 * S4 — Codex as an MCP server. External agents call the docs toolbox over JSON-RPC. The API key sets an
 * entitlement TIER CAP, and retrieval runs as a synthetic session at that cap — so a Commercial-capped key
 * can never retrieve Academic/Confidential resources (PLANSET/04 MCP feature). Demo keys map to caps; in
 * production keys resolve to their creator's entitlement (never exceeding it).
 */
const KEY_CAP: Record<string, Tier> = {
  codex_public: "public",
  codex_commercial: "commercial",
  codex_academic: "academic",
};

function capFromKey(req: Request): Tier {
  const key = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || req.headers.get("x-codex-api-key") || "";
  return KEY_CAP[key] ?? "public"; // unknown/no key → Public only
}

function syntheticSession(tier: Tier): AuthSession {
  return { required: true, authenticated: true, sub: `mcp:${tier}`, kycStatus: "verified", entitlement: { tier, orgId: null, expiresAt: null } };
}

const TOOLS = [
  { name: "searchDocs", description: "Search Citrate documentation within your entitlement tier.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "getSurface", description: "Fetch one documentation surface by slug (if within your tier).", inputSchema: { type: "object", properties: { slug: { type: "string" } }, required: ["slug"] } },
];

const rpc = (id: unknown, result: unknown) => Response.json({ jsonrpc: "2.0", id, result }, { headers: { "cache-control": "no-store" } });
const rpcErr = (id: unknown, code: number, message: string) => Response.json({ jsonrpc: "2.0", id, error: { code, message } });

export async function POST(req: Request) {
  const cap = capFromKey(req);
  const session = syntheticSession(cap);
  let body: { id?: unknown; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
  try {
    body = await req.json();
  } catch {
    return rpcErr(null, -32700, "parse error");
  }
  const { id, method, params } = body;

  if (method === "tools/list") return rpc(id, { tools: TOOLS });

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments ?? {};
    if (name === "searchDocs") {
      const hits = retrieve(session, String(args.query ?? ""), 8, Date.now())
        .map((c) => ({ slug: c.slug, title: c.title, tier: c.tier }));
      return rpc(id, { tierCap: cap, results: hits });
    }
    if (name === "getSurface") {
      const c = getSurface(String(args.slug ?? ""));
      // Enforce the cap: never return a surface above the key's tier.
      if (!c || !canRead(session, { tier: c.tier, orgId: c.orgId }, Date.now())) {
        return rpc(id, { error: "not_found_or_above_tier", tierCap: cap });
      }
      return rpc(id, { slug: c.slug, title: c.title, tier: c.tier, body: c.text });
    }
    return rpcErr(id, -32601, `unknown tool: ${name}`);
  }
  return rpcErr(id, -32601, `unknown method: ${method}`);
}
