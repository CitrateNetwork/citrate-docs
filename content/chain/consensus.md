---
title: Citrate Consensus, GhostDAG
codex_slug: /chain/consensus
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/consensus/src/types.rs, citrate-chain/core/consensus/src/ghostdag.rs, citrate-chain/core/consensus/src/ecvrf.rs, citrate-chain/core/consensus/src/finality.rs, citrate-chain/core/consensus/src/checkpoint.rs
surfaces: [CHAIN-consensus-ghostdag, CHAIN-consensus-ecvrf, CHAIN-consensus-finality]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Consensus is how Citrate Network turns many blocks into one agreed history. The ledger is a BlockDAG, so a block may name several parents, and the GhostDAG protocol reads that graph and produces a single order that every honest node computes the same way. This page is for developers and operators who want the mental model first and the audited surface after.

## What it is

A single-parent chain is a line. Citrate Network is a graph: each block names a selected parent and, optionally, a few merge parents, so the ledger grows like a grafted orchard rather than a single stem. GhostDAG sorts that growth into a total order so the ledger reads as one history.

The protocol divides every block into two sets. The blue set holds the blocks that agree with the honest majority, judged by a k-cluster rule that tolerates a bounded number of blocks seen in parallel. The red set holds the rest. Walking from genesis to the selected tip and interleaving each block's merge set gives the canonical order. The ordering key is blue score, the cumulative count of a block's blue ancestors. The tip with the highest blue score is the head the network builds on, with deterministic tie-breaking when two tips draw level.

One property matters above all the rest: blue score is recomputed, never trusted from the block header. A block that arrives claiming an inflated `blue_score` is checked against the feasible range derived from its own ancestry, and a value outside that range is rejected at admission. This is enforced in `ghostdag.rs` and covered by regression tests.

The default parameters are network constants.

| Parameter | Default | Meaning |
|---|---|---|
| `k` | 18 | k-cluster width, how many parallel blocks are tolerated as blue |
| `max_parents` | 10 | the most parents a block may name |
| `max_blue_score_diff` | 1000 | the blue-score gap a reorg may span |
| `pruning_window` | 100000 | how far back the DAG retains full detail |
| `finality_depth` | 100 | the depth at which depth-based finality applies |

Block target time is about one second on the active testnet and is set per network configuration; see [chain parameters and genesis](/chain/genesis) for the cadence of each. For where these blocks come from, see [the sequencer](/chain/sequencer); for the broader picture, see [the primer](/start/primer).

## How to use it

You do not run GhostDAG directly; you read its output. To follow the live order against a running node:

1. Ask the node for its current tips, the heads it is building on.
2. Read a block and note its blue score; the higher the blue score, the closer to the selected tip.
3. Walk the selected-parent chain back from the tip to see the order the network agreed on.
4. Check a block's depth behind the selected tip. At one hundred blocks of depth it is final under depth-based finality, and a committee checkpoint may have finalized it sooner.

The runnable steps, with the exact JSON-RPC calls, are in [read the DAG](/chain/tutorials/read-the-dag). To construct the engine in Rust, see the example at the end of this page.

## Reference

The consensus stack lives in `core/consensus/`. The audited surface follows, each item with its code path.

### GhostDAG engine, `src/ghostdag.rs`

- `GhostDag::new(params, dag_store)`, construct the engine over a DAG store.
- `GhostDag::calculate_blue_set(block)`, compute a block's blue set under the k-cluster rule.
- `GhostDag::calculate_blue_score(block)`, recompute blue score from the blue set, not from the header.
- `GhostDag::add_block(block)`, admit a block, update relations and tips.
- `GhostDag::select_tip()` and `GhostDag::get_tips()`, the current best tip and all tips.

A header claiming a blue score outside its feasible range is rejected here (`GhostDagError`, `src/ghostdag.rs:34`).

### Parameters, `src/types.rs`

`GhostDagParams::default()` sets `k = 18`, `max_parents = 10`, `max_blue_score_diff = 1000`, `pruning_window = 100000`, and `finality_depth = 100` (`src/types.rs:175`).

### Proposer election, `src/ecvrf.rs`, `src/vrf.rs`

Proposer eligibility uses an elliptic-curve verifiable random function over NIST P-256, specifically ECVRF-P256-SHA256-TAI per RFC 9381 (`src/ecvrf.rs:3`). Each candidate produces an output bound to their secret key and a public input, so the network can check who was entitled to propose without anyone being able to grind the result.

