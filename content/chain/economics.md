---
title: Citrate Economics — SALT, Fees, Rewards
codex_slug: /chain/economics
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/economics/
surfaces: [CHAIN-econ]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Economics — SALT, Fees, Rewards

> The economic engine of Citrate: the SALT token, gas/fee pricing, fee
> distribution, block rewards, and governance. Token fundamentals and fee
> mechanics are public. Institutional operator reward profiles are
> **commercial**. Slashing policy and genesis allocations are
> **confidential** — summarized here at the level a developer needs, with the
> detail gated.

## Overview

The economics crate (`core/economics/`) implements the on-chain economy as
governance-configurable modules unified by `UnifiedEconomicsManager`
(`src/unified_economics.rs`): the token (`token.rs`), dynamic gas pricing
(`dynamic_pricing.rs`), block rewards (`rewards.rs`), multi-party fee
distribution (`revenue_sharing.rs`), institutional rewards (`institutional.rs`),
slashing (`slashing.rs`), governance (`governance.rs`), and genesis allocations
(`genesis.rs`). Almost every parameter below is a *default* that on-chain
governance can change; only the token fundamentals are genesis-fixed.

> **Pre-audit status.** Internally tested (a large unit/simulation suite) but
> **not** externally audited. Some modules are partially built (e.g.
> `enhanced_rewards.rs`, `estimator.rs`) and `rewards.inference_bonus` is
> currently `0`. Treat numbers as production-track defaults, pre-certification.

## Reference

### SALT token — `src/token.rs`, `src/lib.rs`

| Constant | Value | Source |
|---|---|---|
| Symbol (`TOKEN_SYMBOL`) | `SALT` | `src/lib.rs` |
| Name (`TOKEN_NAME`) | `Citrate` | `src/lib.rs` |
| Total supply (`TOTAL_SUPPLY`) | **1,000,000,000** (1 billion) | `src/lib.rs` |
| Decimals (`DECIMALS`) | **18** | `src/token.rs` |

`Token` tracks `balances`, `total_minted`, `total_burned` in `U256`; circulating
supply = minted − burned. `mint` enforces the 1B supply cap; `burn`, `transfer`,
`balance_of` round out the surface. Total supply in base units is
`1_000_000_000 × 10^18` wei.

### Dynamic gas pricing — `src/dynamic_pricing.rs`

EIP-1559-style per-block adjustment toward a target utilization. Defaults
(`DynamicPricingConfig`):

| Param | Default | Meaning |
|---|---|---|
| `base_gas_price` | 1 Gwei (1e9 wei) | starting gas price |
| `target_utilization` | 70% | target block fill |
| `adjustment_factor` | 1.25%/block | price step per block off-target |
| `max_price_multiplier` / `min_price_multiplier` | 50× / 0.1× | price cap / floor |
| `ai_inference_multiplier` | 2× | surcharge on AI operations |

`get_operation_price(OperationType)` prices standard transfers, contract calls,
AI inference (compute-unit scaled), model deployment, and training.

### Fee distribution — `src/revenue_sharing.rs`

Fees flow into typed revenue pools (`GasFees`, `AIInference`, `ModelDeployment`,
`ModelTraining`, `MarketplaceFees`, `SlashingRedistribution`, `FacilitatorFees`)
and are split among stakeholders. The default stakeholder shares
(`RevenueShareConfig`, basis points):

| Stakeholder | Share | bps |
|---|---|---|
| Model creators | 30% | 3000 |
| Validators | 23% | 2300 |
| Infrastructure | 15% | 1500 |
| Stakers | 15% | 1500 |
| Treasury / DAO | 12% | 1200 |
| x402 facilitators | 5% | 500 |

A configurable market-maker skim (`market_maker_gas_bps`, default 1000 = 10%)
is taken from the **gas pool** before the residual split. Per-pool splits differ
(e.g. AI-inference favors model creators; deployment/training favor
creators+infrastructure) — see `revenue_sharing.rs` for the per-pool logic.
Distribution triggers above `min_distribution_threshold` (1000 SALT) on a
`distribution_frequency` cadence (7200 blocks ≈ 1 day), with up to a 5%
performance bonus.

### Block rewards — `src/rewards.rs`

`RewardConfig` defaults:

