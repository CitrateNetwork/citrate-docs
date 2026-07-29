---
title: Citrate Orchard, federated learning cycles
codex_slug: /research/learning
tier: academic
org_scope: ~
source_kind: authored
source: citrate-chain/core/learning/
surfaces: [RES-learning]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate Orchard is the part of the network where models learn together without their training data leaving the machines that hold it. This page explains the learning cycle, how its result is recorded, and where the engine ends and the on-chain wiring is still ahead of us. It is written for researchers and protocol engineers.

## What it is

A model on Citrate does not learn by gathering everyone's data into one place. Each node serves a reference input through its own local model and publishes the result of that, an embedding vector with a per-dimension confidence, never the data behind it. Many nodes do this; their published vectors are combined into one shared learning state. The raw material stays on the hardware that produced it, in keeping with the on-premise default that holds across the network.

The combining happens on a rhythm. The chain reaches a checkpoint on a fixed cadence, and each checkpoint is the moment the published vectors are gathered and reduced. The engine that does this work lives in the `citrate-learning` crate. It runs alongside the chain: it reads from consensus, blue scores and finalized embeddings, and it writes nothing back into transaction execution or block ordering.

The single load-bearing property is that the learning result is recorded separately from the ledger's state. At each checkpoint the engine produces a `learning_root`, a hash of the aggregated learning state. That root is independent of the `state_root`: changing one cannot change the other. We return to this below, because it is what lets learning ride alongside consensus without ever endangering it.

## How to use it

You do not call the learning engine directly the way you call an RPC method; it runs inside a node at checkpoint boundaries. To exercise it yourself, the most direct path is to drive the pipeline in a short Rust program, which is exactly what the companion tutorial walks through.

1. Read this page for the model, then [reproduce a learning round](/research/tutorials/reproduce-a-learning-round) to run the four phases end to end against the real crate.
2. To understand how a checkpoint becomes a synchronization point for both blocks and learning, read [the checkpoint mechanism](/chain/consensus), where the `state_root` independence invariant (INV-4) is defined.
3. To see how disagreement between nodes is preserved rather than averaged away, read [paraconsistent aggregation](/research/paraconsistent).
4. To see where the published embeddings come from in production, read [the compute pool](/compute/pool) and [the operator dashboard](/apps/dashboard).

## The learning cycle and its four phases

A learning round moves through four phases, named in the code as the `OodaPhase` enum: Observe, Orient, Decide, Act. They are the four phases of the learning cycle, and they run once per checkpoint.

| Phase | What happens | Code |
|---|---|---|
| Observe | Each participating node serves a reference input through its local model and submits an embedding with a per-dimension confidence. | `phases.rs::OodaPhase::Observe`, `orchestration.rs::PeerEmbedding` |
| Orient | The submitted embeddings are combined by the dual-output aggregator into an aggregated embedding, a Belnap state vector, and a confidence. | `phases.rs::LearningPipeline::orient`, `aggregation.rs::ParaconsistentAggregator` |
| Decide | A small multilayer-perceptron router reads the query, the aggregated embedding, and the state vector, and chooses a destination. | `phases.rs::LearningPipeline::decide`, `routing.rs::MlpRouter` |
| Act | If the network has matured enough, a LoRA adapter is produced from the aggregated embedding; otherwise nothing is emitted. | `phases.rs::LearningPipeline::act`, `adapters.rs::AdapterFactory` |

Above this per-checkpoint cycle sits a slower, network-wide progression, the macro-phase: `Collection`, then `RoutingActive`, then `FullSystem` (`phases.rs::NetworkLearningPhase`). The network only starts routing once it has accumulated confident embeddings across enough checkpoints, and only starts producing adapters once the router's loss has settled. The Act phase produces an adapter only in `FullSystem`. The transition rule is in `MacroPhaseManager::evaluate_checkpoint`: a fixed number of consecutive checkpoints must clear a confidence threshold to advance to `RoutingActive`, then clear a loss threshold to reach `FullSystem`. `FullSystem` is terminal.

## How the cycle records its result

When a checkpoint height is reached, `LearningOrchestrator::run_checkpoint_aggregation` gathers the local embedding and the peer embeddings, drops any that fail validation, and checks quorum. If fewer than the configured minimum of valid embeddings are present, it returns a zero `learning_root` rather than an error, which matches the quorum invariant (INV-5) in the formal spec. With quorum met, it runs the aggregation and computes:

```text
learning_root = SHA3-256( aggregated_embedding (f32 LE) || state_vector (1 byte each) || checkpoint_height (u64 LE) )
```

