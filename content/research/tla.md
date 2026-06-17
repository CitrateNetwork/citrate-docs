---
title: The TLA+ formal specification corpus
codex_slug: /research/tla
tier: academic
org_scope: ~
source_kind: linked
source: citrate-agentile-archive/formal/specs/ + per-repo specs/tla/
surfaces: [RES-tla]
audited_against_sha: 4da2289
status: Verified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is the machine-checked half of how Citrate establishes that its protocol is correct: a body of TLA+
specifications, each stating the safety properties of one state machine and checked with the TLC model
checker. It is for researchers and reviewers auditing protocol correctness. We link the corpus here; we do
not copy specs into the docs.

## What it is

A TLA+ specification is the source of truth for a state machine. It declares the legal states and the legal
transitions, then asserts invariants that must hold no matter how the machine moves, for example that no
block finalizes without a valid quorum. The TLC model checker explores the reachable state space and, if an
invariant can be broken, returns the exact sequence of steps that breaks it. This catches a design error
before it becomes code, which is cheaper than catching it after.

Citrate keeps a large corpus of these specifications, organized by domain. The canonical, consolidated tree
lives in the Agentile archive at `citrate-agentile-archive/formal/specs/`, with the authoritative index at
`formal/specs/INDEX.md` and the spec-to-code mapping in `formal/mapping/` (`tla_to_solidity.md`,
`tla_to_slint.md`). A runnable subset is mirrored into each repo under `specs/tla/` so the specs can be
exercised in continuous integration next to the code they constrain. The archive index records the corpus
as 121 authored specifications across twelve domains; take current counts, invariant totals, and TLC
outcomes from `INDEX.md` and the per-repo `VERIFICATION_REPORT.txt`, not from older summary files, since the
corpus has grown over time.

## How to use it

The specs are checked with TLC, which needs Java and `tla2tools.jar`. The convention across repos is a
`run_all.sh` driver in `specs/tla/` that auto-downloads the checker if it is missing and runs every
`<spec>.tla` that has a matching `<spec>.cfg` in the domain subdirectories.

```bash
# Run the local runnable subset (one config per spec, four workers)
cd specs/tla && bash run_all.sh

# Deep verification (more workers, long timeout), run on demand
cd specs/tla && bash run_deep.sh

# A single spec
java -jar tla2tools.jar -config consensus/GhostDAGConsensus.cfg \
                        consensus/GhostDAGConsensus.tla
```

`run_all.sh` runs the standard sweep, one `.cfg` per spec. Additional parameter configs (for example
`<spec>_medium.cfg` or `<spec>_liveness.cfg`) are deep verifications driven by `run_deep.sh` on demand, not
by the standard sweep. The rule for when a spec is required lives in `FORMAL_VERIFICATION_RULES.md`: it must
be written for any change to consensus, finality, or proposer election; it should be written for
state-machine or economic-rule changes and new protocol flows; it may be written for complex data-structure
or interface-state invariants.

## Reference

The corpus is grouped by domain. The table below names real specifications you will find in the canonical
tree; `INDEX.md` carries the full per-domain list and invariant counts.

