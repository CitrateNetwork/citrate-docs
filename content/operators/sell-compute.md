---
title: Sell compute
codex_slug: /operators/sell-compute
tier: commercial.kyc
org_scope: ~
source_kind: authored
source: citrate-node-agent (README.md, crates/)
surfaces: [NODE-sell]
audited_against_sha: 38bc9d1
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is the standing procedure for selling compute on Citrate Market with Citrate Node, end to end, on
chain id 40204. It is written for identity-verified operators who run their own hardware and want idle
GPU hours to earn while the machine is otherwise unsupervised.

## What it is

You sell compute by running Citrate Node as a daemon on your own host. The daemon watches Citrate Market,
decides which jobs to bid on by your policy, proves it is alive with a heartbeat, and drives a won job to
completion. It holds no keys: every on-chain write is emitted as an unsigned `SignatureRequest` that your
separate signing surface, the operator's Citrate Keyring or a signing relay, signs and broadcasts. Plan
for two roles, the agent that decides and the signer that holds keys. The work you perform settles in SALT.

The field reference for every flag, route, and gate is [Citrate Node](/compute/node-agent), audited against
the same SHA. Bringing the node online at all is covered in [run a node](/operators/run-a-node), and the
identity step is covered under [verified identity](/aa/identity).

## How to use it

### 1. Write your participation policy

Create `compute.json`:

```json
{ "enabled": true, "allocation_percent": 50, "schedule": "always" }
```

`schedule` is `always`, `nights` (22:00 to 05:59 local), or `weekends`. Start with `enabled: false` to
dry-run the wiring, then flip it to `true` (`crates/config`).

### 2. Self-check offline

```bash
node-agent path/to/compute.json
```

This confirms your policy parses and prints the heartbeat calldata. No RPC is contacted.

### 3. Start the daemon

```bash
export CITRATE_RPC_URL=https://<your-rpc-endpoint>      # https or loopback http only
export CITRATE_PROVIDER_ADDRESS=0x<your-provider-account>
export CITRATE_NODE_AGENT_DAEMON=1
node-agent path/to/compute.json
```

The daemon brings up the loopback supervision API on `127.0.0.1:19600`, reads chain state each tick, runs
the bidder, and beats every 30 seconds.

### 4. Wire up the signer

The agent emits unsigned requests; your signer pulls, signs, broadcasts, then acknowledges:

```bash
TOKEN=$(cat ~/.citrate/node-agent/supervision.token)
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/signature-requests
# sign and broadcast externally, then:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"tx_hash":"0x..."}' \
  http://127.0.0.1:19600/signature-requests/<id>/observed
```

### 5. Operate

```bash
curl http://127.0.0.1:19600/health                                    # liveness, no auth
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/status  # idle|bidding|executing|paused
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/pause   # stop new bids
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/resume
```

`pause` stops new bids but lets in-flight jobs finish; use it for maintenance.

### 6. Understand the bidding so your bids win and stay profitable

The bidder skips a job unless it is enabled, inside the schedule window, under the 10-SALT Commitment cap,
a Commitment-tier job, under 80% capacity, deadline-feasible, and priced off a fresh oracle. It then bids
`cost x 1.15`, capped at `0.9 x maxPrice`, and skips if that would fall below cost. Scoring on-chain is
40% price, 30% reputation, 20% load, and 10% verification tier, so a low bid alone does not win; reputation
earned by completing jobs matters. Tune `allocation_percent`, `schedule`, and `CITRATE_NODE_PFLOPS_1E18`,
your throughput, accordingly. See [rewards and reputation](/operators/rewards).

### 7. Job lifecycle, experimental

When the execution path is enabled (SELL-S2, set `CITRATE_IPFS_GATEWAY`, `CITRATE_LLAMA_URL`, and
`CITRATE_JOB_INPUT_DIR`), a won job walks: `Assigned` → `startExecution` → run inference (weights fetched
by model CID, digest recomputed locally, served) → `submitCommitment` → `submitResult` → `completeJob`.
`submitResult` is refused past the execution deadline, an anti-slash guard. Earnings auto-claim once
claimable reaches `CITRATE_CLAIM_THRESHOLD_WEI`. Treat this path as experimental until SELL-S2 lands fully.

## Reference

| Surface | Where |
|---|---|
| Every flag, route, env var, and gate | [Citrate Node](/compute/node-agent) |
| The on-chain marketplace functions | [compute contracts](/contracts/compute) |
| Reputation, scoring, and slashing-protection | [rewards and reputation](/operators/rewards) |
| Bringing the node online | [run a node](/operators/run-a-node) |
| Identity verification through VERI | [verified identity](/aa/identity) |

## Design rationale

The agent never holds a key because an unattended process reacting to live prices on a GPU host is the
last place a signing key belongs. Unsigned requests plus an external signer mean a daemon compromise cannot
move stake or funds. The conservative bidder, the 80% capacity cap, the night and weekend schedules, and
the twice-execution-time margins all exist so an operator can sell idle hours without watching the machine
and without taking on work it cannot finish before a slashable deadline.

## Failure modes

- The daemon exits at startup if `CITRATE_NODE_AGENT_ADDR` is not loopback; the supervision surface is
  localhost-only by design.
- No bids usually means a bidder gate fired: check `enabled`, the schedule window, capacity under 80%,
  deadline feasibility, oracle freshness, and the 10-SALT cap. `/status` and `/health` report the live
  state.
- An RPC refused at startup is the outbound TLS gate; plaintext HTTP to a non-loopback host is rejected.
  Use https. Never set `CITRATE_NODE_AGENT_ALLOW_INSECURE_OUTBOUND` on a production node; it is a dev-only
  LAN escape hatch that exposes you to a network attacker rewriting chain state, oracle prices, and job
  state.
- A late result is refused rather than submitted, so the lifecycle aborts cleanly instead of being slashed.

## Access and canon

Tier commercial.kyc: operator-depth marketplace know-how, gated on identity verification through Citrate's in-house verification (VERI), not
on a seat. Every operator and machine on Citrate Network is identity-verified through VERI, and Citrate
holds the verification result, not the personal data behind it. Compute is sold from your own hardware,
on-premise by default, and SALT settles the work performed; it is the unit you count in, not a product to
hold. No secrets here: the supervision token is generated locally at mode 0600 and never transcribed, bind
the supervision API to loopback only, and key custody stays in your external signer. The agent never holds
keys.

## Source and verification

Verified against `citrate-node-agent` at `38bc9d1` (`README.md` and `crates/`). The policy fields against
`crates/config`, the bidder gates and cost-plus pricing against `crates/bidder`, the lifecycle and unsigned
signing seam against `crates/lifecycle`, the supervision routes against `crates/supervision`, and the
marketplace scoring and fee split against `ComputeMarketplace.sol`. Status: SELL-S1 (settings, bidder,
heartbeat, supervision, live reads) Implemented, pre-audit; SELL-S2 (execution and earnings) Specified and
experimental.
