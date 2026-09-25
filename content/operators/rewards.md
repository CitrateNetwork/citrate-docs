---
title: Rewards, reputation, and slashing
codex_slug: /operators/rewards
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/economics/, citrate-chain/contracts/src/NematocystSlashing.sol, citrate-node-agent
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is how an operator earns on the Citrate Network, how reputation tracks the work performed, and how
misbehavior is penalized. It is for operators who need to reason about what a node is paid, what raises or
lowers its standing, and what the node-agent does on their behalf to keep an honest operator out of a slash.
SALT settles the work; rewards, reputation, and slashing all point at contribution, not at holding.

## What it is

The economics live in one crate, `core/economics/`. A node earns SALT for the work it performs: sealing
blocks, hosting models, and completing compute jobs. The amounts, the reputation score, and any penalties
are accounted on chain at chain id 40204, and the [node-agent](/compute/node-agent) keeps a local operator
inside the safe envelope automatically. This page is consistent with [network economics](/chain/economics);
where that page describes the supply and the reward schedule, this one describes what reaches the operator.

The reward for a sealed block is a base reward plus four bonus pools, each a percentage of that base reward.
The pools recognize four kinds of contribution, so a node that does more of the work the network values
earns a larger share. The base reward halves every 2,100,000 blocks, so early seasons are more generous than
late ones. We describe the base reward as a configurable default rather than a fixed number, because
governance can move it; what does not move is the halving cadence and the fixed one trillion supply.

## How to use it

You read these values to project earnings and to understand why a score moved; you rarely set them.

1. **Read your standing.** Call `citrate_getReputationScore` for an address's reputation and
   `citrate_getStakedBalance` for its stake over JSON-RPC. Both are documented in the
   [chain RPC reference](/chain/rpc).
2. **Project a block reward.** Expect the base reward plus your earned share of the four pools, adjusted for
   where the chain sits in its halving schedule. See [network economics](/chain/economics) for the supply
   side.
3. **Let the node-agent protect you.** The agent's bidder only accepts jobs it can finish on time and within
   a commitment cap, so it does not over-commit into a penalty. You read its alerts; you do not have to
   compute the envelope yourself.

## Reference

### The block reward and its four pools

Verified in `core/economics/src/enhanced_rewards.rs` (`EnhancedRewardConfig`). The pool percentages are
defaults in source; treat them as defaults, not certified values, since governance can move them.

| Element | Default | Source |
|---|---|---|
| Base block reward | configurable | `base_block_reward` |
| Validator performance pool | 30% of base | `performance_bonus_pool` |
| AI contribution pool | 25% of base | `ai_contribution_pool` |
| Network health pool | 20% of base | `network_health_pool` |
| Long-term staking pool | 25% of base | `staking_bonus_pool` |
| Halving interval | 2,100,000 blocks | `calculate_total_reward_pool` |
| Minimum validator stake | 32,000 SALT | `min_validator_stake` |

A validator's share of the performance and staking pools is proportional to a score built from uptime,
consensus participation, validation efficiency, and a quality score, less a penalty for any prior slash. A
node below the minimum validator stake earns no share of those pools. The AI contribution pool is shared by
score across models deployed, inferences served, compute provided, and community standing.

### Institutional operators

School and institutional operators run under their own parameters, verified in
`config/institutional_rewards.toml` and `core/economics/src/institutional.rs`.

| Parameter | Value | Source |
|---|---|---|
| Block validation base | 150 SALT per month | `institutional_rewards.toml` |
| Uptime bonus | 1.2x above the 90% uptime threshold | `institutional_rewards.toml` |
| Model hosting | 25 SALT per model per 30-day epoch | `institutional_rewards.toml` |
| Minimum uptime to earn | 0.90 | `institutional_rewards.toml` |

Schools are not penalized for scheduled downtime, since their schedules are irregular by design.

### Reputation

Reputation is tracked on chain and read with `citrate_getReputationScore`
(`core/api/src/economics_rpc.rs`), expressed in basis points from 0 to 10,000. It rises with the work a node
performs and falls with missed liveness or a slash. The node-agent observes its own reputation each poll and
raises a latched alert on a drop of more than five percent or on any decrease in stake, so an operator sees a
problem before it compounds (`citrate-node-agent`, supervision state).

### Slashing

Slashing categories live on chain in `NematocystSlashing.sol` (see [contracts security](/contracts/security)
for the category model). The institutional penalty schedule, verified in `core/economics/src/slashing.rs`,
penalizes three offenses as a percentage of stake.