The `learning_root` is a separate field on the block header (`core/consensus/src/types.rs`). The block's own hash, `Block::compute_hash`, deliberately excludes it: it hashes the header, the `state_root`, the transaction root, the receipt root, and the artifact root, and not `learning_root`. This is the independence property in concrete terms, two blocks identical except for their `learning_root` produce the same `compute_hash`, so the learning result can never alter the ledger's state or the ordering of blocks. The consensus crate labels this invariant INV-4, StateRootIndependent, and verifies it against the TLA+ spec `StrobilationCheckpoint.tla`.

One honest note on the hash. An earlier draft of this page described `learning_root` as MiMC-hashed. The code uses SHA3-256, chosen specifically to avoid a circular dependency with the execution crate's MiMC implementation; the determinism guarantee, same inputs always yield the same root, is identical either way (`orchestration.rs::compute_learning_root`).

## Reference

The surface of the `citrate-learning` crate, with source paths. All paths are relative to `citrate-chain/core/learning/src/`.

| Item | Kind | Source |
|---|---|---|
| `OodaPhase` | enum, the four phases Observe / Orient / Decide / Act | `phases.rs` |
| `PhaseManager` | per-checkpoint phase transitions | `phases.rs` |
| `NetworkLearningPhase`, `MacroPhaseManager` | network-wide macro-phase progression | `phases.rs` |
| `LearningPipeline` | coordinates orient, decide, act | `phases.rs` |
| `ParaconsistentAggregator::aggregate_paraconsistent` | dual-output aggregation | `aggregation.rs` |
| `AggregationResult` | aggregated embedding, state vector, confidence | `aggregation.rs` |
| `BelnapValue`, `classify_belnap`, `reduce_belnap_states` | four-valued logic, see [paraconsistent](/research/paraconsistent) | `belnap.rs` |
| `EmbeddingVector` | a fixed-dimension vector with L2 norm and cosine similarity | `embeddings.rs` |
| `LearningOrchestrator::run_checkpoint_aggregation` | gather, validate, aggregate, hash | `orchestration.rs` |
| `compute_learning_root` | the SHA3-256 root | `orchestration.rs` |
| `LearningCheckpoint` | the checkpoint record and its learning fields | `checkpoint.rs` |
| `SafetyGuard`, `LearningMode` | enforces the state-root invariant; modes Disabled / Passive / Active | `safety.rs` |

The defaults from `config.rs`: embedding dimension 768, minimum 3 participants, confidence thresholds 0.8 and 0.3, softmax temperature 1.0, LoRA rank 16, and 3 consecutive checkpoints to advance a macro-phase.

## Design rationale

Most learning systems move the data to the model. For a school or a hospital that is not an option, so Citrate moves only the result of local learning, an embedding, and combines those. Tying the combining to consensus checkpoints means learning inherits the chain's safety and liveness for free, and computing a separate `learning_root` rather than folding the result into the `state_root` means a bug or a disagreement in learning can never corrupt the ledger. That separation is the price and the point: learning is a passenger on consensus, never a driver of it.

## Failure modes

- Below quorum, the orchestrator returns a zero `learning_root` rather than aggregating thin data, so a checkpoint with too few participants is recorded as having learned nothing rather than something unreliable.
- Embeddings with the wrong dimension, with non-finite values, with a confidence vector of the wrong length, or with a negative blue score are filtered out before aggregation and logged (`orchestration.rs::validate_embeddings`).
- The `SafetyGuard` keeps learning in one of three modes and audits every transition; in `Disabled` no embeddings are collected, so a node can run consensus with learning fully off and produce a bit-identical `state_root`.

## Access and canon

Academic tier. The learning engine is a research contribution and its on-chain orchestration is not yet a finished product surface, which is why this page sits here rather than under a public surface. No keys, endpoints, or credentials appear on this page. The on-premise default holds: a node publishes embeddings only when its operator has chosen to take part, and identity on the public network is verified through VERI, Citrate's in-house verification.

## Source and verification

- Source: `citrate-chain/core/learning/`, audited against SHA `03d7851`.
- Key files: `phases.rs` (the four phases, macro-phase, pipeline), `aggregation.rs` (dual-output aggregation), `belnap.rs` (four-valued logic), `orchestration.rs` (`LearningOrchestrator`, `compute_learning_root`), `checkpoint.rs` (`LearningCheckpoint`), `safety.rs` (`SafetyGuard`), `embeddings.rs`.
- The block header `learning_root` field and its exclusion from `Block::compute_hash` are in `core/consensus/src/types.rs`; the invariant is INV-4 (StateRootIndependent) against `specs/tla/StrobilationCheckpoint.tla`.
- Status by surface. The `citrate-learning` crate is Implemented (pre-audit), with unit, property, and integration tests across the four phases, the four-valued lattice laws, and the safety invariant. The on-chain wiring, the orchestrator driven by a live block producer and federated rounds on testnet 40204, is Specified, not yet a production feature. Treat this page as documenting a real, tested engine whose chain integration is in progress.
