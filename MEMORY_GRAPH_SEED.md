# Citrate Atlas, memory graph seed (2026-06-17)

Ingest into the citrate-memories graph when the MCP reconnects. Nodes and edges below capture the Atlas
remediation so context can be cleared and resumed from one pointer. This file is the durable record; the
canonical state is the merged `main` of `citrate-docs` at `e2fc387`.

## Nodes

- **Citrate Atlas** (product): the gated, agentic documentation webapp for the Citrate Network federation.
  Renamed from "Citrate Codex" on 2026-06-17. Repo `citrate-docs` (evolves in place). Next.js 16 / React 19
  / Tailwind v4 / TS strict. Deployed at `citrate-atlas.vercel.app` (Vercel project `citrate-atlas`,
  prj_THzHQQrzLyQeo0zllzUYZUukyeuQ, team team_YpGQrOf4tklQqwqVHpyHEY4a).
- **Atlas design** (artifact): warm-leaning dark default via `data-theme`; Geist / Space Grotesk /
  Source Serif 4 / Geist Mono; green #8ecc09; lattice; Lucide-style icons (no emoji). Tokens in
  `app/globals.css`; markdown renderer `lib/md.tsx` (react-markdown + remark-gfm + rehype-slug); icons in
  `components/icons.tsx`.
- **Voice + canon bar** (standard): `STYLE_GUIDE.md`. Six pillars (Plain, Patient, Specific, Honest,
  Naturalist, Quietly confident); NO em-dashes (commas/ellipses); forbidden words + vocabulary
  substitutions; product-surface names; 4-tier status (Implemented / Specified / Verified / Theoretical);
  page template (frontmatter title only, no body H1; lede, What it is, How to use it, Reference, Design
  rationale, Failure modes, Access and canon, Source and verification).
- **Content gate** (mechanism): `scripts/content-lint.mjs`. Em-dashes are a hard gate; forbidden/vocabulary
  enforced under `--strict` (now run in CI). `proseOf()` strips frontmatter, code, link URLs, and an ALLOW
  list (Web Crypto API, Web3 Secret Storage, crypto-shred). Green: 0 em-dashes, 0 word findings.
- **Confidential invariant** (mechanism): `lib/content/confidential-store.ts` is `server-only`; bodies carry
  the sentinel `CITRATE-CONFIDENTIAL-RUNTIME-ONLY`; `scripts/check-no-confidential.mjs` (`verify:bundle`)
  proves zero confidential bytes in `.next/static`. Verified live (sentinel absent from public HTML).
- **Atlas content set** (deliverable): 88 pages, all rewritten-from-code across 11 sections (start, chain,
  contracts, sdks, aa, compute, operators, apps, research, enterprise, methodology). Each carries a 4-tier
  status, line-level source cites, and a pinned `audited_against_sha`.
- **Product-surface names**: Citrate Network (public ledger / BlockDAG), Citrate Ground (private on-prem),
  Citrate Market (compute marketplace), Citrate Orchard (federated learning), Citrate Node (operator
  daemon), Citrate Keyring (accounts/keys), Citrate Schools (free K-12), Citrate Atlas (the docs product).

## Canon corrections recorded during the rewrite (real code beat prior drafts)

- learning_root is **SHA3-256**, not MiMC, and is independent of state_root (INV-4).
- The learning cycle has **four** phases (Observe/Orient/Decide/Act), described without combat metaphor.
- Storage state root is **SHA3-256 over flat KV**, not a Merkle-Patricia trie.
- BFT checkpoints: interval 50, committee 100, quorum 67 of 100 (`checkpoint.rs`); GhostDAG k=18, finality
  depth 100; chain id 40204 / `eth_chainId` 0x9d0c; SALT 1T (one trillion) / 18 decimals; reward halving every 2,100,000
  blocks.
- `IPFSIncentives` **v1** is deployed (V2/V3 never deployed); x402 precompiles are `0x0200-0x0209`.
- `LoRAFactory` provenance does **not** link to learning rounds.
- Python SDK CLI is broken (no `cli.py`); JS SDK (`citrate-js` v0.2.0) is canonical.
- Bundler `citrate_getUserAddress` has no handler; inference-gateway pool dispatch returns 503 (stub).
- chatbot on-chain inference is **not wired** (Specified); the memory app is **Memrizz**.
- `KYCRegistry` stores no PII (boolean + identity hash); identity has **no `entitlement` claim** yet
  (resolved RP-side, Specified); "Citrate is never a guardian" enforced.

## Edges

- Citrate Atlas --documents--> every federation surface (chain, contracts, sdks, aa, compute, operators,
  apps, research, enterprise).
- Citrate Atlas --consumes--> the source repos pinned in `manifest.toml [repos.citrate-docs].consumes_repos`.
- Atlas content set --conforms-to--> Voice + canon bar.
- Content gate --enforces--> Voice + canon bar (in CI).
- Confidential invariant --protects--> the Confidential tier (audit/ops/funding/compliance bodies).
- Citrate Atlas --gates-via--> citrate-identity OIDC (entitlement claim PENDING, resolved RP-side).
- Atlas remediation --supersedes--> the prior agent-voiced docs (archived).

## Open follow-ups

1. citrate-identity `entitlement` claim is not minted yet; Atlas resolves tier/org entitlement RP-side.
   Track via a `[[drift]]` entry when identity ships it (Rule 12).
2. Custom domain `docs.citrate.ai` not yet attached (live at `citrate-atlas.vercel.app`).
3. Paymaster registrar wiring gap (EW-S1): the factory must `registerWallet` or first-op sponsorship
   reverts. Documented honestly on `/aa/paymaster`.
4. The GitHub repo stays `citrate-docs` (links preserved); only the product/Vercel project are "Atlas".

## Resume pointer

Everything above is merged to `citrate-docs` main (`e2fc387`). To resume: read `STYLE_GUIDE.md`,
`PLANSET/08_ATLAS_REMEDIATION.md`, and this file. The remediation (S0–S11) is complete.
