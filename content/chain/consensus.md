---
title: Citrate Consensus, GhostDAG
codex_slug: /chain/consensus
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/consensus/
surfaces: [CHAIN-consensus-ghostdag, CHAIN-consensus-ecvrf, CHAIN-consensus-finality]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Consensus, GhostDAG

> How Citrate orders blocks. Citrate is a BlockDAG: blocks may have multiple
> parents, and the GhostDAG protocol turns that DAG into a single deterministic
> total order. This page is for developers and operators who want the mental
> model first, then the audited reference. ECVRF proposer election and BFT
> checkpoint finality are deeper (academic-tier) subsections.

## Overview

Unlike a single-parent chain, Citrate blocks reference **multiple parents**, so
the ledger is a directed acyclic graph (a BlockDAG) rather than a line. The
GhostDAG protocol partitions every block into a **blue set** (the
honest-majority-consistent blocks, governed by a *k*-cluster rule) and a **red
set** (everything else), then derives a **deterministic total order** over all
blocks from genesis to the selected tip. Every honest node that sees the same DAG
computes the same order, that is what makes the ledger a ledger.

The mental model in three steps:

1. **Add a block.** A new block names its parents. The engine computes the
   block's blue set and **blue score** (cumulative count of blue ancestors).
2. **Select a tip.** Among current tips, the one with the highest blue score wins
   (with deterministic tie-breaking). This is the head the network builds on.
3. **Order and finalize.** Walking the selected-parent chain and interleaving
   each block's mergeset yields the canonical total order; depth-based finality
   plus committee checkpoints make sufficiently deep blocks irreversible.

The default consensus parameters are network constants:

| Param | Default | Meaning |
|---|---|---|
| `k` | 18 | k-cluster width, anticone tolerance for "blue" classification |
| `max_parents` | 10 | Maximum parents a block may reference |
| `finality_depth` | 100 | Depth at which depth-based finality applies |

Source: `core/consensus/src/types.rs`, `GhostDagParams::default()`
(`k = 18`, `max_parents = 10`, `finality_depth = 100`).

> **Pre-audit status.** The consensus crate is internally audited and TLA+-checked
> in several areas (see below) but has **not** completed an external third-party
> audit. Treat the protocol as production-track but pre-certification. Do not read
> "verified" as "certified".

## Reference

The consensus stack lives in `core/consensus/`. The audited core surfaces:

### GhostDAG engine, `src/ghostdag.rs`

- `GhostDag::new(params, dag_store)`, construct the engine over a DAG store.
- `GhostDag::calculate_blue_set(block)`, compute a block's blue set under the
  k-cluster rule.
- `GhostDag::add_block(block)`, admit a block, update relations and tips.
- `GhostDag::select_tip()` / `GhostDag::get_tips()`, current best tip / all tips.

Blue score is **recomputed**, never trusted from the header. A malicious
`header.blue_score` (e.g. `u64::MAX`) is rejected at admission and ignored by
ordering, see the regression test `core/consensus/tests/c03_total_order_recompute.rs`.

### DAG storage, `src/dag_store.rs`

- `DagStore::new()`, in-memory store.
- `DagStore::persistent(kv)`, write-through to a `KvStore` backend (RocksDB),
  loading prior state on construction so DAG state survives restart.
- `DagStore::with_strict_vrf(bool)`, enable strict VRF admission gating.
- `store_block` · `get_block` · `get_tips` · `finalize_block` · `prune`.

### Tip & chain selection, `src/tip_selection.rs`, `src/chain_selection.rs`

- `TipSelector` with `SelectionStrategy` (`HighestBlueScore`,
  `HighestBlueScoreWithTieBreak`, weighted-random).
- `ParentSelector`, selects `(selected_parent, merge_parents)` for a new block.
- `ChainSelector`, reorg detection with **finality-aware reorg rejection**
  (a reorg that would revert a finalized block is refused).

### Ordering, `src/ordering.rs`

- `TotalOrdering::get_total_order(tip)`, deterministic order genesis → tip.
- `TotalOrdering::get_ordered_blocks(from, to)`, ordered block range + tx order.
- `TotalOrderIterator`, async iterator yielding blocks in consensus order.

### {#ecvrf} ECVRF proposer election, `src/ecvrf.rs`, `src/vrf.rs`

> **Tier: academic.** This subsection documents the cryptographic election
> mechanism. The construction below is faithful to the code; the deeper
> security argument and parameter analysis are academic-tier material.

Proposer eligibility uses an **ECVRF over P-256**, specifically
**ECVRF-P256-SHA256-TAI per RFC 9381** (`core/consensus/src/ecvrf.rs:3`). A VRF
gives each candidate proposer a verifiable, unpredictable-but-deterministic
output bound to their secret key and a public input (`alpha`), so the network can
check *who was entitled to propose* without anyone being able to grind the result.

