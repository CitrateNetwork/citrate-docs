#!/usr/bin/env node
// S3 invariant gate — proves NO gated content reached the client bundle.
//
// Two invariants, both scanned over .next/static (the browser-downloadable assets), exit 1 on any hit:
//   (S3)        no Confidential sentinel string in any client asset;
//   (DOC-B-001) no NON-public content body appears verbatim in any client asset.
//
// DOC-B-004: the detection logic (probe + findLeaks) is EXPORTED and the real scan is guarded behind a
// main check, so scripts/check-bundle-gate-selftest.mjs can drive the *same* code against a synthetic
// leak and prove the gate can be made to fail. A gate that cannot fail is not a gate.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SENTINEL = "CITRATE-CONFIDENTIAL-RUNTIME-ONLY";

export function walk(d) {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

/** Read every file under a dir as [relPath, text] (binary/asset reads fall back to ""). */
export function staticBlobs(dir) {
  return walk(dir).map((f) => {
    let txt = "";
    try { txt = fs.readFileSync(f, "utf8"); } catch { /* binary/asset — skip */ }
    return [path.relative(process.cwd(), f), txt];
  });
}

export function extractExport(src, name) {
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

/**
 * Source of truth for the gated bodies: the SERVER-ONLY content/_generated/content-bodies.ts (post-fix).
 * Fallback: the gated bodies still embedded in content/_generated/content.ts (the pre-fix RED structure),
 * so this same check goes RED against a bundle built from the vulnerable generator.
 */
export function gatedBodies() {
  const bodiesFile = path.resolve("content/_generated/content-bodies.ts");
  if (fs.existsSync(bodiesFile)) {
    const map = extractExport(fs.readFileSync(bodiesFile, "utf8"), "CONTENT_BODIES");
    if (map) return map; // { slug: body } for every non-public doc
  }
  const metaFile = path.resolve("content/_generated/content.ts");
  if (!fs.existsSync(metaFile)) return {};
  const docs = extractExport(fs.readFileSync(metaFile, "utf8"), "CONTENT_DOCS") || {};
  const out = {};
  for (const [slug, d] of Object.entries(docs)) {
    if (d && d.tier && d.tier !== "public" && d.body) out[slug] = d.body;
  }
  return out;
}

/** A stable, distinctive prose probe from a body: the middle prose line, trimmed to 60 chars. */
export function probe(body) {
  const lines = String(body || "")
    .split("\n")
    .filter((l) => l.length > 80 && !l.startsWith("#") && !l.startsWith("|") && !l.startsWith(">"));
  if (!lines.length) return null;
  return lines[Math.floor(lines.length / 2)].slice(10, 70);
}

/** Core detector (shared by the real scan AND the self-test): which gated bodies appear in the blobs. */
export function findLeaks(bodies, blobs) {
  const leaks = [];
  let probed = 0;
  for (const [slug, body] of Object.entries(bodies)) {
    const p = probe(body);
    if (!p) continue;
    probed++;
    const hit = blobs.find(([, txt]) => txt.includes(p));
    if (hit) leaks.push([slug, hit[0]]);
  }
  return { probed, leaks };
}

function runMain() {
  const DIR = path.resolve(".next/static");
  if (!fs.existsSync(DIR)) {
    console.error(`[verify:bundle] ${DIR} not found — run \`next build\` first.`);
    process.exit(2);
  }
  const blobs = staticBlobs(DIR);

  // (S3) sentinel scan
  const hits = blobs.filter(([, txt]) => txt.includes(SENTINEL)).map(([rel]) => rel);
  if (hits.length) {
    console.error(`[verify:bundle] ❌ Confidential sentinel found in ${hits.length} client asset(s):`);
    for (const h of hits) console.error("   " + h);
    console.error("   Confidential content MUST NOT enter the client bundle (S3 invariant). Failing.");
    process.exit(1);
  }
  console.log("[verify:bundle] ✓ zero Confidential content in .next/static — gateway invariant holds.");

  // (DOC-B-001) every gated body must be absent verbatim from the client bundle.
  const { probed, leaks } = findLeaks(gatedBodies(), blobs);
  if (leaks.length) {
    console.error(`[verify:bundle] ❌ ${leaks.length} GATED content body/bodies found verbatim in .next/static:`);
    for (const [slug, file] of leaks) console.error(`   ${slug}  →  ${file}`);
    console.error("   Non-public bodies MUST be served only through /api/content (DOC-B-001). Failing.");
    process.exit(1);
  }
  console.log(`[verify:bundle] ✓ ${probed} gated content bodies probed — zero verbatim in .next/static (DOC-B-001).`);
}

// Run the real scan only when invoked directly (so the self-test can import the detectors safely).
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runMain();
}
