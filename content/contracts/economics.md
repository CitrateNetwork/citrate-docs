---
title: Economics contracts
codex_slug: /contracts/economics
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src/{WrappedSALT,LiquidStakingPool,IPFSIncentives,ContributionAccounting,StablecoinTreasury,MarketMakerAllocation}.sol
surfaces: [SC-econ-wrappedSALT, SC-econ-staking, SC-econ-ipfs, SC-econ-contrib, SC-econ-stable, SC-econ-mm]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

These are the on-premise economic primitives that settle work on the Citrate Network: a wrapped form of
SALT that signed payments can move, a staking pool that lets staked SALT stay liquid, storage incentives
for content kept on IPFS, an accounting contract that tracks the work done so rewards follow it, a treasury
for stablecoin revenue, and an allocation that funds the network's market maker. This page is for the
developers and integrators building against those contracts on chain id 40204.

## What it is

SALT is the unit the Citrate Network counts in. It settles the work the network performs; it is not a
product to hold. The contracts here are the on-chain machinery that records that work and pays it out, and
nothing on this page treats SALT as an instrument to speculate on. For the base facts about SALT, supply,
and gas, read [network economics](/chain/economics).

Each contract does one job:

| Surface | Contract | What it settles |
|---|---|---|
| SC-econ-wrappedSALT | WrappedSALT (wSALT) | native SALT wrapped as an ERC-20 so a signed authorization can move it |
| SC-econ-staking | LiquidStakingPool (stSALT) | SALT staked into a pool, with a liquid share token in return |
| SC-econ-ipfs | IPFSIncentives | rewards for operators who pin model and data content on IPFS |
| SC-econ-contrib | ContributionAccounting | the record of seven kinds of work, weighted, with rewards split by score |
| SC-econ-stable | StablecoinTreasury | stablecoin revenue from institutional compute purchases |
| SC-econ-mm | MarketMakerAllocation | the gas-fee share that funds the network's market maker |

The first four are public; a builder needs them and their on-chain interfaces are public anyway.
StablecoinTreasury and MarketMakerAllocation are tier commercial: the contract bytecode is public on chain,
but the narrative around the network's revenue and its market-maker arrangement is written for contracted
principals. No keys or private endpoints appear on this page.

## How to use it

You read and call these contracts the same way you would any contract on an EVM-compatible network.

1. Point a client at the Citrate Network and confirm the chain id is 40204, as shown in
   [what Citrate is](/start/what-is-citrate).
2. Resolve the address you want from the canonical registry, `contracts/addresses/40204.json`, rather than
   copying an address from prose. The keys there are the contract names used below.
3. For a read, call a view function over `eth_call`. For a write, send a transaction signed by an account
   that holds the right role; the access column in each table below tells you which.
4. Confirm an address holds the code you expect with `eth_getCode` before you send value to it.

For a network-wide snapshot of supply, gas price, staked amount, and treasury in a single call, use
`citrate_getEconomicState`, documented in [chain RPC](/chain/rpc).

## Reference

Every function below is read from the cited `.sol` file at the audited SHA. If a symbol is not listed here,
it is not in the contract at this SHA.

### WrappedSALT

`contracts/src/WrappedSALT.sol`, `is IERC3009, ReentrancyGuard`. An ERC-20 wrapper around native SALT,
`name="Wrapped SALT"`, `symbol="wSALT"`, `decimals=18`. It adds EIP-3009 authorized transfers so a holder
can sign a transfer that someone else submits, which is what the x402 payment flow relies on. The EIP-712
domain separator is rebuilt whenever `block.chainid` changes, so an authorization signed before a re-genesis
cannot be replayed against the new chain.

| Function | Purpose |
|---|---|
| `deposit()` / `receive()`, payable | wrap native SALT into wSALT |
| `withdraw(uint256 amount)` | unwrap wSALT back into native SALT |
| `transfer`, `approve`, `transferFrom` | standard ERC-20 |
| `transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)` | EIP-3009 signed transfer; the holder signs, anyone submits |
| `transferWithFeeAuthorization(from, to, treasury, value, fee, validAfter, validBefore, nonce, v, r, s)` | one signed authorization for the gross `value`, split inside the contract into `value - fee` to `to` and `fee` to `treasury` |
| `receiveWithAuthorization(...)` | pull-style EIP-3009 transfer; the caller must be the payee |
| `cancelAuthorization(authorizer, nonce, v, r, s)` | cancel an unused authorization |
| `DOMAIN_SEPARATOR()` | the current-chain EIP-712 domain separator |
| `authorizationState(authorizer, nonce)` | whether a nonce has been used or cancelled |

