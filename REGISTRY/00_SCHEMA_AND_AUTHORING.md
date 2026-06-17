---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S1
---

# Codex Content Registry — Schema & Authoring Rules

> **The single source of truth for the documentation effort.** `SURFACE_REGISTRY.md` enumerates *every*
> surface in the federation; this file defines (a) the **registry row schema**, (b) the **canonical Codex
> page format** every doc must use, (c) the **access-tier labeling rules**, and (d) the **authoring rules**
> that keep pages **auditable against the codebase**. Doc-writing agents read this file first.

## 0. Why this exists (the IP posture)

The goal is **not to hide documentation from the public** — it is to **stop nefarious actors, hostile
agents, and competitors from anonymously vacuuming up the work**, and to **honor the access privileges our
clients pay for**. So:

- **Public-good docs stay public.** Concepts, quickstarts, open SDK/RPC/CLI reference, the things a
  developer needs to build — open, no login.
- **What gets gated** is (1) **client-paid IP** (a customer's private space — they paid for it), (2)
  **competitive implementation depth** whose anonymous theft would materially harm the network, surfaced
  to **KYC'd / contracted** principals, and (3) **internal / audit / security** material (admins +
  issued auditors only).
- **Access is enforced by the protocol, not by obscurity.** Every page resolves through the single
  server-side chokepoint (`PLANSET/02_ARCHITECTURE.md` §4). Anonymous = Public only; everything above is
  identity- + KYC- + contract-gated, and Confidential is never in the public build. **No secrets in any
  tier, ever** (a gated doc still must not contain a key, a private endpoint, or a credential).

## 1. Registry row schema (`SURFACE_REGISTRY.md`)

Each surface is one row:

| Field | Meaning |
|---|---|
| `id` | Stable slug, `AREA-REPO-SURFACE` (e.g. `SDK-JS-CitrateClient`). Referenced by page frontmatter `surfaces[]`. |
| `surface` | Human name of the thing being documented. |
| `type` | `contract` · `precompile/opcode` · `rpc` · `cli` · `sdk` · `api` · `app-web` · `app-native` · `primitive` · `paper` · `spec` · `sop`. |
| `repo` | The home repo (where the truth lives). |
| `code_path` | The file/dir/symbol the doc is audited against (e.g. `src/index.ts → CitrateClient`). |
| `tier` | `public` · `commercial` · `commercial.kyc` · `academic` · `confidential` (see §3). |
| `org_scope` | `—` or an `org_id`/sector for per-company/per-sector content. |
| `source_kind` | How Codex sources the page: `authored` · `transcluded` · `linked` · `gated` (see §4). |
| `codex_slug` | Target page route in Codex (matches `PLANSET/06_INFORMATION_ARCHITECTURE.md`). |
| `status` | `registry` (listed) · `drafting` · `draft` · `review` · `published`. |
| `notes` | Caveats (pre-audit, deprecated, etc.). |

## 2. Canonical Codex page format (what doc agents produce)

Every page is one Markdown file with this **frontmatter** + **body**. Frontmatter is what makes the page
map to a Codex page and stay auditable.

```markdown
---
title: <page title>
codex_slug: /sdks/js
tier: public                 # public | commercial | commercial.kyc | academic | confidential
org_scope: ~                 # ~ or <org_id>
source_kind: transcluded     # authored | transcluded | linked | gated
source: citrate-sdk-js/README.md           # repo/path the truth lives in (for audit)
surfaces: [SDK-JS-CitrateClient, SDK-JS-aa]  # registry ids this page documents
audited_against_sha: <git rev-parse --short HEAD of the source repo>
status: draft
created: 2026-06-14T00:00:00Z
author: <agent/human>
---

# <Title>

> One-line what-this-is + who it's for.

## Overview
What it is, where it fits, the mental model. Plain-English first.

## Install / Setup            ← (SDKs/CLIs/apps) exact commands, versions, prerequisites
## Reference                  ← API surface / commands / screens — the audited core
   - cite the code symbol/path for each item (auditability)
## Examples                   ← copy-paste-ready, language-tabbed where relevant
## Tutorials                  ← link to the section's Tutorials pages (or inline steps)
## Security & access          ← what's gated and why; "no secrets here"; tier rationale
## Source & verification      ← source repo/path + SHA this page was audited against
```

