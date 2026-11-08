---
title: Network economics
codex_slug: /chain/economics
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/economics/
surfaces: [CHAIN-econ]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
tokenomics_notice: true
---

This is the unit of account on the Citrate Network and the rules that move it. SALT settles the work the
network performs, fees, block rewards, and staking; it is not a product to hold, and this page does not
treat it as one. It is for builders and operators who need to reason about what the network charges, what
it pays, and how supply behaves in the current testnet code. These are proposed values: the
[tokenomics are not yet determined](/start/tokenomics).

## What it is

SALT is the credit the network counts in. When a transaction pays a fee, when a node earns a reward for
sealing a block, or when stake is placed and returned, the amount is denominated in SALT. On the current
testnet, the code caps supply at one trillion SALT; the mainnet supply is not yet determined. The smallest unit is wei-style, so one SALT divides into
10^18 base units, the same granularity a developer already expects from an account balance.

The economics live in one crate, `core/economics/`. It holds the token itself (`token.rs`), the per-block
reward schedule (`enhanced_rewards.rs`), and the constants that bound the whole system (`lib.rs`). The
reward schedule is the part worth understanding early, because it is what gives a node a reason to keep the
network running. In the current code it shrinks on a fixed cadence, so early seasons pay more than late ones.

A block reward is built from a base reward plus four bonus pools, each expressed as a percentage of that
base reward. The four pools recognise four kinds of contribution: validator performance, AI contribution,
network health, and long-term staking. A node that does more of the work the network values receives a
larger share of the pools. On the current testnet, the base reward halves every 2,100,000 blocks, about 24
days at the one-second testnet cadence, so issuance tapers toward zero rather than running flat. The mainnet
schedule is not yet determined.

## How to use it

You rarely set these values yourself; you read them, so you can price work on the current testnet.

1. **Price a transaction.** Estimate the fee the way you would on any account-based ledger: gas used times
   the prevailing price. SALT carries 18 decimals, so amounts and balances behave like the smallest units
   you are used to.
2. **Read the live economic state.** Call `citrate_getEconomicState` for current network metrics and
   `citrate_getToken` for token fundamentals over JSON-RPC. Both are documented in the
   [chain RPC reference](/chain/rpc).
3. **Reason about rewards.** If you operate a node on the current testnet, the code computes the reward for a
   sealed block as the base reward plus your share of the four bonus pools, adjusted for where the chain sits
   in its halving schedule. These are testnet values, not a promise of future rewards. See [run a node](/operators/run-a-node) for the operator path.

## Reference

Token constants, verified in `core/economics/src/lib.rs` and `core/economics/src/token.rs`:

| Constant | Value | Source |
|---|---|---|
| Symbol (`TOKEN_SYMBOL`) | `SALT` | `lib.rs` |
| Name (`TOKEN_NAME`) | `Citrate` | `lib.rs` |
| Total supply (`TOTAL_SUPPLY`) | 1,000,000,000,000 (one trillion) | `lib.rs` |
| Decimals (`DECIMALS`) | 18 | `token.rs` |

Total supply in base units is `1_000_000_000_000 × 10^18`. The token tracks balances, total minted, and total
burned; circulating supply is minted minus burned, and minting is capped at the one trillion ceiling.

Block reward schedule, verified in `core/economics/src/enhanced_rewards.rs`:

| Element | Value | Source |
|---|---|---|
| Base reward | a configurable base reward | `enhanced_rewards.rs` (`base_block_reward`) |
| Validator performance pool | percentage of the base reward | `enhanced_rewards.rs` (`performance_bonus_pool`) |
| AI contribution pool | percentage of the base reward | `enhanced_rewards.rs` (`ai_contribution_pool`) |
| Network health pool | percentage of the base reward | `enhanced_rewards.rs` (`network_health_pool`) |
| Long-term staking pool | percentage of the base reward | `enhanced_rewards.rs` (`staking_bonus_pool`) |
| Halving interval | 2,100,000 blocks (~24 days at the 1 s testnet cadence) | `enhanced_rewards.rs` (`halving_interval`) |

The base reward and the four pool percentages are defaults in the source; we describe the base as a
configurable base reward rather than asserting a fixed number, since governance can move it. The halving
cadence and the supply cap are constants in the current testnet code; they are proposed values and may change
before mainnet.

```rust
use citrate_economics::*;

// Token fundamentals are constants:
assert_eq!(TOKEN_SYMBOL, "SALT");
assert_eq!(TOTAL_SUPPLY, 1_000_000_000_000); // 18 decimals; base units = value × 10^18
```

## Design rationale

The proposed design, a capped supply with a halving base reward, is meant to keep the accounting honest: the network can settle the work it
performs without an open-ended issuance that quietly dilutes everyone who came before. Splitting the reward
into four pools, rather than paying a flat amount per block, is meant to let the network pay for the behaviours it
actually depends on, uptime, useful compute, a healthy peer set, and committed stake, instead of paying
the same for a block whether or not the node contributed anything beyond sealing it. The trade is more
moving parts to reason about; the benefit is that incentives point at the work rather than at the clock.

## Failure modes

The supply cap is enforced at mint: an attempt to mint past one trillion SALT is rejected, so no path
through the reward schedule can inflate beyond the ceiling. Burned credits are tracked separately, so
circulating supply stays an honest minted-minus-burned figure rather than drifting. Because the base reward
and pool percentages are governance-configurable, the load-bearing invariant is the supply cap and the
halving cadence, not any single reward number; treat a published base-reward figure as a default, not a
guarantee.

## Access and canon

Public. SALT settles the work the network performs; it is not an investment instrument, and Almanac does not
describe it as one. Testnet SALT has no cash value. The token fundamentals, the reward structure, and the
halving cadence are documented as they stand in the current testnet code; the final parameters will be
published before mainnet. No keys, balances, or private allocations appear
here.

## Source and verification

- Source: `citrate-chain/core/economics/`, constants in `src/lib.rs` and `src/token.rs`, reward schedule in
  `src/enhanced_rewards.rs`.
- Live state over JSON-RPC: `citrate_getEconomicState` and `citrate_getToken`
  (`core/api/src/economics_rpc.rs`); see [chain RPC](/chain/rpc).
- Audited against SHA: `9d5959e`.
- Status: Implemented (testnet), internally tested, pre external audit. The base reward and pool
  percentages are configurable defaults in source, not certified values.
