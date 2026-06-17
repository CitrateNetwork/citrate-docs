---
title: Sell Compute on Citrate (Operator SOP)
codex_slug: /operators/sell-compute
tier: commercial.kyc
org_scope: ~
source_kind: authored
source: citrate-node-agent (README.md, crates/)
surfaces: [NODE-sell]
audited_against_sha: 6f915eb
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Sell Compute on Citrate (Operator SOP)

> The end-to-end standard operating procedure for a compute operator selling GPU
> time on the Citrate marketplace (chainId **40204**) with `citrate-node-agent`.
> For KYC'd / contracted operators.

## Overview

You sell compute by running the **node agent** as a daemon. The agent watches the
marketplace, decides which jobs to bid on per your policy, proves it is alive with
a heartbeat, and drives jobs to completion. The agent **holds no keys** — every
on-chain write is emitted as an unsigned `SignatureRequest` that your **external
signer** signs and broadcasts. Plan for two roles: the agent (decisions) and the
signer (key custody).

This is an **authored** SOP; the surface reference it relies on is transcluded at
[/compute/node-agent](/compute/node-agent) (audited SHA `6f915eb`).

## Prerequisites

- KYC/contract in place (this is `commercial.kyc` material).
- GPU host + the `node-agent` binary built (`cargo build --release`).
- A provider wallet address and an external signer for that wallet.
- A reachable chain-40204 JSON-RPC endpoint over **HTTPS** (or loopback http).

## Procedure (end to end)

### 1. Write your participation policy — `compute.json`

```json
{ "enabled": true, "allocation_percent": 50, "schedule": "always" }
```

`schedule` is `always` · `nights` (22:00–05:59 UTC) · `weekends`. Start with
`enabled: false` to dry-run, then flip to `true`. (`crates/config`.)

### 2. Self-check offline (no RPC)

```bash
node-agent path/to/compute.json
```

Confirms your policy parses and prints the heartbeat calldata.

### 3. Start the daemon

```bash
export CITRATE_RPC_URL=https://<your-rpc-endpoint>      # HTTPS or loopback only
export CITRATE_PROVIDER_ADDRESS=0x<operator-wallet>
export CITRATE_NODE_AGENT_DAEMON=1
node-agent path/to/compute.json
```

The daemon brings up the loopback supervision API on `127.0.0.1:19600`, reads
chain state each tick, runs the bidder, and broadcasts a heartbeat every 30 s.

### 4. Wire up the signer

The agent emits unsigned `SignatureRequest`s; your signer must pull, sign,
broadcast, then acknowledge:

```bash
TOKEN=$(cat ~/.citrate/node-agent/supervision.token)
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/signature-requests
# sign + broadcast externally, then:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"tx_hash":"0x…"}' \
  http://127.0.0.1:19600/signature-requests/<id>/observed
```

### 5. Operate

```bash
curl http://127.0.0.1:19600/health                                   # liveness (no auth)
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/status # idle|bidding|executing|paused
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/pause   # stop new bids
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/resume
```

`pause` stops new bids but lets in-flight jobs finish — use it for maintenance.

### 6. Understand bidding (so your jobs win and stay profitable)

The bidder skips a job unless: it's `enabled`, inside the schedule window, under
the 10-SALT Commitment cap, a supported tier, under 80% capacity, deadline-feasible,
and the oracle price is fresh. It then bids `cost × 1.15`, capped at `0.9 ×
maxPrice`, and skips if that would be below cost. Tune `allocation_percent`,
`schedule`, and `CITRATE_NODE_PFLOPS_1E18` (your throughput) accordingly.

### 7. Job lifecycle (SELL-S2, experimental)

When execution ships: `Assigned → startExecution → run inference (model fetched
from IPFS, verified, served) → submitCommitment → submitResult → completeJob`.
`submitResult` is refused past the deadline block (anti-slash). Earnings auto-claim
when claimable ≥ `CITRATE_CLAIM_THRESHOLD_WEI`.

## Security & access

Tier **commercial.kyc**: operator-depth marketplace know-how, gated on KYC.

**No secrets here.** The supervision token is generated locally (mode 0600) and
never transcribed; bind the supervision API to loopback only. Use HTTPS for your
RPC endpoint — **never** set `CITRATE_NODE_AGENT_ALLOW_INSECURE_OUTBOUND` on a
production node (it's a dev-only LAN escape hatch that exposes you to MITM of
chain truth, oracle prices, and job state). Keep key custody in your external
signer; the agent never holds keys.

## Source & verification

- Source repo: `citrate-node-agent` (`README.md`, `crates/`)
- Audited against SHA: `6f915eb`
- SELL-S2 (execution/earnings) is experimental and pre-audit.
