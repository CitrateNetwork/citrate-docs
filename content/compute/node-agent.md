---
title: Citrate Node Agent
codex_slug: /compute/node-agent
tier: commercial.kyc
org_scope: ~
source_kind: transcluded
source: citrate-node-agent (crates/)
surfaces: [OPS-node-agent]
audited_against_sha: 6f915eb
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Node Agent

> The local daemon a compute provider runs to sell GPU time on the Citrate
> marketplace: it reads your participation policy, decides which jobs to bid on,
> proves liveness with a heartbeat, drives the job lifecycle, and emits
> **unsigned** transactions for an external signer to sign. Holds no keys. For
> KYC'd / contracted compute operators on chainId **40204**.

## Overview

`citrate-node-agent` is a Rust workspace of focused crates. The binary ties them
together: it loads `compute.json`, reads chain state over JSON-RPC, runs the
bidder, broadcasts heartbeats, and exposes a loopback-only supervision HTTP API.

A defining property: **the agent holds no signing keys** (ADR-agent-signing /
TD-17). Every on-chain write is produced as an unsigned `SignatureRequest` and
handed to an external signing surface (a wallet / relay) that signs and
broadcasts; the agent only observes the resulting transaction. This is why the
operator flow involves a separate signer.

This page is **transcluded** — the truth lives in the crates at the pinned SHA
(`6f915eb`). Each item cites the crate/path it is audited against; if a field or
endpoint is not listed here, it does not exist at this SHA.

| Crate | Path | Role |
|---|---|---|
| `config` | `crates/config/src/lib.rs` | Parse `compute.json` (`ComputeSettings`). |
| `bidder` | `crates/bidder/src/lib.rs` | Pure `evaluate()` cost-plus bid decision. |
| `heartbeat` | `crates/heartbeat/src/lib.rs` | 30 s liveness loop, `heartbeat()` calldata. |
| `supervision` | `crates/supervision/src/server.rs` | Loopback HTTP control plane. |
| `chainio` | `crates/chainio/` | chain-40204 address book + RPC read client + ABI codec. |
| `node-agent` | `crates/node-agent/` | Binary entry point. |
| `lifecycle` | `crates/lifecycle/src/lib.rs` | Job state machine (SELL-S2). |
| `executor` | `crates/executor/` | Model provisioning + inference adapter (SELL-S2). |
| `earnings` | `crates/earnings/` | Claimable poll + auto `claimRewards()` (SELL-S2). |

> **Honest status.** SELL-S1 (config + bidder + heartbeat + supervision + live
> chain reads) is implemented. Execution, model provisioning and earnings
> (SELL-S2) are present as crates but mark themselves as not-yet-production in
> several paths. Treat S2 surfaces as experimental. This agent is pre-audit.

## Install / Setup

```bash
# From the citrate-node-agent workspace root
cargo build --release           # produces the `node-agent` binary
```

### `compute.json` schema

Audited against `crates/config/src/lib.rs` → `ComputeSettings`. Unknown fields
are ignored (forward-compatible); a missing/empty file fails **safe** (disabled).

| Field | Type | Default | Meaning |
|---|---|---|---|
| `enabled` | bool | `false` | Master participation switch. |
| `allocation_percent` | u8 (0–100) | `0` | Fraction of GPU you allot. Out-of-range is rejected. |
| `schedule` | enum | `always` | `always` · `nights` (22:00–05:59 UTC) · `weekends` (Sat/Sun). |

```json
{
  "enabled": true,
  "allocation_percent": 50,
  "schedule": "always"
}
```

### Environment variables

Audited against the crates at this SHA. **No secrets here** — every URL below is
validated at client construction and fails closed on plaintext HTTP to a
non-loopback host.

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `CITRATE_RPC_URL` | unset | No (S1 runs offline) | chain-40204 JSON-RPC endpoint (https or loopback http). |
| `CITRATE_PROVIDER_ADDRESS` | unset | No | Operator provider wallet address (20-byte hex). |
| `CITRATE_NODE_AGENT_DAEMON` | unset | No | Enable daemon mode (`1`/`true`); or pass `--daemon`. |
| `CITRATE_NODE_AGENT_ADDR` | `127.0.0.1:19600` | No | Supervision bind address (**must stay loopback**; daemon exits otherwise). |
| `CITRATE_NODE_AGENT_TOKEN_FILE` | `$HOME/.citrate/node-agent/supervision.token` | No | Bearer-token file (generated at startup, mode 0600). |
| `CITRATE_NODE_PFLOPS_1E18` | `6e18` (6 pflops) | No | Node throughput (fixed-point ×1e18) for exec-time estimates. |
| `CITRATE_CLAIM_THRESHOLD_WEI` | unset | No | Auto-claim earnings when claimable ≥ threshold (S2). |
| `CITRATE_MODEL_CACHE_DIR` | temp dir | No | Model-weights cache (S2). |
| `CITRATE_MODEL_SHA256` | unset | No | Trusted weights digest for integrity check (S2). |
| `CITRATE_IPFS_GATEWAY` | unset | No | IPFS gateway for model CID fetch (S2). |
| `CITRATE_LLAMA_URL` | unset | No | Resident llama-server inference endpoint (S2). |
| `CITRATE_JOB_INPUT_DIR` | unset | No | Off-chain job input drop dir (S2). |
| `CITRATE_MAX_WEIGHT_BYTES` | (large) | No | Download size guard against DoS (S2). |