The fee-bearing path binds `(treasury, fee)` into the signed digest through a distinct type hash,
`TRANSFER_WITH_FEE_AUTHORIZATION_TYPEHASH`, so a submitter cannot redirect the fee leg to another address.
Events: `Transfer`, `Approval`, `Deposit`, `Withdrawal`, `AuthorizationUsed`, `AuthorizationCanceled`. The
error `InvalidFeeAuthorization` reverts a fee transfer whose signature does not recover to `from`.

### LiquidStakingPool

`contracts/src/LiquidStakingPool.sol`, `is ReentrancyGuard, Governable`. A shares-based staking pool,
`name="Staked SALT"`, `symbol="stSALT"`, `decimals=18`. You deposit SALT and receive stSALT shares; rewards
reported to the pool raise the value each share is worth, so the staked SALT stays usable as a share token
while it earns. Withdrawals wait out `WITHDRAWAL_DELAY` blocks before they can be claimed.

| Function | Access | Purpose |
|---|---|---|
| `deposit()`, payable | any | stake SALT, mint stSALT shares, returns `sharesOut` |
| `requestWithdrawal(uint256 shareAmount)` | any | burn shares and queue the SALT release, returns `requestId` |
| `claimWithdrawal(uint256 requestId)` | the requester | claim once `WITHDRAWAL_DELAY` has passed |
| `reportRewards(uint256 rewards, uint256 slashed)` | an oracle | report rewards or slashing; applied at quorum |
| `depositCollateral()` / `withdrawCollateral(uint256)` | a compute provider | post or remove provider collateral |
| `slashProvider(address, uint256)` | governance | slash a provider's collateral back into the pool |
| `donate()`, payable | any | add SALT without changing the share price |
| `addOracle(address)` / `removeOracle(address)` | governance | manage the oracle committee |
| `getSharePrice()`, `balanceOf(address)`, `previewDeposit(uint256)`, `previewWithdraw(uint256)` | view | share and value math |
| `transferGovernance` / `acceptGovernance` | inherited | two-step governance handover |

Constants: `WITHDRAWAL_DELAY = 50400` blocks, about seven days; `ORACLE_QUORUM = 67`, the percentage of the
committee that must agree before a report applies; `MIN_COLLATERAL_BPS = 1000`; `MAX_REWARD_RATE_BPS =
20000`; `MAX_SLASH_RATE_BPS = 1000`. Oracle reports carry a per-nonce replay guard, the committee must agree
on the same `(rewards, slashed)` values, and the caps bound how much any single report can move the pool.
Events: `Deposited`, `WithdrawalRequested`, `WithdrawalClaimed`, `RewardsReported`, `ProviderSlashed`,
`OracleAdded`, `OracleRemoved`, `CollateralDeposited`, `CollateralWithdrawn`, `Donated`.

### IPFSIncentives

`contracts/src/IPFSIncentives.sol`, `is AccessControl, ReentrancyGuard`. This is the deployed storage
incentive, a report-and-claim model. An authorized reporter attests that an operator pinned a content id of
a given size and model type, the contract accrues a reward for that pin, and the operator later withdraws
the accrued SALT.

| Function | Access | Purpose |
|---|---|---|
| `reportPinning(string cid, uint256 sizePinned, ModelType modelType)` | `REPORTER_ROLE` | attest a pin and accrue its reward |
| `claimRewards()` | any | withdraw accrued SALT |
| `depositRewards()`, payable | `DEFAULT_ADMIN_ROLE` | fund the reward pool |
| `updateBaseReward(uint256 newRate)` | `DEFAULT_ADMIN_ROLE` | set the base reward rate |
| `calculateReward(uint256 sizePinned, ModelType)` | view | preview a reward |
| `getModelPinners(string cid)` | view | the operators pinning a content id |

Events: `PinReported`, `RewardClaimed`, `BaseRewardUpdated`, `RewardsDeposited`. Two later designs exist in
the tree, a sealed proof-of-replication mechanism (`IPFSIncentivesV2.sol`) and a commit-reveal extension of
it (`IPFSIncentivesV3.sol`) with a grief-slashable wrong-CommD challenge. Both are now listed in the
canonical registry (`contracts/addresses/40204.json`); this page documents version one's surface, and the
source and verification note points to the later versions.

