#!/usr/bin/env node
// DOC-B-005 tripwire — the access helpers must evaluate entitlement expiry against the REAL clock, never a
// frozen fixture constant. Run: `node --experimental-strip-types scripts/check-access-clock.mjs`.
//
// The bug: canRead/resolveTier/visibility/filterNav (and the mockApi wrappers) defaulted `now` to
// FIXED_NOW (2026-05-28), and every client call-site omitted the argument — so an expired grant kept
// reading as live forever on the client. The fix makes `now` a REQUIRED parameter (omission is a type
// error, enforced by `npm run typecheck`) and passes Date.now() at every live call-site.
//
// Two guards:
//   1. Behavioral: with a session whose expiresAt is already in the past, resolveTier collapses to the
//      base tier and canRead denies — WHEN evaluated at the real clock. A permanent RED WITNESS re-runs
//      the exact same helper at FIXED_NOW (the old default) and asserts the expired grant reads as LIVE
//      there — proving the frozen default was the leak (RC-9).
//   2. Structural: neither the fixture chokepoint (viewers.ts) nor the mockApi barrel (index.ts) may carry
//      a frozen-clock default (`now = NOW` / `now = FIXED_NOW`) on any access helper. With the default
//      gone and the type required, tsc guarantees every call-site supplies a clock.
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");

// ── Load the REAL viewers.ts chokepoint (copy + rewrite its extensionless import for node strip-types). ──
async function loadViewers() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "atlas-clock-"));
  fs.copyFileSync(path.join(ROOT, "prototype/fixtures/types.ts"), path.join(tmp, "types.ts"));
  let v = fs.readFileSync(path.join(ROOT, "prototype/fixtures/viewers.ts"), "utf8");
  // types.ts's only runtime exports used by viewers.ts are TIER_RANK + normalizeTier; the rest are types.
  v = v.replace(/^import\s+\{[^}]*\}\s+from\s+["']\.\/types["'];?\s*$/m,
    'import { TIER_RANK, normalizeTier } from "./types.ts";');
  fs.writeFileSync(path.join(tmp, "viewers.ts"), v);
  return import(path.join(tmp, "viewers.ts"));
}

const { canRead, resolveTier, FIXED_NOW } = await loadViewers();

const realNow = Date.now();
const expiredSession = {
  required: true, authenticated: true, sub: "uuid:tob-auditor-21", kycStatus: "verified",
  entitlement: { tier: "confidential", orgId: null, citrateRole: "auditor_tob", expiresAt: realNow - 1 },
};

// ── Guard 1a: RED WITNESS — evaluating the expired grant at FIXED_NOW (the old frozen default) reads LIVE.
assert.ok(FIXED_NOW < expiredSession.entitlement.expiresAt,
  "RED witness precondition: FIXED_NOW must predate the grant's expiry for the witness to be meaningful.");
assert.equal(resolveTier(expiredSession, FIXED_NOW), "confidential",
  "RED witness failed: at the frozen FIXED_NOW an expired grant should still read as confidential.");
assert.equal(canRead(expiredSession, { tier: "confidential" }, FIXED_NOW), true,
  "RED witness failed: at the frozen FIXED_NOW canRead should still grant the expired auditor.");
console.log(`[check:access-clock] RED witness ✓ — at FIXED_NOW (${new Date(FIXED_NOW).toISOString()}) the expired auditor reads confidential/true (the frozen-default leak).`);

// ── Guard 1b: GREEN — at the real clock the same expired grant collapses to public and is denied. ──
assert.equal(resolveTier(expiredSession, realNow), "public",
  "resolveTier must collapse an expired grant to public at the real clock.");
assert.equal(canRead(expiredSession, { tier: "confidential" }, realNow), false,
  "canRead must deny an expired grant at the real clock.");
console.log(`[check:access-clock] ✓ at the real clock (${new Date(realNow).toISOString()}) the expired auditor reads public/false (DOC-B-005).`);

// ── Guard 2: structural — no frozen-clock default remains on any access helper. ──
const FROZEN_DEFAULT_RE = /\bnow\s*=\s*(NOW|FIXED_NOW)\b/;
for (const rel of ["prototype/fixtures/viewers.ts", "prototype/fixtures/index.ts"]) {
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");
  const bad = src.split("\n")
    .map((l, i) => [i + 1, l])
    .filter(([, l]) => FROZEN_DEFAULT_RE.test(l));
  assert.equal(bad.length, 0,
    `${rel} still defaults an access helper's clock to a frozen constant (DOC-B-005): ` +
    bad.map(([n, l]) => `L${n}: ${l.trim()}`).join(" | "));
}
console.log("[check:access-clock] ✓ no frozen-clock default remains; `now` is a required parameter (tsc enforces every call-site supplies it).");
