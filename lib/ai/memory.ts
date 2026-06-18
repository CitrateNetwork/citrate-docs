import "server-only";
import { createHmac } from "node:crypto";
import { canRead, type AuthSession, type Tier } from "@/prototype/fixtures";
import type { Chunk } from "./corpus";

/**
 * Live knowledge-graph retrieval for Ask Atlas (S4 extension).
 *
 * The docs corpus is a frozen snapshot; the citrate-memories DAG ("mem-gateway")
 * is the LIVE federation memory — commits, sprint decisions, ADRs, findings,
 * code-anchored facts across every repo. This module fans out `memory.search`
 * over the gateway's MCP surface and returns the hits as {@link Chunk}s so they
 * merge into the same tier-filtered RAG pipeline the docs use.
 *
 * TIER SAFETY (filter-before-retrieval, exactly like `corpus.retrieve`): every
 * federation repo has a confidentiality tier; we only ever QUERY the repos the
 * caller `canRead`, and tag the returned chunks with that tier. So a Public asker
 * can never pull memory from `citrate-security` / `citrate-commercial` etc. into
 * the model's context or the citations. (Defense-in-depth hardening — scoping the
 * `svc:atlas` grant per-tier at the gateway — is a follow-up; today the gateway
 * grant is read-all and this server-side filter is the enforcement, matching how
 * the docs corpus contains all tiers and `retrieve` filters before the model.)
 */

/** The federation tenants the knowledge graph covers. Override with `MEMORY_REPOS`. */
const DEFAULT_REPOS = [
  ".github",
  "citrate-agent-runtime",
  "citrate-agentile-archive",
  "citrate-boeing-shell",
  "citrate-bundler",
  "citrate-buyer-webapp",
  "citrate-chain",
  "citrate-chatbot",
  "citrate-commercial",
  "citrate-compliance",
  "citrate-compute-pool",
  "citrate-dashboard",
  "citrate-docs",
  "citrate-explorer",
  "citrate-federation",
  "citrate-gui-native",
  "citrate-identity",
  "citrate-inference-gateway",
  "citrate-learning-center",
  "citrate-memories",
  "citrate-node-agent",
  "citrate-sdk-js",
  "citrate-sdk-marketplace",
  "citrate-sdk-python",
  "citrate-security",
  "citrate-simulation",
  "citrate-studio",
  "citrate-wallet-extension",
  "nist-agent",
];

/**
 * Repos whose memory is sensitive → elevated tier. Everything not listed defaults
 * to `MEM_DEFAULT_TIER` (default "public"), so the chatbot can answer about most of
 * the graph for everyone while internal/audit/deal/compliance memory stays gated.
 * Override the whole map with `MEMORY_REPO_TIERS` (JSON: {"repo":"tier"}).
 */
const DEFAULT_REPO_TIERS: Record<string, Tier> = {
  "citrate-security": "confidential", // audit findings, vulnerability reports
  "citrate-commercial": "confidential", // deal packages
  "citrate-compliance": "confidential", // compliance corpus
  "citrate-federation": "confidential", // internal ops / sprint control-plane
};

function repos(): string[] {
  const raw = process.env.MEMORY_REPOS;
  if (raw && raw.trim()) return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return DEFAULT_REPOS;
}

function repoTierMap(): Record<string, Tier> {
  const raw = process.env.MEMORY_REPO_TIERS;
  if (raw && raw.trim()) {
    try {
      return JSON.parse(raw) as Record<string, Tier>;
    } catch {
      /* fall through to default on malformed JSON */
    }
  }
  return DEFAULT_REPO_TIERS;
}

function repoTier(repo: string): Tier {
  return repoTierMap()[repo] ?? ((process.env.MEM_DEFAULT_TIER as Tier) || "public");
}

function b64url(b: Buffer): string {
  return b.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

/** Mint a short-lived HS256 connect token the gateway verifies for `POST /mcp/u/:sub`. */
function connectToken(sub: string, secret: string, ttlSeconds = 120): string {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(
    Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + ttlSeconds }))
  );
  const sig = b64url(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

interface MemHit {
  repo: string;
  id: string;
  score: number;
  kind: string;
  title: string;
}

// Lines look like: `  4628f59d98 0.730 [commit] test(consensus): Property-based tests…`
const HIT_RE = /^\s+([0-9a-f]{6,})\s+([\d.]+)\s+\[([^\]]+)\]\s+(.*)$/;

function parseHits(repo: string, text: string): MemHit[] {
  const out: MemHit[] = [];
  for (const line of text.split("\n")) {
    const m = HIT_RE.exec(line);
    if (!m) continue;
    out.push({ repo, id: m[1], score: Number(m[2]), kind: m[3], title: m[4].trim() });
  }
  return out;
}

async function searchRepo(
  baseUrl: string,
  sub: string,
  token: string,
  repo: string,
  query: string,
  budget: number,
  signal: AbortSignal
): Promise<MemHit[]> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: "memory.search", arguments: { repo, query, budget } },
  };
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/mcp/u/${encodeURIComponent(sub)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { result?: { content?: Array<{ text?: string }> } };
  const text = json.result?.content?.map((c) => c.text ?? "").join("\n") ?? "";
  return parseHits(repo, text);
}

/**
 * Search the live federation memory for `query`, scoped to what `session` may read.
 * Returns ranked {@link Chunk}s tagged with each source repo's tier (so the route's
 * citations + the model context stay within the caller's access). Returns `[]` and
 * stays silent when the gateway is not configured — the docs RAG still answers.
 */
export async function searchMemory(
  session: AuthSession,
  query: string,
  now?: number
): Promise<Chunk[]> {
  const baseUrl = process.env.MEM_GATEWAY_URL;
  const secret = process.env.MEM_CONNECT_SECRET;
  if (!baseUrl || !secret || !query.trim()) return [];

  const sub = process.env.MEM_SERVICE_SUB || "svc:atlas";
  const perRepo = Math.max(1, Number(process.env.MEM_SEARCH_PER_REPO ?? 3));
  const topK = Math.max(1, Number(process.env.MEM_SEARCH_TOPK ?? 5));

  // filter-before-retrieval: only query repos the caller is entitled to read.
  const readable = repos().filter((r) =>
    canRead(session, { tier: repoTier(r), orgId: null }, now)
  );
  if (!readable.length) return [];

  const token = connectToken(sub, secret);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MEM_SEARCH_TIMEOUT_MS ?? 12000));
  let hits: MemHit[] = [];
  try {
    const perRepoHits = await Promise.all(
      readable.map((r) =>
        searchRepo(baseUrl, sub, token, r, query, perRepo, controller.signal).catch(() => [])
      )
    );
    hits = perRepoHits.flat();
  } finally {
    clearTimeout(timeout);
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((h) => ({
      slug: `mem:${h.repo}:${h.id.slice(0, 10)}`,
      title: h.title,
      tier: repoTier(h.repo),
      orgId: null,
      // give the model the kind + repo context alongside the canonical content.
      text: `[${h.kind} · ${h.repo}] ${h.title}`,
    }));
}
