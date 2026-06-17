---
title: The 13 Agentile rules
codex_slug: /methodology/rules
tier: public
org_scope: ~
source_kind: linked
source: docs/AGENTILE_RULES.md
surfaces: [METH-rules]
audited_against_sha: cd729ed
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The 13 Agentile rules

> The federation-wide rules that govern every repo under
> [`CitrateNetwork`](https://github.com/CitrateNetwork). Human and AI
> contributors follow them equally. This page is a one-line-each index; the full
> statement with rationale lives in [`docs/AGENTILE_RULES.md`](https://github.com/CitrateNetwork),
> and the canonical federation-active version in
> `citrate-federation/agentile/rules/CORE_RULES.md`. Link, don't copy (Rule 9).

## Overview

The rules constrain *what* can ship (the [workflow](/methodology/workflow)
constrains *when* and *how*). They are inherited from the pre-split monorepo and
enforced by CI plus review. New to the methodology? Start with the
[Agentile primer](/start/agentile).

## Reference — the 13 rules

| # | Rule | In one line |
|---|---|---|
| 0 | Read before writing code | Read `AGENT_ENTRY.md` + the repo's `owners.md` before starting. |
| 1 | No mocks, no stubs, no TODOs | Production paths contain real code; mocks live behind `#[cfg(test)]` / a dev flag. |
| 2 | Test count only goes up | `cargo test --workspace` count is monotone non-decreasing within a sprint; removing a test needs an ADR. |
| 3 | Audits are immutable | Reports in `audits/` are dated and never edited; corrections go in a dated follow-up. |
| 4 | Sprint file is authoritative | Status lives in `sprints/active/` — not chat, not memory, not a PR description. |
| 5 | Rule-12 frontmatter | Every doc carries `created` / `branch` / `author` / `status`. |
| 6 | Daily benchmark on chain crates | Sessions touching core `citrate-chain` crates end with a benchmark run. |
| 7 | Data-source tracing | Every IPC/API endpoint declares its data source before implementation. |
| 8 | Zero `.unwrap()` in production | `grep .unwrap() src/` returns 0 in GUI/production crates; CI enforces. Use `?` + typed errors. |
| 9 | One source of truth per topic | Don't duplicate docs — link, don't copy. |
| 10 | Authorization before destruction | Force-push, repo/branch delete, secret rotation need explicit human OK — not just green CI. |
| 11 | Federation manifest is canonical | `citrate-federation/manifest.toml` wins over any per-repo divergence. |
| 12 | Cross-repo deps follow the drift map | Add a `[[drift]]` manifest entry first, then the `Cargo.toml`/`package.json` dep. |
| 13 | Visibility flips need sign-off | PRIVATE → PUBLIC on a Tier-1 repo needs federation-lead (and, if customer-specific, customer) sign-off. |

> Numbering note: "Rule 5" and "Rule 12" both name the frontmatter constraint —
> Rule 5 in the federation renumbering, "Rule 12" in the archive numbering. Same
> rule.

## Tutorials

- [Agentile primer](/start/agentile) — the methodology in 60 seconds.
- [Sprint workflow](/methodology/workflow) — how work moves active → completed.

## Security & access

Public. The rules are public-good methodology. No secrets. Internal-only SOPs
that *apply* these rules to sensitive operations are gated — see
[SOPs](/methodology/sops).

## Source & verification

Linked page. Canonical source: `docs/AGENTILE_RULES.md` (with rationale) and
`citrate-federation/agentile/rules/CORE_RULES.md` (federation-active), federation
SHA `cd729ed`. Where this index and the canonical files diverge, the canonical
files win.
