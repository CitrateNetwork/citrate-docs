---
title: The TLA+ Formal Specification Corpus
codex_slug: /research/tla
tier: academic
org_scope: ~
source_kind: linked
source: citrate-agentile-archive/formal/
surfaces: [RES-tla]
audited_against_sha: 4da2289
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The TLA+ Formal Specification Corpus

> Citrate's machine-checked formal models. Each spec states safety (and
> sometimes liveness) invariants and is verified with the TLC model checker.
> For researchers and reviewers auditing protocol correctness. Codex **links**
> the corpus; it does not copy specs.

## Overview

Citrate maintains a large body of TLA+ specifications that pin down the
correctness properties of its protocol, contracts, learning loop, and UI state
machines. The canonical, consolidated corpus lives in the Agentile archive at
[`citrate-agentile-archive/formal/specs/`](../../../citrate-agentile-archive/formal/specs/);
the detailed, current index is
[`formal/specs/INDEX.md`](../../../citrate-agentile-archive/formal/specs/INDEX.md).
A per-repo runnable subset is mirrored into each repo's `specs/tla/` so specs
can be exercised in CI alongside the code they constrain.

A TLA+ spec is the source of truth for a state machine: it declares the legal
states and transitions, then asserts invariants (e.g. "no finalize without a
valid quorum"). TLC explores the reachable state space and reports any
invariant violation as a counterexample trace. This catches design bugs before
they reach code — and the spec→code mapping is recorded in
[`formal/mapping/`](../../../citrate-agentile-archive/formal/mapping/)
(`tla_to_solidity.md`, `tla_to_slint.md`).

> **Honest count.** Legacy summary files cite varying totals (101 vs 121) as
> the corpus grew. Always take current spec counts, invariant totals, and TLC
> outcomes from the canonical `formal/specs/INDEX.md` and the per-repo
> `VERIFICATION_REPORT.txt` — not from older summaries.

## Domains

The corpus is organized by domain. The canonical `INDEX.md` groups specs as:

| Domain | What it constrains | Representative specs |
|--------|--------------------|----------------------|
| **consensus** | GhostDAG blue-set correctness, VRF proposer election, finality, prevrandao pipeline | `GhostDAGConsensus`, `VRFElection`, `VRFChainContinuity`, `PrevrandaoPipeline` |
| **zk** | ZK proof lifecycle, verifying-key management, Halo2-KZG version monotonicity | `ZKProofLifecycle`, `ZKKeyManagement`, `Halo2VerifierVersionMonotonic` |
| **learning** | OODA cycle phases, adapter provenance, paraconsistent aggregation, mentor selection | `OODACycle`, `AdapterProvenance`, `ParaconsistentAggregation`, `MentorSelection` |
| **contracts** | Trust scoring, spec-registry lifecycle, inference-request lifecycle | `TrustScoring`, `SpecRegistryLifecycle`, `InferenceRequestLifecycle` |
| **compute** | x402 server-side settlement, batch-inference gateway escrow | `X402FacilitatorSettle`, `GatewayBatchLifecycle` |
| **gui** | Desktop/Slint state machines — auth, wallet session, navigation, send/deploy flows | `AuthStateMachine`, `WalletSessionLifecycle`, `SendTransactionFlow`, `ContractDeploymentFlow` |
| **network** | P2P/transport state machines | network domain specs |
| **agent** | Agent-harness safety — approval, grants, trails, sidecars, e-stop (Belnap lattice, Byzantine detection) | `BelnapLattice`, `ByzantineDetection`, `SafetyInvariant` |

Additional domains in the canonical tree: **iot** (inter-organizational
transfer), **halo2**, **wallet**, plus **legacy-gui** and **audit-archive**
(historical / from the 2026-03 security deep audit). See `INDEX.md` for the
authoritative per-domain spec list and invariant counts.

## How to run

Specs are checked with TLC (the TLA+ model checker; Java 11+ and
`tla2tools.jar`). The convention across repos is a `run_all.sh` driver in
`specs/tla/`:

```bash
# Run the local runnable subset (single category sweep, 4 workers)
cd specs/tla && bash run_all.sh

# Deep verification (more workers, long timeout) — run on demand
cd specs/tla && bash run_deep.sh

# A single spec
java -jar tla2tools.jar -config consensus/GhostDAGConsensus.cfg \
                        consensus/GhostDAGConsensus.tla
```

`run_all.sh` auto-downloads `tla2tools.jar` if missing and picks up any
`<spec>.tla` that has a matching `<spec>.cfg` in the category subdirs.
Additional parameter cfgs (e.g. `<spec>_medium.cfg`, `<spec>_liveness.cfg`) are
deep verifications run on demand via `run_deep.sh`, not by the standard sweep.

When to add a spec (per `FORMAL_VERIFICATION_RULES.md`): **MUST** for any change
to consensus, finality, or proposer election; **SHOULD** for state-machine or
economic-rule changes and new protocol flows; **MAY** for complex data-structure
or UI-state invariants.

## Where specs live (per repo)

- **Canonical corpus:** `citrate-agentile-archive/formal/specs/<domain>/` —
  authoritative for counts and coverage. Index: `formal/specs/INDEX.md`.
- **citrate-chain:** `specs/tla/{consensus,zk,learning,contracts,compute,gui}/`
  with `run_all.sh`, `run_deep.sh`, and `VERIFICATION_REPORT.txt`. The chain
  README notes this is a runnable subset and is not authoritative for counts.
- **citrate-explorer:** `specs/tla/`.
- **citrate-memories:** `specs/` (e.g. `Authz.tla`, `Ingestion.tla`,
  `check.sh`).
- GUI specs additionally live under `gui/citrate_gui_v2/specs/` and
  `specs/gui/` in the chain repo.

## Source & verification

- **Source:** `citrate-agentile-archive/formal/` (canonical) plus per-repo
  `specs/tla/` runnable subsets.
- **Audited against SHA:** `4da2289` (citrate-agentile-archive). Per-repo
  subsets pinned at each repo's HEAD (e.g. citrate-chain `03d7851`).
- **Rule 9 (link, don't copy):** Codex links the specs and their indices; the
  `.tla`/`.cfg` files and TLC run artifacts remain the truth in their repos.
- **No secrets.** Specs are abstract state machines; no keys, hostnames, or
  credentials appear in the corpus or this page.
