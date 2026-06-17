---
title: Federated Learning Cycles
codex_slug: /research/learning
tier: academic
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/learning/ (+ core/learning-daemon/)
surfaces: [RES-learning]
audited_against_sha: 03d7851
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Federated Learning Cycles

> How Citrate runs a learning round, propose → train → aggregate → verify →
> checkpoint, on top of GhostDAG consensus, without ever touching consensus
> state. For researchers and protocol engineers.

## Overview

Citrate's thesis is that **distributed consensus and distributed learning are
the same process at different time scales** (Gradient Paper II). The mechanism
that realizes this is the `citrate-learning` crate: a checkpoint-synchronized
federated learning layer that rides *alongside* the chain. Nodes contribute
embedding vectors with per-dimension confidence; at each BFT checkpoint these
are aggregated using **paraconsistent (Belnap four-valued) aggregation**, routed
through a small MLP, and, once the network reaches its full phase, distilled
into LoRA adapters with on-chain provenance.

The single most important property is the **safety invariant** (Theorem 3): for
any block `B`, the state root after executing `B`'s transactions is identical
whether the learning pipeline is enabled or disabled. Learning **reads** from
consensus (blue scores, finality checkpoints, finalized embeddings) and never
**writes** to transaction execution, block ordering, or the state root. The
learning output is committed as a separate `learning_root` hash that is
provably independent of the state root.

## Concept, the learning cycle

A learning round is a five-stage pipeline aligned to consensus checkpoints
(default interval ~10 blocks). The crate models two nested loops:

1. **Macro-phase** (network-wide, long-lived): `Collection → RoutingActive →
   FullSystem`. The network only generates adapters once it has spent enough
   checkpoints accumulating confident embeddings and a trained router.
2. **OODA micro-cycle** (per checkpoint, ~seconds): `Observe → Orient → Decide
   → Act`.

The five conceptual stages map onto the OODA cycle and the checkpoint barrier:

| Stage | What happens | Code |
|---|---|---|
| **Propose** | Each participating node serves a reference input through its local model and proposes an embedding + per-dimension confidence vector (the **Observe** phase collects these). | `orchestration.rs::PeerEmbedding`, `phases.rs::OodaPhase::Observe` |
| **Train** | The MLP router takes a `train_step` against routing targets; the aggregated embedding seeds adapter creation. | `routing.rs::Router::train_step`, `phases.rs::LearningPipeline` |
| **Aggregate** | Embeddings are combined by the **dual-output** paraconsistent aggregator → `(aggregated_embedding, Belnap state_vector, confidence)`. The **Orient** phase. | `aggregation.rs::ParaconsistentAggregator`, `belnap.rs::classify_belnap` |
| **Verify** | Byzantine detection flags statistical outliers and Belnap-inconsistent contributors before they pollute the aggregate. | `verification.rs::ByzantineDetector` |
| **Checkpoint** | At the BFT boundary, a deterministic `learning_root = SHA3-256(embedding ‖ state_vector ‖ height)` is computed for the block header, provably independent of `state_root`. The **Act** phase optionally emits a LoRA adapter. | `orchestration.rs::LearningOrchestrator::run_checkpoint_aggregation`, `checkpoint.rs::LearningCheckpoint` |

## How it maps to the network

- **Trust weights come from consensus.** Blue scores from GhostDAG are folded
  into aggregation as `softmax(blue_score / τ)` trust weights, a node that
  cannot keep up with consensus carries little weight in learning
  (`belnap.rs::blue_scores_to_trust_weights`).
- **Disagreement is preserved, not averaged away.** The aggregator emits a
  Belnap state per dimension (`T`/`F`/`B`/`N`); a `B` ("both") dimension tells
  the router to consult multiple sources rather than trust a fictional mean. See
  [Paraconsistent consensus](/research/paraconsistent).
- **Adapters carry provenance.** LoRA adapters produced in the `Act` phase carry
  a `ProvenanceChain` (`adapters.rs`) and are intended for on-chain registration
  via `LoRAFactory` and reward routing via `ContributionAccounting`. See
  [the Mentorship Protocol](/research/mentorship).
- **The daemon drives the loop.** `core/learning-daemon/` (`orchestrator.rs`,
  `watcher.rs`, `aggregator.rs`, `finalizer.rs`) watches finality events and
  runs aggregation off the hot consensus path.

## Honest status

The `citrate-learning` **crate** is implemented and heavily tested (the crate
README reports 272 tests, including `proptest` property tests for the Belnap
lattice laws and the safety invariant; integration tests cover the OODA
pipeline, Belnap adversarial cases, LoRA provenance, and federation e2e). What
is implemented at crate level today:

- Belnap FOUR lattice + `classify_belnap` classification function;
- dual-output `ParaconsistentAggregator` (embedding + state vector +
  confidence);
- MLP router that **takes the Belnap state vector as input**;
- macro-phase + OODA phase state machines;
- `LearningOrchestrator` producing a deterministic `learning_root`;
- `SafetyGuard` enforcing the state-root invariant; Byzantine detection.

**What is still the frontier:** full wiring into the node binary and consensus
checkpoint struct, and live federated rounds on testnet. The 2026-03 architecture
note (`core/learning/ARCHITECTURE.md`) catalogues the original sprint gaps; many
of its "CRITICAL" gaps (φ classification, dual-output aggregation, router state
vector, macro-phase split) have since landed in the crate, but the
end-to-end *on-chain* learning round is **specified + partially integrated**, not
yet a production network feature. Treat this page as documenting a real,
tested learning engine whose chain integration is in progress.

This is also why the registry tier is `academic`: the mechanism is a research
contribution and the orchestration is not yet a finished product surface.

## Source & verification

- **Source repo / path:** `citrate-chain/core/learning/` (engine) and
  `citrate-chain/core/learning-daemon/` (loop driver).
- **Audited against SHA:** `03d7851`.
- **Key files:** `phases.rs` (OODA + macro-phase + `LearningPipeline`),
  `aggregation.rs` (dual-output aggregator), `belnap.rs` (FOUR lattice +
  `classify_belnap`), `orchestration.rs` (`LearningOrchestrator`,
  `learning_root`), `safety.rs` (Theorem 3 `SafetyGuard`), `verification.rs`
  (Byzantine detection), `adapters.rs` (LoRA + provenance), `checkpoint.rs`.
- **Formal specs referenced in code:** `specs/tla/StrobilationCheckpoint.tla`
  (INV-2 learning-root determinism, INV-4 state-root independence, INV-5
  embedding quorum).
- **Paper:** [Gradient Paper II, Paraconsistent Consensus](/research/paraconsistent).
- **No secrets on this page.** No keys, endpoints, or credentials.
