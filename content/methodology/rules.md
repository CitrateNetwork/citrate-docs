---
title: The 13 Agentile rules
codex_slug: /methodology/rules
tier: public
org_scope: ~
source_kind: linked
source: docs/AGENTILE_RULES.md
surfaces: [METH-rules]
audited_against_sha: cd729ed
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The federation-wide rules that govern every repository under CitrateNetwork. People and agents follow them
equally. This page is a one-line-each index; the full statement with rationale lives in
`docs/AGENTILE_RULES.md`, with the federation-active copy in
`citrate-federation/agentile/rules/CORE_RULES.md`. Per Rule 9, where this index and those files differ, the
files win.

## What it is

The rules constrain what can ship; the [workflow](/methodology/workflow) constrains when and how. They
carry over from the pre-split monorepo and are enforced by CI and review together. If the methodology is
new to you, start with the [Agentile primer](/start/agentile).

## Reference

| # | Rule | In one line |
|---|---|---|
| 0 | Read before writing code | Read `AGENT_ENTRY.md` and the repo's `owners.md` before starting. |
| 1 | No mocks, no stubs, no TODOs | Production paths contain real code; mocks live behind `#[cfg(test)]` or a dev flag. |
| 2 | Test count only goes up | The `cargo test --workspace` count is monotone within a sprint; removing a test needs an ADR. |
| 3 | Audits are immutable | Reports in `audits/` are dated and never edited; corrections go in a dated follow-up. |
| 4 | Sprint file is authoritative | Status lives in `sprints/active/`, not in chat, memory, or a PR description. |
| 5 | Rule-12 frontmatter | Every document carries `created`, `branch`, `author`, and `status`. |
| 6 | Daily benchmark on chain crates | Sessions touching core `citrate-chain` crates end with a benchmark run. |
| 7 | Data-source tracing | Every endpoint declares its data source before it is implemented. |
| 8 | Zero `.unwrap()` in production | `grep .unwrap() src/` returns zero in production crates; CI enforces it. Use `?` and typed errors. |
| 9 | One source of truth per topic | Do not duplicate docs. Link, do not copy. |
| 10 | Authorization before destruction | Force-push, delete, or rotation needs explicit human sign-off, not just green CI. |
| 11 | Federation manifest is canonical | `citrate-federation/manifest.toml` wins over any per-repo divergence. |
| 12 | Cross-repo deps follow the drift map | Add a `[[drift]]` manifest entry first, then the `Cargo.toml` or `package.json` dependency. |
| 13 | Visibility flips need sign-off | Private to public on a Tier-1 repo needs federation-lead sign-off (and customer sign-off where the work is customer-specific). |

A note on numbering: the frontmatter constraint is called Rule 5 in the federation renumbering and Rule 12
in the archive numbering. It is the same rule.

## Access and canon

Public. The rules are public-good methodology and contain no secrets. The internal procedures that apply
these rules to sensitive operations are gated; see [SOPs](/methodology/sops).

## Source and verification

The canonical sources are `docs/AGENTILE_RULES.md` (with rationale) and
`citrate-federation/agentile/rules/CORE_RULES.md` (federation-active), at SHA `cd729ed`. Status:
Implemented.
