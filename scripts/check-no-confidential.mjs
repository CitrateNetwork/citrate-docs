#!/usr/bin/env node
// S3 invariant gate — proves NO Confidential content reached the client bundle.
// Scans .next/static (the browser-downloadable assets) for the Confidential sentinel; exits 1 if found.
// The sentinel legitimately appears in .next/server (the gateway route handler) — that is server-only and
// never shipped to the browser, so we scan ONLY .next/static. (PLANSET/03 `ConfidentialNeverInBuild`.)
import fs from "node:fs";
import path from "node:path";

const SENTINEL = "CITRATE-CONFIDENTIAL-RUNTIME-ONLY";
const DIR = path.resolve(".next/static");

if (!fs.existsSync(DIR)) {
  console.error(`[verify:bundle] ${DIR} not found — run \`next build\` first.`);
  process.exit(2);
}

function walk(d) {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

const hits = [];
for (const f of walk(DIR)) {
  let txt;
  try { txt = fs.readFileSync(f, "utf8"); } catch { continue; }
  if (txt.includes(SENTINEL)) hits.push(path.relative(process.cwd(), f));
}

if (hits.length) {
  console.error(`[verify:bundle] ❌ Confidential sentinel found in ${hits.length} client asset(s):`);
  for (const h of hits) console.error("   " + h);
  console.error("   Confidential content MUST NOT enter the client bundle (S3 invariant). Failing.");
  process.exit(1);
}
console.log("[verify:bundle] ✓ zero Confidential content in .next/static — gateway invariant holds.");
