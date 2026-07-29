---
title: Citrate Node
codex_slug: /compute/node-agent
tier: commercial.kyc
org_scope: ~
source_kind: authored
source: citrate-node-agent (crates/, README.md)
surfaces: [OPS-node-agent]
audited_against_sha: 38bc9d1
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate Node is the daemon an operator runs to sell compute on Citrate Market from their own hardware.
It reads a small settings file, watches the market over JSON-RPC, decides which jobs to bid on, proves
liveness with a heartbeat, and drives a won job to payout. It holds no keys: every write it wants made is
handed, unsigned, to a separate signing surface. This page is for identity-verified operators on Citrate
Network, chain id 40204.

## What it is

Citrate Node is a Rust workspace of focused crates, built into one `node-agent` binary. The binary loads
`compute.json`, samples the clock, reads chain state, runs the bidder, and exposes a loopback supervision
API the operator's tools drive. Compute is sold on Citrate Market; the machine running this daemon stays
on your premises, and the work it performs settles in SALT.

One property shapes the whole design: the daemon holds no signing keys. Every on-chain write is produced
as an unsigned `SignatureRequest` and queued for an external signing surface, the operator's Citrate
Keyring or a signing relay, which signs and broadcasts it. The daemon only observes the resulting
transaction. This is why selling involves two roles, the agent that decides and the signer that holds
keys, and it is enforced in code at `crates/lifecycle/src/lib.rs` and `crates/node-agent/src/main.rs`
(ADR-agent-signing / TD-17).

The crates, each citing the path it is audited against:

| Crate | Path | Role |
|---|---|---|
| `config` | `crates/config/src/lib.rs` | Parse `compute.json` into `ComputeSettings`; schedule-window logic. |
| `bidder` | `crates/bidder/src/lib.rs` | Pure `evaluate()` cost-plus bid decision. |
| `heartbeat` | `crates/heartbeat/src/lib.rs` | 30-second liveness loop, `heartbeat()` calldata. |
| `chainio` | `crates/chainio/` | Chain-40204 address book, JSON-RPC read client, ABI codec, outbound TLS gate. |
| `supervision` | `crates/supervision/src/server.rs` | Loopback HTTP control surface, bearer-token gated. |
| `node-agent` | `crates/node-agent/` | The binary that ties the crates together. |
| `lifecycle` | `crates/lifecycle/src/lib.rs` | Job state machine, plans the next unsigned write. |
| `executor` | `crates/executor/` | Model provisioning and inference adapter. |
| `earnings` | `crates/earnings/` | Claimable poll and `claimRewards()` calldata. |
| `pinning` | `crates/pinning/` | Replication-slot pinning sidecar. |

The settings, bidder, heartbeat, and supervision surfaces are the implemented selling path (SELL-S1). The
execution, model-provisioning, and earnings surfaces (SELL-S2) compile and are wired into the daemon loop
but several paths still report themselves as not yet production; treat them as experimental. The agent
has not had an external audit.

## How to use it

1. Build the binary from the workspace root with `cargo build --release`. The result is
   `target/release/node-agent`.
2. Write `compute.json`, your participation policy. Start with `enabled: false` to dry-run the wiring,
   then flip it to `true`.
3. Self-check offline by running `node-agent path/to/compute.json`. No RPC is contacted; the agent prints
   your policy, the clock, and the heartbeat calldata it would send.
4. Run live as a daemon with `CITRATE_RPC_URL` and `CITRATE_PROVIDER_ADDRESS` set. The daemon brings up
   the loopback supervision API, reads chain state each tick, runs the bidder, and beats every 30 seconds.
5. Wire up your signer. The signing surface pulls unsigned requests from `/signature-requests`, signs and
   broadcasts them, then reports each back to `/signature-requests/{id}/observed`.

The runnable, end-to-end version of this is [become a compute seller](/operators/tutorials/become-a-seller),
and the full operating procedure is [sell compute](/operators/sell-compute).

## Reference

### `compute.json`, `crates/config/src/lib.rs`

Audited against `ComputeSettings`. Unknown fields are ignored, so newer writers stay forward-compatible; a
missing or empty file falls back to disabled, the fail-safe default.

| Field | Type | Default | Meaning |
|---|---|---|---|
| `enabled` | bool | `false` | Master participation switch. |
| `allocation_percent` | u8, 0 to 100 | `0` | Fraction of the GPU you allot. Out of range is rejected. In S1 this is read and surfaced, not yet hardware-enforced. |
| `schedule` | enum | `always` | `always`, `nights` (22:00 to 05:59 local), or `weekends` (Saturday and Sunday). |

