---
title: Become a seller
codex_slug: /operators/tutorials/become-a-seller
tier: public
org_scope: ~
source_kind: authored
source: citrate-node-agent (README.md, crates/) + ComputeMarketplace.sol
surfaces: [NODE-sell, OPS-node-agent]
audited_against_sha: 0e63363
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A walkthrough from a fresh checkout to a live seller on Citrate Market, chain id 40204. You will complete membership verification, build and configure Citrate Node, register as a provider on the marketplace contract,
let the agent bid and win a job, and walk that job to payment, settled in SALT. It is written for operators
who run their own hardware. Allow roughly twenty minutes for the local steps; verification and on-chain
confirmations take their own time.

## What it is

Citrate Node decides; you sign. The daemon reads your policy, watches the market, and produces unsigned
writes; your signing surface, the operator's Citrate Keyring or a relay, signs and broadcasts them. The
marketplace itself, `ComputeMarketplace` on Citrate Network, is the contract that holds escrow, runs the
bidding, and releases payment. This tutorial touches both: the daemon for decisions, the contract for the
money. Bringing the node online first is covered in [run a node](/operators/run-a-node), and the full
contract surface in [compute contracts](/contracts/compute).

## How to use it

### Step 1, complete membership verification

Membership includes identity verification through VERI, Citrate's in-house verification. Node and consensus code do not check it.
Complete verification through [verified identity](/aa/identity). Citrate keeps the verification result, not the
personal data behind it. You cannot register as a provider without it.

### Step 2, build the agent

```bash
# from the citrate-node-agent workspace root
cargo build --release
# the binary is target/release/node-agent
```

### Step 3, write a policy

Create `compute.json`:

```json
{
  "enabled": true,
  "allocation_percent": 25,
  "schedule": "nights"
}
```

This allots 25% of the GPU, at night only (22:00 to 05:59 local). Fields are validated against
`crates/config`; `allocation_percent` must be 0 to 100.

### Step 4, self-check offline

```bash
node-agent compute.json
```

The agent prints your enabled, allocation, and schedule values, the current clock, the heartbeat calldata,
and a self-check. No RPC is contacted. If you set `enabled: false`, it reports disabled, a safe way to
confirm wiring.

### Step 5, register as a provider

Registration is an on-chain write to `ComputeMarketplace.registerProvider(bytes32[] supportedModels)`. It
is payable and requires a stake: `MIN_PROVIDER_STAKE` is 1000 SALT (`ComputeMarketplace.sol`). The stake is
your collateral; the contract slashes it if you take a job and miss the deadline. Pass the model hashes you
will serve, and your profile starts at full reputation (10000 basis points) with a default of 10 concurrent
jobs. You sign and broadcast this from your Citrate Keyring, not from the daemon. Add more stake later with
`addStake()`.

### Step 6, run live

```bash
export CITRATE_RPC_URL=https://<your-rpc-endpoint>     # https or loopback http only
export CITRATE_PROVIDER_ADDRESS=0x<your-provider-account>
export CITRATE_NODE_AGENT_DAEMON=1
node-agent compute.json
```

The daemon starts the supervision API on `127.0.0.1:19600` and begins reading chain state, bidding, and
beating every 30 seconds.

### Step 7, drive it

In a second terminal:

```bash
TOKEN=$(cat ~/.citrate/node-agent/supervision.token)

curl http://127.0.0.1:19600/health                                    # no auth
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/status  # idle|bidding|executing|paused

# pull unsigned writes for your signer to sign and broadcast
curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/signature-requests

# after signing and broadcasting externally, acknowledge:
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -d '{"tx_hash":"0x..."}' \
  http://127.0.0.1:19600/signature-requests/<id>/observed

# maintenance: stop new bids (in-flight jobs finish), then resume
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/pause
curl -X POST -H "Authorization: Bearer $TOKEN" http://127.0.0.1:19600/resume
```

### Step 8, win a job

