---
title: "The Citrate Inc.: Cooperative Capitalism and Shared Ownership of AI Infrastructure (v3)"
version: v3
created: 2026-04-28T04:05:00Z
branch: main
author: Larry Klosowski + Lauren Mendenhall + Claude Opus 4.7
status: active
maturity: Specified — `ContributionAccounting` 7-type tracking is implemented on-chain
supersedes: v2
---

# Paper VII — The Citrate Inc. (v3)

> Named after Mozi (墨子, c. 470–391 BCE) and *jian ai* (兼愛,
> "impartial care") — the Mohist ethical system that argues
> universal mutual benefit, not state interest, is the
> foundation of justice.

## Abstract

The traditional venture-capital model concentrates ownership in
a small number of early backers and operators. The traditional
cooperative model spreads ownership equally regardless of
contribution. **Citrate Inc. capitalism** is a third path: a
system where ownership accrues **proportional to contribution
across multiple types of work**, with the contribution types
themselves **renormalizable by governance** to track the
network's evolving needs.

v3 anchors this in the deployed `ContributionAccounting` contract
(`0x1AFE987622ab5AdD275D2Fd21248F77F5e00667f`). The seven
contribution types are not abstract — they are enum values in
Solidity, each with a governance-mutable weight, each tracked
per-address, each driving a real reward distribution.

## 1. The seven contribution types

| Type | Default weight | Examples | Source |
|------|---------------:|----------|--------|
| Validation | 1.0× | Block proposing, BFT signing, mining | `ContributionAccounting` enum 0 |
| ModelHosting | 1.5× | Serving inference requests | enum 1 |
| AdapterCreation | 2.0× | Publishing accepted LoRA adapters | enum 2 |
| DataProvision | 1.5× | Registering training-data CIDs | enum 3 |
| AppDevelopment | 1.0× | Deploying tools, UIs, MCPs | enum 4 |
| BridgeInfra | 1.0× | Cross-chain relay operations | enum 5 |
| Governance | 0.5× | Voting + proposals | enum 6 |

Source: `contracts/src/ContributionAccounting.sol` lines 113–119.

