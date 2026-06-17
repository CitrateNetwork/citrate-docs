---
title: Citrate Storage — State, RocksDB, Pruning, IPFS Pinning
codex_slug: /chain/storage
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/storage/
surfaces: [CHAIN-storage]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Storage — State, RocksDB, Pruning, IPFS Pinning

> How Citrate persists the BlockDAG, account/AI state, and model artifacts.
> This page gives developers and operators the mental model first, then an
> audited reference. The state-commitment and at-rest-encryption internals are
> deeper (academic-tier) subsections — present because they are research-depth,
> not because they are secret.

## Overview

The storage crate (`core/storage/`) is the persistence layer. It coordinates
three things: a **RocksDB** key-value backend (the durable store), an
**in-process state model** (accounts, contract storage, code, and AI state) that
hangs a deterministic Merkle commitment off that backend, and an **IPFS**
integration for large off-chain model artifacts with pinning incentives.

The top-level coordinator is `StorageManager` (`src/lib.rs`), constructed via
`StorageManager::new(path, pruning_config)` (default, no at-rest encryption) or
`StorageManager::with_config(path, config)` (full config, including QSSP
at-rest encryption). It owns the block store, transaction store, state stores,
LRU caches, the pruner, and the optional IPFS service.

> **Design note — flat KV state, not a Patricia trie.** Citrate does **not**
> use a traditional Merkle Patricia Trie for the world state. State lives in
> flat RocksDB column families, and the **state root is computed** as a
> deterministic hash over the sorted state (see `#state-commitment`). This
> trades trie-proof structure for write concurrency and MVCC support. The
> registry surface name (`MPT/RocksDB`) reflects the conceptual role
> ("authenticated state over RocksDB"), not a literal trie implementation; this
> page documents the actual mechanism.

> **Pre-audit status.** The storage crate is internally tested (including a
> durability/fsync suite and 98%-coverage targets) but has **not** completed an
> external third-party audit. Several call-sites carry remediation markers
> (e.g. `REM-2 / WP-H1.3` fsync enforcement, `SECREM-01 CONS-6` corrupt-data
> handling). Treat it as production-track but pre-certification.

## Reference

### RocksDB backend — `src/db/`

- `RocksDB::open(path)` (`src/db/rocks_db.rs`) wraps `rocksdb::DB` and opens all
  column families with tuned options. Compression is **LZ4** in production (None
  under the `no-compression` test feature).
- Read/write surface: `get_cf` · `put_cf` · `delete_cf` · `iter_cf` ·
  `prefix_iter_cf`; batched writes via `batch()` + `batch_put_cf` /
  `batch_delete_cf` committed with either `write_batch` (no fsync) or
  **`write_batch_sync`** (fsync). Atomic counters (`write_batch_count`,
  `write_batch_sync_count`) back the durability tripwire (`REM-2 / WP-H1.3`,
  audit M-API-01) so producer-path writes are verifiably fsync'd.
- **Column families** (`src/db/column_families.rs`) are grouped by role:
  blockchain (`CF_BLOCKS`, `CF_HEADERS`, `CF_TRANSACTIONS`, `CF_RECEIPTS`),
  state (`CF_STATE`, `CF_ACCOUNTS`, `CF_STORAGE`, `CF_CODE`, `CF_ACCOUNT_VERSIONS`),
  AI (`CF_MODELS`, `CF_TRAINING`), DAG (`CF_BLUE_SET`, `CF_DAG_RELATIONS`,
  `CF_DAG_BLOCKS`, `CF_DAG_CHILDREN`, `CF_DAG_TIPS`, `CF_DAG_FINALIZED`,
  `CF_DAG_HEIGHT_INDEX`, `CF_DAG_METADATA`), consensus (`CF_CHECKPOINTS`), plus
  `CF_METADATA` (height/sender-nonce indices) and `CF_DEFAULT`.
- Tuning lives in `DbOptimizations` (`src/db/optimizations.rs`): large write
  buffers, bloom filters, an LRU block cache for metadata CFs, and parallelism
  scaled to CPU count.

### Chain store — `src/chain/`

- `BlockStore` (`src/chain/block_store.rs`) — `put_block` writes a block plus its
  parent→child DAG relations, height index, and blue set in one atomic batch.
  Latest height is cached for O(1) `get_latest_height()` (`RM-B1 / WP-C3.2`,
  audit L-STORE-01); read-modify-write of child links/height is serialized
  (`FUA-CHAIN-01`); truncated/corrupt values are treated as missing
  (`SECREM-01 CONS-6`). DAG queries: `get_children`, `get_blue_set`, `get_tips`,
  `put_tip` / `remove_tip`.
- `TransactionStore` (`src/chain/transaction_store.rs`) — `put_transaction` /
  `put_transactions` (batched, fsync) with a sender-nonce index
  (`get_by_sender`), plus `put_receipt` / `get_receipt`. Producer-path commits
  use `write_batch_sync` (`REM-2 / WP-H1.3`).

### State — `src/state/`, `src/state_manager.rs`

- `StateStore` (`src/state/state_store.rs`) over RocksDB: `get/put_account`,
  `get/put_storage`, `delete_storage`, `get/put_code`, `get_all_accounts`, and
  `write_state_batch_sync` for finalized state. AI state is first-class here too:
  `get/put_model`, `get/put_training_job`. MVCC version tracking
  (`Sprint P950-A-4 WP-A.4.3`) lives in `CF_ACCOUNT_VERSIONS`:
  `put_account_version`, `get_all_account_versions`, `get_global_version`.