> **DEV-ONLY, never in production: `CITRATE_NODE_AGENT_ALLOW_INSECURE_OUTBOUND=1`.**
> This bypasses the TLS requirement and permits plaintext HTTP to non-loopback
> hosts for LAN test rigs only. A MITM on a plaintext RPC link can feed the agent
> false chain truth, false oracle prices, and false job state. The agent logs
> loudly whenever it is set. Do not set it on any production node.

## Reference

### Bidder — `crates/bidder/src/lib.rs` → `evaluate()`

Pure function: `evaluate(job, oracle, settings, caps) -> BidDecision`. Gating
order (cheapest checks first), then cost-plus pricing:

1. `enabled == false` → Skip (Disabled)
2. Outside schedule window → Skip (OutsideSchedule)
3. `maxPrice ≥ 10 SALT` → Skip (ExceedsCommitmentCap; S1 stays under the ZK-upgrade threshold)
4. Non-Commitment tier → Skip (UnsupportedTier)
5. Active jobs ≥ 80% of max-concurrent → Skip (AtCapacity)
6. Deadline < 2× estimated exec seconds → Skip (DeadlineInfeasible)
7. Schedule window closes < 2× estimated exec seconds → Skip (WindowClosingSoon)
8. Oracle stale → Skip (OracleStale)
9. Price = `cost × 1.15`, capped at `0.9 × maxPrice`. If below cost → Skip (Unprofitable); else Bid.

### Heartbeat — `crates/heartbeat/src/lib.rs`

- Interval: **30 s** (`HEARTBEAT_INTERVAL`), kept under the on-chain heartbeat window so one miss never trips suspension.
- Calldata: `HeartbeatMonitor.heartbeat()` selector only (no args).
- Send errors are logged but do **not** stop the loop.

### Supervision HTTP — `crates/supervision/src/server.rs`

Loopback-only (non-loopback binds rejected at startup). Bearer token is minted at
startup (256-bit, hex), persisted to the token file at mode 0600, and compared in
constant time. All endpoints except `/health` require `Authorization: Bearer <token>`.

| Method | Route | Auth | Response |
|---|---|---|---|
| GET | `/health` | none | Health JSON snapshot (liveness probes). |
| GET | `/status` | bearer | `"idle"` · `"bidding"` · `"executing"` · `"paused"`. |
| POST | `/pause` | bearer | Pause new bids (in-flight jobs finish). |
| POST | `/resume` | bearer | Resume bidding. |
| GET | `/signature-requests` | bearer | Array of unsigned `SignatureRequest`s for the signer. |
| POST | `/signature-requests/{id}/observed` | bearer | Mark request signed+broadcast; body `{"tx_hash":"0x…"}`. |

### chainio — `crates/chainio/src/generated/addresses.json`

Read client + ABI codec against the chain-40204 address book (mirrored from
`citrate-chain`). Contracts the agent reads/calls: `ComputeMarketplace`
(`getProvider`, `getJob`, `bidOnJob`, `startExecution`, `submitCommitment`,
`submitResult`, `completeJob`), `ComputePricingOracle` (`saltPerPflopHour`,
`isPriceStale`), `ComputeVerifier`, `HeartbeatMonitor` (`heartbeat`),
`ContributionAccounting` (`claimRewards`), `ModelRegistry` (`getModel`).

## Examples

```bash
# Offline self-check (no RPC needed)
node-agent path/to/compute.json

# Live daemon
export CITRATE_RPC_URL=https://<your-rpc-endpoint>
export CITRATE_PROVIDER_ADDRESS=0x<operator-wallet>
export CITRATE_NODE_AGENT_DAEMON=1
node-agent path/to/compute.json

# Supervise
TOKEN=$(cat ~/.citrate/node-agent/supervision.token)
curl http://127.0.0.1:19600/health
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/status
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/pause
```

## Tutorials

- [Become a compute seller](/operators/tutorials/become-a-seller) — runnable, end to end.
- [Sell compute (operator SOP)](/operators/sell-compute) — the full procedure.

## Security & access

Tier **commercial.kyc**: the agent is operator-depth implementation
(bid-pricing logic, lifecycle, capacity gating) whose anonymous theft would
materially help a competitor clone the marketplace seller side, but which any
contracted/KYC'd operator should have. Gated on KYC, not on a seat.

No secrets appear on this page. The supervision token is generated locally and
never transcribed. The dev-only `CITRATE_NODE_AGENT_ALLOW_INSECURE_OUTBOUND`
escape hatch is documented as forbidden in production, with its value never set
here. The agent holds no keys by design.

## Source & verification

- Source repo: `citrate-node-agent` (`crates/`)
- Audited against SHA: `6f915eb`
- Pre-audit; SELL-S2 surfaces (execution/executor/earnings) are experimental.
