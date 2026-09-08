---
title: LVM, EVM execution and the parallel executor
codex_slug: /chain/lvm
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/execution/src/revm_adapter.rs, citrate-chain/core/execution/src/parallel/, citrate-chain/core/execution/src/mvcc/
surfaces: [CHAIN-lvm-revm, CHAIN-lvm-mvcc]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The LVM is the execution layer of the Citrate Network: a full EVM that runs ordinary Solidity, with an
optimistic parallel path underneath so that transactions which do not touch the same accounts run at the
same time. This page is for contract authors and node operators.

## What it is

The LVM executes standard EVM bytecode. It does not fork the opcode set, so contracts compiled by Solidity
or Vyper for Ethereum run unmodified, and the tooling you already use works against it. Underneath, the
chain embeds REVM behind a thin adapter, `StateDBAdapter`, that bridges REVM's database trait to Citrate's
own state store. From the outside it behaves like any EVM node; the difference is in how it schedules work.

On top of byte-for-byte EVM execution, the LVM adds an optimistic parallel path built on multi-version
concurrency control, MVCC. Within a block, transactions that do not conflict execute concurrently. Each one
records the accounts it read, and at commit the executor checks whether any of those accounts changed since
it started. If none did, the writes apply and the transaction commits; if one did, that transaction is the
loser, and it retries against fresh state. The result is the same state root you would get from running the
block one transaction at a time, so single-threaded equivalence is preserved, the work just finishes
sooner when the block allows it. Think of it as harvesting several rows of an orchard at once, then setting
aside and re-picking only the trees two crews reached for together.

The consensus that orders blocks before the LVM runs them is GhostDAG, covered under
[Citrate Network](/chain/consensus).

## How to use it

There is nothing Citrate-specific to do. Deploy and call contracts the way you would on Ethereum.

1. Point your tooling, Foundry, ethers, or viem, at the Citrate RPC. See [chain RPC](/chain/rpc) for
   connection details.
2. Set the chain id to 40204. The LVM writes this into the REVM configuration per executor, and
   transactions signed for another chain id are rejected.
3. Deploy your contract and call it. Events, logs, and `eth_getLogs` behave as on Ethereum, so subgraphs
   and event assertions work without change.
4. Read state with `eth_call`. State is correct after a node restart, because a cold in-memory cache falls
   through to the persistent store rather than returning empty data.

The parallel path is internal to the executor. You do not opt in, and you cannot observe it from a
transaction; it only affects how quickly a block is processed.

## Reference

The audited surface, each item with its code path under `citrate-chain`.

| Item | Behavior | Code path |
|---|---|---|
| Hardfork spec | `SpecId::CANCUN`, set with `.with_spec_id(SpecId::CANCUN)`. CANCUN enables MCOPY (EIP-5656), which Solidity 0.8.25+ emits for dynamic-bytes return encoding (the `BFR-VM-1` note). | `core/execution/src/revm_adapter.rs` |
| Chain id | Supplied per executor with `Executor::with_chain_id(..)` and written into the REVM config. The Citrate Network uses 40204. | `core/execution/src/revm_adapter.rs` |
| Precompiles | The nine standard Ethereum precompiles, ECRECOVER through BLAKE2F at `0x01` to `0x09`, plus Citrate extensions. | see [Precompiles](/chain/precompiles), [confidential precompiles](/chain/precompiles-zkp) |
| Logs and events | REVM logs are converted one to one into Citrate receipt logs by `convert_revm_log` (fix PIL-48), so `eth_getLogs` returns real event topics. | `core/execution/src/revm_adapter.rs` |
| State source | `StateDBAdapter` is backed by an in-memory cache and a persistent store; cache misses fall through to the store (fix PIL-13b). | `core/execution/src/revm_adapter.rs` |
| BLOCKHASH | Returns the hash for the 256 most recent blocks; older or unknown blocks return zero, per EVM spec. | `core/execution/src/revm_adapter.rs` |

### The MVCC primitives

