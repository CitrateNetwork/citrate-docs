#!/usr/bin/env node
// DOC-B-003 tripwire — the MCP server must NOT grant an entitlement tier from a plaintext key→tier literal
// baked into the route source. Run: `node --experimental-strip-types scripts/check-mcp-keys.mjs`.
//
// The bug: app/api/mcp/route.ts held `const KEY_CAP: Record<string, Tier> = { codex_public:"public",
// codex_commercial:"commercial", codex_academic:"academic" }` and read the presented key straight out of
// that map — so any anonymous caller who read the public repo and sent `x-codex-api-key: codex_academic`
// got the academic corpus from the server. The fix resolves keys against a HASH-AT-REST, env-configured
// store (`MCP_API_KEYS`) that fails closed to "public".
//
// Three guards:
//   1. Structural: no module under app/api/** may contain a `Record<string, Tier>` literal or any of the
//      three demo credential strings. A permanent RED WITNESS runs the exact pre-fix literal resolver and
//      asserts it grants academic from the source string (RC-9).
//   2. Behavioral (real code): the SHIPPED resolveMcpKeyCap fails closed with no store, honours a hashed
//      store entry, honours expiry, and never escalates an unknown tier.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

const ROOT = path.resolve(import.meta.dirname, "..");
const sha256Hex = (s) => createHash("sha256").update(s).digest("hex");

// ── Guard 1: structural — no credential literal / tier map anywhere under app/api. ──
function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx|js|mjs)$/.test(e.name)) out.push(p);
  }
  return out;
}
const TIER_MAP_RE = /Record\s*<\s*string\s*,\s*Tier\s*>\s*=\s*\{/;
const DEMO_KEY_RE = /\bcodex_(public|commercial|academic)\b/;
const apiFiles = walk(path.join(ROOT, "app/api"));
const structuralHits = [];
for (const f of apiFiles) {
  const src = fs.readFileSync(f, "utf8");
  if (TIER_MAP_RE.test(src)) structuralHits.push([path.relative(ROOT, f), "Record<string, Tier> literal map"]);
  if (DEMO_KEY_RE.test(src)) structuralHits.push([path.relative(ROOT, f), "plaintext demo credential (codex_*)"]);
}
if (structuralHits.length) {
  console.error("[check:mcp-keys] ❌ credential-shaped literal(s) under app/api (DOC-B-003):");
  for (const [f, why] of structuralHits) console.error(`   ${f} — ${why}`);
  process.exit(1);
}
console.log(`[check:mcp-keys] ✓ ${apiFiles.length} app/api modules scanned — no Record<string,Tier> map, no plaintext codex_* credential.`);

// ── Guard 1 RED WITNESS: the pre-fix literal resolver grants academic from a source string. ──
const legacyKeyCap = { codex_public: "public", codex_commercial: "commercial", codex_academic: "academic" };
const legacyResolve = (key) => legacyKeyCap[key] ?? "public";
assert.equal(legacyResolve("codex_academic"), "academic",
  "RED witness failed: the pre-fix literal resolver should grant academic from the source string.");
console.log('[check:mcp-keys] RED witness ✓ — the pre-fix literal resolver grants "academic" from the in-source string "codex_academic".');

// ── Load the SHIPPED resolver (copy + rewrite its server-only / alias imports for node strip-types). ──
async function loadResolver() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-mcp-"));
  fs.copyFileSync(path.join(ROOT, "prototype/fixtures/types.ts"), path.join(tmp, "types.ts"));
  let m = fs.readFileSync(path.join(ROOT, "lib/auth/mcp-keys.ts"), "utf8");
  m = m.replace(/^import\s+["']server-only["'];?\s*$/m, ""); // server-only is a build-time barrier only
  // mcp-keys.ts's only runtime import from the barrel is normalizeTier (Tier is type-only).
  m = m.replace(/^import\s+\{[^}]*\}\s+from\s+["']@\/prototype\/fixtures["'];?\s*$/m,
    'import { normalizeTier } from "./types.ts";');
  fs.writeFileSync(path.join(tmp, "mcp-keys.ts"), m);
  return import(path.join(tmp, "mcp-keys.ts"));
}
const { resolveMcpKeyCap } = await loadResolver();
const now = Date.now();

// ── Guard 2a: with NO store configured, the old demo strings (and anything) fail closed to public. ──
for (const k of ["codex_academic", "codex_commercial", "codex_public", "anything", ""]) {
  const cap = resolveMcpKeyCap(k, now, {});
  assert.equal(cap.tier, "public", `no-store: key ${JSON.stringify(k)} must resolve to public, got ${cap.tier}`);
}
console.log('[check:mcp-keys] ✓ with no MCP_API_KEYS store, every key (incl. the old "codex_academic") resolves to public.');

// ── Guard 2b: a hashed store entry grants its tier; expiry is honoured; unknown tier never escalates. ──
const goodKey = "prov-academic-key-x7";
const expiredKey = "prov-expired-key-x8";
const badTierKey = "prov-superadmin-key-x9";
const store = {
  [sha256Hex(goodKey)]: { tier: "academic", sub: "org:rutgers", expiresAt: now + 30 * 86_400_000 },
  [sha256Hex(expiredKey)]: { tier: "academic", sub: "org:stale", expiresAt: now - 1 },
  [sha256Hex(badTierKey)]: { tier: "superadmin", sub: "org:evil", expiresAt: null },
};
const env = { MCP_API_KEYS: JSON.stringify(store) };

assert.equal(resolveMcpKeyCap(goodKey, now, env).tier, "academic", "provisioned key must grant its configured tier");
assert.equal(resolveMcpKeyCap(goodKey, now, env).sub, "org:rutgers", "cap must carry the key owner's sub");
assert.equal(resolveMcpKeyCap(expiredKey, now, env).tier, "public", "expired key must collapse to public");
assert.equal(resolveMcpKeyCap(badTierKey, now, env).tier, "public", "unknown tier in store must normalize to public (never escalate)");
assert.equal(resolveMcpKeyCap("unlisted-key", now, env).tier, "public", "unknown key must resolve to public");
assert.equal(resolveMcpKeyCap(goodKey, now, { MCP_API_KEYS: "{ not json" }).tier, "public", "malformed store must fail closed");
console.log("[check:mcp-keys] ✓ shipped resolver: hashed grant honoured, expiry honoured, unknown tier/key/malformed-store all fail closed to public (DOC-B-003).");
