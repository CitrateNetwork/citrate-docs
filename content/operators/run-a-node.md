---
title: Run a Citrate Node
codex_slug: /operators/run-a-node
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain (README.md, docs/OPERATIONS.md, docker/, config/)
surfaces: [NODE-run]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Run a Citrate Node

> How to run a Citrate node — devnet (local), testnet, or via Docker — on chainId
> **40204**. For anyone who wants to operate a node; no login required.

## Overview

`citrate-chain` builds a GhostDAG-based L1 with EVM-compatible execution (LVM via
REVM). The node binary is built from the `citrate-node` crate. You can run a local
devnet single node, join testnet, or run either in Docker.

Network facts (audited against `README.md` and the `config/` TOML at SHA `03d7851`):

| Fact | Value |
|---|---|
| Chain ID | **40204** (devnet and testnet) |
| Token | SALT (18 decimals) |
| Consensus | GhostDAG (k=8 devnet, k=18 testnet) |
| Default JSON-RPC | `:8545` (HTTP) |
| Default WebSocket | `:8546` |
| Default REST API | `:3000` |
| Default P2P | `:30303` |
| Default metrics | `:9100` |

This page is **transcluded** — the canonical run instructions live in
`citrate-chain` README + `docs/OPERATIONS.md`. See those at the pinned SHA.

## Install / Setup

Prerequisites: Rust toolchain (the Docker build pins Rust 1.93.0). Then from the
`citrate-chain` workspace root:

```bash
cargo build --release        # builds the citrate-node binary
```

## Reference

### Run a node (bare metal)

Audited against `README.md` and `node-app/README.md`.

```bash
# Local devnet (single node, mining on, 1s blocks)
cargo run --bin citrate-node -- devnet

# Testnet
cargo run --bin citrate-node -- --network testnet

# Explicit config / data dir
cargo run --bin citrate-node -- --config /path/to/node.toml --data-dir /custom/path
```

Helper script for a 3-node local testnet (`scripts/launch_local_testnet.sh`):

```bash
./scripts/launch_local_testnet.sh            # preserve data
./scripts/launch_local_testnet.sh --clean    # fresh start
./scripts/launch_local_testnet.sh --status   # check status
```

### Run a node (Docker)

Audited against `docker-compose.yml` and `docker/node.Dockerfile`.

```bash
docker compose -f docker-compose.yml --profile devnet  up --build
docker compose -f docker-compose.yml --profile testnet up --build
docker compose -f docker-compose.yml --profile cluster up --build   # 5-node
```

Inside the container RPC binds to `0.0.0.0`; external exposure is controlled by
the compose port mappings (devnet maps host `8545/8546/30303/9100`; testnet maps
host `18545/18546/30304/19100`).

### Environment variables

Audited against `node-app/README.md` and the compose files.

| Variable | Default | Purpose |
|---|---|---|
| `RUST_LOG` | `info,citrate_api=debug` (devnet) | Log filter. |
| `CITRATE_DATA_DIR` | `/data` (docker) | RocksDB storage dir. |
| `CITRATE_RPC_ADDR` | `127.0.0.1:8545` | JSON-RPC listen address. |
| `CITRATE_METRICS` / `CITRATE_METRICS_ADDR` | `1` / `0.0.0.0:9100` | Prometheus metrics. |
| `CITRATE_OPERATOR_TOKEN` | unset | **Required for admin RPC methods on non-loopback binds** (fail-closed). Use a strong random token. |

### Health & memory

```bash
# Block height
curl -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
  http://127.0.0.1:8545

# Producer RSS (PIL-13 memory health, docs/OPERATIONS.md)
ps -o rss= -p "$(pgrep -f citrate-node | head -1)"
```

Memory health (`docs/OPERATIONS.md`): healthy ≤ 1.2 GB; watch 1.2–2 GB; >2 GB is
leak-class — trip the `mining = false` circuit breaker (node still serves RPC
reads at ~1 GB, only writes stop); alert fires at >3 GB.

## Examples

```bash
# Quickest path to a working node
cargo build --release
cargo run --bin citrate-node -- devnet
curl http://127.0.0.1:8545
```

## Tutorials

- [Sell compute (operator SOP)](/operators/sell-compute) — once your node is up.

## Security & access

Tier **public**: running a node is public-good developer/operator material.

**Security notes — no secrets on this page.** RPC ships with **no TLS and no
auth** (SECREM-01 CFG-2). On bare metal it defaults to loopback; if you bind to
`0.0.0.0`, you must set `CITRATE_OPERATOR_TOKEN` and front the endpoint with a
TLS-terminating reverse proxy with an explicit CORS allow-list. The devnet
coinbase (`f39Fd6e…`) is a well-known Hardhat test account — **never use it on
testnet or production**, and never reuse the example dev keys. The dev-only
`CITRATE_REQUIRE_VALID_SIGNATURE=false` and `CITRATE_ALLOW_PLAINTEXT_P2P=1`
switches must stay off outside local development.

## Source & verification

- Source repo: `citrate-chain` (`README.md`, `docs/OPERATIONS.md`, `docker/`, `config/`)
- Audited against SHA: `03d7851`
- Note: there is no `docs/PRIVATE_NETWORK.md` at this SHA; the operator runbook is `docs/OPERATIONS.md`.
