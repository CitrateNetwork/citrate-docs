/**
 * Nav tree (the tier-aware sidebar), sample docs across every tier/state, disclosures, search results.
 *
 * The nav is a representative slice of PLANSET/06_INFORMATION_ARCHITECTURE.md — enough to exercise every
 * visibility state (public, commercial, C·kyc, academic, confidential-hidden, org-scoped). Every section
 * carries a Tutorials subsection. Docs cover: authored, transcluded (last-synced), visible-locked,
 * confidential + disclosure, embargoed, versioned.
 */

import { Disclosure, Doc, NavNode, SearchResult } from "./types";
import { FIXED_NOW } from "./viewers";

const DAY = 86_400_000;

/* ───────────────────────────────────────────────────────────────────────────── Nav tree */

export const NAV: NavNode[] = [
  {
    id: "start", title: "Start Here", tier: "public", kind: "group", icon: "sparkles",
    children: [
      { id: "start-what", title: "What Citrate is", slug: "/start/what-is-citrate", tier: "public", kind: "doc" },
      { id: "start-primer", title: "GhostDAG / LVM / SALT primer", slug: "/start/primer", tier: "public", kind: "doc" },
      { id: "start-agentile", title: "Agentile methodology", slug: "/start/agentile", tier: "public", kind: "doc" },
      { id: "start-tut", title: "Tutorials", slug: "/start/tutorials", tier: "public", kind: "tutorials" },
    ],
  },
  {
    id: "chain", title: "Chain Core", tier: "public", kind: "group", icon: "layers",
    children: [
      { id: "chain-consensus", title: "Consensus (GhostDAG)", slug: "/chain/consensus", tier: "public", kind: "doc" },
      { id: "chain-lvm", title: "Execution (LVM)", slug: "/chain/lvm", tier: "public", kind: "doc" },
      { id: "chain-precompiles", title: "Precompiles & Opcodes", slug: "/chain/precompiles", tier: "public", kind: "doc" },
      { id: "chain-zkp", title: "ZKP / inference precompiles", slug: "/chain/precompiles-zkp", tier: "confidential", kind: "doc" },
      { id: "chain-rpc", title: "JSON-RPC reference", slug: "/chain/rpc", tier: "public", kind: "doc" },
      { id: "chain-cli", title: "CLI (citrate-cli)", slug: "/chain/cli", tier: "public", kind: "doc" },
      { id: "chain-tut", title: "Tutorials", slug: "/chain/tutorials", tier: "public", kind: "tutorials" },
    ],
  },
  {
    id: "sdks", title: "SDKs & APIs", tier: "public", kind: "group", icon: "code",
    children: [
      { id: "sdk-js", title: "sdk-js (citrate-js)", slug: "/sdks/js", tier: "public", kind: "doc" },
      { id: "sdk-py", title: "sdk-python", slug: "/sdks/python", tier: "public", kind: "doc" },
      { id: "sdk-mkt", title: "marketplace-sdk", slug: "/sdks/marketplace", tier: "commercial", kind: "doc" },
      { id: "sdk-tut", title: "Tutorials", slug: "/sdks/tutorials", tier: "public", kind: "tutorials" },
    ],
  },
  {
    id: "compute", title: "Compute & Inference", tier: "commercial", kind: "group", icon: "cpu",
    children: [
      { id: "compute-node-agent", title: "Run node-agent (sell)", slug: "/compute/node-agent", tier: "commercial", kind: "doc" },
      { id: "compute-gateway", title: "Inference gateway", slug: "/compute/gateway", tier: "commercial", kind: "doc" },
      { id: "compute-tut", title: "Tutorials", slug: "/compute/tutorials", tier: "commercial", kind: "tutorials" },
    ],
  },
  {
    id: "research", title: "Federated Learning & Research", tier: "academic", kind: "group", icon: "flask",
    children: [
      { id: "research-paraconsistent", title: "Paraconsistent consensus", slug: "/research/paraconsistent", tier: "academic", kind: "doc" },
      { id: "research-papers", title: "Gradient Papers v3", slug: "/research/gradient-papers", tier: "academic", kind: "doc" },
      { id: "research-tla", title: "TLA+ corpus", slug: "/research/tla", tier: "academic", kind: "doc" },
      { id: "research-tut", title: "Tutorials", slug: "/research/tutorials", tier: "academic", kind: "tutorials" },
    ],
  },
  {
    id: "enterprise", title: "Enterprise & Compliance", tier: "commercial", kind: "group", icon: "building",
    children: [
      { id: "ent-procurement", title: "Procurement (MSA/SOW)", slug: "/enterprise/procurement", tier: "commercial", kind: "doc" },
      { id: "ent-defense_prime", title: "defense_prime — private space", slug: "/enterprise/defense_prime", tier: "commercial", orgId: "defense_prime", kind: "doc" },
      { id: "ent-compliance", title: "Compliance posture (full)", slug: "/enterprise/compliance-full", tier: "confidential", kind: "doc" },
      { id: "ent-tut", title: "Tutorials", slug: "/enterprise/tutorials", tier: "commercial", kind: "tutorials" },
    ],
  },
  {
    id: "sandboxes", title: "Sandboxes", tier: "public", kind: "group", icon: "play",
    children: [
      { id: "sb-dag", title: "GhostDAG blue-score", slug: "/sandboxes/dag", tier: "public", kind: "sandbox" },
      { id: "sb-relay", title: "Gasless relay", slug: "/sandboxes/relay", tier: "public", kind: "sandbox" },
      { id: "sb-x402", title: "x402 payment", slug: "/sandboxes/x402", tier: "public", kind: "sandbox" },
      { id: "sb-infer", title: "Inference gateway", slug: "/sandboxes/inference", tier: "public", kind: "sandbox" },
      { id: "sb-rpc", title: "RPC explorer", slug: "/sandboxes/rpc", tier: "public", kind: "sandbox" },
    ],
  },
  {
    id: "internal", title: "Internal / Audit", tier: "confidential", kind: "group", icon: "lock",
    children: [
      { id: "int-audit", title: "Audit reports & findings", slug: "/internal/audit", tier: "confidential", kind: "doc" },
      { id: "int-ops", title: "Ops pack", slug: "/internal/ops", tier: "confidential", kind: "doc" },
      { id: "int-funding", title: "Funding / data room", slug: "/internal/funding", tier: "confidential", kind: "doc" },
      { id: "int-registers", title: "Compliance registers", slug: "/internal/registers", tier: "confidential", kind: "doc" },
      { id: "int-incident", title: "Incident response", slug: "/internal/incident", tier: "confidential", kind: "doc" },
      { id: "int-sops", title: "Internal SOPs", slug: "/internal/sops", tier: "confidential", kind: "doc" },
    ],
  },
  {
    id: "admin", title: "Admin Console", tier: "confidential", kind: "group", icon: "shield",
    children: [
      { id: "admin-ent", title: "Entitlements & people", slug: "/admin/entitlements", tier: "confidential", kind: "doc" },
      { id: "admin-orgs", title: "Organizations", slug: "/admin/orgs", tier: "confidential", kind: "doc" },
      { id: "admin-sync", title: "Content sync", slug: "/admin/sync", tier: "confidential", kind: "doc" },
      { id: "admin-log", title: "Access log", slug: "/admin/access-log", tier: "confidential", kind: "doc" },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────────────────────── Disclosures */

export const DISCLOSURES: Record<string, Disclosure> = {
  "audit-nda": {
    id: "audit-nda",
    title: "Confidential audit material — handling terms",
    body:
      "You are accessing Confidential audit material under an active engagement. By continuing you " +
      "acknowledge the NDA in force, that access is logged, that you will not redistribute, and that " +
      "your access is time-limited to your engagement window. Errata follow the immutable-audit rule (Rule 3).",
  },
};

/* ─────────────────────────────────────────────────────────────────────────────────── Docs */

const toc = (...h: string[]) => h.map((text, i) => ({ depth: i === 0 ? 1 : 2, text, anchor: text.toLowerCase().replace(/\s+/g, "-") }));

export const DOCS: Record<string, Doc> = {
  // PUBLIC · authored
  "/start/what-is-citrate": {
    slug: "/start/what-is-citrate", title: "What Citrate is", tier: "public", sourceKind: "authored",
    source: "codex", readingTimeMin: 4, toc: toc("Overview", "GhostDAG", "The LVM", "SALT"),
    body:
      "# What Citrate is\n\nCitrate is an **AI-native Layer-1 BlockDAG** using **GhostDAG** consensus with an " +
      "EVM-compatible execution layer (the **LVM**) and a standardized MCP layer. Chain id **40204**; native " +
      "token **SALT**.\n\n## GhostDAG\n\nBlocks form a DAG; ordering is by **blue_score**, finality is depth-based.\n\n" +
      "```ts\nimport { CitrateClient } from \"citrate-js\";\nconst c = new CitrateClient({ rpcUrl: \"https://rpc.citrate.ai\" });\nconsole.log(await c.chain.head());\n```\n",
  },

  // PUBLIC · transcluded (last-synced badge)
  "/chain/rpc": {
    slug: "/chain/rpc", title: "JSON-RPC reference", tier: "public", sourceKind: "transcluded",
    source: "citrate-chain/core/api/README.md", syncedSha: "81a4156", syncedAt: FIXED_NOW - 2 * DAY,
    readingTimeMin: 9, toc: toc("Standard methods", "Citrate methods", "AI methods"),
    body:
      "# JSON-RPC reference\n\n> _Transcluded from `citrate-chain` @ `81a4156` — synced 2 days ago._\n\n" +
      "## Citrate methods\n\n- `citrate_getDagStats` — DAG stats (current tips, max blue score, height)\n- `chain_getTips` — current tips\n" +
      "- `chain_getHeight` — chain height\n- `chain_getBlock` — block by hash or height\n",
  },

  // COMMERCIAL · authored (readable by builder/enterprise/admin; locked for anonymous)
  "/sdks/marketplace": {
    slug: "/sdks/marketplace", title: "marketplace-sdk", tier: "commercial", sourceKind: "authored",
    source: "codex", readingTimeMin: 7, toc: toc("Install", "MarketplaceClient", "X402Client"),
    body:
      "# marketplace-sdk\n\n`@citratenetwork/marketplace-sdk` — `MarketplaceClient`, `X402Client`, `CitrateWallet`, ABI + calldata builders.\n\n" +
      "```ts\nimport { MarketplaceClient } from \"@citratenetwork/marketplace-sdk\";\n```\n",
  },

  // COMMERCIAL · org-scoped to defense_prime (only enterprise+admin see it)
  "/enterprise/defense_prime": {
    slug: "/enterprise/defense_prime", title: "defense_prime — private space", tier: "commercial", orgId: "defense_prime",
    sourceKind: "gated", source: "private:defense_prime-space", readingTimeMin: 5, accessLogged: true,
    toc: toc("Provenance workflows", "Procurement", "Support SOPs"),
    body:
      "# defense_prime — private space\n\n_Scoped to org `defense_prime`. Other orgs cannot see this node._\n\n" +
      "Supply-chain provenance workflows, procurement event semantics, and your support SOPs.\n",
  },

  // ACADEMIC · linked archive
  "/research/gradient-papers": {
    slug: "/research/gradient-papers", title: "Gradient Papers v3", tier: "academic", sourceKind: "linked",
    source: "citrate-docs/gradient_papers_v3/", readingTimeMin: 2, toc: toc("The 10-paper series"),
    body:
      "# Gradient Papers v3\n\nThe 10-part working dissertation (verified against testnet 40204). " +
      "Linked, not copied (Rule 9):\n\n1. Citrate Technical Paper\n2. Paraconsistent Consensus\n…\n10. Substrate of Verifiable Inference\n",
  },

  // CONFIDENTIAL · gated + disclosure required + access-logged
  // CONFIDENTIAL — metadata only (body lives ONLY in the server-only confidential store, served via the
  // /api/content gateway after auth; S3). No confidential body in the client bundle.
  "/internal/audit": {
    slug: "/internal/audit", title: "Audit reports & findings", tier: "confidential", sourceKind: "gated",
    source: "citrate-security/audits/", disclosureRequired: true, disclosureId: "audit-nda", accessLogged: true,
    readingTimeMin: 12, toc: [], body: null,
  },
  "/internal/ops": {
    slug: "/internal/ops", title: "Ops pack", tier: "confidential", sourceKind: "gated",
    source: "ops/", disclosureRequired: true, disclosureId: "audit-nda", accessLogged: true, toc: [], body: null,
  },
  "/internal/registers": {
    slug: "/internal/registers", title: "Compliance registers", tier: "confidential", sourceKind: "gated",
    source: "citrate-compliance/registers/", disclosureRequired: true, disclosureId: "audit-nda", accessLogged: true, toc: [], body: null,
  },
  "/internal/incident": {
    slug: "/internal/incident", title: "Incident response", tier: "confidential", sourceKind: "gated",
    source: "ops/ + citrate-security", disclosureRequired: true, disclosureId: "audit-nda", accessLogged: true, toc: [], body: null,
  },
  "/internal/sops": {
    slug: "/internal/sops", title: "Internal SOPs", tier: "confidential", sourceKind: "gated",
    source: "ops/04_SOP_STANDARD.md", disclosureRequired: true, disclosureId: "audit-nda", accessLogged: true, toc: [], body: null,
  },
  "/internal/funding": {
    slug: "/internal/funding", title: "Funding / data room", tier: "confidential", sourceKind: "gated",
    source: "funding/docs/", disclosureRequired: true, disclosureId: "audit-nda", accessLogged: true, toc: [], body: null,
  },

  // CONFIDENTIAL · embargoed (body withheld until date)
  // Posture disclaimer (REM-03): the framework names in this TOC are a table of
  // contents only. Citrate's actual status on SOC 2, CMMC L2, and FedRAMP is in
  // progress and not yet certified; see /enterprise/compliance for the per-framework
  // caveats. This note keeps the fixture honest and satisfies disclaimer-check.
  "/enterprise/compliance-full": {
    slug: "/enterprise/compliance-full", title: "Compliance posture (full)", tier: "confidential",
    sourceKind: "gated", source: "citrate-compliance/", embargoUntil: FIXED_NOW + 21 * DAY, accessLogged: true,
    readingTimeMin: 8, toc: toc("SOC 2", "CMMC L2", "FedRAMP"),
    body: null, // withheld until embargo lifts
  },

  // PUBLIC · versioned example
  "/sdks/js": {
    slug: "/sdks/js", title: "sdk-js (citrate-js)", tier: "public", sourceKind: "transcluded",
    source: "citrate-sdk-js/README.md", syncedSha: "a1b2c3d", syncedAt: FIXED_NOW - 5 * DAY,
    versions: ["0.2.0", "0.1.0"], currentVersion: "0.2.0", readingTimeMin: 6,
    toc: toc("Install", "CitrateClient", "Account Abstraction"),
    body:
      "# citrate-js\n\n`npm install citrate-js`\n\n```ts\nimport { CitrateClient } from \"citrate-js\";\n```\n\n" +
      "Exports: `CitrateClient`, `WebSocketClient`, `aa/*` (userop, webauthn, kernel, recovery, bundler), React hooks.\n",
  },
};

/* ───────────────────────────────────────────────────────────────────────────── Search */

export const SEARCH_RESULTS: SearchResult[] = [
  { title: "JSON-RPC reference", slug: "/chain/rpc", tier: "public", section: "Chain Core", snippet: "citrate_getDagStats, chain_getTips, chain_getHeight …" },
  { title: "marketplace-sdk", slug: "/sdks/marketplace", tier: "commercial", section: "SDKs & APIs", snippet: "MarketplaceClient, X402Client, CitrateWallet …" },
  { title: "Paraconsistent consensus", slug: "/research/paraconsistent", tier: "academic", section: "Research", snippet: "Belnap four-valued logic; disagreement as information …" },
  { title: "Audit reports & findings", slug: "/internal/audit", tier: "confidential", section: "Internal / Audit", snippet: "Audit reports & findings — gated; served post-auth via the Confidential gateway." },
  { title: "defense_prime — private space", slug: "/enterprise/defense_prime", tier: "commercial", section: "Enterprise", snippet: "Provenance workflows, procurement, support SOPs" },
];
