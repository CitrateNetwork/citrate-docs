---
title: "The Memetic Money Portal v3 — Bridge Architecture and Contracted Market-Maker Model"
version: v3
created: 2026-04-28T03:55:00Z
branch: main
author: Larry Klosowski + Saul Loveman + Claude Opus 4.7
status: active
maturity: Specified — bridge primitives partly deployed (Sepolia testnet); MM contract live on Citrate testnet; mainnet pending
supersedes: v2 (which assumed an open AMM bridge model; v3 replaces with contracted MM)
---

# Paper VI — The Memetic Money Portal (v3)

> **v3 substantive change.** v2 specified a **fundraise + AMM
> bridge** where $SNAP holders would price-discover liquidity
> against $SALT through a per-wallet bonding curve. v3 **replaces
> the AMM model with a contracted full-time market-maker**
> arrangement (DLP / John Burnell), with on-chain governance
> (`MarketMakerAllocation.sol`, `0xF61e79AF3Bc2a905695E45b0fa7a43F9141a554a`)
> retaining 10% of gas fees as the MM compensation pool. The
> rationale is in §3 below; the v2 bridge mechanics are
> archived as historical context only.

## 1. The bridge problem

Citrate exists on its own L1 with chain id 40204. Most DeFi
liquidity exists on Ethereum mainnet. To get capital into Citrate
(for staking, model marketplace participation, paying for
inference) and out of Citrate (for off-ramp, treasury operations,
DAO grants), there must be a **bridge**.

Bridges fail in two characteristic ways:

1. **Trusted custodians**: someone holds ETH on one side and
   issues SALT on the other. Catastrophe if the custodian is
   compromised.
2. **AMM bridges**: a smart contract pools both assets and lets
   the market price them. Subject to oracle attacks, JIT
   liquidity manipulation, and severe slippage on small chains.

v3 chooses a **third path**: a contracted full-time market
maker, operating with on-chain compensation, on-chain reporting,
and DAO-revocable authority.

## 2. Architecture overview

```
Ethereum mainnet                          Citrate L1 (40204)
----------------                          ------------------
$SNAP (ERC-721 + ERC-6551)                $SALT (native gas)
        │                                          │
        │                                          │
        ▼                                          ▼
User Zone vault ──────► MM operator ────► Citrate MarketMaker
(freely accessible:     (DLP, contracted   Allocation contract
fees, rewards)           full-time)        (10% gas fees,
                                            DAO-reconfigurable)
        ▲                                          ▲
        │                                          │
Protocol Zone vault ◄───────────────── Pricing oracle
(locked collateral,                     (ComputePricingOracle
timelocked withdrawal)                   + off-chain CEX feeds)
```

The MM:

- Holds inventory of both **ETH** (and other base assets) and
  **SALT**.
- Quotes a tradable spread against an external CEX reference
  price plus an inventory-skew premium.
- Pays for the privilege of operating with their own capital;
  the network compensates via a 10% take of gas fees, scoped to
  prevent rent extraction.
- Can be **fired by DAO vote**. The MarketMakerAllocation
  contract has a `setMarketMaker` governance-only call that
  replaces the operator address.

## 3. Why a contracted MM, not an AMM

We considered AMM-style bridges deeply (v2 specified one). The
analysis behind switching:

### 3.1 Liquidity depth

A small-chain AMM is permanently shallow. With $X total
liquidity, a $X/100 trade incurs ~1% slippage; a $X/10 trade
incurs ~5% slippage. Citrate's anticipated mainnet TVL on
launch is ~$2M (conservative). At those depths, every meaningful
trade is a slippage event.

A contracted MM borrows from professional market making's
deeper book — they pre-position inventory based on flow
expectations, run dynamic hedging (perp shorts, delta-neutral
exposure), and quote tight spreads against external references.

### 3.2 Adversarial environments

AMM bridges are heaven for MEV bots: the entire price discovery
is on-chain, transparent, and racable. A contracted MM operates
**off-chain order book + on-chain settlement** — quotes come
through the MM's API; trades land on-chain only after the MM
has accepted them. MEV is not eliminated (settlement is still
on-chain) but the price-discovery surface is closed.

### 3.3 Operational cost

An AMM's "cost" is impermanent loss + bot front-running. A
contracted MM's cost is the 10% gas-fee allocation +
inventory-management overhead. For a chain with non-trivial
volume, the contracted-MM model is **cheaper per dollar
traded**. The break-even is around $1M daily volume, which we
expect to clear within 6 months of mainnet.

### 3.4 Governance leverage

An AMM has no levers — once deployed, parameters move only via
governance contract upgrades. A contracted MM has dozens of
levers — spread floor, inventory limits, max-trade size, daily
volume cap — each settable via DAO proposal. This lets the
network respond to market conditions at the speed of governance,
not the speed of contract migration.

## 4. The compensation contract

`MarketMakerAllocation.sol` (canonical address
`0xF61e79AF3Bc2a905695E45b0fa7a43F9141a554a`):

- Receives **10% of every block's gas fees** as a stream.
- Streams the accumulated balance to the registered MM address
  on a configurable schedule (default: daily).
- Has a **DAO-only `setRate(uint16)`** that can adjust the 10%
  rate up to 25% or down to 0% via governance vote.
- Has a **DAO-only `setMarketMaker(address)`** that fires the
  current MM and authorizes a successor. A two-step transfer
  (propose / accept) prevents accidental misallocation.
