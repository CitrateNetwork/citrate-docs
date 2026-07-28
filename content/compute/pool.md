---
title: Citrate Compute Pool
codex_slug: /compute/pool
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-compute-pool (pool-coordinator/, training-worker/)
surfaces: [OPS-compute-pool]
audited_against_sha: ae9358d
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The compute pool is how several machines act as one provider on Citrate Market. It is two
daemons: a coordinator that spreads single-prompt inference work across a pool, and a worker
that takes part in distributed training and in multi-stage inference. It is for operators who
run more than one machine and want them to share work and share the pay.

## What it is

A pool is a group of machines, each one a member, that present themselves to the market as a
single provider. The work and the settlement still happen on the public ledger, the Citrate
Network; the pool only decides which member does a given job and divides the payment when the
job is done.

Two daemons live in the `citrate-compute-pool` workspace, and they play different roles.

- The coordinator, `citrate-pool-coordinator`, handles single-prompt inference. Every member
  of an on-chain `ComputePool` runs a copy. The copies watch the chain for a `ComputeRequested`
  event, and the one whose account is the elected coordinator for the current epoch picks a
  member, records the dispatch on-chain, sends the prompt to that member over HTTPS, and then
  submits the completion or the failure. An epoch is a fixed window of 100 blocks; the elected
  coordinator rotates with it.
- The worker, `citrate-training-worker`, takes part in jobs that span machines. In `training`
  mode it is one node of a data-parallel training pool, the surface we call Citrate Orchard. In
  `pipeline` mode it owns one stage of a model too large for a single machine, and activations
  flow through the stages in sequence.

Both daemons keep their keys, their data, and their model weights on the operator's own
hardware. Nothing about a job reaches the public ledger except the dispatch record, the
completion, and the payment, which is the on-premise default that holds across the network.

## How to use it

1. Build the workspace. From the `citrate-compute-pool` root, `cargo build --release` produces
   both binaries. Neither one depends on a chain crate at the Rust level; they speak to the
   network over JSON-RPC at runtime, so no deploy key is needed to build.
2. Give each daemon an account. Both load a secp256k1 key, either from a Secret Storage v3
   keystore file plus its passphrase, or from a raw private-key hex string for testnet only. The
   account address you configure must match the key.
3. Point the daemon at the network and the contract. The coordinator needs the `ComputePool`
   address and the map of member endpoints; the worker needs its mode and its job contract.
4. Run the coordinator on every member machine. Each copy decides for itself whether it is the
   elected coordinator for the current epoch and acts only when it is.
5. Run the worker where the training or pipeline job lives, scoped to the job id you want it to
   watch.

A coordinator and a worker, started from the environment up:

```bash
# Coordinator: one copy per pool member
export CITRATE_POOL_KEYSTORE_PATH=/secure/pool-keystore.json
export CITRATE_POOL_KEYSTORE_PASSPHRASE="$KEYSTORE_PASS"   # from your secret store
export CITRATE_POOL_WALLET_ADDRESS=0x<derived-address>
export CITRATE_POOL_CONTRACT=0x<ComputePool>
export CITRATE_POOL_RPC_URL=https://<your-rpc-endpoint>
export CITRATE_POOL_MEMBER_ENDPOINTS="0xm1=https://m1/pool-infer,0xm2=https://m2/pool-infer"
citrate-pool-coordinator

# Worker: one per training or pipeline job
export CITRATE_WORKER_MODE=training
export CITRATE_TRAINING_KEYSTORE_PATH=/secure/worker-keystore.json
export CITRATE_TRAINING_KEYSTORE_PASSPHRASE="$KEYSTORE_PASS"
export CITRATE_WORKER_CONTRACT=0x<ComputePoolTraining>
export CITRATE_WORKER_JOB_ID=42
citrate-training-worker
```

## Reference

### The two crates

| Path | Crate | Role |
|---|---|---|
| `pool-coordinator/` | `citrate-pool-coordinator` | Watches `ComputeRequested`, decides the member, records dispatch, posts the prompt, completes or fails the job. |
| `training-worker/` | `citrate-training-worker` | `training` mode is a data-parallel training node, `pipeline` mode is one stage of a multi-stage model. |

### How the coordinator decides

