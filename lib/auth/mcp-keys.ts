import "server-only";
import { createHash } from "node:crypto";
import { Tier, normalizeTier } from "@/prototype/fixtures";

/**
 * MCP API-key → entitlement resolution (S4). DOC-B-003 fix.
 *
 * The prior implementation mapped three PLAINTEXT literal key strings (`codex_public`/`codex_commercial`/
 * `codex_academic`) directly to tiers inside the route module, so anyone who read the public source and
 * sent `x-codex-api-key: codex_academic` retrieved academic-tier bodies from the server. There was no key
 * store, no owner scope, no expiry — the "identity" the gate ran on was a constant in the repo.
 *
 * This resolver instead reads a HASH-AT-REST, env-configured key store and fails CLOSED:
 *   - `MCP_API_KEYS` is a JSON object keyed by the SHA-256 (hex) of the API key — the plaintext key is
 *     NEVER stored in source or config:
 *         { "<sha256hex>": { "tier": "commercial", "sub": "org:acme", "expiresAt": 1790000000000 } }
 *   - the presented key is hashed and looked up; the cap is the entry's tier, capped by `normalizeTier`
 *     (an unknown/typo'd tier string collapses to "public" — a bad config can never widen access);
 *   - `expiresAt` (epoch-ms) is honoured — an expired key resolves to "public";
 *   - unset/malformed env, no key, an unknown key, or an expired key all resolve to "public".
 *
 * There is deliberately no in-repo default that grants anything above public. Until a real seat/contracts
 * key table is wired (PLANSET/07 §2), an operator provisions caps by adding `sha256(key) → {tier,sub}`
 * entries to `MCP_API_KEYS`.
 */

export interface McpKeyCap {
  tier: Tier;
  /** The key owner's subject, for the synthetic session + access logging. */
  sub: string;
  expiresAt: number | null;
}

interface RawEntry {
  tier?: unknown;
  sub?: unknown;
  expiresAt?: unknown;
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function keyStore(env: NodeJS.ProcessEnv): Record<string, RawEntry> {
  const raw = env.MCP_API_KEYS;
  if (!raw || !raw.trim()) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, RawEntry>;
    }
  } catch {
    /* malformed → fail closed (empty store) */
  }
  return {};
}

const publicCap = (): McpKeyCap => ({ tier: "public", sub: "mcp:anon", expiresAt: null });

/** Resolve a presented MCP API key to an entitlement cap. Fail-closed to "public" on anything unexpected. */
export function resolveMcpKeyCap(
  presentedKey: string | null | undefined,
  now: number,
  env: NodeJS.ProcessEnv = process.env
): McpKeyCap {
  const key = (presentedKey ?? "").trim();
  if (!key) return publicCap();

  const entry = keyStore(env)[sha256Hex(key)];
  if (!entry) return publicCap();

  // normalizeTier collapses any unknown/typo'd tier to "public" — a bad store entry can never escalate.
  const tier = normalizeTier(entry.tier);
  const expiresAt = typeof entry.expiresAt === "number" ? entry.expiresAt : null;
  if (expiresAt != null && now >= expiresAt) return publicCap(); // expired key → public

  const sub = typeof entry.sub === "string" && entry.sub.trim() ? entry.sub.trim() : `mcp:${tier}`;
  return { tier, sub, expiresAt };
}

/** Extract the API key from an MCP request (Authorization: Bearer … or x-codex-api-key). */
export function extractApiKey(req: Request): string | null {
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (bearer) return bearer;
  const header = req.headers.get("x-codex-api-key")?.trim();
  return header || null;
}
