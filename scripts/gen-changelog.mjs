#!/usr/bin/env node
// Generate the federation changelog page from the memory graph. Queries the
// mem-gateway MCP surface (the same one that powers "Ask Almanac") with
// `memory.recall` per repo for recent-history storylines, and writes a real nav
// page at content/start/_generated/changelog.md.
//
// Runs in prebuild, so each deploy regenerates it with current activity. It is
// fail-soft: with no MEM_GATEWAY_URL / MEM_CONNECT_SECRET (e.g. a local build)
// or an unreachable gateway, it writes a graceful placeholder rather than
// failing the build. Protocol mirrors lib/ai/memory.ts.
import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT_DIR = path.join(ROOT, "content", "start", "_generated");
const OUT = path.join(OUT_DIR, "changelog.md");

const MEM_URL = process.env.MEM_GATEWAY_URL;
const SECRET = process.env.MEM_CONNECT_SECRET;
const SUB = process.env.MEM_SERVICE_SUB || "svc:atlas";
// PUBLIC-tier repos only. This page is tier: public, so it must never draw from
// confidential-tier repos (citrate-security / -commercial / -compliance /
// -federation per DEFAULT_REPO_TIERS in lib/ai/memory.ts). Keep this list to
// repos whose memory is safe to surface openly.
const REPOS = (
  process.env.CHANGELOG_REPOS ||
  "citrate-chain,citrate-core,citrate-inference-gateway,citrate-identity,citrate-docs,citrate-sdk-js"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
// Defense in depth: never recall a confidential-tier repo onto this public page,
// even if CHANGELOG_REPOS is overridden to include one.
const CONFIDENTIAL = new Set([
  "citrate-security",
  "citrate-commercial",
  "citrate-compliance",
  "citrate-federation",
]);
const SAFE_REPOS = REPOS.filter((r) => !CONFIDENTIAL.has(r));
const BUDGET = Number(process.env.CHANGELOG_BUDGET || 10);

const REPO_LABEL = {
  "citrate-chain": "Network and node",
  "citrate-core": "Citrate Core (desktop)",
  "citrate-inference-gateway": "Inference and compute",
  "citrate-identity": "Identity and Keyring",
  "citrate-docs": "Documentation",
  "citrate-sdk-js": "SDKs",
};

const FRONTMATTER = `---
title: Changelog
codex_slug: /start/changelog
tier: public
org_scope: ~
source_kind: transcluded
source: mem-gateway memory.recall over the federation memory graph
surfaces: [START-changelog]
audited_against_sha: live
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 90
---
`;

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/=+$/g, "").replace(/\+/g, "-").replace(/\//g, "_");

function connectToken(sub, secret, ttl = 120) {
  const header = b64url(Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const payload = b64url(Buffer.from(JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + ttl })));
  const sig = b64url(createHmac("sha256", secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

// recall lines (no score): `  01b5a444f9 [doc] citrate-federation ...`
const RECALL_RE = /^\s*([0-9a-f]{6,})\s+\[([^\]]+)\]\s+(.*)$/;
// House style + safety: drop em-dashes, collapse whitespace, cap length.
const clean = (s) => s.replace(/—/g, "-").replace(/\s+/g, " ").trim().slice(0, 200);

async function recall(repo, token) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(`${MEM_URL.replace(/\/$/, "")}/mcp/u/${encodeURIComponent(SUB)}`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: { name: "memory.recall", arguments: { repo, budget: BUDGET } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const json = await res.json();
    const text = json?.result?.content?.map((c) => c.text ?? "").join("\n") ?? "";
    return text
      .split("\n")
      .map((line) => RECALL_RE.exec(line))
      .filter(Boolean)
      .map((m) => ({ id: m[1].slice(0, 10), kind: clean(m[2]), title: clean(m[3]) }))
      .filter((e) => e.title);
  } catch {
    clearTimeout(t);
    return [];
  }
}

function placeholder() {
  return `${FRONTMATTER}
The changelog draws recent activity from the Citrate memory graph, the same
signed, code-anchored knowledge store that powers Ask Almanac. It is regenerated
on every deploy from \`memory.recall\` across the federation repositories.

Live entries appear here once the docs build can reach the memory gateway. To
see current activity in the meantime, ask Ask Almanac what changed recently in a
given area, or browse the source repositories directly.
`;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!MEM_URL || !SECRET) {
    fs.writeFileSync(OUT, placeholder());
    console.log("[gen-changelog] no MEM_GATEWAY_URL/MEM_CONNECT_SECRET; wrote placeholder changelog.");
    return;
  }
  const token = connectToken(SUB, SECRET);
  const sections = [];
  let total = 0;
  for (const repo of SAFE_REPOS) {
    const entries = await recall(repo, token);
    if (!entries.length) continue;
    total += entries.length;
    const label = REPO_LABEL[repo] || repo;
    const rows = entries.map((e) => `- **${e.kind}** ${e.title}  \`${e.id}\``).join("\n");
    sections.push(`## ${label}\n\n${rows}\n`);
  }

  if (!total) {
    fs.writeFileSync(OUT, placeholder());
    console.log("[gen-changelog] gateway returned no entries; wrote placeholder changelog.");
    return;
  }

  const body = `${FRONTMATTER}
Recent activity across the Citrate federation, drawn from the memory graph (the
signed, code-anchored knowledge store behind Ask Almanac) via \`memory.recall\`.
This page is regenerated on every deploy. Each line is one recalled item with
its kind and a short id.

${sections.join("\n")}`;
  fs.writeFileSync(OUT, body);
  console.log(`[gen-changelog] wrote ${path.relative(ROOT, OUT)} (${total} entries across ${sections.length} areas)`);
}

main();