The decision loop is `handle_event` in `pool-coordinator/src/lib.rs`. For one `ComputeRequested`
event it does five things, in order, and the order matters.

1. It reads `coordinatorFor(poolId, epoch)`, with the epoch derived from the event's block
   number as `block / 100` (`pool-coordinator/src/chain.rs`, `epoch_of`). If the elected
   coordinator is not this daemon's own account, it stops and does nothing on-chain.
2. It reads the pool's active members and picks one. Selection is deterministic, not a rotating
   cursor: the member is `members[keccak256(job_id) mod member_count]`
   (`pool-coordinator/src/dispatcher.rs`, `select_member`). The same job id always picks the
   same member, so a coordinator that restarts mid-job picks the same target, and two daemons
   that briefly believe they are coordinator pick the same target rather than two different
   ones.
3. It resolves the chosen member to its HTTPS endpoint from the configured map, failing with
   `UnknownMemberEndpoint` if the member is not listed.
4. It records the dispatch on-chain before making the HTTP call. Recording first means that if
   the call hangs and the daemon crashes, the chain already knows the dispatch happened and the
   timeout clock has started, so the job cannot sit pending forever.
5. It POSTs the prompt to `member/pool-infer` and waits. On success it submits `completeJob`,
   which distributes payment across the members. On failure it submits `failJob`, which refunds
   the buyer.

The request body is `{model, prompt, max_tokens, job_id}` and the response is
`{output, input_tokens?, output_tokens?}` (`pool-coordinator/src/provider.rs`). A 2xx response
with an empty or whitespace `output` is rejected as `ProviderFailed`, which routes the job down
the refund path. This is the pay-for-no-work guard; it does not yet check that the output is
correct, only that there is one.

### Coordinator environment variables

Read from `pool-coordinator/src/config.rs`.

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `CITRATE_POOL_KEYSTORE_PATH` | none | one of | SSv3 keystore file path. |
| `CITRATE_POOL_KEYSTORE_PASSPHRASE` | none | if keystore set | Keystore passphrase. |
| `CITRATE_POOL_PRIVATE_KEY_HEX` | none | one of (testnet) | Raw 64-hex key. |
| `CITRATE_POOL_WALLET_ADDRESS` | none | yes | Must match the derived key. |
| `CITRATE_POOL_CONTRACT` | none | yes | `ComputePool` address. |
| `CITRATE_POOL_MEMBER_ENDPOINTS` | `""` | yes | `addr1=url1,addr2=url2` member endpoint map. |
| `CITRATE_POOL_CHAIN_ID` | `40204` | no | Chain id, verified against the RPC at startup. |
| `CITRATE_POOL_RPC_URL` | `http://127.0.0.1:18545` | no | JSON-RPC endpoint. |
| `CITRATE_POOL_PROVIDER_TIMEOUT_SECS` | `30` | no | Per-request member timeout. |
| `CITRATE_POOL_METRICS_ADDR` | none | no | Prometheus `/metrics` bind, warns if not loopback. |

### Worker environment variables

Read from `training-worker/src/bin/main.rs`.

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `CITRATE_WORKER_MODE` | none | yes | `training` or `pipeline`. |
| `CITRATE_TRAINING_KEYSTORE_PATH` | none | one of | SSv3 keystore path. |
| `CITRATE_TRAINING_KEYSTORE_PASSPHRASE` | none | if keystore set | Passphrase. |
| `CITRATE_TRAINING_PRIVATE_KEY_HEX` | none | one of (testnet) | Raw key. |
| `CITRATE_WORKER_CONTRACT` | none | yes | Training or pipeline contract address. |
| `CITRATE_WORKER_JOB_ID` | none | recommended | The job to watch, by id. |
| `CITRATE_WORKER_CHAIN_ID` | `40204` | no | Chain id. |
| `CITRATE_WORKER_RPC_URL` | `https://rpc.citrate.ai` | no | JSON-RPC endpoint. |
| `CITRATE_WORKER_POLL_INTERVAL_SECS` | `3` | no | Event poll cadence. |
| `CITRATE_WORKER_CONFIRMATIONS_BUFFER` | `12` | no | Re-scan depth for reorg tolerance. |
| `CITRATE_WORKER_FROM_BLOCK` | `latest` | no | Event start block. |
| `CITRATE_WORKER_METRICS_ADDR` | none | no | Metrics bind, not yet wired for the worker. |

