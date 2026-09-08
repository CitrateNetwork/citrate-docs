---
title: Reproduce a learning round
codex_slug: /research/tutorials/reproduce-a-learning-round
tier: academic
org_scope: ~
source_kind: authored
source: citrate-chain/core/learning/
surfaces: [RES-learning]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A walk-through of one complete learning round, run locally against the real `citrate-learning` crate, so you can watch the four phases produce an aggregated embedding, a Belnap state vector, and a deterministic learning root. For researchers. The crate-level steps run today; the on-chain steps are marked where they are not yet wired.

## What it is

The learning engine that ships in `citrate-chain` is exercised by the crate's own tests, so you can reproduce a round without a running node. You will build the crate, run its end-to-end suite, then write one short test that walks the four phases by hand and prints what each produces. The concepts map one to one to [Citrate Orchard](/research/learning) and [paraconsistent aggregation](/research/paraconsistent).

## How to use it

You need a Rust toolchain (`rustup`, stable; `cargo --version` should work), a checkout of `citrate-chain` at SHA `e68af83` or later, and about five minutes.

### Step 1, build and run the learning suite

The crate already contains the full pipeline as tests. Confirm it builds and the Observe-through-Act path passes.

```bash
cd citrate-chain
cargo test -p citrate-learning
```

The rounds that matter live in these tests:

- `core/learning/tests/e2e_ooda_pipeline.rs`, a full cycle across three participants covering aggregation, Belnap classification, routing, LoRA, safety, and Byzantine detection.
- `core/learning/tests/belnap_adversarial.rs`, disagreement handling.
- `core/learning/tests/lora_provenance.rs`, the adapter provenance chain.

To run just the end-to-end cycle:

```bash
cargo test -p citrate-learning --test e2e_ooda_pipeline
```

### Step 2, run one round yourself

Add the following as `core/learning/tests/my_round.rs`. The API is taken directly from `core/learning/src/phases.rs`. Three participants submit embeddings; participant three disagrees on dimension 0.

```rust
use citrate_learning::aggregation::AggregationInput;
use citrate_learning::config::LearningConfig;
use citrate_learning::embeddings::EmbeddingVector;
use citrate_learning::phases::{LearningPipeline, MacroPhaseManager};

#[test]
fn reproduce_a_learning_round() {
    let dim = 4;

    // Tiny config so the round is fast. One good checkpoint reaches FullSystem.
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

    // --- Observe: three participants each submit an embedding plus confidence ---
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

    // --- Orient: dual output, aggregated embedding plus Belnap state vector ---
    let agg = pipeline.orient(&input).expect("aggregate");
    println!("aggregated embedding: {:?}", agg.embedding);
    println!("Belnap state vector : {:?}", agg.state_vector); // expect Both on dim 0

    // --- Decide: the router reads the state vector, not just the mean ---
    let decision = pipeline.decide(&query, &agg).expect("route");
    println!("routed to destination: {}", decision.selected);

    // --- Act: advance the macro-phase to FullSystem, then produce an adapter ---
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

### Step 3, read what happened

- Dimension 0 had one strongly negative contributor against two positive ones, so its Belnap state resolves to `Both`. The network records the disagreement instead of averaging it to a misleading near-zero. This is the point of [paraconsistent aggregation](/research/paraconsistent).
- The router received the query, the aggregated embedding, and the state vector together, so it can send a contested dimension to several destinations rather than trusting a fictional mean.
- The adapter is produced only once `macro_mgr.can_adapt()` is true, which is the `FullSystem` macro-phase. In `Collection` or `RoutingActive` the Act phase produces no adapter; pass `false` to `execute_cycle` to confirm.

### Step 4, see the learning root

The orchestrator is what a checkpoint actually calls. Add this to the same file to see the deterministic `learning_root` and confirm it is stable across runs.

```rust
use citrate_learning::orchestration::{compute_learning_root};
use citrate_learning::belnap::BelnapValue;

#[test]
fn learning_root_is_deterministic() {
    let embedding = vec![0.1f32, 0.2, 0.3, 0.4];
    let state = vec![
        BelnapValue::True,
        BelnapValue::Neither,
        BelnapValue::Both,
        BelnapValue::False,
    ];
    let root_a = compute_learning_root(&embedding, &state, 100);
    let root_b = compute_learning_root(&embedding, &state, 100);
    assert_eq!(root_a, root_b);          // same inputs, same root (INV-2)
    assert_ne!(root_a, [0u8; 32]);       // and non-trivial
}
```

The root is `SHA3-256(aggregated_embedding || state_vector || checkpoint_height)` (`core/learning/src/orchestration.rs::compute_learning_root`). It is the value a node would place in the block header's `learning_root` field, which is independent of the `state_root`; see [Citrate Orchard](/research/learning) for that invariant.

### Step 5, see the safety invariant

A learning round must never change execution state. The `SafetyGuard` (`core/learning/src/safety.rs`) enforces that the `state_root` is identical whether learning is on or off. The crate's safety tests check it:

```bash
cargo test -p citrate-learning safety
```

### Step 6, the on-chain path, Specified, not yet wired

In production the embeddings are not hand-written; they are gossiped from finalized blocks, and the round is driven by the block producer at a checkpoint height. That wiring is Specified, not yet a running feature, and the relevant surfaces are honest about it:

- The chain id is 40204 (`0x9d0c`); confirm with `eth_chainId`, see [the JSON-RPC reference](/chain/rpc).
- `citrate_getTrainingJob` reads a job from storage by id. `citrate_createTrainingJob` is present but returns a placeholder today (its handler responds with "Training job creation not fully implemented yet" in `core/api/src/server.rs`), so do not expect it to enqueue real work yet.
- The on-chain learning cycle contract `AILearningCycleCorePortable` in `contracts/src/edu/ai-gateway/` models the same shape on chain, `openCycle`, `joinCycle`, `startCollecting`, `submitCommitment`, `startAggregating`, `recordAdapter`, `finalizeCycle`, and is the intended home for the cycle state once the node wiring lands.

## What you reproduced

You ran the four phases a live checkpoint runs, Observe, Orient with paraconsistent dual output, Decide, and Act, and you computed the deterministic `learning_root` the same way the orchestrator does. The difference from a live network is the source of the embeddings, hand-written here against gossiped on chain, and the node wiring, which is the integration frontier described on [Citrate Orchard](/research/learning).

## Source and verification

- Engine: `citrate-chain/core/learning/` at SHA `e68af83`. Pipeline API in `src/phases.rs`; aggregation in `src/aggregation.rs`; four-valued logic in `src/belnap.rs`; the root in `src/orchestration.rs`.
- Reference tests: `tests/e2e_ooda_pipeline.rs`, `tests/belnap_adversarial.rs`, `tests/lora_provenance.rs`.
- On-chain surfaces named above: `core/api/src/server.rs` (`citrate_createTrainingJob`, `citrate_getTrainingJob`) and `contracts/src/edu/ai-gateway/AILearningCycleCorePortable.sol`.
- Status by surface. The crate-level round (Steps 1 through 5) is Implemented (pre-audit) and runs as shown. The on-chain path (Step 6) is Specified, with `citrate_getTrainingJob` and the cycle contract present and `citrate_createTrainingJob` not yet functional.
- No keys, endpoints, or credentials appear in this tutorial.
- Related: [Citrate Orchard](/research/learning), [paraconsistent aggregation](/research/paraconsistent), [education contracts](/contracts/edu), [JSON-RPC reference](/chain/rpc).