- `AIStateTree` (`src/state/ai_state.rs`) — in-memory map of models, training
  jobs, model-weight CIDs, an inference cache, and LoRA adapters, with
  `calculate_root()` over the AI sub-state.
- `StateManager` (`src/state_manager.rs`) — composes `StateStore` + `AIStateTree`.

#### {#state-commitment} State commitment

> **Tier: academic.** The commitment construction is faithful to the code; the
> security argument is research-depth.

`StateManager::calculate_state_root()` derives the world-state root
deterministically: an account root (accounts sorted by address), a storage root
(storage sorted by address), and an AI root (`AIStateTree::calculate_root()`),
combined as `SHA3-256(account_root || storage_root || ai_root)`. The root is a
function of the sorted state, not of a trie — every honest node with the same
state computes the same root.

### Pruning — `src/pruning/`

`Pruner` (`src/pruning/pruner.rs`) with `PruningConfig` (`keep_blocks`,
`keep_states`, `interval`, `batch_size`, `auto_prune`) and `PruningStats`.
`prune()` runs one cycle; `prune_blocks_before(height)` and
`prune_states_before(height)` delete historical blocks/headers and old state
below a threshold; `compact()` triggers RocksDB compaction afterwards.
`start_auto_pruning` runs the loop on the configured interval. Auto-pruning is
spawned by `StorageManager::start_services()`.

### IPFS model storage & pinning — `src/ipfs/`

- `IPFSService` (`src/ipfs/mod.rs`) — HTTP client to an IPFS daemon:
  `store_model` / `retrieve_model`, `list_pinned_models`, `get_model_metadata`,
  `fetch_raw`. `IpfsDaemon` (`src/ipfs/daemon.rs`) manages a local kubo daemon
  lifecycle (`install`/`start`/`stop`/`health_check`).
- **Chunking** (`src/ipfs/chunking.rs`): models above a size threshold are split
  into chunks, each addressed by a **BLAKE3** hash; `ChunkManifest` records the
  per-chunk CIDs for reassembly. `chunk_model` / `reconstruct_model` /
  `verify_chunk`.
- **Pinning incentives** (`src/ipfs/pinning.rs`): `PinningManager` accounts for
  replica counts and accrued `PinReward`s per CID and per pinner;
  `record_external_pin` registers a pin; rewards scale by pinned bytes, model
  type, and duration. `PersistentPinRegistry` (`WP-R.4`) persists the registry.
- `EncryptedIPFSStore` (`src/ipfs/encrypted_store.rs`) — optional client-side
  encryption (AES-256-GCM, per-chunk nonce/tag) with an address-based access
  control list for authorized recipients; public metadata stays in the clear.

### Caching — `src/cache/`

`Cache<K, V>` (`src/cache/lru_cache.rs`) is a thread-safe LRU
(`get`/`put`/`remove`/`contains`/`clear`). `StorageManager` keeps a hot
`block_cache` and `state_cache`; `clear_caches()` flushes them.

### {#at-rest} At-rest encryption (QSSP)

> **Tier: academic.** Optional and disabled by default. Documented here for
> operators evaluating at-rest protection; the cryptographic argument is
> research-depth.

When enabled via `StorageConfig`, the storage layer applies **QSSP** — a
crypto-agile, post-quantum hybrid envelope (`src/crypto/`): a hybrid KEM
combining **ML-KEM (CRYSTALS-Kyber)** with **X25519**, feeding **AES-256-GCM**
data encryption, to resist "harvest now, decrypt later". Per-column-family keys
are derived (Argon2id master key → HKDF-SHA3 per-CF keys) with scheduled
rotation, and key *commitments* (never key material) can be anchored on-chain
for auditability (`src/crypto/key_commitment.rs`). Initialize with
`StorageManager::initialize_encryption(password)`.

## Examples

```rust
use citrate_storage::{StorageManager, PruningConfig};

// Default storage at a path, auto-pruning with defaults.
let storage = StorageManager::new("./data", PruningConfig::default())?;
storage.start_services();            // spawns the auto-pruner

// Maximum-security config (QSSP at-rest, tuned for AI model storage):
let cfg = citrate_storage::StorageConfig::maximum_security("node-1".into());
let storage = StorageManager::with_config("./data", cfg)?;
storage.initialize_encryption("…operator-supplied passphrase…")?;
```

## Tutorials

- See [Run a node](/operators/run-a-node) for storage paths, pruning config, and
  the IPFS daemon in an operational context. **Tier: public.**

## Security & access

- **Tier: public** for the storage model and reference — this is what a
  developer/operator needs to reason about persistence and pruning. The
  `#state-commitment` and `#at-rest` subsections are marked **academic** because
  the cryptographic constructions are research-depth, not secret.
- **No secrets here.** No keys, passphrases, or private endpoints. QSSP master
  keys are operator-supplied at runtime, per-CF keys are derived, and key
  material is zeroized after use; only key *commitments* (not keys) are ever
  anchored on-chain.

## Source & verification

- **Source repo / path:** `citrate-chain/core/storage/`
- **Truth document (Rule 9):** `core/storage/README.md` — this page summarizes
  and links; it does not duplicate the README.
- **Audited against SHA:** `03d7851`
  (`git -C citrate-chain rev-parse --short HEAD`).
- **Honest status:** internally tested (durability/fsync suite + coverage
  targets); **pre external audit** — not certified.