### ContributionAccounting

`contracts/src/ContributionAccounting.sol`, `is Governable`. This is the record that lets rewards follow
work. It tracks contributions across seven types, weights each type, keeps a cached score per contributor,
and splits a funded pool in proportion to those scores. The seven types are `Validation`, `ModelHosting`,
`AdapterCreation`, `DataProvision`, `AppDevelopment`, `BridgeInfra`, and `Governance`. Weights are basis
points, where 10000 is a one-times multiplier.

| Function | Access | Purpose |
|---|---|---|
| `recordContribution(address contributor, ContributionType ctype, uint256 amount)` | a recorder or governance | record work and refresh the contributor's score |
| `recordDimensionContribution(address contributor, bytes32 dimension, uint256 amount)` | a recorder or governance | record a per-dimension running total |
| `fundRewards()`, payable | any | add SALT to the reward pool |
| `distributeRewards()` | governance | freeze each contributor's share of the pool by score |
| `claimRewards()` | any | withdraw a claimable balance |
| `updateWeight(ContributionType ctype, uint256 newWeight)` | governance | change a type's weight and rescore every contributor |
| `addRecorder(address)` / `removeRecorder(address)` | governance | manage the recorder allowlist |
| `getScore(address)`, `pendingReward(address)`, `contributorCount()`, `getContributorListPage(offset, limit)`, `getDimensionScore(address, bytes32)` | view | read scores, pending shares, and the contributor list |

The active contributor list is capped at `MAX_CONTRIBUTORS = 1024` so distribution and rescoring stay within
a bounded gas budget. `distributeRewards` allocates shares first and lets each contributor claim later, so
claim order does not change anyone's amount. Events: `ContributionRecorded`,
`DimensionContributionRecorded`, `RewardsDistributed`, `RewardClaimed`, `WeightUpdated`, `RecorderAdded`,
`RecorderRemoved`.

### StablecoinTreasury

`contracts/src/StablecoinTreasury.sol`, `is ReentrancyGuard, Governable`. Tier commercial. It accumulates
stablecoins from institutional compute purchases across an allowlist of accepted tokens, tracks revenue and
activity per epoch, and distributes to recipients under governance control. No SALT is involved; it moves
ERC-20 stablecoins only, and assumes each accepted token is pegged one-to-one to the US dollar.

| Function | Access | Purpose |
|---|---|---|
| `deposit(address stablecoin, uint256 amount)` | any | deposit an accepted stablecoin |
| `distribute(address stablecoin, address[] recipients, uint256[] amounts)` | governance | distribute to a length-matched list of recipients |
| `addStablecoin(address)` / `removeStablecoin(address)` | governance | manage the accepted-token allowlist |
| `recordActivity(uint256 jobCount, uint256 inferenceCount)` | an authorized activity recorder | record per-epoch compute and inference counts |
| `emergencyWithdraw(address stablecoin, address to)` | governance | move a stablecoin's full balance to a governance address |
| `totalValueLocked()`, `stablecoinCount()`, `getAcceptedStablecoins()`, `getEpochRevenue(uint256)`, `getCurrentEpoch()` | view | read balances, the allowlist, and epoch data |

An epoch is `EPOCH_LENGTH = 1000` blocks; the allowlist is capped at `MAX_STABLECOINS = 20`. Events:
`StablecoinAdded`, `StablecoinRemoved`, `Deposited`, `Distributed`, `EmergencyWithdrawal`, `EpochAdvanced`,
`ActivityRecorderSet`, `ActivityRecorded`.

### MarketMakerAllocation

`contracts/src/MarketMakerAllocation.sol`, `is Governable`. Tier commercial. It receives a share of gas-pool
fees, skimmed before the network's wider revenue split, to fund the market maker who provides liquidity and
handles listings. The market maker withdraws the accumulated SALT; governance can change the rate and the
market-maker address.

| Function | Access | Purpose |
|---|---|---|
| `receive()`, payable | the block producer or revenue distributor | take the gas-fee allocation |
| `withdraw(uint256 amount)` | the market maker | withdraw part of the accrued SALT |
| `withdrawAll()` | the market maker | withdraw the full balance |
| `changeMarketMaker(address newMaker, string reason)` | governance | replace the market-maker address with a recorded reason |
| `changeAllocationRate(uint256 newBps)` | governance | change the skim rate within its bounds |
| `calculateAllocation(uint256 gasFees)` | view | preview the skim and the remainder |
| `availableBalance()`, `changeHistoryCount()` | view | read the balance and the change history |
| `transferGovernance` / `acceptGovernance` | inherited | two-step governance handover |