| Param | Default | Meaning |
|---|---|---|
| `block_reward` | 10 SALT | base reward per block |
| `halving_interval` | 2,100,000 blocks (~4 yr) | reward halving period |
| `treasury_percentage` | 10% | treasury cut of each block reward |
| `model_deployment_bonus` | 1 SALT | per model deployed in a block |
| `inference_bonus` | 0 SALT | per inference (currently disabled) |

Each block reward splits 90% validator / 10% treasury, halving every
`halving_interval` until it reaches zero.

### Institutional rewards — `src/institutional.rs` *(commercial)*

> **Tier: commercial.** Operator-facing reward profiles for institutional
> validators. Summarized here; the full profile/estimator detail is
> contracted-tier (see [Operator rewards](/operators/rewards)).

`InstitutionalRewardConfig` rewards four contribution types — block validation
(monthly base SALT + an uptime bonus up to 1.2× above a minimum uptime
threshold), model hosting, adapter creation, and data provision — each subject
to per-epoch caps. `estimator.rs` projects monthly earnings.

### Slashing — `src/slashing.rs` *(confidential)*

> **Tier: confidential.** Slashing exists and covers three offense categories:
> **equivocation** (double-signing), **invalid state transition**, and
> **transaction censorship**, with first-offense grace, a cooldown, and a
> cumulative-slash deactivation ceiling. The institutional policy is designed to
> be lenient (e.g. no downtime penalties for institutions). **Penalty
> percentages, grace/cooldown parameters, and the deactivation threshold are
> gated** — they are not published here. See `core/economics/src/slashing.rs`
> and the gated security docs for the parameters.

### Governance — `src/governance.rs`

`GovernanceConfig` defaults: proposal threshold 10,000 SALT; voting period
50,400 blocks (~7 days); execution delay 7,200 blocks (~1 day); 10% quorum of
supply; 60% approval. Proposal types: `ParameterChange`, `NetworkUpgrade`,
`TreasurySpend`, `Emergency`, `MarketplaceGovernance`. Votes are `For` /
`Against` / `Abstain` with delegation; `unified_economics.rs` adds a quadratic
voting-power aggregation to temper plutocracy.

### Genesis allocations — `src/genesis.rs` *(confidential accounts)*

> **Tier: confidential — accounts.** The genesis allocation *structure* is
> public; the *specific genesis account addresses are not published here*, and
> **no private keys or mnemonics exist in the repository** (key material is held
> out-of-band; the code carries only public addresses).

The genesis allocation is organized into named categories (treasury, faucet,
deployer, team/dev, validator) plus a remaining mining-reward pool, all summing
to the 1B SALT cap. The standard `0x4e59…` Arachnid deterministic CREATE2
deployer is pre-deployed at genesis (zero balance, code-only) so ERC-4337
tooling works from block 0. `initialize_shared_genesis_state()` is the single
source of truth, guaranteeing **deterministic genesis** (same config → same
state root → same block hash) across independent node startups.

## Examples

```rust
use citrate_economics::*;

// Token fundamentals are constants:
assert_eq!(TOKEN_SYMBOL, "SALT");
assert_eq!(TOTAL_SUPPLY, 1_000_000_000);
// DECIMALS == 18

// Default block-reward schedule:
let rewards = RewardConfig::default();   // 10 SALT/block, halving every 2.1M blocks

// Default fee split:
let shares = RevenueShareConfig::default(); // creators 30 / validators 23 / infra 15 / …
```

## Tutorials

- [Operator rewards](/operators/rewards) — institutional reward profiles and
  estimation. **Tier: commercial.**

## Security & access

- **Tier: public** for SALT fundamentals, gas pricing, fee distribution, block
  rewards, and governance — these are what builders and the community need to
  reason about the economy. **Institutional rewards** are **commercial**;
  **slashing parameters** and **genesis account addresses** are
  **confidential** and intentionally not enumerated here.
- **No secrets here.** No private keys, no mnemonics, no genesis account
  addresses, no slashing penalty math. The repository itself contains no key
  material — only public addresses, held out-of-band.

## Source & verification

- **Source repo / path:** `citrate-chain/core/economics/`
- **Truth document (Rule 9):** `core/economics/README.md` — this page summarizes
  and links.
- **Audited against SHA:** `03d7851`
  (`git -C citrate-chain rev-parse --short HEAD`).
- **Honest status:** internally tested; **pre external audit** — not certified.
  Some modules partial (`enhanced_rewards`, `estimator`); `inference_bonus = 0`.