When a requester posts a job with `postJob`, the contract locks their `maxPrice` in escrow and opens the
bidding window. The agent's bidder evaluates it, and if every gate passes it queues a `bidOnJob(jobId,
price, estimatedLatency)` write for your signer. After the bid deadline, anyone can call `assignBestBid`,
which scores the bids (40% price, 30% reputation, 20% load, 10% verification tier) and assigns the winner.
A low price alone does not win; the reputation you earn by completing jobs is what moves you up.

### Step 9, execute and settle

Once assigned, the lifecycle planner walks the job through the contract, one signed write at a time:

```text
Assigned   -- startExecution(jobId) -------------------------> Executing
Executing  -- submitCommitment(jobId, SHA3(in||out||nonce)) -> commitment recorded
Executing  -- submitResult(jobId, outputHash, proof) --------> Verifying  (verifies inline)
Verifying  -- completeJob(jobId) ----------------------------> Completed  (releases payment)
```

`submitResult` is refused past the execution deadline, so a late result aborts cleanly rather than being
slashed. On `completeJob` the escrow is released: 95% to you, 2.5% burned, 2.5% to the treasury
(`BME_BURN_DIVISOR` and `TREASURY_DIVISOR` are both 40 in `ComputeMarketplace.sol`). The execution path
runs only when `CITRATE_IPFS_GATEWAY`, `CITRATE_LLAMA_URL`, and `CITRATE_JOB_INPUT_DIR` are set; this is
SELL-S2, experimental. Earnings sweep with `claimRewards()` once claimable reaches your threshold.

### Step 10, verify you are selling

- `/status` shows `bidding` or `executing` when there is matching demand.
- `/health` shows a recent heartbeat age.
- Your provider address shows broadcast transactions on the network explorer, and `getProvider` reflects
  your stake, active jobs, and reputation.

## Reference

The contract functions you touch, audited against `citrate-chain/contracts/src/ComputeMarketplace.sol` at
`e6f11ef`:

| Function | What it does |
|---|---|
| `registerProvider(bytes32[])` | Register as a provider; payable, requires `MIN_PROVIDER_STAKE` (1000 SALT). |
| `addStake()` | Add collateral to a registered provider. |
| `bidOnJob(uint256,uint256,uint256)` | Place a bid at or below the job's `maxPrice`. |
| `assignBestBid(uint256)` | Score the bids and assign the winner; callable by anyone after the bid deadline. |
| `startExecution(uint256)` | Assigned provider confirms work has begun. |
| `submitCommitment(uint256,bytes32)` | Record `SHA3(input || output || nonce)` before the result. |
| `submitResult(uint256,bytes,bytes)` | Submit the output hash and tier proof; refused past the deadline. |
| `completeJob(uint256)` | Release escrow: 95% provider, 2.5% burn, 2.5% treasury. |
| `getProvider(address)` | Read a provider profile (stake, active jobs, reputation). |
| `getJob(uint256)` | Read a job's state and parameters. |

Slashing on timeout is 5% of stake (`TIMEOUT_SLASH_BPS = 500`). A disputed result requires a 10-SALT bond
(`DISPUTE_BOND`) that is burned if the dispute fails. See [compute contracts](/contracts/compute) and
[rewards and reputation](/operators/rewards) for the rest.

## Design rationale

The stake-and-slash design is what lets a requester trust an unknown provider: your 1000 SALT is collateral
that you will finish what you bid on, and the scoring formula rewards a record of completed jobs over a
single cheap bid. The agent never signs, so the daemon reacting to live prices on your GPU host cannot move
that stake; only your Citrate Keyring can. The conservative bidder keeps you on the safe side of the
deadline that the slash protects.

## Failure modes

- The daemon exits immediately if `CITRATE_NODE_AGENT_ADDR` is not loopback; the supervision surface is
  localhost-only by design.
- No bids usually means a bidder gate fired: check `enabled`, the schedule window, capacity under 80%,
  deadline feasibility, oracle freshness, and the 10-SALT cap.
- An RPC refused at startup is the outbound TLS gate rejecting plaintext HTTP to a non-loopback host. Use
  https. Do not set `CITRATE_NODE_AGENT_ALLOW_INSECURE_OUTBOUND` on a production node; it is a dev-only LAN
  escape hatch that exposes you to a network attacker rewriting chain state.
- `registerProvider` reverts below 1000 SALT, with no supported models, or if you are already registered.
- A missed execution deadline slashes 5% of your stake; the agent aborts before submitting late to avoid
  exactly this.

## Access and canon

Tier commercial.kyc. No secrets in this tutorial: the supervision token is generated locally at mode 0600
and read from its file, keys live only in your external signer, and the dev-only insecure-outbound flag is
called out as forbidden in production. Identity verification through VERI, Citrate's in-house verification, is part of membership; node and consensus code do not check operator identity. Compute is sold
from your own hardware, on-premise by default, and SALT settles the work performed; it is the unit you
count in, not a product to hold. The agent holds no keys.

## Source and verification

Verified against `citrate-node-agent` at `0e63363` (the agent, `crates/`) and
`citrate-chain/contracts/src/ComputeMarketplace.sol` at `e6f11ef` (the marketplace, which lives in the
`citrate-chain` repository, not the node-agent). The build, policy, self-check,
daemon, and supervision steps against `crates/config`, `crates/node-agent`, and `crates/supervision`; the
bid decision against `crates/bidder`; the lifecycle writes and the unsigned signing seam against
`crates/lifecycle`; registration, stake, scoring, the fee split, the timeout slash, and the dispute bond
against `ComputeMarketplace.sol`. Status: SELL-S1 (register, bid, heartbeat, supervision, live reads)
Implemented, pre-audit; SELL-S2 (execution and earnings) Specified and experimental.