| Domain | What it constrains | Representative specs |
|---|---|---|
| consensus | Blue-set ordering, VRF proposer election, finality, the concurrent executor | `GhostDAGConsensus.tla`, `VRFElection.tla`, `VRFChainContinuity.tla`, `PrevrandaoPipeline.tla`, `ExecutorMVCC.tla`, `GhostDAGAuditAnchor.tla` |
| zk and halo2 | Proof lifecycle, verifying-key management, verifier version monotonicity | `ZKProofLifecycle.tla`, `ZKKeyManagement.tla`, `Halo2VerifierVersionMonotonic.tla` |
| learning | OODA cycle, adapter provenance, paraconsistent aggregation, mentor selection, checkpointing | `OODACycle.tla`, `AdapterProvenance.tla`, `ParaconsistentAggregation.tla`, `BelnapLattice.tla`, `MentorSelection.tla`, `StrobilationCheckpoint.tla` |
| contracts | Trust scoring, the spec registry, inference-request lifecycle, role-escalation grants | `TrustScoring.tla`, `SpecRegistryLifecycle.tla`, `InferenceRequestLifecycle.tla`, `RoleEscalationGrant.tla` |
| compute | Settlement, batch-inference escrow, data and pipeline parallel jobs, disputes | `X402FacilitatorSettle.tla`, `GatewayBatchLifecycle.tla`, `DataParallelTrainingJob.tla`, `DisputeResolution.tla` |
| agent | Approval, break-glass, capability grants, emergency stop, append-only trails | `ApprovalStateMachine.tla`, `BreakGlass.tla`, `CapabilityGrantLifecycle.tla`, `EmergencyStopProtocol.tla`, `TrailAppendOnly.tla` |
| gui | Desktop state machines: auth, account session, send and deploy flows, role-escalation timer | `AuthStateMachine.tla`, `WalletSessionLifecycle.tla`, `SendTransactionFlow.tla`, `ContractDeploymentFlow.tla`, `RoleEscalationTimer.tla` |
| network | Peer handshake, block sync, mempool gossip and routing | `P2PPeerHandshake.tla`, `BlockSyncProtocol.tla`, `MempoolGossipProtocol.tla` |
| iot | Inter-organizational envelope transfer, sub-secret derivation | `InterOrgEnvelopeChain.tla`, `HKDFSubSecretDerivation.tla` |
| account | Key lifecycle, signing, recovery safety, session limits | `WalletKeyLifecycle.tla`, `TransactionSigningFlow.tla`, `MnemonicRecoverySafety.tla`, `SessionRateLimiting.tla` |

The archive also carries `legacy-gui` and `audit-archive` trees, historical specs from the 2026-03 security
deep audit, which are excluded from the authored count.

Per-repo runnable subsets sit next to the code they govern:

- `citrate-agentile-archive/formal/specs/<domain>/`, the canonical corpus, authoritative for counts.
- `citrate-chain/specs/tla/{consensus,zk,learning,contracts,compute,gui}/`, with `run_all.sh`,
  `run_deep.sh`, and `VERIFICATION_REPORT.txt`; the chain README notes this is a runnable subset, not the
  authority for counts.
- `citrate-explorer/specs/tla/` (for example `SelectedParentReconcile.tla`).
- `citrate-memories/specs/` (`Authz.tla`, `Ingestion.tla`, `SupersededDag.tla`, with `check.sh`).
- `citrate-comms/formal/` (`AuditChainIntegrity.tla`, `RelayCommitOrder.tla`).

The spec registry that records which spec governs which surface is documented under
[governance](/contracts/governance); the methodology that says when to write a spec is in the
[workflow](/methodology/workflow). The behavioral counterpart, what the system does rather than what states
it may occupy, is the [BDD library](/research/bdd).

## Design rationale

We separate two questions on purpose. A TLA+ spec answers "can this state machine ever reach a bad state",
which a model checker can decide by exhaustive search of an abstract model. A behavior test answers "does
the running code do the right thing on this input". Keeping the abstract model in TLA+ lets us find ordering
and concurrency bugs, the ones that hide between valid steps, before any code exists, and the spec-to-code
mapping keeps the model honest about what it actually constrains. The cost is that a spec is an abstraction
and can drift from the code; the mapping files and the per-repo runnable subsets exist to keep that drift
visible.

## Access and canon

Academic tier. The specifications are abstract state machines; no keys, hostnames, or credentials appear in
the corpus or on this page. We link the specs and their indices rather than copy them, so the `.tla` and
`.cfg` files and the TLC run artifacts remain the truth in their repositories.

## Source and verification

- Source: `citrate-agentile-archive/formal/specs/` (canonical) plus the per-repo `specs/tla/` runnable
  subsets named above.
- Audited against SHA: `4da2289` (citrate-agentile-archive); per-repo subsets pinned at each repo's HEAD,
  for example citrate-chain at `03d7851`.
- Status: Verified for specs the index records as TLC-checked, for example `ExecutorMVCC.tla` (checked at
  Small, Liveness, and Medium configurations, with a deep run reported clean) and
  `Halo2VerifierVersionMonotonic.tla` (four invariants). The corpus as a whole is Specified and being
  checked spec by spec; consult `INDEX.md` and `VERIFICATION_REPORT.txt` for the current outcome of any one
  spec.
