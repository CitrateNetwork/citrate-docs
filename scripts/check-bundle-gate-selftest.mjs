#!/usr/bin/env node
// DOC-B-004 tripwire (meta-check) — proves the bundle-leak gate can actually FAIL.
// Run: `node scripts/check-bundle-gate-selftest.mjs`.
//
// The finding: the repo's named "bundle-leak proof" grepped only for a sentinel string that, by
// construction, appears only in DEMO stand-in Confidential bodies — so in the deployment it is meant to
// protect (real bodies fetched at request time, no sentinel) the grep has nothing to find and returns
// green unconditionally, AND it was scoped to `confidential` only, saying nothing about commercial/
// academic. It printed green on the exact build that leaked 350 KB of gated content.
//
// This meta-check exercises the SAME detector the real gate uses (findLeaks/probe from
// check-no-confidential.mjs) and asserts:
//   (RED)   a gated body deliberately inlined into a synthetic client asset IS detected (the gate bites);
//   (GREEN) the same body absent from the assets is NOT flagged (no false positive);
// so the gate is provably capable of failing — which is the whole point (RC-9).
import assert from "node:assert/strict";
import { probe, findLeaks } from "./check-no-confidential.mjs";

// A representative gated body: markdown heading + a long prose line the probe will latch onto.
const gatedBody =
  "# The TLA+ formal specification corpus\n\n" +
  "This is the machine-checked half of how Citrate establishes that its protocol is correct: a body of " +
  "TLA+ specifications, each stating the safety properties of one state machine and checked with TLC.\n";
const bodies = { "/research/tla": gatedBody };

// The probe must extract a stable prose line (otherwise the detector can never fire on this body).
const p = probe(gatedBody);
assert.ok(p && p.length > 0, "probe must extract a prose line from a gated body");

// ── RED: inline the gated body into a synthetic client chunk → the gate MUST report a leak. ──
const leakingBlobs = [
  ["_next/static/chunks/app-real.js", "export const x=1; /* unrelated */"],
  ["_next/static/chunks/leak.js", `globalThis.__DOC=${JSON.stringify(gatedBody)};`],
];
const red = findLeaks(bodies, leakingBlobs);
assert.equal(red.leaks.length, 1, "the gate MUST detect a gated body inlined into a client asset (it can fail)");
assert.equal(red.leaks[0][0], "/research/tla", "the detected leak must name the offending slug");
console.log(`[bundle-gate-selftest] RED ✓ — an inlined gated body is caught: ${red.leaks[0][0]} → ${red.leaks[0][1]} (the gate can fail).`);

// ── GREEN: the same body absent from the assets → zero leaks (no false positive). ──
const cleanBlobs = [
  ["_next/static/chunks/app-real.js", "export const x=1;"],
  ["_next/static/chunks/other.js", "console.log('nothing gated here');"],
];
const green = findLeaks(bodies, cleanBlobs);
assert.equal(green.leaks.length, 0, "a clean bundle must produce zero leaks");
assert.equal(green.probed, 1, "the body must still be probed even when clean");
console.log("[bundle-gate-selftest] GREEN ✓ — a clean bundle yields zero leaks; the probe still ran.");

console.log("[bundle-gate-selftest] ✓ the bundle-leak gate is provably capable of failing (DOC-B-004).");
