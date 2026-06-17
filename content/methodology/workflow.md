---
title: The Agentile sprint workflow
codex_slug: /methodology/workflow
tier: public
org_scope: ~
source_kind: linked
source: docs/AGENTILE_WORKFLOW.md
surfaces: [METH-workflow]
audited_against_sha: cd729ed
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The Agentile sprint workflow

> How work moves from idea → active → completed across the federation, and why
> that produces a clean audit trail. This page summarizes; the full choreography
> lives in [`docs/AGENTILE_WORKFLOW.md`](https://github.com/CitrateNetwork). Link,
> don't copy (Rule 9). Companion: [the 13 rules](/methodology/rules).

## Overview

Where the [rules](/methodology/rules) constrain *what* can ship, the workflow
constrains *when* and *how*. The unit of work is a **sprint file** — a dated
Markdown doc with Rule-12 frontmatter that is the single source of truth for a
workstream's status (Rule 4). A **federation sprint** spans repos and lives in
`citrate-federation/agentile/sprints/`; a **repo sprint** affects one repo and
lives in `citrate-federation/repos/<repo>/sprints/`. Same format, same lifecycle.

## Reference — the lifecycle

1. **Kickoff.** Create `sprints/active/<slug>.md` with Rule-12 frontmatter; fill
   in goal, scope, out-of-scope, and the plan table. Update `CURRENT.md` so
   observers see it's active.
2. **Daily updates.** Each session that advances the sprint appends one dated
   line to the **Daily updates** section (Rule 4 — not Slack).
3. **Decisions become ADRs.** Architectural choices/trade-offs get a short ADR
   (`adrs/ADR-YYYY-MM-DD-<slug>.md`) with Rule-12 frontmatter, linked from the
   sprint's "Decisions made".
4. **Cross-repo + manifest.** If SHA pins shift, bump
   `citrate-federation/manifest.toml`, run `./scripts/pin-bump.sh <repo>` to open
   consumer PRs, merge on green, and let nightly drift-check verify (Rules 11–12).
5. **Close.** When exit criteria are met, **move** (not copy) the file to
   `completed/<YYYY-MM>/<slug>.md`, set `status: archived`, write the close note
   (noting any delta from the plan), and remove it from `CURRENT.md`.
6. **Audit hand-off.** Completed sprints are immutable (Rule 3) and form the
   audit-evidence chain — auditors grep `created:` dates and cross-reference ADRs,
   `audits/`, and the manifest.

### Where work goes

| Work type | Sprint/file home |
|---|---|
| Cross-repo workstream | `citrate-federation/agentile/sprints/active/<slug>.md` |
| Single-repo workstream | `citrate-federation/repos/<repo>/sprints/active/<slug>.md` |
| Architectural decision | `…/adrs/ADR-YYYY-MM-DD-<slug>.md` (federation or repo) |
| Audit report | `audits/YYYY-MM-DD-<slug>.md` in the affected repo |

### Anti-patterns (each violates a rule)

Status in Slack (Rule 4) · two sprints for one workstream (Rule 9) · editing a
closed sprint (Rule 3) · `TODO:` in production (Rule 1) · a `Cargo.toml` dep with
no manifest entry (Rules 11–12) · force-pushing without asking (Rule 10).

## Tutorials

- [Agentile primer](/start/agentile) — overview and benefits.
- [The 13 rules](/methodology/rules) — what the workflow enforces.

> Convenience skills (`/sprint kickoff|daily|close|status`, `/journal`,
> `/case-study`, `/essay`, `/audit-drive`, `/claim-grade`) automate the
> file-shuffling — but the methodology works with just `git` and an editor.

## Security & access

Public. Process documentation, no secrets. Sprint *contents* for confidential
work (audit, ops, funding) live in private repos and are gated; the workflow
itself is public.

## Source & verification

Linked page. Canonical source: `docs/AGENTILE_WORKFLOW.md` and the federation
control plane under `citrate-federation/agentile/`, SHA `cd729ed`. This page
summarizes; the canonical file wins on any divergence.
