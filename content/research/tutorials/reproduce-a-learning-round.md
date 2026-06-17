---
title: "Tutorial: Reproduce a Learning Round"
codex_slug: /research/tutorials/reproduce-a-learning-round
tier: academic
org_scope: ~
source_kind: authored
source: citrate-chain/core/learning/ (tests + LearningPipeline)
surfaces: [RES-learning]
audited_against_sha: 03d7851
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Tutorial: Reproduce a Learning Round

> Run a complete federated learning round — propose → aggregate → verify →
> route → checkpoint — locally against the `citrate-learning` crate, and read
> the Belnap state vector and LoRA adapter it produces. For researchers.

This tutorial runs the **real** learning engine that ships in `citrate-chain`.
It does not require a running node — the engine is exercised by the crate's own
end-to-end tests and by a short program you can paste into a test. Everything
below maps 1:1 to the concepts in [Federated learning cycles](/research/learning)
and [Paraconsistent consensus](/research/paraconsistent).

## Prerequisites

- A Rust toolchain (`rustup`, stable) — `cargo --version` should work.
- A local checkout of `citrate-chain` at SHA `03d7851` (or later).
- ~5 minutes.

## Step 1 — Build and run the learning test suite

The crate already contains the full pipeline as tests. Confirm it builds and the
propose→aggregate→route→adapt path passes:

```bash
cd citrate-chain
cargo test -p citrate-learning
```

You should see the unit + integration suite pass (the crate README reports 272
tests). The ones that matter for a learning round live in:

- `core/learning/tests/e2e_ooda_pipeline.rs` — full OODA cycle across 3
  participants (aggregation, Belnap classification, routing, LoRA, safety,
  Byzantine detection, persistence).
- `core/learning/tests/belnap_adversarial.rs` — disagreement handling.
- `core/learning/tests/lora_provenance.rs` — adapter provenance chain.

To run just the end-to-end pipeline:

```bash
cargo test -p citrate-learning --test e2e_ooda_pipeline
```

## Step 2 — Run one round yourself

Add this as a test (e.g. `core/learning/tests/my_round.rs`) and run it. It walks
the five stages explicitly. The API is taken directly from
`core/learning/src/phases.rs::LearningPipeline`.

```rust
use citrate_learning::aggregation::AggregationInput;
use citrate_learning::config::LearningConfig;
use citrate_learning::embeddings::EmbeddingVector;
use citrate_learning::phases::{LearningPipeline, MacroPhaseManager};

#[test]
fn reproduce_a_learning_round() {
    let dim = 4;

    // Config: tiny so it's fast; FullSystem after one good checkpoint.
    let config = LearningConfig {
        embedding_dimensions: dim,
        lora_rank: 2,
        macro_confidence_threshold: 0.5,
        macro_loss_threshold: 0.5,
        macro_consecutive_checkpoints: 1,
        ..LearningConfig::default()
    };

    let mut pipeline = LearningPipeline::new(&config);
    let mut macro_mgr = MacroPhaseManager::new(config.clone());

    // --- PROPOSE: three participants each propose an embedding + confidence ---
    let e1 = EmbeddingVector::new(vec![0.9, 0.8, 0.7, 0.6]).expect("e1");
    let e2 = EmbeddingVector::new(vec![0.85, 0.75, 0.65, 0.55]).expect("e2");
    let e3 = EmbeddingVector::new(vec![-0.8, 0.7, 0.66, 0.50]).expect("e3"); // dim 0 disagrees
    let conf = vec![0.9; dim];
    let query = EmbeddingVector::new(vec![0.5; dim]).expect("query");

    let input = AggregationInput {
        embeddings: &[&e1, &e2, &e3],
        confidences: &[&conf, &conf, &conf],
        blue_scores: &[1.0, 1.0, 1.0], // trust weights from consensus
        temperature: 1.0,
        theta_high: 0.8,
        theta_low: 0.3,
    };

    // --- ORIENT / AGGREGATE: dual output = embedding + Belnap state vector ---
    let agg = pipeline.orient(&input).expect("aggregate");
    println!("aggregated embedding: {:?}", agg.embedding);
    println!("Belnap state vector : {:?}", agg.state_vector); // expect B on dim 0

    // --- DECIDE / ROUTE: router consumes the state vector, not just the mean ---
    let decision = pipeline.decide(&query, &agg).expect("route");
    println!("routed to destination: {}", decision.selected);

    // --- CHECKPOINT / ACT: advance macro-phase, then produce a LoRA adapter ---
    macro_mgr.evaluate_checkpoint(0.8, Some(0.2)); // drive toward FullSystem
    let result = pipeline
        .execute_cycle(&query, &input, macro_mgr.can_adapt(), [1u8; 32], 100)
        .expect("cycle");

    if let Some(adapter) = result.adapter {
        println!("LoRA adapter dim={} rank={}", adapter.dim, adapter.rank);
        assert_eq!(adapter.dim, dim);
    }
}
```

Run it:

```bash
cargo test -p citrate-learning --test my_round -- --nocapture
```

## Step 3 — Read what happened

- **Dimension 0** had one strongly-negative contributor and two positive ones, so
  its Belnap state should resolve to **B (Both)** — the network *records the
  disagreement* instead of averaging it to a misleading near-zero. This is the
  whole point of [paraconsistent aggregation](/research/paraconsistent).
- The **router** received `(query, aggregated_embedding, state_vector)` — it can
  route B-state dimensions to multiple downstream destinations rather than
  trusting a fictional mean.
- The **adapter** is only produced once `macro_mgr.can_adapt()` is true (the
  `FullSystem` macro-phase). In `Collection`/`RoutingActive` the `Act` stage
  produces no adapter — verify by passing `false` to `execute_cycle`.

## Step 4 — (Optional) See the safety invariant

The learning round must never change execution state. The `SafetyGuard`
(`core/learning/src/safety.rs`) enforces that the state root is identical whether
learning is on or off. The property is checked by the crate's safety tests:

```bash
cargo test -p citrate-learning safety
```

## What you reproduced

You ran the same five stages a live checkpoint runs — propose, aggregate
(paraconsistent dual output), verify (Byzantine detection in the e2e test),
route, and the deterministic checkpoint `learning_root`
(`core/learning/src/orchestration.rs`). The difference from a live network is
the source of embeddings (here, hand-written; on-chain, gossiped from finalized
blocks) and the wiring into the node binary — which is the
[current integration frontier](/research/learning#honest-status).

## Source & verification

- **Engine:** `citrate-chain/core/learning/` @ `03d7851`. Pipeline API:
  `src/phases.rs::LearningPipeline`. Aggregation:
  `src/aggregation.rs::ParaconsistentAggregator`. Belnap:
  `src/belnap.rs`. Checkpoint root: `src/orchestration.rs`.
- **Reference tests:** `tests/e2e_ooda_pipeline.rs`,
  `tests/belnap_adversarial.rs`, `tests/lora_provenance.rs`.
- **No secrets in this tutorial.** No keys, endpoints, or credentials.
