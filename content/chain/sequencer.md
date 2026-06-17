---
title: Citrate Sequencer — Mempool & Block Building
codex_slug: /chain/sequencer
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/sequencer/
surfaces: [CHAIN-seq-mempool]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Sequencer — Mempool & Block Building

> The pipeline between "a transaction arrives" and "a block is produced." The
> sequencer validates transactions, stages them in a priority mempool, and
> assembles candidate blocks for proposers. The public surface (mempool basics,
> validation rules) is here; parent-selection and bundle assembly are deeper
> (academic-tier) because they are where competitive implementation detail lives.

## Overview

The sequencer (`core/sequencer/`) owns three stages:

1. **Validate** — incoming transactions pass a validation pipeline (signature,
   balance, nonce, gas, size, rate-limit, blacklist).
2. **Stage** — valid transactions enter a **priority mempool** with AI-aware
   transaction classification, per-sender limits, duplicate detection and
   capacity bounds.
3. **Build** — the block builder selects top-priority transactions, executes
   them through the execution layer, computes state/receipt roots and an
   EIP-1559 base fee, and produces a signed candidate block.

The mempool's distinctive feature is **AI-aware priority classes**: every
transaction is tagged with a `TxClass`, and each class carries a priority
multiplier so that, e.g., system and compute traffic can be ordered ahead of
standard transfers.

| `TxClass` | Relative priority |
|---|---|
| `System` | 1000× |
| `Compute` | 500× |
| `Training` | 400× |
| `ModelUpdate` / `Inference` / `Storage` / `Standard` | lower (per `priority_multiplier()`) |

Source: `core/sequencer/src/mempool.rs` — `TxClass` and `priority_multiplier()`.

> **Pre-audit status.** The sequencer is internally tested (94 tests, incl.
> proptests) but **not** externally audited. Mempool/DoS surface (rate limiting,
> per-sender caps, eviction) is implemented but should be treated as
> pre-certification.

## Reference

### Mempool — `src/mempool.rs`

- `Mempool::new(config: MempoolConfig)` — capacity, gas floor, per-sender limit
  (defaults: 10,000 capacity, 1 Gwei floor).
- `Mempool::add_transaction(tx)` — validate + insert with priority sorting.
- `Mempool::get_transactions(max)` — extract top-priority batch for building.
- `Mempool::get_pending_transactions_for_sender(pubkey)` — pending-nonce support.
- `Mempool::remove_transactions(hashes)` — drop mined transactions.
- `Mempool::estimate_gas_price()` — gas-price estimate from current pool.
- `Mempool::get_stats() -> MempoolStats` — size, gas stats, per-class breakdown.
- `MempoolAccess` trait — async cross-crate mempool interface.

### Transaction validator — `src/validator.rs`

- `TxValidator::new(rules, state_provider)` / `validate(tx)` /
  `validate_batch(txs)`.
- `validate` runs: signature (ed25519 + ECDSA), balance, nonce, gas price/limit,
  data-size limit, rate limit, address blacklist.
- `ValidationRules` — configurable min gas price, max gas limit, max data size,
  rate limits.
- `ValidationPipeline` — parallel/sequential batch split into `(valid, invalid)`.
- `TxValidator::blacklist_address(addr)` / `unblacklist_address(addr)`.
- `StateProvider` trait — async account lookups (`get_account`, `get_balance`,
  `get_nonce`); `MockStateProvider` is test-only.

### {#parent-selection} Parent selection (academic)

> **Tier: academic.** Block building selects DAG parents via the consensus
> layer's `ParentSelector`, which returns `(selected_parent, merge_parents)` for
> a new block (`citrate-consensus`, `core/consensus/src/tip_selection.rs`). The
> selection strategy and its interaction with blue-score ordering are
> research-depth detail and are documented at academic tier.

### {#bundle} Bundle / block assembly (academic)

> **Tier: academic.** `BlockBuilder` (`src/block_builder.rs`) is where the
> candidate block is assembled — transaction selection from the mempool,
> execution via `Executor` / `ParallelExecutor`, state-root and receipt-root
> computation, EIP-1559 base-fee calculation and block signing. The ordering and
> bundling heuristics are competitive implementation depth and are marked
> academic.

- `BlockBuilder::new(config, mempool, dag_store, ghostdag)`.
- `BlockBuilder::with_executor(executor)` — attach the execution engine.
- `BlockBuilder::build_block(parent, proposer, vrf_proof)` — full candidate.
- `BlockBuilderConfig` — max block size, gas limits, tx bounds, target block time.

## Examples

Mirrors `core/sequencer/README.md` (Rust):

```rust
use citrate_sequencer::*;
use std::sync::Arc;

let mempool = Arc::new(Mempool::new(MempoolConfig::default())); // 10k cap, 1 Gwei floor

// validate before staging
let validator = TxValidator::new(ValidationRules::default(), state_provider);
validator.validate(&tx).await?;
mempool.add_transaction(tx).await?;

// build a candidate block
let builder = BlockBuilder::new(builder_config, mempool.clone(), dag_store, ghostdag);
let block = builder.build_block(parent_hash, proposer_key, vrf_proof).await?;
```

To observe pending transactions on a live node, see
`mempool_getPending` / `citrate_getMempoolStats` in the
[Chain CLI](/chain/cli) and RPC reference.

## Tutorials

- [Read the DAG](/chain/tutorials/read-the-dag) — also surfaces mempool stats
  alongside DAG state. **Tier: public.**

## Security & access

- **Tier: public** for mempool basics and validation rules — a developer needs
  these to submit transactions and reason about ordering and fees.
- **`#parent-selection` and `#bundle` are academic** — they are competitive
  implementation depth (how the proposer picks parents and packs a block).
  Public-good understanding stays public; the cloning-grade heuristics are gated.
- **No secrets here.** Proposer keys and VRF proofs are *parameters*, never
  documented values. `MockStateProvider` is test scaffolding, not a production
  backend.

## Source & verification

- **Source repo / path:** `citrate-chain/core/sequencer/`
- **Truth document (Rule 9):** `core/sequencer/README.md` — summarized and
  linked, not copied.
- **Audited against SHA:** `03d7851`.
- **Honest status:** internally tested (94 tests); **pre external audit**.
