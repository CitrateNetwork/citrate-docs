---
title: Citrate Sequencer, Mempool and Block Building
codex_slug: /chain/sequencer
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/sequencer/src/mempool.rs, citrate-chain/core/sequencer/src/validator.rs, citrate-chain/core/sequencer/src/block_builder.rs
surfaces: [CHAIN-seq-mempool]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The sequencer is the path a transaction takes between arriving at a node and landing in a block. It validates each transaction, holds the valid ones in a priority mempool, and assembles candidate blocks for proposers. This page is for developers who submit transactions and operators who want to understand how a block is put together.

## What it is

Think of the mempool as a sorting shed at harvest. Transactions come in, the ones that do not pass inspection are set aside, and the rest are sorted so the most important work is taken first. The sequencer (`core/sequencer/`) does this in three plain stages.

1. Validate. An incoming transaction passes a validation pipeline: signature, balance, nonce, gas price and limit, data size, rate limit, and an address blacklist.
2. Stage. A valid transaction enters the priority mempool, which holds up to ten thousand transactions by default, caps each sender, drops duplicates, and orders by priority.
3. Build. The block builder takes the top-priority transactions, executes them, computes the state root and receipt root and an EIP-1559 base fee, and produces a signed candidate block.

Priority is not gas price alone. Every transaction carries a `TxClass`, and each class has a multiplier so that system and compute traffic can be ordered ahead of ordinary transfers. The effective priority is the gas price multiplied by the class multiplier.

| `TxClass` | Priority multiplier |
|---|---|
| `System` | 1000 |
| `ModelUpdate` | 100 |
| `Compute` | 80 |
| `Training` | 50 |
| `Inference` | 20 |
| `Storage` | 10 |
| `Standard` | 1 |

Source: `core/sequencer/src/mempool.rs`, `TxClass::priority_multiplier()` (`src/mempool.rs:66`).

## How to use it

You submit transactions to the mempool; proposers build from it. In Rust the flow is:

1. Construct a mempool from a config (defaults: ten thousand capacity, one Gwei gas floor, one hundred transactions per sender).
2. Validate a transaction against the current state before staging it.
3. Add the validated transaction to the mempool; it is sorted into place by priority.
4. When it is your turn to propose, build a candidate block from the top of the pool.

```rust
use citrate_sequencer::*;
use std::sync::Arc;

let mempool = Arc::new(Mempool::new(MempoolConfig::default())); // 10k cap, 1 Gwei floor

// Validate before staging.
let validator = TxValidator::new(ValidationRules::default(), state_provider);
validator.validate(&tx).await?;
mempool.add_transaction(tx).await?;

// Build a candidate block from the pool.
let builder = BlockBuilder::new(builder_config, mempool.clone(), proposer_key).with_executor(executor);
let block = builder.build_block(selected_parent, merge_parents, parent_height, parent_blue_score, vrf_proof).await?;
```

To watch pending transactions on a live node without Rust, use `mempool_getPending` and `citrate_getMempoolStats` over JSON-RPC; see [chain RPC](/chain/rpc).

## Reference

### Mempool, `src/mempool.rs`

- `Mempool::new(config)`, build a mempool. `MempoolConfig::default()` is ten thousand capacity, one Gwei gas floor, one hundred per sender (`src/mempool.rs:181`).
- `Mempool::add_transaction(tx)`, validate and insert with priority sorting.
- `Mempool::get_transactions(limit)`, extract the top-priority batch for building.
- `Mempool::pending_nonce_for(sender)`, the next pending nonce for a sender.
- `Mempool::remove_transaction(hash)`, drop a transaction once it is in a block.
- `Mempool::stats()`, size, gas statistics, and a per-class breakdown.

### Transaction validator, `src/validator.rs`

- `TxValidator::new(rules, state_provider)`, then `validate(tx)` or `validate_batch(txs)`.
- `validate` runs, in order: address blacklist, rate limit, gas price and limit, data-size limit, signature (ed25519 and ECDSA), then balance and nonce (`src/validator.rs:188`).
- `ValidationRules`, the configurable floor: minimum gas price, maximum gas limit, maximum data size, rate limits.
- `ValidationPipeline`, splits a batch into valid and invalid.
- `TxValidator::blacklist_address(addr)` and `unblacklist_address(addr)`.
- `StateProvider` trait, async account lookups; `MockStateProvider` is test-only.

### Block builder, `src/block_builder.rs`

The builder assembles the candidate block, plainly and in order: it takes the selected parent (the tip with the highest blue score) plus up to `max_parents - 1`, which is nine, merge parents from the consensus layer, pulls the top-priority transactions from the mempool, executes them, computes the state and receipt roots, sets the EIP-1559 base fee, and signs the result.

- `BlockBuilder::new(config, mempool, proposer_key)`, with the proposer key held on the builder (`src/block_builder.rs:129`).
- `BlockBuilder::with_executor(executor)`, attach the execution engine.
- `BlockBuilder::build_block(selected_parent, merge_parents, parent_height, parent_blue_score, vrf_proof)`, produce the full candidate (`src/block_builder.rs:149`).
- `BlockBuilderConfig`, maximum block size, gas limits, transaction bounds, and `block_time_target`, which defaults to two seconds (`src/block_builder.rs:77`).

Parent selection itself belongs to the consensus layer: `ParentSelector` returns `(selected_parent, merge_parents)` for a new block. See [consensus](/chain/consensus) for how blue score picks the selected parent, and [the LVM](/chain/lvm) for how the transactions execute.

## Design rationale

Two design choices stand out. The mempool sorts by class as well as price so the network does not let a fee war crowd out the work it exists to carry; compute and training traffic carry weight that an ordinary transfer does not. And the builder reuses the consensus layer's parent selection rather than inventing its own, so there is one definition of "which parents" across the codebase, not two that can drift apart. The two-second target keeps blocks frequent enough that priority work waits seconds, not minutes, while the BlockDAG absorbs the near-simultaneous blocks that a fast cadence produces.

## Failure modes

- A transaction that fails any validation check is set aside, not staged; an invalid signature, a stale nonce, a gas price below the floor, or a blacklisted sender each stop it at the door.
- The mempool is bounded. At capacity, low-priority transactions are evicted rather than allowed to exhaust memory, and per-sender caps stop one account from filling the pool. The system fails closed: it sheds the lowest-priority load rather than accepting unbounded work.
- A built block carries computed state and receipt roots; a proposer cannot substitute arbitrary roots, because the receiving nodes recompute and reject a block whose roots do not match execution.

## Access and canon

Public. Mempool behavior and validation rules are what a developer needs to submit transactions and reason about ordering and fees. No secrets appear here: proposer keys and VRF proofs are parameters, never documented values, and `MockStateProvider` is test scaffolding, not a production backend.

## Source and verification

- Source files: `core/sequencer/src/mempool.rs`, `src/validator.rs`, `src/block_builder.rs`.
- Audited against SHA `9d5959e`.
- Status: Implemented, pre external audit. The crate is internally tested, including property tests; it has not completed a third-party audit. The mempool denial-of-service surface (rate limiting, per-sender caps, eviction) is implemented but should be treated as pre-certification.
