---
title: Citrate Storage, State, RocksDB, Pruning, IPFS Pinning
codex_slug: /chain/storage
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/storage/src/state_manager.rs, citrate-chain/core/storage/src/db/, citrate-chain/core/storage/src/chain/, citrate-chain/core/storage/src/state/, citrate-chain/core/storage/src/pruning/, citrate-chain/core/storage/src/ipfs/
surfaces: [CHAIN-storage]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Storage is where Citrate Network keeps what it has agreed on: the BlockDAG, account and AI state, and large model artifacts. This page gives developers and operators the mental model first, then the audited surface. It is the soil under the orchard; everything else grows on it.

## What it is

The storage crate (`core/storage/`) is the persistence layer, and it coordinates three things. A RocksDB key-value backend is the durable store on disk. An in-process state model holds accounts, contract storage, code, and AI state, and computes a deterministic state root over them. An IPFS integration holds large off-chain model artifacts, with incentives for nodes that keep them pinned.

State is flat, not a tree. Citrate Network does not use a Merkle-Patricia trie for the world state. State lives in flat RocksDB column families, and the state root is a hash over the sorted state. `StateManager::calculate_state_root()` computes an account root (accounts sorted by address), a storage root (storage sorted by address), and an AI root, then combines them as `SHA3-256(account_root || storage_root || ai_root)`. Because the inputs are sorted, every honest node with the same state computes the same root. This is a deliberate simplification, explained under design rationale below.

The top-level coordinator is `StorageManager` (`src/lib.rs`), built with `StorageManager::new(path, pruning_config)` for the default, no at-rest encryption, or `StorageManager::with_config(path, config)` for the full configuration including at-rest encryption. It owns the RocksDB handle, the block and transaction stores, the state store, the block and state caches, and the pruner. IPFS is a separate service, not a field of `StorageManager`.

## How to use it

For an operator, storage is mostly configuration and then it runs itself.

1. Choose a data path and a pruning policy, then construct a `StorageManager`.
2. Start its background services; this spawns the auto-pruner on the configured interval.
3. If you need at-rest encryption, supply an `EncryptionAtRestConfig` on the `StorageConfig` you pass to `with_config`; the key material is bound at construction, there is no separate runtime initialize step. Encryption is off by default.

```rust
use std::sync::Arc;
use citrate_storage::{StorageManager, StorageConfig, PruningConfig};
use citrate_storage::crypto::at_rest::EncryptionAtRestConfig;

// Default storage at a path, auto-pruning with defaults.
let storage = Arc::new(StorageManager::new("./data", PruningConfig::default())?);
storage.clone().start_services().await;   // spawns the auto-pruner (async, takes Arc<Self>)

// Full config with at-rest encryption:
let cfg = StorageConfig::default()
    .with_encryption(EncryptionAtRestConfig::with_password("...operator-supplied passphrase..."));
let storage = StorageManager::with_config("./data", cfg)?;
```

For storage paths, pruning, and the IPFS daemon in an operational setting, see [run a node](/operators/run-a-node).

## Reference

### RocksDB backend, `src/db/`

- `RocksDB::open(path)` (`src/db/rocks_db.rs`) wraps `rocksdb::DB` and opens every column family with tuned options. Compression is LZ4 in production.
- Read and write surface: `get_cf`, `put_cf`, `delete_cf`, `iter_cf`, `prefix_iter_cf`; batched writes commit with either `write_batch` (no fsync) or `write_batch_sync` (fsync). Atomic counters back a durability tripwire (`REM-2 / WP-H1.3`) so producer-path writes are verifiably synced.
- Column families (`src/db/column_families.rs`) are grouped by role: blocks, headers, transactions, receipts; state, accounts, storage, code, account versions; AI models and training; the DAG; checkpoints; and metadata.

### Chain store, `src/chain/`

- `BlockStore` (`src/chain/block_store.rs`), `put_block` writes a block plus its parent-to-child DAG relations, height index, and blue set in one atomic batch. Latest height is cached for fast lookup; truncated or corrupt values are treated as missing (`SECREM-01 CONS-6`).
- `TransactionStore` (`src/chain/transaction_store.rs`), batched, synced writes with a sender-nonce index, plus receipts.

### State, `src/state/`, `src/state_manager.rs`

- `StateStore` (`src/state/state_store.rs`) over RocksDB: `get/put_account`, `get/put_storage`, `delete_storage`, `get/put_code`, `get_all_accounts`, and `write_state_batch_sync` for finalized state. AI state is first-class: `get/put_model`, `get/put_training_job`.
- `AIStateTree` (`src/state/ai_state.rs`), an in-memory map of models, training jobs, model-weight CIDs, an inference cache, and LoRA adapters, with `calculate_root()` over the AI sub-state.
- `StateManager` (`src/state_manager.rs`) composes `StateStore` and `AIStateTree`, and `calculate_state_root()` derives the world-state root as `SHA3-256(account_root || storage_root || ai_root)` (`src/state_manager.rs:34`).