Tutorials are their own pages (same frontmatter, `codex_slug: /<section>/tutorials/<name>`), with numbered
runnable steps and a link to the relevant sandbox.

## 3. Tier-labeling decision tree (apply per surface)

1. Is it **internal / audit / ops / funding / security-internal / incident**? → **confidential**.
2. Is it a **specific customer's paid/private** content (their space, their integration)? →
   **confidential** + `org_scope = <org_id>` (or **commercial** + `org_scope` if it's contracted-but-not-secret).
3. Is it **research / formal-methods / papers / unreleased academic** material? → **academic**.
4. Is it **deep implementation / operator depth** whose anonymous theft would materially help a competitor,
   but which any contracted/KYC'd builder should have? → **commercial.kyc** (gated on KYC, not a seat).
5. Is it **enterprise/paid-seat** implementation detail (marketplace ops, SLAs, procurement)? →
   **commercial**.
6. Otherwise (concepts, quickstarts, open SDK/RPC/CLI reference a developer needs) → **public**.

When in doubt between public and gated, **prefer public for what a developer needs to build, gate what a
competitor needs to clone.** Record the rationale in the page's "Security & access" section.

## 4. Source-kind rules (Rule 9 — link, don't copy)

- **`transcluded`** — reference docs that mirror code (API surface, RPC methods, CLI flags, ABIs). The
  truth lives in the **source repo**; Codex pulls it at a pinned SHA. **Prefer this for code-adjacent
  reference** so docs can't drift from code.
- **`authored`** — narrative, IA overviews, conceptual explainers, tutorials. Authored in Codex
  (`citrate-docs/content/`), because there's no single code file that is the truth.
- **`linked`** — papers, the TLA+ corpus, external standards. Codex links, never copies.
- **`gated`** — Confidential material; served at request time from its **private** home repo, never built
  in.

> **Staging convention (this effort).** Doc agents author pages into `citrate-docs/content/<section>/`
> in this format. Pages whose `source_kind` is `transcluded`/`gated` are **drafts/specs of the
> transclusion** — the final wiring (S6) points Codex at the source repo at its SHA; the staged file
> records the intended shape + the `source` + `audited_against_sha`. `authored` pages stay in
> `citrate-docs/content/` as their permanent home.

## 5. Authoring rules (every page)

1. **Audit against code.** Open the `code_path`. Every documented symbol/command/route must exist in the
   code. Cite the path. Record `audited_against_sha` (`git -C <repo> rev-parse --short HEAD`).
2. **No secrets in any tier.** No private keys, mnemonics, internal hostnames, credentials, or live
   secrets — not even in Confidential pages. If you find one in the code/docs, flag it, don't transcribe it.
3. **Rule 9.** Don't duplicate what a repo README/spec already states well — set `source_kind:
   transcluded` and summarize + link. Author only what isn't already canonical somewhere.
4. **Rule 12.** Full frontmatter on every page.
5. **Honest status.** Mark pre-audit/experimental/deprecated surfaces. Don't claim "certified".
6. **Tier the page, and justify it** in "Security & access".
7. **Tutorials per surface area** — at least one runnable tutorial per section (DESIGN_BRIEF §8).

## 6. Coverage gate

The effort is complete (per `PLANSET/01` success criteria) when **every `SURFACE_REGISTRY.md` row reaches
`status: published` or a tracked stub**, and the `06_INFORMATION_ARCHITECTURE.md` map has no orphan/untiered
surface. The registry is the checklist.
