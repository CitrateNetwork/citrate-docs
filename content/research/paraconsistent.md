---
title: Paraconsistent Consensus (Belnap Four-Valued Logic)
codex_slug: /research/paraconsistent
tier: academic
org_scope: ~
source_kind: linked
source: citrate-docs/gradient_papers_v3/Gradient_Papers_No2_Paraconsistent_Consensus_v3.md
surfaces: [RES-paraconsistent]
audited_against_sha: 03d7851
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Paraconsistent Consensus

> Disagreement as information. How Citrate aggregates embeddings across nodes
> using Belnap's four-valued logic instead of averaging conflict away. Summary +
> link to Gradient Paper II.

## Overview

Classical BFT treats disagreement as a defect: honest nodes must converge on a
single value. **Paraconsistent consensus** refuses that frame. It treats
disagreement as *information about the network's epistemic state*, and a system
that averages it away throws out the very data that distinguishes a healthy
decentralized network from a collapsed one. The protocol runs **on top of** the
GhostDAG/BFT checkpoint mechanism: each checkpoint is a synchronization barrier
not just for blocks but for routing weights, adapter registrations, and embedding
aggregations.

## Concept, Belnap FOUR

Nuel Belnap's 1977 four-valued logic admits four truth values, each with a
network meaning:

| Value | Reading | Network meaning |
|---|---|---|
| **T** | True | all known sources agree this dimension is positive |
| **F** | False | all known sources agree it is negative |
| **B** | Both | sources disagree, contradictory information |
| **N** | Neither | no source has spoken, unknown |

Classical aggregation (mean / median / weighted average) collapses **B** and
**N** into the T/F continuum. Paraconsistent aggregation **preserves** them. If
node A's data says dimension 47 should be `+0.8` and node B's says `-0.6`, the
mean (`+0.1`) is right for neither, it is the projection onto a fictional
consensus. The paraconsistent answer is "dimension 47 is in state **B** for this
checkpoint; route queries that activate it to multiple sources for
cross-validation, not to the mean." This matters precisely when node data
distributions genuinely differ (personalized models, regional dialects,
domain-specialist adapters).

The aggregation rule produces **two** outputs per dimension: a Belnap state
*computed independently* of the embedding, and a weighted mean restricted to
consenting sources (a pair for `B`, undefined for `N`). The routing model
receives the enriched representation, not a flat scalar.

## How it maps to the network

- **Implemented in code, not just on paper.** The `citrate-learning` crate
  implements the Belnap FOUR lattice (`belnap.rs`: `BelnapValue` with
  `join`/`meet`/`negation`, the `classify_belnap` classification function, and
  `reduce_belnap_states`), and a **dual-output** `ParaconsistentAggregator`
  (`aggregation.rs`) returning `(embedding, state_vector, confidence)`. Property
  tests verify the lattice laws.
- **Trust weights from consensus.** Per-source weights are
  `softmax(blue_score / τ)`, see `belnap.rs::blue_scores_to_trust_weights`.
- **Checkpoint-aligned.** Validators co-sign learning roots at the checkpoint
  barrier (~50× cheaper than per-block voting), so learning **safety inherits
  from BFT safety** and **liveness inherits from GhostDAG liveness**. The
  load-bearing claim: *consensus and learning are the same process at different
  time scales*.
- **Q16 substrate.** The paper proposes a Belnap aggregation precompile in the
  Q16 quantized-inference range so in-circuit aggregation is bit-deterministic, see [verifiable inference](/research/verifiable-inference).

## Honest status

The on-chain `LearningPool` / `LearningCycleManager` state machines and the
`LoRAFactory` are implemented. The **Belnap aggregation as a precompile** (the
paper proposes address `0x0110`) and the **extended `learning_payload` block /
checkpoint fields** are **specified, not yet in the consensus structs** (the
`RM-PARA-1` sprint). The paraconsistent aggregator itself **is implemented at the
crate level** and tested, ahead of where the April paper's reality-check table
shows it. The paper's three experimental hypotheses (aggregation quality,
adapter-composition power law, Byzantine convergence) are **specified
experiments, not yet run**. Treat the logic and crate engine as real; treat live
federated paraconsistent rounds on testnet as the frontier.

## Source & verification

- **Paper (linked, not copied):**
  `citrate-docs/gradient_papers_v3/Gradient_Papers_No2_Paraconsistent_Consensus_v3.md`.
- **Code anchors (citrate-chain @ `03d7851`):** `core/learning/src/belnap.rs`,
  `core/learning/src/aggregation.rs`, `core/learning/src/knowledge.rs`;
  `core/consensus/src/finality.rs` (checkpoint barrier; learning fields not yet
  added). Tests: `core/learning/tests/belnap_adversarial.rs`.
- **Belnap-q16 lattice aggregation precompile (proposed):** registry surface
  `CHAIN-pre-q16` (`/chain/precompiles#q16`), specified, not yet implemented.
- **Related:** [Federated learning cycles](/research/learning),
  [The Mentorship Protocol](/research/mentorship),
  [Verifiable inference](/research/verifiable-inference).
- **No secrets on this page.**