The parallel path lives in `core/execution/src/mvcc/` and `core/execution/src/parallel/`. It implements the
Block-STM, snapshot-versioning model proven by the TLA+ spec `specs/tla/consensus/ExecutorMVCC.tla`; the
spec-to-code mapping is tabulated in `core/execution/src/mvcc/mod.rs`. Each concurrent worker holds three
things:

- a pinned read version, the state version at the moment it started (`mvcc/read_set.rs`, `ReadVersion`);
- a read set, the accounts it observed during execution (`mvcc/read_set.rs`, `ReadSet`);
- a scratch journal, the writes it is holding for the transaction (`mvcc/scratch_journal.rs`,
  `ScratchJournal`).

At commit, the `CommitCoordinator` (`mvcc/commit.rs`) checks the read set against the current state: if no
account in the read set was written since the worker pinned, it applies the journal and advances the
version; otherwise the worker aborts and retries against a fresh pin. The `RetryHarness` (`mvcc/retry.rs`)
bounds this at `DEFAULT_MAX_RETRIES`, which is 8, then falls back to serial execution so a contended
transaction always makes progress.

### Scheduling

`ParallelExecutor` (`parallel/executor.rs`) groups transactions into non-conflicting batches using a
`ConflictScheduler` and a `DefaultAccessSetExtractor`, then runs the groups concurrently as Tokio tasks.
Conflicts are detected by `AccessSet::conflicts_with` (`parallel/conflict.rs`), which flags write-write,
read-write, and write-read overlaps. The default extractor marks the sender as a writer, for nonce and
balance, and derives recipient access from the transaction type.

The executor benchmark (`benches/tps_parallel.rs`, 2026-04-21) records about a 2.41 times parallel speedup
at 8 workers over a single worker on a disjoint-senders microbench. That is a property of the executor
alone; real throughput is bound by RPC and signature checking and sits well below it. Network throughput is
5,000 TPS sustained, 10,000 ceiling. Treat the microbench as informational, not a guarantee.

## Design rationale

Most chains execute a block strictly in order, one transaction after another, because that is the simplest
way to get a single agreed state. The cost is that a block of independent transactions, say a thousand
transfers between a thousand distinct pairs of accounts, runs no faster than a block where every
transaction touches the same contract. The LVM takes the optimistic bet that most transactions in a block
are independent, runs them together, and pays the retry cost only for the few that actually collide. The
bet is safe because the read-set check at commit is exact: if two transactions touched the same account,
the loser re-runs, so the committed result is identical to serial execution. The trade is added
complexity in the executor, which is why the commit protocol is pinned to a TLA+ model rather than left to
review alone.

## Failure modes

- A transaction that loses the read-set check retries against fresh state. After `DEFAULT_MAX_RETRIES`
  attempts it falls back to serial execution, so a heavily contended account never stalls; it just stops
  benefiting from parallelism.
- The committed state root is identical to serial execution by construction. If parallel and serial
  execution ever diverged, that would be a consensus fault, which is exactly the property the
  `ExecutorMVCC.tla` spec is written to exclude.
- On a cold cache after restart, reads fall through to the persistent store rather than returning zero
  (PIL-13b), so `eth_call` does not silently return wrong data.

## Access and canon

Public. EVM compatibility, the hardfork spec, the chain id, and the parallel-execution model are all things
a developer or operator needs to build and run on the Citrate Network, and none of it is sensitive. The
MVCC section is research-provenance material; the prose here links to the TLA+ model rather than
reproducing it. No keys, endpoints, or credentials appear on this page.

## Source and verification

- Source repo: `citrate-chain`
- Source files: `core/execution/src/revm_adapter.rs`, `core/execution/src/parallel/{executor.rs,conflict.rs}`,
  `core/execution/src/mvcc/{commit.rs,read_set.rs,scratch_journal.rs,retry.rs,mod.rs}`
- TLA+ spec: `specs/tla/consensus/ExecutorMVCC.tla`
- Audited against SHA: `9d5959e`
- Status: Implemented (pre-audit). The EVM path runs on testnet 40204; the MVCC commit protocol is
  Verified against its TLA+ model.