### Pruning, `src/pruning/`

`Pruner` (`src/pruning/pruner.rs`) with `PruningConfig` (`keep_blocks`, `keep_states`, `interval`, `batch_size`, `auto_prune`). `prune()` runs one cycle; `prune_blocks_before(height)` and `prune_states_before(height)` delete historical blocks and old state below a threshold; `compact()` triggers RocksDB compaction afterwards. `start_auto_pruning` runs the loop on the configured interval, spawned by `StorageManager::start_services()`.

### IPFS model storage and pinning, `src/ipfs/`

- `IPFSService` (`src/ipfs/mod.rs`), an HTTP client to an IPFS daemon: `store_model`, `retrieve_model`, `list_pinned_models`, `get_model_metadata`, `fetch_raw`. `IpfsDaemon` (`src/ipfs/daemon.rs`) manages a local kubo daemon.
- Chunking (`src/ipfs/chunking.rs`): models above a size threshold are split into chunks, each addressed by a BLAKE3 hash; `ChunkManifest` records the per-chunk CIDs for reassembly.
- Pinning incentives (`src/ipfs/pinning.rs`): `PinningManager` accounts for replica counts and accrued rewards per CID and per pinner; rewards scale by pinned bytes, model type, and duration. `PersistentPinRegistry` persists the registry.
- `EncryptedIPFSStore` (`src/ipfs/encrypted_store.rs`), optional client-side encryption (AES-256-GCM, per-chunk nonce and tag) with an address-based access list; public metadata stays in the clear.

### Caching, `src/cache/`

`Cache<K, V>` (`src/cache/lru_cache.rs`) is a thread-safe LRU. `StorageManager` keeps a hot block cache and state cache; `clear_caches()` flushes them.

### At-rest encryption

When enabled via `StorageConfig`, the storage layer applies a cipher-agile, post-quantum hybrid envelope (`src/crypto/`): a hybrid key exchange combining ML-KEM (CRYSTALS-Kyber) with X25519, feeding AES-256-GCM data encryption, to resist a harvest-now, decrypt-later attack. Per-column-family keys are derived from an Argon2id master key through HKDF-SHA3, with scheduled rotation. Key commitments, never key material, can be anchored on-chain for auditability (`src/crypto/key_commitment.rs`). It is off by default; enable it by setting `StorageConfig::with_encryption(EncryptionAtRestConfig::with_password(...))` before `StorageManager::with_config`.

## Design rationale

The state root is computed by hashing sorted state with SHA3-256, not by a Merkle-Patricia trie, and that is a deliberate simplification. A trie buys you compact inclusion proofs, but it costs write concurrency: every write touches a path of internal nodes, and concurrent writers contend on them. Citrate Network carries AI workloads that write state in bulk, so we took the trade the other way. Flat column families let writes proceed in parallel and support multi-version concurrency, and a deterministic hash over sorted state still gives every node the same root to agree on. We do not advertise trie-proof structure, because we do not implement one; the page documents the mechanism that exists.

Durability is the other deliberate choice. Producer-path writes commit with fsync and are checked by a tripwire counter, so a block a node claims to have stored is a block it has actually flushed to disk, not one sitting in a buffer that a crash could lose.

## Failure modes

- Truncated or corrupt stored values are treated as missing rather than parsed into bad state, so a damaged record fails closed at read time instead of poisoning consensus.
- Producer-path writes are fsync'd and counted; the durability tripwire flags a path that writes without syncing, so a crash does not silently drop a block the node reported as stored.
- At-rest encryption holds no key material on disk: the master key is operator-supplied at runtime, per-family keys are derived, key material is zeroized after use, and only key commitments, not keys, are ever anchored on-chain.

## Access and canon

Public. The storage model, the state-root construction, and the reference are what a developer or operator needs to reason about persistence, pruning, and at-rest protection. No secrets appear here: no keys, passphrases, or private endpoints.

## Source and verification

- Source files: `core/storage/src/state_manager.rs`, `src/db/`, `src/chain/`, `src/state/`, `src/pruning/`, `src/ipfs/`, `src/crypto/`.
- Audited against SHA `9d5959e`.
- Status: Implemented, pre external audit. The crate is internally tested, including a durability and fsync suite; it has not completed a third-party audit. Several call sites carry remediation markers (for example `REM-2 / WP-H1.3` fsync enforcement, `SECREM-01 CONS-6` corrupt-data handling). Treat it as production-track but pre-certification.
