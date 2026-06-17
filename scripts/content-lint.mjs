#!/usr/bin/env node
// Citrate Atlas content linter (STYLE_GUIDE.md §9).
// ERROR (gate, fails the build): em-dashes. They are mechanically removable and must stay at zero.
// WARN (rewrite backlog): forbidden words + banned vocabulary. These need prose rewrites (S3..S10), so
//   they are reported but do not fail the build, UNTIL `--strict` is passed (flip on after the rewrites).
// Scans content/**/*.md + lib/content/confidential-store.ts. Code fences + inline code are excluded from
// the word checks (so code samples and identifiers do not trip the vocabulary rules); em-dashes are
// checked everywhere.
import fs from "node:fs";
import path from "node:path";

const STRICT = process.argv.includes("--strict");
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

const FORBIDDEN = [
  "revolutionary", "revolutionize", "cutting-edge", "bleeding-edge", "state-of-the-art", "disrupt",
  "disruptive", "game-changer", "paradigm shift", "unleash", "empower", "seamless", "robust",
  "scalable", "web3", "synergy", "leverage", "pivot", "deep-dive", "circle back", "enterprise-grade",
  "bank-grade", "military-grade", "ai-powered", "ai-first", "supercharge", "cutting edge",
];
const VOCAB = [
  "blockchain", "cryptocurrency", "crypto", "decentralized", "tokenomics", "defi", "nft",
  "smart wallet", "\\bwallet\\b", "\\bmining\\b", "\\bminer\\b",
];

function listFiles() {
  const out = [];
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === "_generated") continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".md")) out.push(p);
    }
  };
  walk(path.join(ROOT, "content"));
  const store = path.join(ROOT, "lib/content/confidential-store.ts");
  if (fs.existsSync(store)) out.push(store);
  return out;
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, "").replace(/`[^`]*`/g, "");
}
function lineOf(text, idx) { return text.slice(0, idx).split("\n").length; }

let emErrors = 0, warns = 0;
const emFiles = [];
const wordHits = {};

for (const f of listFiles()) {
  const rel = path.relative(ROOT, f);
  const raw = fs.readFileSync(f, "utf8");

  // em-dashes everywhere (U+2014)
  const em = [...raw.matchAll(/—/g)];
  if (em.length) { emErrors += em.length; emFiles.push(`${rel}: ${em.length}`); }

  // word checks on prose only
  const prose = stripCode(raw).toLowerCase();
  for (const term of [...FORBIDDEN, ...VOCAB]) {
    const re = new RegExp(term.includes("\\b") ? term : `\\b${term.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}\\b`, "g");
    const n = (prose.match(re) || []).length;
    if (n) { wordHits[term] = (wordHits[term] || 0) + n; warns += n; }
  }
}

console.log(`[content-lint] em-dashes (ERROR gate): ${emErrors}`);
if (emFiles.length) emFiles.slice(0, 40).forEach((l) => console.log("   " + l));
console.log(`[content-lint] forbidden/vocabulary (${STRICT ? "ERROR" : "WARN, rewrite backlog"}): ${warns}`);
const sorted = Object.entries(wordHits).sort((a, b) => b[1] - a[1]);
sorted.slice(0, 30).forEach(([t, n]) => console.log(`   ${n.toString().padStart(4)}  ${t}`));

const fail = emErrors > 0 || (STRICT && warns > 0);
if (fail) {
  console.error(`[content-lint] FAIL (${emErrors} em-dashes${STRICT ? `, ${warns} word findings` : ""}).`);
  process.exit(1);
}
console.log("[content-lint] OK (em-dash gate green" + (STRICT ? " + strict word checks" : "") + ").");
