import "server-only";
import { createHmac } from "node:crypto";
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
 *   - keys are MINTED by `node scripts/mint-mcp-key.mjs` in the format `cdk_<43 base64url chars>`
 *     (32 random bytes); any other presented string never resolves;
 *   - `MCP_API_KEYS` is a JSON object keyed by HMAC-SHA256(key, MCP_KEY_PEPPER) in hex; the plaintext
 *     key is NEVER stored, and without the server-only pepper the store cannot be brute-forced:
 *         { "<hmac hex>": { "tier": "commercial", "sub": "org:acme", "expiresAt": 1790000000000 } }
 *   - `MCP_KEY_PEPPER` unset or shorter than 32 chars: nothing resolves;
 *   - the cap is the entry's tier, capped by `normalizeTier` (an unknown/typo'd tier string collapses
 *     to "public", so a bad config can never widen access);
 *   - `expiresAt` (epoch-ms) is honoured: an expired key resolves to "public";
 *   - unset/malformed env, no key, an unknown key, or an expired key all resolve to "public".
 *
 * There is deliberately no in-repo default that grants anything above public.
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

/**
 * Minted key format (scripts/mint-mcp-key.mjs): `cdk_` + 32 random bytes, base64url (43 chars). Only
 * keys in this format can resolve, so a stored entry can only ever be matched by a 256-bit random token.
 */
export const MCP_KEY_RE = /^cdk_[A-Za-z0-9_-]{43}$/;

/** Minimum length of the server-side pepper (`MCP_KEY_PEPPER`). Shorter or unset: no key resolves. */
export const MIN_MCP_KEY_PEPPER_LENGTH = 32;

/**
 * The store index for a presented key: HMAC-SHA256(key) under the server-only `MCP_KEY_PEPPER`.
 * PBA R2 (CodeQL js/insufficient-password-hash #5): the store used to be keyed by a bare SHA-256 of
 * operator-chosen keys, so a leaked `MCP_API_KEYS` could be brute-forced offline. With a keyed HMAC a
 * leaked store is useless without the pepper, and the key format above guarantees 256-bit keys anyway.
 */
export function mcpKeyDigest(key: string, pepper: string): string {
  return createHmac("sha256", pepper).update(key).digest("hex");
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

/** The shortest presented key that can resolve to a grant (defence in depth under MCP_KEY_RE). */
export const MIN_MCP_KEY_LENGTH = 32;

/** The subject of the fail-closed public cap (no, unknown or expired key). Never a verified principal. */
export const ANON_MCP_SUB = "mcp:anon";
const publicCap = (): McpKeyCap => ({ tier: "public", sub: ANON_MCP_SUB, expiresAt: null });

/** Resolve a presented MCP API key to an entitlement cap. Fail-closed to "public" on anything unexpected. */
export function resolveMcpKeyCap(
  presentedKey: string | null | undefined,
  now: number,
  env: NodeJS.ProcessEnv = process.env
): McpKeyCap {
  const key = (presentedKey ?? "").trim();
  if (key.length < MIN_MCP_KEY_LENGTH || !MCP_KEY_RE.test(key)) return publicCap();
  const pepper = env.MCP_KEY_PEPPER ?? "";
  if (pepper.length < MIN_MCP_KEY_PEPPER_LENGTH) return publicCap(); // no pepper → nothing resolves (fail closed)

  const entry = keyStore(env)[mcpKeyDigest(key, pepper)];
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