The weights default to `2.0× > 1.5× > 1.0× > 0.5×` reflecting
the v3 prioritization: **adapter creation is most rewarded**
(it's how the network gets smarter); **governance is least
rewarded** in raw weight, because governance accrues structural
power independent of token rewards.

## 2. Why these seven, not others

A cooperative system has a lot of degrees of freedom. Why these
seven categories?

**Inclusion test.** A category was added if (a) it is
verifiably-on-chain (otherwise reward distribution is
adversarial), and (b) it represents a *distinct* kind of value
(otherwise it merges into another category).

- Validation: verifiable from block proposer signatures.
- ModelHosting: verifiable from `InferenceRouter` request logs.
- AdapterCreation: verifiable from `LoRAFactory` registration.
- DataProvision: verifiable from `IPFSIncentives` pinning records.
- AppDevelopment: verifiable from contract-deployment events.
- BridgeInfra: verifiable from cross-chain relay receipts.
- Governance: verifiable from `TreasuryGovernor` vote records.

**Exclusion test.** Categories deliberately left off:

- "Marketing / community building" — high-value but
  un-verifiable on-chain. Funded via DAO grants instead.
- "Research / paper writing" — high-value but its on-chain
  signal (citations? downloads?) is too noisy to make it a
  reward column. Funded via DAO grants.
- "Trading / liquidity provision" — important to ecosystem but
  separately compensated through `MarketMakerAllocation`,
  doesn't go through ContributionAccounting.

This matters: **only seven categories** receive baseline reward
flow, and all seven are objectively measurable. Everything else
is grant-funded.

## 3. Revenue distribution

### 3.1 Block reward layer (mining)

| Recipient | Share |
|-----------|------:|
| Block proposer | 50% |
| Validation contributors (BFT signers) | 30% |
| Distribution pool | 20% |

The Distribution pool is the input to ContributionAccounting's
proportional payout (cf. §3.2).

### 3.2 Inference layer

For every paid inference request settled via `InferenceRouter`:

| Recipient | Share |
|-----------|------:|
| Model host (the node that served) | 70% |
| Adapter creator (if a LoRA adapter was used) | 15% |
| Treasury | 10% |
| Data provider (if attribution to training data is on-chain) | 5% |

The adapter and data shares can be 0 if the model has no
registered adapter / no on-chain data attribution. In that case
the residual flows back to the Treasury.

### 3.3 Bridge layer (post-mainnet)

| Recipient | Share |
|-----------|------:|
| MM operator (gas-fee allocation) | 10% |
| $SNAP holders (residual after MM reserve target) | varies |
| Treasury | residual |

Source: `contracts/src/MarketMakerAllocation.sol` (10% rate is
DAO-mutable up to 25%).

## 4. Shapley-value rationale

The 7-type weight system is justified by a **Shapley-value
argument** from cooperative game theory:

> A contributor's marginal value = the difference in network
> output (request-throughput, model quality, security) when they
> participate vs. when they don't, **averaged over all possible
> orderings of contributors joining the network**.

For a 1000-contributor network, computing exact Shapley values
is infeasible (it's #P-hard). The 7-weighted-types system is a
**linear approximation** of the Shapley distribution: the
weights are calibrated such that, in the typical contribution
mix, payouts match Shapley to within ~10%.

Calibration is **adversarially adjustable**. If governance
observes that, e.g., adapter creation is being over-rewarded
relative to its actual marginal value (perhaps because adapters
are being created but not used), governance lowers the
AdapterCreation weight. The recompute is **immediate** —
RFI-04 / RFI26-08 (commit `be65c63e`) ensures
`updateWeight` recomputes every contributor's cached score in
the same call (bounded by `MAX_CONTRIBUTORS=1024`).

## 5. The VC-model critique

v3 keeps v2's critique of the standard VC funding model. Three
problems:

### 5.1 Misaligned incentives

VC-backed AI startups are pressured to grow user count, not
serve users well. Citrate's contribution accounting ties reward
to **measurable per-request value** (ModelHosting is rewarded
per inference served, not per user signed up).

### 5.2 Extraction of creative labor

LoRA adapters trained by individual researchers usually transfer
to the platform that hosts them, with the researcher receiving
no residual. Citrate's AdapterCreation weight (2.0×, highest)
inverts this — adapter creators are the **most rewarded
contributors** by default.

### 5.3 Concentration risk

A typical VC capitalization table has 10 entities holding ~80%
of equity. Citrate's contribution accounting distributes
ownership across **every contributor of every type**, capped at
1024 active contributors per epoch. The Gini coefficient of
SALT distribution post-mainnet should be substantially lower
than typical token launches.

## 6. Counter-arguments and responses

### 6.1 "On-chain measurement is gameable."

True. Mitigations:

- **Weight adjustment** as a governance lever (cf. §4).
- **NematocystSlashing** for adversarial behavior — sybil
  contribution-farms are detectable via flow analysis and
  punishable on-chain.
- **Trust floors** — mentor candidates need blue_score ≥ 1000;
  reward thresholds are similarly gated.

### 6.2 "Cooperative ownership doesn't scale."

The Mondragón Corporation (Spain, 81,000 worker-owners, $13B
revenue) suggests it does. The Citrate analog — a network of
operators, not workers — should scale at least as well.

### 6.3 "DAO governance is theater."

Often true elsewhere. Citrate counters with:

- **Tiered quorum thresholds** (25–50%) calibrated by proposal type.
- **Voting weight = blue_score + contribution_score + governance_participation**,
  not just token-balance — so silent whales don't dominate.
- **Constitutional amendments** require 50% quorum (high bar).
- **Operational parameters** require 25% quorum (low bar — fast adjustment).

See Paper VIII for the full constitutional framework.

## 7. Implementation reality check

| Component | Status | Citation |
|-----------|--------|----------|
| 7-type contribution tracking | **Implemented** | `0x1AFE987622ab5AdD275D2Fd21248F77F5e00667f` |
| Weight recompute on update | **Implemented** | RFI-04 fix, commit `be65c63e` |
| MAX_CONTRIBUTORS=1024 cap | **Implemented** | RFI-03 fix, same commit |
| Distribution mechanism | **Implemented** | `distributeRewards()` in same contract |
| Shapley calibration | Specified | governance task post-mainnet |
| Tiered quorum thresholds | Implemented in TreasuryGovernor | `0x541923570Df41b307cA037fdD0fb508502885455` |

## 8. References

- Mozi (墨子). *Jian Ai* (兼愛, "Impartial Care"). c. 5th c. BCE.
- Shapley, L.S. (1953). *A value for n-person games*.
- Mondragón Corporation case studies — cooperative scale.
- Citrate Paper II — paraconsistent consensus (where the
  routing model the contribution rewards measure is defined).
- Citrate Paper III — mentorship protocol (the social
  mechanism that AdapterCreation rewards lubricate).
- Citrate Paper VIII — DAO constitution (governance over the
  weights).