| Offense | Penalty | Source |
|---|---|---|
| Equivocation (signing two blocks at one height) | 10% of stake | `equivocation_penalty_pct` |
| Invalid state transition | 15% of stake | `invalid_state_penalty_pct` |
| Transaction censorship | 5% of stake | `censorship_penalty_pct` |

A first offense inside the grace window is recorded at zero penalty. A cooldown follows each slash, and an
operator whose cumulative slash reaches 50% of stake is deactivated. Downtime is not a slashable offense for
institutional operators.

```rust
// core/economics/src/slashing.rs, institutional defaults
equivocation_penalty_pct: 10,
invalid_state_penalty_pct: 15,
censorship_penalty_pct: 5,
first_offense_grace_epochs: 2,
cooldown_epochs: 1,
max_cumulative_slash_pct: 50,
penalize_downtime: false,
```

### What the node-agent does to keep you safe

Verified in `citrate-node-agent`. The agent holds no keys: every write it wants to make, a heartbeat, a
result, a reward claim, is emitted as an unsigned signature request that a signing surface signs and
broadcasts, and the agent advances only on observed on-chain truth.

- **Commitment cap and capacity check.** The bidder refuses a job at or above a commitment cap, and refuses
  new work once it is at roughly 80% of its concurrent-job capacity, so it does not accept work it cannot
  finish and slide into a penalty (`crates/bidder/src/lib.rs`).
- **Deadline safety.** It only accepts a job when the time to the deadline is at least twice the estimated
  execution time.
- **Liveness.** It sends a heartbeat on a 30-second cadence, and counts only broadcast heartbeats as
  liveness, never optimistically queued ones (`crates/heartbeat/src/lib.rs`).
- **Reward claims.** It reads the claimable balance from the accounting contract and only emits a claim once
  the balance crosses a dust threshold, and never twice for the same claim in flight
  (`crates/earnings/src/lib.rs`).

## Design rationale

Splitting the block reward into four pools rather than paying a flat amount lets the network pay for the
behaviors it actually depends on, uptime, useful compute, a healthy peer set, and committed stake, instead
of paying the same whether or not a node contributed beyond sealing the block. The trade is more parts to
reason about; the benefit is that the reward points at the work. Slashing is the mirror: it penalizes the
specific harms, equivocation, invalid state, censorship, and leaves honest downtime alone for institutions
that cannot run around the clock. The node-agent's caps exist so that an operator who simply runs the daemon
is kept inside the safe envelope without having to model it.

## Failure modes

The honest invariant here is that rewards and penalties settle work, not promises.

- **Over-commitment.** Left unprotected, an operator could accept more work than it can finish and be slashed
  for the misses. The agent's commitment cap, capacity check, and deadline safety factor are the guard, and
  they fail toward refusing work rather than accepting it.
- **Silent reputation decay.** A drop in reputation or a slash to stake is easy to miss. The agent latches an
  alert on a greater-than-five-percent reputation drop or any stake decrease, so the alert cannot be polled
  past.
- **Treating defaults as guarantees.** The base reward and the four pool percentages are governance-
  configurable. The load-bearing invariants are the halving cadence and the supply cap, not any single
  reward number; treat a published figure as a default.

## Access and canon

Commercial tier, operator implementation depth. SALT settles the work the network performs; reputation and
slashing reward contribution and penalize misbehavior, and none of them is a speculative instrument. A node runs on hardware the operator controls. Identity verification through VERI, Citrate's in-house verification, is part of membership; node and consensus code do not check operator identity. No keys appear here: rewards accrue to the operator's account, and the node-agent holds no keys,
emitting unsigned requests for a separate signing surface to sign.

## Source and verification

- Source: `citrate-chain/core/economics/`, reward schedule in `src/enhanced_rewards.rs`, institutional
  parameters in `src/institutional.rs` and `config/institutional_rewards.toml`, slashing schedule in
  `src/slashing.rs`; slashing categories on chain in `contracts/src/NematocystSlashing.sol`; reputation and
  stake reads in `core/api/src/economics_rpc.rs` (`citrate_getReputationScore`, `citrate_getStakedBalance`).
- Operator-side guards: `citrate-node-agent` (`crates/bidder`, `crates/heartbeat`, `crates/earnings`,
  supervision state), audited at `0e63363`.
- Audited against SHA: `9d5959e` (chain), `0e63363` (node-agent).
- Status: Implemented (testnet), internally tested, pre external audit. The reward pool percentages and base
  reward are configurable defaults in source, not certified values.