```json
{
  "enabled": true,
  "allocation_percent": 50,
  "schedule": "always"
}
```

### Environment variables

Audited against the crates at this SHA. No secrets belong here. Every outbound URL is validated at client
construction and fails closed on plaintext HTTP to a non-loopback host (`crates/chainio/src/outbound.rs`).

| Variable | Default | Required | Purpose |
|---|---|---|---|
| `CITRATE_RPC_URL` | unset | No, S1 runs offline | Chain-40204 JSON-RPC endpoint, https or loopback http. |
| `CITRATE_PROVIDER_ADDRESS` | unset | No | The operator's provider account address, 20-byte hex. |
| `CITRATE_NODE_AGENT_DAEMON` | unset | No | Enable daemon mode (`1` or `true`), or pass `--daemon`. |
| `CITRATE_NODE_AGENT_ADDR` | `127.0.0.1:19600` | No | Supervision bind address; must stay loopback or the daemon refuses to start. |
| `CITRATE_NODE_AGENT_TOKEN_FILE` | `$HOME/.citrate/node-agent/supervision.token` | No | Bearer-token file, minted at startup, mode 0600. |
| `CITRATE_NODE_PFLOPS_1E18` | `6e18`, 6 pflops | No | Node throughput as fixed-point times 1e18, feeds execution-time estimates. |
| `CITRATE_CLAIM_THRESHOLD_WEI` | `1e18`, 1 SALT | No | Auto-claim earnings once claimable reaches this threshold (S2). |
| `CITRATE_MODEL_CACHE_DIR` | `/var/lib/citrate-node-agent/models` | No | Model-weights cache (S2). |
| `CITRATE_MODEL_SHA256` | unset | No | Trusted weights digest, recomputed locally for integrity (S2). |
| `CITRATE_IPFS_GATEWAY` | unset | No | Gateway for model-CID weight fetch (S2). |
| `CITRATE_LLAMA_URL` | unset | No | Resident llama-server inference endpoint (S2). |
| `CITRATE_JOB_INPUT_DIR` | unset | No | Watched directory for off-chain job input (S2). |

The execution path turns on only when `CITRATE_IPFS_GATEWAY`, `CITRATE_LLAMA_URL`, and
`CITRATE_JOB_INPUT_DIR` are all set; otherwise the daemon bids and claims earnings but does not execute
won jobs (`crates/node-agent/src/main.rs`, `build_job_executor`).

There is also a dev-only escape hatch, `CITRATE_NODE_AGENT_ALLOW_INSECURE_OUTBOUND=1`. It bypasses the TLS
requirement and permits plaintext HTTP to non-loopback hosts, for LAN test rigs only. A network attacker
on a plaintext RPC link can feed the agent false chain state, false oracle prices, and false job state.
The agent logs loudly whenever it is set. Do not set it on any production node.

### Bidder, `crates/bidder/src/lib.rs`

A pure function, `evaluate(job, oracle, settings, caps) -> BidDecision`. The gates run cheapest first,
then pricing:

1. `enabled == false`, skip (Disabled).
2. Outside the schedule window, skip (OutsideSchedule).
3. `maxPrice >= 10 SALT`, skip (ExceedsCommitmentCap); S1 stays below the threshold above which a job
   auto-upgrades to a verification tier whose precompile is stubbed.
4. Tier other than Commitment, skip (UnsupportedTier).
5. Active jobs at or above 80% of capacity, skip (AtCapacity).
6. Time to deadline below twice the estimated execution seconds, skip (DeadlineInfeasible).
7. Schedule window closes within twice the estimated execution seconds, skip (WindowClosingSoon).
8. Oracle price stale, skip (OracleStale).
9. Price is `cost x 1.15`, capped at `0.9 x maxPrice`; if that would fall below cost, skip (Unprofitable);
   otherwise bid.

### Heartbeat, `crates/heartbeat/src/lib.rs`

The cadence is 30 seconds (`HEARTBEAT_INTERVAL`), kept under the on-chain heartbeat window so a single
missed beat never trips suspension. The calldata is the `HeartbeatMonitor.heartbeat()` selector alone, no
arguments. Send errors are logged but do not stop the loop.

### Supervision HTTP, `crates/supervision/src/server.rs`

Loopback only; a non-loopback bind is rejected at startup. A 256-bit bearer token is minted at startup,
persisted at mode 0600, and required on every endpoint except `/health`.

