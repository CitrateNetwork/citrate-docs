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

const STATIC_FILES = walk(DIR);
const STATIC_BLOBS = STATIC_FILES.map((f) => {
  let txt = "";
  try { txt = fs.readFileSync(f, "utf8"); } catch { /* binary/asset — skip */ }
  return [path.relative(process.cwd(), f), txt];
});

const hits = [];
for (const [rel, txt] of STATIC_BLOBS) {
  if (txt.includes(SENTINEL)) hits.push(rel);
}

if (hits.length) {
  console.error(`[verify:bundle] ❌ Confidential sentinel found in ${hits.length} client asset(s):`);
  for (const h of hits) console.error("   " + h);
  console.error("   Confidential content MUST NOT enter the client bundle (S3 invariant). Failing.");
  process.exit(1);
}
console.log("[verify:bundle] ✓ zero Confidential content in .next/static — gateway invariant holds.");

// ── DOC-B-001 tripwire ──────────────────────────────────────────────────────────────────────────────
// Every NON-public (commercial/academic/confidential) content-pipeline body must be served at request
// time from the /api/content gateway and must NOT appear verbatim in any browser-downloadable asset.
// Source of truth for the gated bodies: the SERVER-ONLY content/_generated/content-bodies.ts (post-fix).
// Fallback: the gated bodies still embedded in content/_generated/content.ts (the pre-fix RED structure),
// so this same check goes RED against a bundle built from the vulnerable generator.
function extractExport(src, name) {
  const key = `export const ${name}`;
  const at = src.indexOf(key);
  if (at === -1) return null;
  const eq = src.indexOf("=", at);
  let b = src.slice(eq + 1);
  const nextExport = b.indexOf("\nexport const");
  if (nextExport !== -1) b = b.slice(0, nextExport);
  b = b.trim();
  if (b.endsWith(";")) b = b.slice(0, -1);
  try { return JSON.parse(b); } catch { return null; }
}

function gatedBodies() {
  const bodiesFile = path.resolve("content/_generated/content-bodies.ts");
  if (fs.existsSync(bodiesFile)) {
    const map = extractExport(fs.readFileSync(bodiesFile, "utf8"), "CONTENT_BODIES");
    if (map) return map; // { slug: body } for every non-public doc
  }
  // Fallback: pull non-public bodies out of the client meta module (pre-fix RED structure).
  const metaFile = path.resolve("content/_generated/content.ts");
  if (!fs.existsSync(metaFile)) return {};
  const docs = extractExport(fs.readFileSync(metaFile, "utf8"), "CONTENT_DOCS") || {};
  const out = {};
  for (const [slug, d] of Object.entries(docs)) {
    if (d && d.tier && d.tier !== "public" && d.body) out[slug] = d.body;
  }
  return out;
}

// A stable, distinctive prose probe from a body: the middle prose line, trimmed to 60 chars.
function probe(body) {
  const lines = String(body || "")
    .split("\n")
    .filter((l) => l.length > 80 && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith(">"));
  if (!lines.length) return null;
  return lines[Math.floor(lines.length / 2)].slice(10, 70);
}

const bodies = gatedBodies();
const leaks = [];
let probed = 0;
for (const [slug, body] of Object.entries(bodies)) {
  const p = probe(body);
  if (!p) continue;
  probed++;
  const hit = STATIC_BLOBS.find(([, txt]) => txt.includes(p));
  if (hit) leaks.push([slug, hit[0]]);
}

if (leaks.length) {
  console.error(`[verify:bundle] ❌ ${leaks.length} GATED content body/bodies found verbatim in .next/static:`);
  for (const [slug, file] of leaks) console.error(`   ${slug}  →  ${file}`);
  console.error("   Non-public bodies MUST be served only through /api/content (DOC-B-001). Failing.");
  process.exit(1);
}
console.log(`[verify:bundle] ✓ ${probed} gated content bodies probed — zero verbatim in .next/static (DOC-B-001).`);