- `ecvrf::prove(secret: &[u8;32], alpha: &[u8]) -> (EcvrfProof, [u8;32])`
  (RFC 9381 §5.1), `core/consensus/src/ecvrf.rs:288`.
- `ecvrf::verify(...)` (RFC 9381 §5.3), `core/consensus/src/ecvrf.rs:332`.
- Hash-to-curve uses **try-and-increment** (RFC 9381 §5.4.1.1).
- Nonce generation is **deterministic** via an HMAC-DRBG (RFC 6979 §3.2), with
  the DRBG state `(k, v)` **wiped on drop** (`core/consensus/src/ecvrf.rs:208`).
- Proof serialization is a fixed **114 bytes**:
  `pk_p256(33) || Gamma(33) || c(16) || s(32)` (`ecvrf.rs:33`).

`VrfProposerSelector` (`src/vrf.rs`) applies stake-weighted eligibility on top of
the VRF output and supports both ECVRF and a legacy SHA3 proof path during
migration; `LeaderElection` provides epoch-based leader selection.

### {#finality} BFT checkpoint finality, `src/finality.rs`, `src/checkpoint.rs`

> **Tier: academic.** Depth-based finality is the everyday mechanism; the
> committee BFT checkpoint layer that hard-finalizes it is deeper material.

Citrate finalizes in two complementary layers:

1. **Depth-based finality** (`src/finality.rs`). `FinalityTracker` with a
   configurable `FinalityConfig` marks a block final once it is buried under
   enough confirmations (`finality_depth`, default 100). `FinalityStatus` is one
   of `Finalized`, `PendingFinalization`, or `Unfinalized { confirmations }`;
   `FinalityEvent` is broadcast when a block crosses the line. Finalized blocks
   are protected from reorg by `ChainSelector`.

2. **Committee BFT checkpoints** (`src/checkpoint.rs`). `CheckpointManager`
   coordinates a deterministically selected committee
   (`CommitteeSelector::select(validators, height, vrf_seed, size)`) that casts
   **ed25519-signed `CheckpointVote`s** over `(height || block_hash)`. A
   checkpoint finalizes once a **quorum** of votes is reached
   (`CheckpointState::has_quorum(threshold)`, `src/checkpoint.rs:173`). The
   default committee is **100** members with a **67/100** quorum threshold, i.e. 2/3 + 1 (`CheckpointConfig`, `src/checkpoint.rs:88,102-103`).

## Examples

Constructing the engine and querying the DAG (Rust, mirrors
`core/consensus/README.md`):

```rust
use citrate_consensus::*;
use std::sync::Arc;

let dag_store = Arc::new(DagStore::new());
let params = GhostDagParams::default();         // k=18, max_parents=10
let ghostdag = GhostDag::new(params, dag_store.clone());

dag_store.store_block(genesis_block).await?;
ghostdag.add_block(&child_block).await?;
let blue_set = ghostdag.calculate_blue_set(&child_block).await?;

// Deterministic total order from genesis to a tip:
let ordering = TotalOrdering::new(dag_store.clone(), Arc::new(ghostdag));
let order = ordering.get_total_order(tip_hash).await?;

// Depth-based finality:
let tracker = FinalityTracker::with_defaults(dag_store.clone());
let finalized = tracker.update_finality(&tip_hash, tip_height).await?;
```

To read the live DAG over JSON-RPC (no Rust required), see the runnable
[Read the DAG](/chain/tutorials/read-the-dag) tutorial.

## Tutorials

- [Read the DAG](/chain/tutorials/read-the-dag), query tips, blue score and a
  block over JSON-RPC against a running node. **Tier: public.**

## Security & access

- **Tier: public** for the GhostDAG overview and reference, this is protocol
  a developer needs to reason about ordering and finality, and the algorithm
  is academically published (GhostDAG). The `#ecvrf` and `#finality`
  subsections are marked **academic** because the cryptographic and BFT
  arguments are research-depth, not because they are secret.
- **No secrets here.** No keys, no validator secrets, no private endpoints.
  ECVRF `prove` takes a secret key *parameter*; no secret value is documented.
  The crate's HMAC-DRBG explicitly wipes nonce state on drop.
- Integrity of AI-model commitments carried in blocks is formally checked by
  `specs/tla/consensus/EmbeddedModelCommitment.tla` (7 invariants, 7,110 states,
  zero violations). This is a property check, **not** an external audit.

## Source & verification

- **Source repo / path:** `citrate-chain/core/consensus/`
- **Truth document (Rule 9):** `core/consensus/README.md`, this page summarizes
  and links; it does not duplicate the README.
- **Audited against SHA:** `03d7851`
  (`git -C citrate-chain rev-parse --short HEAD`).
- **Honest status:** internally tested (314 tests incl. proptests) and
  TLA+-checked in places; **pre external audit**, not certified.
