---
title: "Tutorial: Become a Compute Seller"
codex_slug: /operators/tutorials/become-a-seller
tier: commercial.kyc
org_scope: ~
source_kind: authored
source: citrate-node-agent (README.md, crates/)
surfaces: [NODE-sell, OPS-node-agent]
audited_against_sha: 6f915eb
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Tutorial: Become a Compute Seller

> A runnable, step-by-step walkthrough to go from a fresh checkout to a live
> Citrate compute seller (chainId **40204**). For KYC'd / contracted operators.
> ~15 minutes. Audited against `citrate-node-agent` SHA `6f915eb`.

## What you'll do

1. Build the agent.
2. Write and self-check a participation policy.
3. Run the agent in offline mode (no chain).
4. Run it as a live daemon and drive it through the supervision API.

## Prerequisites

- A Rust toolchain and the `citrate-node-agent` checkout.
- (For the live step) a chain-40204 HTTPS JSON-RPC endpoint, a provider wallet
  address, and an external signer for that wallet.
- KYC/contract in place.

## Step 1, Build

```bash
# From the citrate-node-agent workspace root
cargo build --release
# The binary is target/release/node-agent
```

## Step 2, Write a policy

Create `compute.json`:

```json
{
  "enabled": true,
  "allocation_percent": 25,
  "schedule": "nights"
}
```

This allots 25% of the GPU, only at night (22:00–05:59 UTC). Fields are validated
against `crates/config`, `allocation_percent` must be 0–100.

## Step 3, Self-check offline

```bash
node-agent compute.json
```

Expected: the agent prints your enabled/allocation/schedule, the current UTC
clock, the heartbeat calldata, and a self-check OK. No RPC is contacted. If you
set `enabled: false`, it reports disabled, a safe way to verify wiring.

## Step 4, Run live

```bash
export CITRATE_RPC_URL=https://<your-rpc-endpoint>     # HTTPS (or loopback http) only
export CITRATE_PROVIDER_ADDRESS=0x<your-provider-wallet>
export CITRATE_NODE_AGENT_DAEMON=1
node-agent compute.json
```

The daemon starts the supervision API on `127.0.0.1:19600` and begins reading
chain state, bidding, and heart-beating every 30 s.

## Step 5, Drive it

In a second terminal:

```bash
TOKEN=$(cat ~/.citrate/node-agent/supervision.token)

curl http://127.0.0.1:19600/health                                    # no auth
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/status  # idle|bidding|executing|paused

# Pull unsigned tx requests for your external signer to sign + broadcast
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/signature-requests

# After signing + broadcasting externally, acknowledge:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"tx_hash":"0x…"}' \
  http://127.0.0.1:19600/signature-requests/<id>/observed

# Maintenance: stop new bids (in-flight jobs finish), then resume
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/pause
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/resume
```

## Step 6, Verify you're selling

- `/status` shows `bidding` or `executing` when there is matching demand.
- `/health` shows a recent heartbeat age.
- Broadcast transactions for your provider address appear on-chain (via your explorer).

## Troubleshooting

- **Daemon exits immediately**, `CITRATE_NODE_AGENT_ADDR` must be loopback; a
  non-loopback bind is rejected by design.
- **No bids**, check the bidder gates: `enabled`, schedule window, capacity
  (<80%), deadline feasibility, oracle freshness, and the 10-SALT cap.
- **RPC refused at startup**, the agent rejects plaintext HTTP to non-loopback
  hosts. Use HTTPS. Do **not** set `CITRATE_NODE_AGENT_ALLOW_INSECURE_OUTBOUND`
  on a production node, it is a dev-only LAN escape hatch that exposes you to MITM.

## Next steps

- [Sell compute (operator SOP)](/operators/sell-compute), the full procedure and bidding model.
- [Node agent reference](/compute/node-agent), every field, endpoint, and env var.

## Security & access

Tier **commercial.kyc**. No secrets in this tutorial: the supervision token is
generated locally (0600) and read from its file, keys live only in your external
signer, and the dev-only insecure-outbound flag is called out as forbidden in
production. The agent holds no keys.

## Source & verification

- Source repo: `citrate-node-agent` (`README.md`, `crates/`)
- Audited against SHA: `6f915eb`
- SELL-S2 execution surfaces are experimental and pre-audit.
