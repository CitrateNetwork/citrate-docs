---
title: The Agentile sprint workflow
codex_slug: /methodology/workflow
tier: public
org_scope: ~
source_kind: linked
source: docs/AGENTILE_WORKFLOW.md
surfaces: [METH-workflow]
audited_against_sha: cd729ed
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

How work moves from idea to active to completed across the federation, and why that leaves a clean audit
trail. This page summarizes; the full choreography lives in `docs/AGENTILE_WORKFLOW.md`. Per Rule 9, the
canonical file governs where the two differ. Its companion is [the 13 rules](/methodology/rules).

## What it is

Where the [rules](/methodology/rules) constrain what can ship, the workflow constrains when and how. The
unit of work is a **sprint file**: a dated Markdown document, under Rule-12 frontmatter, that is the single
source of truth for a workstream's status (Rule 4). A federation sprint spans repositories and lives in
`citrate-federation/agentile/sprints/`; a repo sprint touches one repository and lives in
`citrate-federation/repos/<repo>/sprints/`. Same format, same lifecycle.

## How to use it

The lifecycle, step by step:

1. **Kickoff.** Create `sprints/active/<slug>.md` with Rule-12 frontmatter and fill in the goal, scope,
   out-of-scope, and the plan table. Update `CURRENT.md` so observers can see it is active.
2. **Daily updates.** Each session that advances the sprint appends one dated line to the daily-updates
   section. The sprint file is the record, not a chat thread (Rule 4).
3. **Decisions become ADRs.** Architectural choices and trade-offs get a short ADR at
   `adrs/ADR-YYYY-MM-DD-<slug>.md` under Rule-12 frontmatter, linked from the sprint's decisions section.
4. **Cross-repo and manifest.** If SHA pins shift, bump `citrate-federation/manifest.toml`, run
   `./scripts/pin-bump.sh <repo>` to open the consumer PRs, merge on green, and let the nightly drift check
   verify (Rules 11 and 12).
5. **Close.** When the exit criteria are met, move (do not copy) the file to
   `completed/<YYYY-MM>/<slug>.md`, set `status: archived`, write the close note recording any delta from
   the plan, and remove it from `CURRENT.md`.
6. **Audit hand-off.** Completed sprints are immutable (Rule 3) and form the audit-evidence chain. Auditors
   read the `created:` dates and cross-reference the ADRs, the `audits/` directory, and the manifest.

## Reference

Where each kind of work lives:

| Work type | Home |
|---|---|
| Cross-repo workstream | `citrate-federation/agentile/sprints/active/<slug>.md` |
| Single-repo workstream | `citrate-federation/repos/<repo>/sprints/active/<slug>.md` |
| Architectural decision | `…/adrs/ADR-YYYY-MM-DD-<slug>.md` (federation or repo) |
| Audit report | `audits/YYYY-MM-DD-<slug>.md` in the affected repo |

The common anti-patterns, each of which breaks a rule: status kept in chat (Rule 4); two sprints for one
workstream (Rule 9); editing a closed sprint (Rule 3); a `TODO:` in production (Rule 1); a dependency with
no manifest entry (Rules 11 and 12); a force-push taken without asking (Rule 10).

Convenience skills (`/sprint kickoff|daily|close|status`, `/journal`, `/case-study`, `/audit-drive`)
automate the file-shuffling, but the methodology works with nothing more than git and an editor.

## Access and canon

Public. This is process documentation and holds no secrets. Sprint contents for confidential work, such as
audit, operations, and funding, live in private repositories and gate there; the workflow itself is public.

## Source and verification

The canonical sources are `docs/AGENTILE_WORKFLOW.md` and the federation control plane under
`citrate-federation/agentile/`, at SHA `cd729ed`. Status: Implemented.
