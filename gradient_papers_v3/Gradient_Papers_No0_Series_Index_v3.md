---
title: "The Gradient Papers — Series Index (v3)"
version: v3
created: 2026-04-28T03:00:00Z
branch: main
author: Larry Klosowski (Cnidarian Foundation / Labs)
co_author: Claude Opus 4.7 (1M context)
status: active
supersedes: v2 (February 2026)
---

# The Gradient Papers — Series Index (v3)

> *"Models are smarter together than apart, consensus and learning
> are the same process, and a network that learns by reaching
> consensus will outperform any network that treats intelligence
> and agreement as separate concerns."*

The Gradient Papers are a ten-part working dissertation documenting
the **Citrate Network** — an AI-native Layer-1 BlockDAG built around
the thesis that distributed learning and distributed consensus are
the same problem under different names.

This v3 revision was written in April 2026 against the v0.5.0
testnet code (chain id 40204, RPC `https://rpc.citrate.ai`). Every
mechanical claim in v3 is traceable to a file path or contract
address in the canonical repository.

---

## What changed from v2

| Concern | v2 (Feb 2026) | v3 (Apr 2026) |
|---------|---------------|----------------|
| Status tags | Implemented / Specified / Hypothesis | Same, plus **Verified** for items with on-chain or audit evidence |
| Code references | Filename-only ("see executor.rs") | **file:line** with the testnet commit pinned |
| Statistics | Hand-waved or omitted | Replaced with measured benchmarks (`benchmarks/*.md`) and audit findings (`.agentile/audits/*`) |
| Bridge mechanism | $SNAP → $SALT redeemable, fundraise-driven | Recast as **Medusa Paradigm No.9** — contracted full-time market-maker model with on-chain SALT/USD oracle |
| Token economics | "TBD" on velocity, "TBD" on emission curve | Closed-form schedule + sensitivity analysis driven by `MarketMakerAllocation.sol` and `ContributionAccounting.sol` |
| Paper IX role | Inspiration only | Promoted to load-bearing — biological architecture motifs map to live code (NematocystSlashing, TEEAttestationRegistry) |
| Paper count | 9 + index | 10 + index — Paper X added: **The Substrate of Verifiable Inference** (Halo2-KZG, Q16 compute, attestation gates) |
| Papers integrated with audit | None | Every paper closes with "audit and reality check" referencing `.agentile/audits/2026-04-*-*` |

**Honesty principle.** The v3 papers cite the testnet's actual
state (38 contracts deployed, 4,989 Rust tests passing, 2.02×
parallel-execution speedup measured). Where v2 leaned on
aspirational language, v3 says "this works today / this is
specified / this is conjectural." The reader can audit each
claim against the linked code or commit.

---

## Reading paths

| Audience | Recommended order |
|----------|-------------------|
| **Engineers** | I → X → IV → II → III → V → VI |
| **Researchers** | IX → V → II → X → III → I |
| **Investors** | I → VI → VII → VIII → II |
| **Operators** | I → IV → X → IX → VIII |
| **Community** | VIII → VII → VI → IX → I |

---

## Paper inventory

| # | Title | v3 status | Anchor in code |
|---|-------|-----------|----------------|
| 0 | Series Index (this) | — | `gradient_papers_v3/` |
| I | Citrate: Protocol Specification for an AI-Native BlockDAG | **Verified** (testnet 40204) | `core/consensus`, `core/execution` |
| II | Paraconsistent Consensus | **Specified** | `core/consensus/src/finality.rs` |
| III | The Mentorship Protocol | Specified | `contracts/src/LearningPool.sol` |
| IV | Behavioral Issues: BDD as Engineering Methodology | **Practiced** | `.agentile/rules/`, every sprint dir |
| V | ATIS: Analog Token Importance Scoring | Theoretical | external — no code |
| VI | The Memetic Money Portal v3 (Bridge & Market-Maker) | **Specified** + Sepolia partial | `contracts/src/MarketMakerAllocation.sol`, citrate-web/snap-contracts |
| VII | The Mozi Cooperative | Specified | `contracts/src/ContributionAccounting.sol` |
| VIII | The BR1J Constitution | Specified | `contracts/src/TreasuryGovernor.sol` |
| IX | The Medusa Paradigm | **Specified + Practiced** | `contracts/src/NematocystSlashing.sol`, `contracts/src/TEEAttestationRegistry.sol` |
| X | The Substrate of Verifiable Inference | **Implemented** | `core/execution/src/zkp/halo2/`, `precompiles/{verify,compute}.rs` |

The implementation-maturity bar of each paper is rendered in the
paper's own header. v3 introduces three new tags:

- **Verified** — claim has on-chain evidence or external audit.
- **Practiced** — methodology is in active use (sprints, code
  review gates, retrospectives).
- **Implemented** — code exists in `main` and is exercised by
  tests + benchmarks.

---

## The series thesis, restated

A blockchain is a system for many machines to agree on a single
view of truth. A learning network is a system for many machines
to converge on a single (or richer) representation of the world.

These are the same shape. Both are gradient-descent processes in
disguise — one over disagreement (slashing-driven equilibrium),
one over loss (training-driven equilibrium). v3 makes that
identity load-bearing: every paper that claims to "do learning"
points to a contract that records contribution, every paper that
claims to "do consensus" points to a finality mechanism that
treats disagreement as data.

The series argues that the next generation of distributed
intelligence will be built by networks that **don't separate
consensus from cognition**. Citrate is the first attempt to build
one.

---

## Living document protocol

The v3 papers are not frozen. Each paper carries a header
`status: <stage>` that tracks its claim-evidence ratio:

- `draft` — text written, evidence not yet linked
- `active` — every claim either cites code or is tagged
  `[Hypothesis]`
- `superseded` — replaced by a later revision
- `archived` — historical context only

A paper moves from `draft` → `active` when its claim-evidence
audit (CI workflow `paper-claim-audit.yml`) passes. The audit
script greps for unsupported numeric claims and forces a tag.

This file is the index. Read whichever paper your role calls for.
The architecture works either bottom-up (I → IX) or top-down (IX
→ I) — biology and engineering meet in the middle.

---

## Authorship

The Gradient Papers are written by Larry Klosowski with
collaboration from Lauren Mendenhall (BR1J / Constitution),
Saul Loveman (engineering and protocol implementation), and
the Claude Opus 4.x research-and-implementation lineage.

v3 was assembled in April 2026 alongside the v0.5.0-beta.1
testnet release and the RM-DOC-1 documentation parity sprint.

The opinions in the closing essay accompanying this series
(`THE_GRADIENT_PAPERS_ARC.md`) are the author's honest opinions
of where the work stands. They are not endorsements; they are a
record of what we know we don't know.