- `ecvrf::prove(secret, alpha)`, RFC 9381 section 5.1.
- `ecvrf::verify(...)`, RFC 9381 section 5.3.
- `VrfProposerSelector` (`src/vrf.rs`) applies stake-weighted eligibility on top of the VRF output.

### Depth-based finality, `src/finality.rs`

`FinalityTracker` marks a block final once it sits under enough confirmations, `confirmation_depth = 100` by default (`FinalityConfig`, `src/finality.rs:42`). `FinalityStatus` is `Finalized`, `PendingFinalization`, or `Unfinalized`. A finalized block is protected from reorg: a reorganization that would rewrite it is refused at admission by `ChainSelector` (`src/chain_selection.rs:25`).

### Committee checkpoint finality, `src/checkpoint.rs`

Depth-based finality is the everyday mechanism. The checkpoint layer adds deterministic finality on top of it. `CheckpointManager` coordinates a deterministically selected committee that signs over `(height || block_hash)` with ed25519, and the signatures are aggregated. A checkpoint finalizes once a quorum signs (`CheckpointState::has_quorum`). The chain id is bound into the signed message so a vote on one chain cannot replay onto another (`src/checkpoint.rs:90`).

`CheckpointConfig::default()` sets `interval = 50` blocks, `committee_size = 100`, and `quorum_threshold = 67`, which is two-thirds of one hundred plus one (`src/checkpoint.rs:98`).

### Example

Construct the engine and read the order in Rust.

```rust
use citrate_consensus::*;
use std::sync::Arc;

let dag_store = Arc::new(DagStore::new());
let params = GhostDagParams::default();          // k=18, max_parents=10, finality_depth=100
let ghostdag = GhostDag::new(params, dag_store.clone());

dag_store.store_block(genesis_block).await?;
ghostdag.add_block(&child_block).await?;

// Deterministic total order from genesis to a tip:
let ordering = TotalOrdering::new(dag_store.clone(), Arc::new(ghostdag));
let order = ordering.get_total_order(tip_hash).await?;

// Depth-based finality (default depth 100):
let tracker = FinalityTracker::with_defaults(dag_store.clone());
let finalized = tracker.update_finality(&tip_hash, tip_height).await?;
```

## Design rationale

A graph orders work better than a line under load. When two proposers produce blocks at nearly the same moment, a single-parent chain has to discard one; a BlockDAG keeps both as parents and lets GhostDAG decide their order later. That is why blocks may name up to ten parents and why the target time can sit near one second without the orphan waste a line would suffer.

Two choices guard the ledger. Blue score is recomputed rather than trusted, so a block cannot lie its way to the front by claiming a large score. And finality is layered: depth-based finality settles in over one hundred blocks for every block automatically, while committee checkpoints give a faster, signed, deterministic guarantee every fifty blocks. The cost is a checkpoint committee that must be selected and must sign; the benefit is that a settled block is settled by both depth and signature.

## Failure modes

- A block arriving with a forged `blue_score` is rejected at admission; ordering ignores the header value and uses the recomputed one.
- A reorganization that would rewrite a finalized block is refused by `ChainSelector`, which returns a finality error rather than reverting history. The system fails closed: it keeps the finalized history rather than accepting the longer-but-conflicting branch.
- A checkpoint cannot finalize without a quorum of sixty-seven of one hundred committee signatures, so a minority of the committee cannot force a checkpoint. Chain-id binding stops a valid vote from one network being replayed onto another.

## Access and canon

Public. The GhostDAG model, the parameters, and the audited surface are protocol a developer needs to reason about ordering and finality, and GhostDAG itself is published research. No keys, validator secrets, or private endpoints appear here. ECVRF `prove` takes a secret key as a parameter; no secret value is documented.

## Source and verification

- Source files: `core/consensus/src/types.rs`, `src/ghostdag.rs`, `src/ecvrf.rs`, `src/vrf.rs`, `src/finality.rs`, `src/chain_selection.rs`, `src/checkpoint.rs`.
- Audited against SHA `9d5959e`.
- Status: Implemented, pre external audit. The crate is internally tested and TLA+-checked in several areas; it has not completed a third-party audit, so read "tested" as tested, not certified.
