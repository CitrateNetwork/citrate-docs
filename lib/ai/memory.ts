import "server-only";
import { createHmac } from "node:crypto";
import { canRead, type AuthSession, type Tier } from "@/prototype/fixtures";
import type { Chunk } from "./corpus";

/**
 * Live knowledge-graph retrieval for Ask Almanac (S4 extension).
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
  "citrate-defense_prime-shell",
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
 * Repos whose memory tier is pinned. Everything not listed defaults to
 * `MEM_DEFAULT_TIER` (default **"confidential"** — FAIL CLOSED). Federation memory is
 * live internal engineering data (commits, ADRs, code-anchored facts, findings), so an
 * unlisted repo is gated by default; a public/anonymous asker gets NO federation memory
 * until a repo is explicitly opened. To let the public chatbot answer about a
 * genuinely-public repo, add it here with tier "public" (e.g. docs/SDKs), or set
 * `MEM_DEFAULT_TIER`. Override the map with `MEMORY_REPO_TIERS` (JSON: {"repo":"tier"}).
 */
export const DEFAULT_REPO_TIERS: Record<string, Tier> = {
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

/**
 * Resolve the effective repo→tier map from an optional `MEMORY_REPO_TIERS` JSON override.
 *
 * DOC-B-009: the override is MERGED OVER the confidential defaults, never used as a whole-map
 * REPLACEMENT. A partial or mistyped override therefore cannot silently DEMOTE a declared
 * confidential repo (`citrate-security`/`-commercial`/`-compliance`/`-federation`) to public;
 * it can only add/raise entries or (deliberately, explicitly) lower one it names. Malformed
 * JSON falls back to the safe defaults.
 */
export function resolveRepoTiers(raw: string | undefined = process.env.MEMORY_REPO_TIERS): Record<string, Tier> {
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as Record<string, Tier>;
      return { ...DEFAULT_REPO_TIERS, ...parsed };
    } catch {
      /* fall through to default on malformed JSON */
    }
  }
  return { ...DEFAULT_REPO_TIERS };
}

/** Tier for one repo against an already-resolved map (unknown repo → configured default).
 *  FAIL CLOSED: an unlisted repo defaults to "confidential" so federation memory is never
 *  served to a lower-tier (incl. anonymous/public) asker unless explicitly opened. */
export function repoTierFrom(map: Record<string, Tier>, repo: string): Tier {
  return map[repo] ?? ((process.env.MEM_DEFAULT_TIER as Tier) || "confidential");
}

function repoTier(repo: string): Tier {
  return repoTierFrom(resolveRepoTiers(), repo);
}

/**
 * Boot-time floor assertion (DOC-B-009 tripwire): every repo declared confidential in
 * DEFAULT_REPO_TIERS must still resolve confidential under the live config, or we throw and
 * fail closed rather than serve federation memory with a silently-demoted repo.
 */
export function assertConfidentialFloor(map: Record<string, Tier> = resolveRepoTiers()): void {
  const demoted = Object.entries(DEFAULT_REPO_TIERS)
    .filter(([repo, tier]) => tier === "confidential" && repoTierFrom(map, repo) !== "confidential")
    .map(([repo]) => repo);
  if (demoted.length) {
    throw new Error(
      `MEMORY_REPO_TIERS demotes confidential repo(s) below their declared tier: ${demoted.join(", ")}`
    );
  }
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

// search lines:  `  4628f59d98 0.730 [commit] test(consensus): Property-based tests…`
const SEARCH_RE = /^\s+([0-9a-f]{6,})\s+([\d.]+)\s+\[([^\]]+)\]\s+(.*)$/;
// recall lines (no score): `  01b5a444f9 [doc] citrate-federation`
const RECALL_RE = /^\s+([0-9a-f]{6,})\s+\[([^\]]+)\]\s+(.*)$/;

