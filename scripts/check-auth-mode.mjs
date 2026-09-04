#!/usr/bin/env node
// DOC-B-002 tripwire — the auth-mode resolver must FAIL CLOSED and the client must not diverge from
// the server. Run: `node --experimental-strip-types scripts/check-auth-mode.mjs` (wired as npm run
// check:auth-mode / part of `npm run verify:bundle`).
//
// Two guards:
//   1. Behavioral: across the cross-product {unset,"","dev","mock","oidc","OIDC","garbage"} × NODE_ENV,
//      the SHARED resolver (lib/auth/auth-mode.ts, used by BOTH providers.tsx and session.ts) must never
//      select the fixture tier-switcher ("mock") except for the explicit, non-production "mock" flag.
//      A permanent RED WITNESS re-runs the exact pre-fix client resolver and asserts it VIOLATES the
//      contract — so this file is provably a tripwire, not decoration (RC-9).
//   2. Structural: providers.tsx and session.ts must both resolve the mode through the shared module and
//      must not carry an inline fail-open `=== "oidc" ? "oidc" : "dev"`. That divergence WAS the bug.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { resolveAuthMode } from "../lib/auth/auth-mode.ts";

const MODES = [undefined, "", "dev", "mock", "oidc", "OIDC", "garbage"];
const ENVS = ["development", "production", undefined];

// The fail-closed contract, independently spelled out (NOT reusing the impl):
function expected(m, nodeEnv, allowMock) {
  if (m === "oidc") return "oidc";
  if (m === "mock") {
    if (nodeEnv === "production" && allowMock !== "1") return "mock-disabled";
    return "mock";
  }
  return "oidc"; // unset / "" / "dev" / "OIDC" / garbage → the real verifying path, never the switcher
}

// The exact pre-fix client resolver (components/providers.tsx:15, RED). Fails OPEN to "dev".
function legacyFailOpenClient(env) {
  return env.NEXT_PUBLIC_AUTH_MODE === "oidc" ? "oidc" : "dev";
}

// "dev" here is the client's label for "use the fixture tier-switcher" — i.e. the elevated/bypass path.
const isSwitcher = (v) => v === "dev" || v === "mock";

const cases = [];
for (const m of MODES) for (const nodeEnv of ENVS) for (const allowMock of [undefined, "1"]) {
  const env = {};
  if (m !== undefined) env.NEXT_PUBLIC_AUTH_MODE = m;
  if (nodeEnv !== undefined) env.NODE_ENV = nodeEnv;
  if (allowMock !== undefined) env.ALLOW_MOCK_AUTH = allowMock;
  cases.push({ env, m, nodeEnv, allowMock });
}

// ── Guard 1a: RED WITNESS — the legacy client resolver must break the fail-closed contract. ──
const legacyViolations = cases.filter(({ env, m, nodeEnv }) => {
  // A violation = the resolver hands out the fixture switcher when the contract forbids it.
  const contract = expected(m, nodeEnv, env.ALLOW_MOCK_AUTH);
  return isSwitcher(legacyFailOpenClient(env)) && !isSwitcher(contract);
});
assert.ok(
  legacyViolations.length > 0,
  "RED witness failed to reproduce: the pre-fix client resolver should violate the fail-closed contract.",
);
console.log(`[check:auth-mode] RED witness ✓ — legacy fail-open resolver violates the contract in ${legacyViolations.length}/${cases.length} cases (e.g. NEXT_PUBLIC_AUTH_MODE unset → "dev" switcher).`);

// ── Guard 1b: the shipped shared resolver must satisfy the contract for every case (client === server). ──
const realViolations = [];
for (const { env, m, nodeEnv, allowMock } of cases) {
  const got = resolveAuthMode(env);
  const want = expected(m, nodeEnv, allowMock);
  if (got !== want) realViolations.push({ env, got, want });
  // Hard fail-closed invariant: the fixture switcher is reachable ONLY via the explicit "mock" flag, and
  // in production ONLY with the explicit ALLOW_MOCK_AUTH=1 staging opt-in. Unset / "dev" / garbage / the
  // production default can NEVER reach it.
  if (isSwitcher(got)) {
    assert.equal(m, "mock", `resolver selected the fixture switcher for NEXT_PUBLIC_AUTH_MODE=${JSON.stringify(m)} (must fail closed)`);
    if (nodeEnv === "production") {
      assert.equal(allowMock, "1", "resolver selected the fixture switcher in production without the explicit ALLOW_MOCK_AUTH=1 opt-in (must fail closed)");
    }
  }
}
if (realViolations.length) {
  console.error(`[check:auth-mode] ❌ shared resolver diverged from the fail-closed contract in ${realViolations.length} case(s):`);
  for (const v of realViolations) console.error(`   env=${JSON.stringify(v.env)} got=${v.got} want=${v.want}`);
  process.exit(1);
}
console.log(`[check:auth-mode] ✓ shared resolver satisfies the fail-closed contract across all ${cases.length} cases (DOC-B-002).`);

// ── Guard 2: structural — client and server both route through the shared module; no inline fail-open. ──
const FAIL_OPEN_RE = /===\s*["']oidc["']\s*\?\s*["']oidc["']\s*:\s*["']dev["']/;
for (const [file, needle] of [
  ["components/providers.tsx", "auth-mode"],
  ["lib/auth/session.ts", "auth-mode"],
]) {
  const src = fs.readFileSync(path.resolve(file), "utf8");
  assert.ok(src.includes(needle), `${file} must resolve the auth mode through lib/auth/auth-mode (shared client+server resolver).`);
  assert.ok(!FAIL_OPEN_RE.test(src), `${file} still contains the fail-open '=== "oidc" ? "oidc" : "dev"' resolver (DOC-B-002).`);
}
console.log("[check:auth-mode] ✓ providers.tsx and session.ts both use the shared resolver; no inline fail-open remains.");
