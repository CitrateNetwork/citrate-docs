---
created: 2026-06-17T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: ATLAS-REMEDIATION
---

# Citrate Atlas, Content + Design Remediation

> Companion to `00_OVERVIEW.md` through `07_*`. The app shell shipped (S0 through S6), but the content and
> the visual finish were not at the team's bar. This planset takes one clean pass to fix both: port the
> final **Citrate Atlas** design (renamed from Codex), and rewrite every page from code to the voice in
> `../STYLE_GUIDE.md`. Executed as a recipe, blockers first, so we do not leave tech debt behind us.

## What was wrong

- The markdown renderer dropped GFM tables (raw pipes rendered), reprinted the page title (H1 twice), and
  did not label code fences. The prose was agent-voiced, verbose, and carried em-dashes in 88 of ~90 files.
- The content was mostly accurate to code but missed canon: no substrate framing, no on-prem / KYC-via-
  CLEAR language on operator pages, no mainnet timeline.
- The app was built against an interim design; the final design is **Citrate Atlas** (warm-leaning dark,
  Geist + Space Grotesk + Source Serif 4 + Geist Mono, Citrate green, lattice, real icon set), recovered
  from the design handoff bundle.

## The recipe (sprints)

| Sprint | Goal | Exit |
|---|---|---|
| **ATLAS-S0** | Style guide (`../STYLE_GUIDE.md`) + per-page rewrite matrix | Both exist; every page mapped to its source code path + rewrite brief |
| **ATLAS-S1** | Port the Atlas design: tokens, icon set (no emoji), real markdown renderer (tables/code/no duplicate title), re-skin components 1:1, rename Codex to Atlas in UI | Renders pixel-close to `Citrate Atlas.html` in both themes; a table + code page renders clean; build + verify:bundle green |
| **ATLAS-S2** | Adopt product-surface taxonomy in IA/sidebar/slugs; add `scripts/content-lint.mjs` (em-dash/forbidden/vocab) to CI; mechanical em-dash purge | IA reflects taxonomy; `content-lint` green and enforced |
| **ATLAS-S3..S10** | Full rewrite-from-code, one section per sprint, in dependency order | Each section's pages rewritten to the template, on-voice, 4-tier status, source+SHA, lint-clean, registry-reconciled |
| **ATLAS-S11** | Status review, rename Vercel to citrate-atlas + redeploy, manifest pin, update the citrate-memories graph, final E2E + handoff refresh | Live as Citrate Atlas; graph current; resumable from one pointer |

Section order for S3 through S10: Start Here + Methodology, Chain Core, Smart Contracts, SDKs + Account
Abstraction & Identity, Compute & Inference + Node Operators, Apps & dApps, Research / Citrate Orchard,
Enterprise & Compliance. Cross-links resolve as we go because upstream sections land first.

## The bar

Voice, vocabulary, forbidden words, product names, canon, status labels, and the page template all live in
`../STYLE_GUIDE.md`. The per-page matrix (this sprint's other deliverable) maps each page to the code it is
verified against and the canon it must embed.

## Related

- Design source: the Atlas handoff bundle (`styles/codex.css` + `src/*.jsx`).
- Voice source: the Citrate brand spec (six pillars, vocabulary, product names).
- Facts source: the federation code + `../REGISTRY/SURFACE_REGISTRY.md` corrections log.
