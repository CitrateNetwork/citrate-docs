---
title: Citrate Compute Pool
codex_slug: /compute/pool
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-compute-pool (pool-coordinator/, training-worker/)
surfaces: [OPS-compute-pool]
audited_against_sha: ae9358d
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Compute Pool

> Two daemons for running pooled compute on Citrate: **`citrate-pool-coordinator`**
> dispatches inference jobs across a member pool (CM-05), and
> **`citrate-training-worker`** participates in data-parallel training (CM-07) and
> inference-pipeline (CM-08) jobs. For paid-seat compute operators on chainId **40204**.

## Overview

`citrate-compute-pool` builds two binaries. Both are driven entirely by
**environment variables** (no TOML/JSON config files) and both speak directly to
on-chain contracts via signed transactions.

| Binary | Crate | What it does |
|---|---|---|
| `citrate-pool-coordinator` | `pool-coordinator/` | Subscribes to `ComputeRequested`, elects coordinator per epoch, round-robin selects a member, records dispatch on-chain, POSTs the request to the member's `/pool-infer`, then completes or fails the job on-chain. |
| `citrate-training-worker` | `training-worker/` | `training` mode (CM-07): joins training pools, observes epoch events; `pipeline` mode (CM-08): inference-pipeline stage worker. |

This page is **transcluded** — truth lives in the binaries at SHA `ae9358d`.

> **Honest status.** S1 scope for the training worker is **event observation
> only**; the training backend (forward/backward, ring all-reduce, Merkle
> aggregation) is deferred to S2. The coordinator dispatch path is implemented.
> Pre-audit.

## Install / Setup

```bash
# From the citrate-compute-pool workspace root
cargo build --release
```

Both binaries authenticate with a wallet, supplied as **either** a Web3 SSv3
keystore + passphrase **or** a raw private-key hex (testnet only). Keys are never
shown on this page; the keystore JSON schema is documented in
`pool-coordinator/src/wallet.rs`.

## Reference

### `citrate-pool-coordinator` env vars

Audited against `pool-coordinator/src/config.rs`.

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `CITRATE_POOL_KEYSTORE_PATH` | — | one-of | SSv3 keystore file path. |
| `CITRATE_POOL_KEYSTORE_PASSPHRASE` | — | if keystore set | Keystore passphrase. |
| `CITRATE_POOL_PRIVATE_KEY_HEX` | — | one-of (testnet) | Raw 64-hex key. |
| `CITRATE_POOL_WALLET_ADDRESS` | — | **yes** | Must match derived key. |
| `CITRATE_POOL_CONTRACT` | — | **yes** | `ComputePool` address. |
| `CITRATE_POOL_MEMBER_ENDPOINTS` | `""` | **yes** | `addr1=url1,addr2=url2` member `/pool-infer` map. |
| `CITRATE_POOL_CHAIN_ID` | `40204` | No | Chain ID (verified against RPC at startup). |
| `CITRATE_POOL_RPC_URL` | `http://127.0.0.1:18545` | No | JSON-RPC endpoint. |
| `CITRATE_POOL_PROVIDER_TIMEOUT_SECS` | `30` | No | Per-request member timeout. |
| `CITRATE_POOL_POLL_INTERVAL_SECS` | `3` | No | Event poll cadence. |
| `CITRATE_POOL_FROM_BLOCK` | `latest` | No | Event start block. |
| `CITRATE_POOL_CONFIRMATIONS_BUFFER` | `12` | No | Reorg rescan depth. |
| `CITRATE_POOL_METRICS_ADDR` | — | No | Prometheus `/metrics` bind (warns if non-loopback). |
| `LOG_FORMAT` / `RUST_LOG` | `pretty` / `info,…=debug` | No | Logging. |

Dispatch protocol: HTTPS POST to `member/pool-infer` with
`{model, prompt, max_tokens, job_id}`; response `{output, input_tokens?,
output_tokens?}`. Empty `output` is rejected (pay-for-no-work guard).

### `citrate-training-worker` env vars

Audited against the training-worker config.

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `CITRATE_WORKER_MODE` | — | **yes** | `training` or `pipeline`. |
| `CITRATE_TRAINING_KEYSTORE_PATH` | — | one-of | SSv3 keystore path. |
| `CITRATE_TRAINING_KEYSTORE_PASSPHRASE` | — | if keystore set | Passphrase. |
| `CITRATE_TRAINING_PRIVATE_KEY_HEX` | — | one-of (testnet) | Raw key. |
| `CITRATE_WORKER_CONTRACT` | — | **yes** | `ComputePoolTraining` / pipeline contract. |
| `CITRATE_WORKER_CHAIN_ID` | `40204` | No | Chain ID. |
| `CITRATE_WORKER_RPC_URL` | `https://rpc.citrate.ai` | No | JSON-RPC endpoint. |
| `CITRATE_WORKER_JOB_ID` | — | No (recommended) | Watch a specific job. |
| `CITRATE_WORKER_POLL_INTERVAL_SECS` | `3` | No | Event poll cadence. |
| `CITRATE_WORKER_FROM_BLOCK` | `latest` | No | Event start block. |
| `CITRATE_WORKER_CONFIRMATIONS_BUFFER` | `12` | No | Reorg rescan depth. |
| `CITRATE_WORKER_METRICS_ADDR` | — | No | Metrics bind (S1 follow-up). |
| `LOG_FORMAT` / `RUST_LOG` | `pretty` / `info,…=debug` | No | Logging. |

## Examples

```bash
# Coordinator
export CITRATE_POOL_KEYSTORE_PATH=/secure/pool-keystore.json
export CITRATE_POOL_KEYSTORE_PASSPHRASE="$KEYSTORE_PASS"   # from your secret store
export CITRATE_POOL_WALLET_ADDRESS=0x<derived-address>
export CITRATE_POOL_CONTRACT=0x<ComputePool>
export CITRATE_POOL_RPC_URL=https://<your-rpc-endpoint>
export CITRATE_POOL_MEMBER_ENDPOINTS="0xm1=https://m1/pool-infer,0xm2=https://m2/pool-infer"
citrate-pool-coordinator

# Training worker
export CITRATE_WORKER_MODE=training
export CITRATE_TRAINING_KEYSTORE_PATH=/secure/worker-keystore.json
export CITRATE_TRAINING_KEYSTORE_PASSPHRASE="$KEYSTORE_PASS"
export CITRATE_WORKER_CONTRACT=0x<ComputePoolTraining>
export CITRATE_WORKER_JOB_ID=42
citrate-training-worker
```

## Tutorials

- [Sell compute (operator SOP)](/operators/sell-compute)
- [Become a compute seller](/operators/tutorials/become-a-seller)

## Security & access

Tier **commercial**: enterprise/paid-seat marketplace operations and SLAs.
Pool membership and stake are enforced on-chain, not by the daemons.

No secrets here. Keystore passphrases and private keys are supplied via your own
secret store and never printed. Empty-output and chain-id verification guards are
documented above. Bind `*_METRICS_ADDR` to loopback unless you front it with auth.

## Source & verification

- Source repo: `citrate-compute-pool`
- Audited against SHA: `ae9358d`
- Pre-audit; training backend (S2) not yet implemented.