| Method | Route | Auth | Response |
|---|---|---|---|
| GET | `/health` | none | Health snapshot for liveness probes. |
| GET | `/status` | bearer | `idle`, `bidding`, `executing`, or `paused`. |
| POST | `/pause` | bearer | Stop new bids; in-flight jobs finish. |
| POST | `/resume` | bearer | Resume bidding. |
| GET | `/signature-requests` | bearer | The unsigned `SignatureRequest`s waiting for the signer. |
| POST | `/signature-requests/{id}/observed` | bearer | Mark a request signed and broadcast; body `{"tx_hash":"0x..."}`. |

### Marketplace calls, `crates/chainio/`

The read client and ABI codec work against the chain-40204 address book, mirrored from Citrate Network and
guarded by a divergence test. On `ComputeMarketplace` the agent reads `getProvider` and `getJob` and builds
calldata for `registerProvider`, `bidOnJob`, `assignBestBid`, `startExecution`, `submitCommitment`,
`submitResult`, and `completeJob`. It reads `saltPerPflopHour` and `isPriceStale` from `ComputePricingOracle`,
sends `heartbeat()` to `HeartbeatMonitor`, claims from `ContributionAccounting`, and reads `getModel` from
`ModelRegistry`. The marketplace functions are documented in full in [compute contracts](/contracts/compute).

## Design rationale

The two-role split, an agent that never holds keys and a signer that does, is the load-bearing decision.
An unattended daemon that watches the market and reacts to prices is exactly the kind of process you do not
want holding a signing key on a production GPU host. By emitting unsigned requests and letting the operator's
Citrate Keyring or a relay sign them, a compromise of the daemon cannot move funds or stake on its own. The
cost is the extra signer hop, which the supervision API and the observe callback are built to make routine.

The bidder's gates lean conservative for the same reason. New providers start with no reputation, jobs that
miss a deadline are slashed, and the night and weekend schedules exist so an operator can sell idle hours
without supervising the machine. The 80% capacity cap and the twice-execution-time margins all reserve
headroom so the daemon does not take on work it cannot safely finish.

## Failure modes

- A non-loopback `CITRATE_NODE_AGENT_ADDR` is refused at startup; the supervision surface cannot be widened
  to a routable interface.
- Plaintext HTTP to a non-loopback RPC, IPFS, or inference endpoint fails closed at client construction, so
  a misconfigured daemon dies at startup rather than mid-job. The dev-only insecure-outbound flag is the
  only override, and it is forbidden in production.
- The bearer token is minted locally at mode 0600. A web page the operator visits cannot read it, which
  also closes the cross-site request hole on `/pause` and `/resume`. `/health` is intentionally open and
  exposes no secret.
- Past the execution deadline the lifecycle planner aborts rather than submit a late, slashable result.
- A stale oracle stops the bidder from pricing off bad data.

## Access and canon

Tier commercial.kyc. The agent is operator-depth implementation, the bid-pricing logic, the lifecycle, and
the capacity gates, that any contracted operator should have but whose anonymous theft would materially help
a competitor clone the selling side of the market. Access is gated on identity verification through Citrate's in-house verification (VERI),
not on a seat. Every operator and machine on Citrate Network is identity-verified through VERI, and Citrate
holds the verification result, not the personal data behind it. Compute is sold from your own hardware, and
SALT settles the work; it is the unit you count in, not a product to hold. No secrets appear on this page:
the supervision token is generated locally and never transcribed, and the agent holds no keys by design.

## Source and verification

Verified against `citrate-node-agent` at `38bc9d1`. `compute.json` against `crates/config/src/lib.rs`; the
bidder gates and cost-plus pricing against `crates/bidder/src/lib.rs`; the 30-second cadence against
`crates/heartbeat/src/lib.rs`; the loopback bind, bearer token, and routes against
`crates/supervision/src/server.rs` and `crates/supervision/src/auth.rs`; the no-keys signing seam against
`crates/lifecycle/src/lib.rs` and `crates/node-agent/src/main.rs`; the outbound TLS gate against
`crates/chainio/src/outbound.rs`; the marketplace calls against `crates/chainio/src/marketplace.rs` and the
chain-40204 address book in `crates/chainio/src/generated/addresses.json`. Status: SELL-S1 (settings,
bidder, heartbeat, supervision, live reads) Implemented, pre-audit; SELL-S2 (execution, executor, earnings)
Specified and experimental.