### What the worker library already contains

The training state machine is written and tested, even where the production binary does not yet
drive it. In `training-worker/src/worker.rs` a `Worker` runs the full lifecycle, joining,
loading shared starting weights, the per-step forward and backward pass, a quantized
all-reduce of the gradient with peers, a per-step commitment, and, when a worker is the elected
coordinator for an epoch, aggregating the peers' commitments into a Merkle root and posting it
with `commitEpoch`. The `EpochAggregator` in that file enforces that only registered members
count toward a root and that each `(worker, step)` pair counts once, so a single flooding peer
cannot finalize a root over forged work. The pipeline path in `training-worker/src/pipeline.rs`
runs the same idea for one stage of a model. Today these run against a small deterministic model,
an in-process transport, and a mock chain client, which is enough to check the state machine end
to end.

## Design rationale

The coordinator holds no shared state, and that is deliberate. Because the member is chosen by
hashing the job id rather than advancing a cursor, every copy of the daemon reaches the same
answer without talking to the others, a restart does not lose its place, and the brief window
where two copies both think they are coordinator resolves on-chain: the contract's "job not
pending" guard rejects the second `recordDispatch`. The cost is that selection is not perfectly
even per member; over many jobs it is close enough, and the property we wanted was agreement
without coordination. Recording the dispatch before the HTTP call, rather than after, trades a
little latency for the guarantee that a crashed coordinator leaves a recoverable trail instead
of a job stuck pending forever.

## Failure modes

The surface is security relevant where money moves, so it fails toward the buyer. A member that
returns nothing, times out, or returns empty output is treated as work not done: the coordinator
submits `failJob` and the buyer is refunded rather than paying for silence. The chain id is
checked against the RPC at startup, so a daemon pointed at the wrong network stops instead of
signing transactions there. Pool membership and stake are enforced by the on-chain contract, not
by the daemons, so a machine cannot pay itself by lying to a coordinator. Bind any metrics
endpoint to loopback unless you put authentication in front of it; the coordinator warns when the
bind address is not loopback. The output guard closes the pay-for-empty-work path, not the
pay-for-wrong-work path: checking that an answer is correct, not merely present, is on-chain work
that is specified but not yet built.

## Access and canon

Tier commercial: this is paid-seat marketplace operation, where operators sell pooled compute
under a service level. Every member account on the public network is identity-checked through
VERI; Citrate keeps the verification result, not the personal data behind it. Keys, data, and
model weights stay on the operator's hardware, and the only things the pool publishes are the
dispatch record, the completion, and the payment. No secrets appear on this page: keystore
passphrases and private keys come from your own secret store and are never printed.

This page connects to [federated learning](/research/learning) for the training surface
(Citrate Orchard), to the [compute contracts](/contracts/compute) the daemons call, and to the
[node agent](/compute/node-agent) that a single machine runs when it is not part of a pool.

## Source and verification

- Source repo: `citrate-compute-pool`.
- Files: `pool-coordinator/src/lib.rs`, `dispatcher.rs`, `chain.rs`, `provider.rs`, `config.rs`;
  `training-worker/src/lib.rs`, `worker.rs`, `pipeline.rs`, `bin/main.rs`, `training-worker/src/wallet.rs`.
- Audited against SHA: `ae9358d`.
- Status by component:
  - Coordinator decision loop (`handle_event`, `select_member`, `epoch_of`, output guard):
    Implemented, with unit and smoke tests. The live JSON-RPC adapter (`HttpChainAdapter`) is the
    seam the loop runs against; the loop and its guards are tested through a mock chain.
    Pre-audit.
  - Coordinator binary: Implemented, pre-audit.
  - Worker binary (`bin/main.rs`): Implemented for event observation. It watches a job and logs
    the events that would drive the state machine; wiring those events to spawn a `Worker` is a
    follow-up. Pre-audit.
  - Training and pipeline state machines (`worker.rs`, `pipeline.rs`): Implemented against a
    deterministic model, in-process transport, and mock chain (S0). The real GPU backend,
    cross-machine libp2p transport, and live chain are Specified, not yet built (S1 and S2).
  - On-chain output correctness checking and challenge hooks: Specified, not yet built.
