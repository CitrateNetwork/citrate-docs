---
title: LVM, EVM execution & parallel executor
codex_slug: /chain/lvm
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/execution/src/revm_adapter.rs
surfaces: [CHAIN-lvm-revm, CHAIN-lvm-mvcc]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context) + Saul Loveman
---

# LVM, EVM execution & parallel executor

> Citrate's execution layer: a full EVM (via REVM) plus a Block-STM-style
> MVCC parallel executor. For contract authors and node operators.

## Overview

The Citrate VM ("LVM") executes standard EVM bytecode. It does **not** fork
the opcode set, contracts compiled by Solidity / Vyper for Ethereum run
unmodified. Under the hood the chain embeds [REVM](https://github.com/bluealloy/revm)
behind a thin adapter (`StateDBAdapter`) that bridges REVM's `Database` trait to
Citrate's `StateDB` and persistent store.

On top of byte-for-byte EVM execution, the executor adds a **multi-version
concurrency control (MVCC)** path so that non-conflicting transactions in a
block run in parallel, then commit serializably.

## Reference

### EVM compatibility

- **Hardfork spec:** `SpecId::CANCUN`. Set in the adapter at
  `core/execution/src/revm_adapter.rs` (`.with_spec_id(SpecId::CANCUN)`).
  CANCUN enables MCOPY (EIP-5656), which Solidity 0.8.25+ emits for
  dynamic-bytes ABI return encoding, see the `BFR-VM-1` note in the source.
- **Chain ID:** supplied per-executor (`Executor::with_chain_id(..)`) and
  written into the REVM `cfg_env`. Citrate mainnet uses **40204** (see
  `core/execution/tests/*` fixtures).
- **Precompiles:** the 9 standard Ethereum precompiles (ECRECOVER … BLAKE2F,
  `0x01`–`0x09`) plus Citrate extensions, see
  [Precompiles](/chain/precompiles) and
  [Confidential precompiles overview](/chain/precompiles-zkp).
- **Logs / events:** REVM's emitted logs are converted 1:1 into Citrate
  receipt logs by `convert_revm_log` (`revm_adapter.rs`), so `eth_getLogs`
  returns real event topics (fix PIL-48). Subgraphs and Foundry event
  assertions work as on Ethereum.
- **State source of truth:** `StateDBAdapter` is backed by an in-memory cache
  **and** a persistent store. Cache misses fall through to the persistent
  store (fix PIL-13b) so `eth_call` returns correct data after a node restart.
- **BLOCKHASH:** returns the hash for the 256 most recent blocks; older /
  unknown blocks return zero, per EVM spec (`revm_adapter.rs`).

### {#parallel} MVCC & the parallel executor

Surface: `CHAIN-lvm-mvcc` (academic). Code:
`core/execution/src/mvcc/` and `core/execution/src/parallel/`.

The MVCC primitives implement the Block-STM / snapshot-versioning model proven
correct by the TLA+ spec `specs/tla/consensus/ExecutorMVCC.tla` (see the
spec-mapping table in `core/execution/src/mvcc/mod.rs`). Each concurrent worker
holds:

- a **pinned read version** (`ReadVersion`), the `StateVersion` at entry;
- a **read set** (`ReadSet`), accounts observed during execution;
- a **scratch journal** (`ScratchJournal`), pending writes for the tx.

At commit the `CommitCoordinator` performs a CAS: if no account in the read set
was written since the pin, it atomically applies the journal and bumps the
version; otherwise the worker aborts and retries against a fresh pin
(`RetryHarness`, `DEFAULT_MAX_RETRIES`). As of Sprint P950-A-3 the
`CommitCoordinator` owns the executor's serialization lock (the old
`execution_guard` mutex and `mvcc` feature flag were removed).

**Scheduling.** `ParallelExecutor` (`parallel/executor.rs`) groups
transactions into non-conflicting batches using a `ConflictScheduler` +
`DefaultAccessSetExtractor`, then runs groups concurrently via Tokio tasks.
Conflicts are detected by `AccessSet::conflicts_with` (`parallel/conflict.rs`),
which flags write-write, read-write, and write-read overlaps; the default
extractor marks the sender as a writer (nonce, balance) and derives
recipient access from the tx type.

> **Performance (informational, not a guarantee).** The repo's executor
> benchmark (`benches/tps_parallel.rs`, 2026-04-21) records ~773K tx/s @ 8
> workers vs ~321K @ 1 worker (2.41× speedup) on a disjoint-senders workload.
> Real-world TPS is RPC/signature-bound and sits well below this ceiling.

## Examples

Deploy and call a standard Solidity contract, no Citrate-specific changes are
required. Use any Ethereum tooling (Foundry, ethers, viem) pointed at the
Citrate RPC with chain ID **40204**. See the [SDK](/sdks) and [CLI](/chain/cli)
references for connection details.

## Tutorials

See [Chain tutorials](/chain/tutorials) for an end-to-end deploy-and-call walkthrough.

## Security & access

This page is **public**: EVM compatibility, the hardfork spec, the chain ID,
and the parallel-execution model are all things a developer or operator needs
to build and run on Citrate, and none of it is competitively sensitive. The
MVCC section is tagged academic in the registry because its formal model
(TLA+) is research material; the prose here links to that model rather than
reproducing it. **No secrets appear on this page**, no endpoints, keys, or
credentials.

## Source & verification

- Source repo: `citrate-chain`
- Paths: `core/execution/src/revm_adapter.rs`,
  `core/execution/src/mvcc/`, `core/execution/src/parallel/`
- Audited against SHA: `03d7851`