async function callTool(
  baseUrl: string, sub: string, token: string, name: string,
  args: Record<string, unknown>, signal: AbortSignal
): Promise<string> {
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/mcp/u/${encodeURIComponent(sub)}`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    signal,
  });
  if (!res.ok) return "";
  const json = (await res.json()) as { result?: { content?: Array<{ text?: string }> } };
  return json.result?.content?.map((c) => c.text ?? "").join("\n") ?? "";
}

/** Relevance hits for a repo (memory.search). */
async function searchRepo(baseUrl: string, sub: string, token: string, repo: string, query: string, budget: number, signal: AbortSignal): Promise<MemHit[]> {
  const text = await callTool(baseUrl, sub, token, "memory.search", { repo, query, budget }, signal);
  const out: MemHit[] = [];
  for (const line of text.split("\n")) {
    const m = SEARCH_RE.exec(line);
    if (m) out.push({ repo, id: m[1], score: Number(m[2]), kind: m[3], title: m[4].trim() });
  }
  return out;
}

/** Recent-history storyline for a repo (memory.recall), scored below search hits so relevance leads. */
async function recallRepo(baseUrl: string, sub: string, token: string, repo: string, budget: number, signal: AbortSignal): Promise<MemHit[]> {
  const text = await callTool(baseUrl, sub, token, "memory.recall", { repo, budget }, signal);
  const out: MemHit[] = [];
  for (const line of text.split("\n")) {
    const m = RECALL_RE.exec(line);
    if (m) out.push({ repo, id: m[1], score: 0.05, kind: m[2], title: m[3].trim() });
  }
  return out;
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
  now: number // DOC-B-005: required — the tier filter must evaluate against the real clock.
): Promise<Chunk[]> {
  const baseUrl = process.env.MEM_GATEWAY_URL;
  const secret = process.env.MEM_CONNECT_SECRET;
  if (!baseUrl || !secret || !query.trim()) return [];

  // DOC-B-009: fail closed rather than serve federation memory under a config that has silently
  // demoted a declared-confidential repo below its floor.
  const tierMap = resolveRepoTiers();
  assertConfidentialFloor(tierMap);

  const sub = process.env.MEM_SERVICE_SUB || "svc:atlas";
  const perRepo = Math.max(1, Number(process.env.MEM_SEARCH_PER_REPO ?? 4));
  const topK = Math.max(1, Number(process.env.MEM_SEARCH_TOPK ?? 12));
  // Optional recent-history storyline: comma-list of repos to also pull via memory.recall (helps
  // "history of the project" questions). Off by default to keep specific questions precise.
  const recallRepos = (process.env.MEM_RECALL_REPOS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const recallBudget = Math.max(1, Number(process.env.MEM_RECALL_BUDGET ?? 4));

  // filter-before-retrieval: only query repos the caller is entitled to read.
  const readable = repos().filter((r) =>
    canRead(session, { tier: repoTierFrom(tierMap, r), orgId: null }, now)
  );
  if (!readable.length) return [];

  const token = connectToken(sub, secret);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MEM_SEARCH_TIMEOUT_MS ?? 12000));
  let hits: MemHit[] = [];
  try {
    const searches = readable.map((r) =>
      searchRepo(baseUrl, sub, token, r, query, perRepo, controller.signal).catch(() => [])
    );
    // Recall only the configured repos that the caller may read.
    const recalls = recallRepos
      .filter((r) => readable.includes(r))
      .map((r) => recallRepo(baseUrl, sub, token, r, recallBudget, controller.signal).catch(() => []));
    const all = await Promise.all([...searches, ...recalls]);
    hits = all.flat();
  } finally {
    clearTimeout(timeout);
  }

  // Dedupe by repo+id (a node can surface from both search and recall); keep the higher score.
  const byId = new Map<string, MemHit>();
  for (const h of hits) {
    const key = `${h.repo}:${h.id}`;
    const prev = byId.get(key);
    if (!prev || h.score > prev.score) byId.set(key, h);
  }

  return [...byId.values()]
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