- Has a **public `pendingRewards()`** view so the chain is
  transparent about MM compensation — anyone can audit what's
  paid out.

The 10% rate is a **starting point**. v3 expects governance to
tune it within the first 6 months based on observed liquidity
quality (spread tightness, fill rates, inventory utilization).

## 5. The $SNAP NFT layer

The $SNAP NFTs from v2 remain — they are now **bridge-side
governance tokens** with reduced economic role:

- Each $SNAP is an ERC-721 + ERC-6551 token-bound account on
  Ethereum.
- Holders **vote** on bridge parameters (MM identity, rate,
  inventory caps) via Snapshot-style off-chain signing,
  ratified on-chain via `TreasuryGovernor`.
- $SNAP holders **receive a residual** of MM-allocation excess —
  if the MM's compensation pool grows beyond a target reserve,
  the overflow is distributed pro-rata to $SNAP holders.

This is intentionally **smaller** than v2's promise. v2 gave
$SNAP holders direct ownership of bridge fees; v3 makes them
governance-and-residual-only. The reasoning: a token that mainly
governs is more legally defensible (less likely to be classed as
a security under various jurisdictions) than a token that mainly
extracts fees.

## 6. The bonding-curve fundraise (historical, see §10)

v2 described a per-wallet bonding curve from 1.0× to 3.0×
discouraging whale accumulation. **v3 does not deploy this on
mainnet.** The fundraise that occurred on Sepolia testnet
(deployed at `0xB225F65B6a297dfe3A11BAD6e19E6f2f5D4AB247`) is
preserved in archive but not promoted to mainnet.

Reasoning: bonding curves are subtle to operate (whale-discouragement
becomes whale-encouragement at the right Sybil count) and the
current treasury mix already covers the launch capital
requirements. Re-running the bonding curve on mainnet would be
a re-launch of $SNAP, not a continuation; v3 chooses
continuation.

## 7. Settlement flow

The end-to-end ETH → SALT flow (mainnet, post-launch):

```
Step 1: User signs an EIP-3009 TransferWithAuthorization on Ethereum:
        "Transfer 1 ETH from me to the bridge custody multisig."
Step 2: User submits the signed authorization to the MM's API.
Step 3: MM verifies the signature off-chain and quotes:
        "I'll pay you 100 SALT (at current market) for your 1 ETH."
Step 4: User accepts; MM submits a settlement bundle to Citrate:
        - calls 0x0201 TRANSFER_AUTH_VERIFY (precompile gas: 4200)
        - on success, mints/releases SALT to user's Citrate address
Step 5: Cross-chain bot relays the now-claimed authorization
        to Ethereum, calling transferWithAuthorization() to pull
        the user's ETH into the bridge multisig. MM-controlled
        keys then route the ETH into MM inventory.
```

The reverse flow (SALT → ETH) inverts the directionality: user
deposits SALT into a Citrate bridge contract, MM holds the SALT
inventory and releases ETH on Ethereum.

## 8. Failure modes & mitigations

| Failure | Mitigation |
|---------|-----------|
| MM goes offline | Settlement is paused; users can withdraw deposits after a 7-day timeout via the bridge fallback contract. |
| MM acts adversarially | DAO can fire via `setMarketMaker`. Worst-case loss is bounded by the MM's inventory at firing time. |
| External oracle manipulation | The pricing reference uses **median of 3 CEXs**. A manipulated single-CEX feed is rejected. |
| Sybil-vote on $SNAP governance | Quadratic voting (anti-whale) on parameter changes >10% deltas. |
| Cross-chain MEV (settlement front-run) | Permissioned MM-only access to the settlement function on Citrate (via `onlyMarketMaker` modifier). |

## 9. Implementation reality check

| Component | Status | Citation |
|-----------|--------|----------|
| `MarketMakerAllocation` contract | **Implemented + Deployed** | `0xF61e79AF3Bc2a905695E45b0fa7a43F9141a554a` |
| `X402Facilitator` (EIP-3009 verifier) | **Implemented + Deployed** | `0xc0fDE3a8a42f6479Cf12B4A5489E7A988C918e23` |
| Bridge custody multisig | Specified — uses 3-of-5 hardware wallet Safe pre-launch | TBD |
| MM operator (DLP / John Burnell) | Specified | onboarding pending |
| Off-chain pricing oracle | Specified (3-CEX median) | not yet running |
| Sepolia $SNAP NFT contracts | **Deployed** (testnet only) | `0xB225F65B6a297dfe3A11BAD6e19E6f2f5D4AB247` |
| Mainnet $SNAP migration | **Not planned** for launch | post-launch governance |

The **structural** components are on-chain. The **operational**
relationship with DLP is in negotiation (per Saul's project
notes); contract execution awaits MM signature.

## 10. v2 → v3 archive note

v2's bonding-curve fundraise design and AMM bridge mechanism
are preserved for historical context in:

- `archive/papers/Gradient_Papers_No6_Memetic_Money_Portal_v2.md`
  (or the original .docx if that's where v2 lives)

The v2 design is **not** the deployed system. Reading v2 to
understand "what Citrate does today" will mislead. Read v3.

## 11. References

- Coinbase x402 protocol (https://www.x402.org).
- ERC-6551 standard — Token Bound Accounts.
- Citrate Paper I — protocol foundation, $SALT tokenomics.
- Citrate Paper VII — economic framework that the MM
  compensation slots into.
- John Burnell / DLP correspondence — see Saul's project notes
  for MM contracting details.
