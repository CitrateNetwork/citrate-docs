---
title: A primer on Agentile
codex_slug: /start/agentile
tier: public
org_scope: ~
source_kind: linked
source: AGENTILE.md
surfaces: [START-agentile, METH-rules, METH-workflow]
audited_against_sha: cd729ed
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Agentile is how the Citrate federation keeps its repositories coherent and auditable. This is a short
orientation; the canonical document is `AGENTILE.md` at the federation root, and where this page and that
file differ, the file wins.

## What it is

Agentile is the methodology we use to keep planning, governance, audit posture, and cross-repo state
coherent across the federation. It is three things working together:

- a small set of **13 rules** that constrain what can ship;
- a **sprint-driven workflow** that constrains when and how things ship;
- a **single-source-of-truth** convention: every document is dated and branch-stamped, each topic lives in
  exactly one place, and the agents that do the work follow the same rules and leave the same file-based
  trail a person would.

It is not Scrum, and it needs no tooling beyond git and Markdown. It exists because the codebase grew from
one repository into many, which opens two failure modes Agentile is built to close: drift between repos,
and context that lives in someone's head instead of on disk.

## How to use it

If you are building on Citrate, Agentile is the reason the docs you read are dated, traceable, and
consistent with the code. If you are contributing, it is the protocol you follow: read the entry point
first, write the sprint file before the code, keep the test count climbing, and link rather than copy. If
you are auditing, it is why the evidence sits on disk rather than in memory. The two pages under
[methodology](/methodology/rules) give the full statement and the sprint lifecycle.

## Reference

The 13 rules, in brief. The full statement is on [the rules page](/methodology/rules).

| # | Rule |
|---|---|
| 0 | Read before writing. Start with the entry point and the owners file. |
| 1 | No mocks, stubs, or TODOs in production paths. |
| 2 | Test count only goes up within a sprint. |
| 3 | Audits are immutable; errata go in a follow-up, never an edit. |
| 4 | The sprint file is the truth, not chat and not memory. |
| 5 | Rule-12 frontmatter on every document (created, branch, author, status). |
| 6 | Daily benchmark on the chain-core crates. |
| 7 | Trace the data source before implementing any endpoint. |
| 8 | Zero `.unwrap()` in production paths. |
| 9 | One source of truth per topic. Link, do not copy. |
| 10 | Authorization before destruction. Force-push, delete, or rotate needs a human's sign-off. |
| 11 | The federation manifest is canonical. |
| 12 | Cross-repo dependencies follow the drift map: the drift entry first, then the dependency. |
| 13 | Visibility flips need sign-off (private to public on a Tier-1 repo). |

The sprint lifecycle, in brief: work lives in dated files that move from `active/` to `completed/`. A
sprint opens with a goal, scope, and plan under Rule-12 frontmatter, takes daily updates, turns decisions
into ADRs, and bumps the manifest when a change crosses repos. Closing it means moving the file and writing
the close note. Completed sprints are immutable. The full choreography is on
[the workflow page](/methodology/workflow).

## Access and canon

Public. This is an overview that links to the canonical methodology documents in the federation. No
secrets. Internal-only procedures, such as incident response and access review, are gated; see
[SOPs](/methodology/sops).

## Source and verification

Linked page. The canonical sources are `AGENTILE.md`, `docs/AGENTILE_RULES.md`, and
`docs/AGENTILE_WORKFLOW.md` at the federation root, at SHA `cd729ed`. Per Rule 9, this page summarizes and
the canonical files govern. Status: Implemented.
