---
title: The Agentile methodology — primer
codex_slug: /start/agentile
tier: public
org_scope: ~
source_kind: linked
source: AGENTILE.md
surfaces: [START-agentile, METH-rules, METH-workflow]
audited_against_sha: cd729ed
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The Agentile methodology — primer

> How the Citrate federation keeps ~40 repos coherent and auditable. A 60-second
> orientation; the canonical document is [`AGENTILE.md`](https://github.com/CitrateNetwork)
> at the federation root. Link, don't copy (Rule 9).

## Overview

**Agentile** is the methodology Citrate uses to keep planning, governance, audit
posture, and cross-repo state coherent across the federation. It is three things:

- a small set of **13 rules** that constrain *what* can ship;
- a **sprint-driven workflow** that constrains *when* and *how* things ship;
- a **single-source-of-truth** convention — every doc is dated and
  branch-stamped, one topic lives in one place, and AI agents follow the same
  rules and produce the same file-based artifacts as humans.

It is not Scrum and needs no tooling beyond `git` and Markdown. It exists because
the codebase split from a monorepo into many repos in May 2026, which introduced
two failure modes Agentile is designed to kill: **cross-repo drift** and **lost
context**.

## The 13 rules, in brief

Full statement: [the 13 rules](/methodology/rules) (→ `docs/AGENTILE_RULES.md`).

0. **Read before writing** — read the entry point + owners file first.
1. **No mocks, stubs, or TODOs** in production paths.
2. **Test count only goes up** within a sprint.
3. **Audits are immutable** — errata go in a follow-up, never an edit.
4. **Sprint file is the truth** — not chat, not memory.
5. **Rule-12 frontmatter** on every doc (`created`/`branch`/`author`/`status`).
6. **Daily benchmark** on the chain-core crates.
7. **Data-source tracing** before implementing any endpoint.
8. **Zero `.unwrap()`** in production paths.
9. **One source of truth per topic** — link, don't copy.
10. **Authorization before destruction** — force-push/delete/rotate needs a human OK.
11. **The federation manifest is canonical.**
12. **Cross-repo deps follow the drift map** — drift entry first, then the dep.
13. **Visibility flips need sign-off** (PRIVATE → PUBLIC on Tier-1 repos).

## The sprint lifecycle, in brief

Work lives in dated sprint files that move through `active/ → completed/`:
kickoff (write goal/scope/plan + Rule-12 frontmatter) → daily updates → decisions
become ADRs → cross-repo changes bump the manifest → close (move the file, fill
the close note). Completed sprints are immutable. Full choreography:
[workflow](/methodology/workflow) (→ `docs/AGENTILE_WORKFLOW.md`).

## Why it matters to you

If you're **building on** Citrate, Agentile is why the docs you read are dated,
auditable, and don't contradict the code. If you're **contributing**, it's the
protocol you follow. If you're an **auditor**, it's why the evidence chain is on
disk, not in someone's head.

## Tutorials

- [Your first 10 minutes](/start/tutorials/your-first-10-minutes) — get oriented and read the chain.

## Security & access

Public. This is an overview that links to the canonical methodology docs in the
federation repos. No secrets. Internal-only SOPs (incident, access review) are
gated — see [SOPs](/methodology/sops).

## Source & verification

Linked page. Canonical sources: `AGENTILE.md`, `docs/AGENTILE_RULES.md`, and
`docs/AGENTILE_WORKFLOW.md` at the federation root, federation SHA `cd729ed`.
This page summarizes; where it diverges from the canonical files, the canonical
files win (Rule 9).
