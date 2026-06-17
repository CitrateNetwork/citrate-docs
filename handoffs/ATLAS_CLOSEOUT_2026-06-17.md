---
title: Citrate Atlas, remediation close-out
created: 2026-06-17
branch: main
author: Citrate team
status: complete
---

# Citrate Atlas, remediation close-out (2026-06-17)

The Atlas remediation is complete. The docs product was renamed from Codex to **Citrate Atlas**, the final
design was ported, all 88 content pages were rewritten from code, the content gate is enforced in CI, and
the site is deployed at `citrate-atlas.vercel.app`.

## What shipped

| Sprint | Scope | PR |
|---|---|---|
| S0 | Style guide + per-page rewrite matrix | (in #3) |
| S1 | Final Atlas design port (tokens, renderer, icons) | #3 |
| S2 | Product-surface naming + content linter + em-dash purge | #3 |
| S3 | Start Here + Methodology (voice exemplars) | #4 |
| S4 | Citrate Network (chain-core), 15 pages | #5 |
| S5 | Smart contracts, 10 pages | #6 |
| S6 | SDKs + Citrate Keyring, 14 pages | #7 |
| S7 | Citrate Market + Citrate Node, 8 pages | #8 |
| S8 | Apps & dapps, 17 pages | #9 |
| S9 | Research / Citrate Orchard, 9 pages | #10 |
| S10 | Enterprise & Compliance, 7 pages | #11 |
| S11 | Content gate enforced (`--strict`) + deploy + memory graph | #12 + this |

## How it was done

Every page was rewritten **from the source code**, not edited in place. Each section was fanned out to
parallel reviewers, each given the style guide, the S3 exemplar, the verified canon for its pages, and the
exact source paths and pinned SHAs. Outputs were verified centrally (build, typecheck, em-dash gate, no
redundant H1, prose vocabulary) before one PR per section was merged to main.

The result: 88 pages on the Atlas voice and template, each with a 4-tier status and line-level source
cites. The reviewers caught dozens of canon corrections the prior docs had wrong (recorded in
`MEMORY_GRAPH_SEED.md`).

## State of the gates

- **Em-dash gate**: 0 across all content (hard gate).
- **Vocabulary gate**: `content-lint --strict` is green (0 findings) and runs in CI. `proseOf()` excludes
  frontmatter, code, link URLs, and a short allowlist of real proper nouns.
- **Confidential-never-in-build**: `verify:bundle` proves zero confidential bytes in `.next/static`;
  verified live (sentinel absent from public HTML, gateway fail-closed at 404 unauthenticated).
- **Build + typecheck**: green.

## Deploy

- Vercel project renamed `citrate-codex` to **`citrate-atlas`** (same project id, history preserved).
- Production: `https://citrate-atlas.vercel.app` (deployment `dpl_CGKNqw3APGoVnKb7MHJptswhY7Pq`, READY).
- Vercel SSO deployment protection was disabled so the app's own splash + OIDC + tiered gating governs
  access (the confidential tier is protected app-side, not by Vercel SSO).
- Live checks: public routes 200, Atlas branding renders, confidential gateway fail-closed, no sentinel in
  the public bundle.

## Federation

- `manifest.toml [repos.citrate-docs]` updated: role/notes to Atlas, `rev` pinned to `e2fc387`,
  `consumes_repos` expanded to the full source set, `publishes` adds `citrate-atlas.vercel.app`. Marked
  ACCEPTED, S0–S11 complete.

## Open follow-ups

1. **Entitlement claim**: citrate-identity does not mint an `entitlement` claim yet; Atlas resolves
   tier/org entitlement relying-party side. Add a `[[drift]]` entry when identity ships it (Rule 12).
2. **Custom domain**: attach `docs.citrate.ai` (live today at `citrate-atlas.vercel.app`).
3. **Paymaster registrar gap (EW-S1)**: the account factory must `registerWallet` or first-op sponsorship
   reverts. Documented on `/aa/paymaster`; tracked in the identity/EW work.
4. **GitHub repo name** stays `citrate-docs` (preserves links); only the product and Vercel project are
   "Atlas". Optional later rename.

## Resume pointer

Read `STYLE_GUIDE.md`, `PLANSET/08_ATLAS_REMEDIATION.md`, and `MEMORY_GRAPH_SEED.md`. Everything is merged
to `citrate-docs` main at `e2fc387`.