The default rate is `allocationBps = 1000`, ten percent. It is bounded between `MIN_ALLOCATION_BPS = 100` and
`MAX_ALLOCATION_BPS = 1500`, and a rate change is held off until `RATE_CHANGE_COOLDOWN = 302400` blocks,
about seven days, have passed since the last change. Events: `AllocationReceived`, `Withdrawn`,
`MarketMakerChanged`, `AllocationRateChanged`.

## Design rationale

The shape of these contracts follows from one rule: pay for work that happened, and keep the accounting
honest while you do it. The staking pool uses a shares model so a staker's claim grows with reported rewards
without a separate bookkeeping pass, and it holds the share price steady against a first-depositor
manipulation by computing shares against a virtual offset rather than the raw balance. The storage incentive
keeps the deployed version a simple report-and-claim, because the sealed-proof and commit-reveal designs add
real complexity and are not yet the live mechanism. ContributionAccounting freezes each round's shares at
distribution time and bounds its contributor set, so a reward split cannot be reordered for advantage or
priced out by gas. The two commercial contracts are kept narrow and governance-gated because they touch the
network's revenue and a single strategic relationship, and the cooldown and rate bounds on the market-maker
skim keep that relationship from quietly drifting.

## Failure modes

These contracts move value, so the relevant question is how each one fails closed.

- WrappedSALT will not unwrap more than an account holds, and the fee path reverts with
  `InvalidFeeAuthorization` rather than settling if the signed digest does not recover to `from`. The
  rebuilt domain separator means an authorization signed before a chain-id change cannot be replayed after
  one.
- LiquidStakingPool applies a reward report only when a 67 percent quorum agrees on the same values, rejects
  a report that exceeds its caps, and rejects unsolicited SALT through `receive()` so that the only ways in
  are `deposit()`, which mints shares, and `donate()`, which does not move the share price.
- ContributionAccounting refuses a new contributor once the cap is reached rather than running an unbounded
  loop, and recomputes scores on a weight change so the split stays consistent.
- StablecoinTreasury distributes only up to the recorded balance and requires recipient and amount arrays of
  equal length; its emergency path moves funds to a governance address, not an arbitrary one.
- MarketMakerAllocation caps the skim rate and enforces a cooldown between changes, so a single change cannot
  push the allocation past its bounds or be repeated rapidly.

## Access and canon

WrappedSALT, LiquidStakingPool, IPFSIncentives, and ContributionAccounting are public, the open primitives a
builder needs, with on-chain interfaces that are public by nature. StablecoinTreasury and
MarketMakerAllocation are tier commercial: the deployed bytecode and the interface are public on chain, but
the narrative around the network's revenue and its market-maker arrangement is written for contracted
principals. No keys, mnemonics, private endpoints, or credentials appear on this page or are needed to read
these contracts. The deployed addresses are public testnet values.

## Source and verification

- Source repo: `citrate-chain` at SHA `9d5959e`.
- Files: `contracts/src/WrappedSALT.sol`, `contracts/src/LiquidStakingPool.sol`,
  `contracts/src/IPFSIncentives.sol`, `contracts/src/ContributionAccounting.sol`,
  `contracts/src/StablecoinTreasury.sol`, `contracts/src/MarketMakerAllocation.sol`.
- Addresses: the canonical registry is `contracts/addresses/40204.json` for chain 40204. At this SHA it
  lists all three, `IPFSIncentives` (version one), `IPFSIncentivesV2`, and `IPFSIncentivesV3`; the deploy
  script `contracts/script/DeployAll.s.sol` deploys version one, and V2 and V3 are deployed and registered
  separately. The superseded `contracts/DEPLOYED_ADDRESSES.md` is no longer the source of truth, so resolve
  from `addresses/40204.json` and confirm with `eth_getCode` before sending value.
- Status: Implemented, pre-audit. The contracts run on testnet 40204 and carry remediations from the
  SECREM-01 and re-audit sprints in their source comments, with Foundry invariant suites in places, but no
  external third-party audit has been completed. Treat as experimental.
