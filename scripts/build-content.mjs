#!/usr/bin/env node
// Codex content build — compiles the markdown files under content/ (the staged, code-audited pages)
// into a generated TS module the app imports: CONTENT_DOCS (slug -> Doc) + CONTENT_NAV (sidebar tree).
//
// This is the S1 "hybrid content pipeline" in prototype form: authored/transcluded MD -> typed docs.
// Confidential bodies are never authored into content/, so nothing confidential enters the bundle here.
// Run: `node scripts/build-content.mjs` (also runs on prebuild/predev).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT_DIR = path.join(ROOT, "content");
const OUT_DIR = path.join(CONTENT_DIR, "_generated");
const OUT_FILE = path.join(OUT_DIR, "content.ts");

const TIER_RANK = { public: 0, commercial: 1, academic: 2, confidential: 3 };
const SECTION_LABEL = {
  start: "Start Here", chain: "Chain Core", contracts: "Smart Contracts", sdks: "SDKs & APIs",
  aa: "Account Abstraction & Identity", compute: "Compute & Inference", apps: "Apps & dApps",
  operators: "Node Operators", research: "Federated Learning & Research", methodology: "Methodology & SOPs",
};
const SECTION_ORDER = ["start", "chain", "contracts", "sdks", "aa", "compute", "apps", "operators", "research", "methodology"];

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "_generated") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (e.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function slugify(s) {
  return s.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
}

function parseFrontmatter(raw) {
  if (!raw.startsWith("---")) return { fm: {}, body: raw };
  const end = raw.indexOf("\n---", 3);
  if (end === -1) return { fm: {}, body: raw };
  const fmBlock = raw.slice(3, end).trim();
  const body = raw.slice(end + 4).replace(/^\s*\n/, "");
  const fm = {};
  for (const line of fmBlock.split("\n")) {
    const m = /^([a-zA-Z0-9_]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith("[")) continue; // skip arrays (e.g. surfaces) — not needed for rendering
    v = v.replace(/^["']|["']$/g, "");
    fm[m[1]] = v;
  }
  return { fm, body };
}

function normalizeTier(t) {
  const s = (t || "").toLowerCase();
  if (s.includes("confidential")) return "confidential";
  if (s.includes("academic")) return "academic";
  if (s.includes("commercial")) return "commercial"; // also covers commercial.kyc
  return "public";
}

function toc(body) {
  const items = [];
  for (const line of body.split("\n")) {
    const m = /^(##|###)\s+(.*)$/.exec(line);
    if (m) items.push({ depth: m[1].length, text: m[2].trim(), anchor: slugify(m[2]) });
  }
  return items;
}

const files = fs.existsSync(CONTENT_DIR) ? walk(CONTENT_DIR) : [];
const docs = {};
const sections = {}; // section -> { leaves: [], tutorials: [] }

for (const file of files) {
  const raw = fs.readFileSync(file, "utf8");
  const { fm, body } = parseFrontmatter(raw);
  const rel = "/" + path.relative(CONTENT_DIR, file).replace(/\.md$/, "");
  const slug = (fm.codex_slug || rel).trim();
  const tier = normalizeTier(fm.tier);
  const orgRaw = (fm.org_scope || "").trim();
  const orgId = orgRaw && orgRaw !== "~" && orgRaw.toLowerCase() !== "none" ? orgRaw : null;
  const title = fm.title || (body.match(/^#\s+(.*)$/m)?.[1] ?? slug);

  docs[slug] = {
    slug, title, tier, orgId,
    sourceKind: fm.source_kind || "authored",
    source: fm.source || "codex",
    ...(fm.audited_against_sha ? { syncedSha: fm.audited_against_sha } : {}),
    toc: toc(body),
    body,
  };

  const parts = slug.replace(/^\//, "").split("/");
  const section = parts[0] || "misc";
  const isTut = parts.includes("tutorials");
  (sections[section] ||= { leaves: [], tutorials: [] });
  const node = { id: slug, title, slug, tier, ...(orgId ? { orgId } : {}), kind: isTut ? "tutorials" : "doc" };
  (isTut ? sections[section].tutorials : sections[section].leaves).push(node);
}

// Build the nav: one group per section, non-tutorial leaves first, tutorial leaves last.
const orderedSections = Object.keys(sections).sort((a, b) => {
  const ia = SECTION_ORDER.indexOf(a), ib = SECTION_ORDER.indexOf(b);
  return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});
const nav = orderedSections.map((section) => {
  const { leaves, tutorials } = sections[section];
  const children = [...leaves.sort((a, b) => a.title.localeCompare(b.title)),
                    ...tutorials.sort((a, b) => a.title.localeCompare(b.title))];
  const groupTier = children.reduce(
    (acc, c) => (TIER_RANK[c.tier] < TIER_RANK[acc] ? c.tier : acc), "confidential");
  return { id: `grp-${section}`, title: SECTION_LABEL[section] || section, tier: groupTier, kind: "group", children };
});

fs.mkdirSync(OUT_DIR, { recursive: true });
const banner = `// AUTO-GENERATED by scripts/build-content.mjs — do not edit. Run \`node scripts/build-content.mjs\`.\n`;
const out =
  banner +
  `import type { Doc, NavNode } from "@/prototype/fixtures";\n\n` +
  `export const CONTENT_DOCS: Record<string, Doc> = ${JSON.stringify(docs, null, 0)};\n\n` +
  `export const CONTENT_NAV: NavNode[] = ${JSON.stringify(nav, null, 0)};\n`;
fs.writeFileSync(OUT_FILE, out);
console.log(`[build-content] ${files.length} pages → ${path.relative(ROOT, OUT_FILE)} (${nav.length} sections)`);
