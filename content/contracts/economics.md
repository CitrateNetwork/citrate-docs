---
title: Economics Contracts
codex_slug: /contracts/economics
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain (contracts/src/WrappedSALT.sol, LiquidStakingPool.sol, IPFSIncentives.sol, IPFSIncentivesV2.sol, ContributionAccounting.sol, StablecoinTreasury.sol, MarketMakerAllocation.sol)
surfaces: [SC-econ-wrappedSALT, SC-econ-staking, SC-econ-ipfs, SC-econ-contrib, SC-econ-stable, SC-econ-mm]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Economics Contracts

> The token-economic contracts of Citrate: the wrapped-SALT token for gasless
> payments, the liquid-staking pool, IPFS pinning incentives (v1 + the
> sealed-PoRep v2), 7-type contribution accounting, the stablecoin treasury, and
> the market-maker allocation. For developers and integrators building on Citrate
> (chainId **40204**). The native token is **SALT**.

## Overview

This page is **transcluded**: the truth lives in `citrate-chain` at the pinned
SHA (`03d7851`). Every function and event below is audited against the `.sol`
source cited per section — if a symbol is not listed here, it does not exist in
the contract at this SHA. The ABI is summarized, not reproduced (Rule 9); follow
the source link for the full interface.

> **Honest status: pre-audit.** Several of these contracts carry SECREM-01 /
> re-audit remediations noted inline in their NatSpec (e.g. wSALT SOL-01 / SOL-02
> / RFI-01, staking SOL-16, contribution RFI-03/04). They also have Foundry
> invariant suites and TLA+ specs in places. None of this is an external
> third-party audit. Pilot is testnet-beta — treat as experimental.

### Contract map

| Surface | Contract | Source | Tier | Deployed (40204) |
|---|---|---|---|---|
| SC-econ-wrappedSALT | WrappedSALT (wSALT) | `contracts/src/WrappedSALT.sol` | public | `0xad7c3135c1b9b3189208fd617b6b058c1c0469f3` |
| SC-econ-staking | LiquidStakingPool (stSALT) | `contracts/src/LiquidStakingPool.sol` | public | `0x8951ae72e5479cae28ef7bb3caa4207d5719e24b` |
| SC-econ-ipfs | IPFSIncentives / IPFSIncentivesV2 | `contracts/src/IPFSIncentives.sol`, `IPFSIncentivesV2.sol` | public | `0x20a0b74c766e84b20558abd76a7a0fd6434a4c4c` (v1) |
| SC-econ-contrib | ContributionAccounting | `contracts/src/ContributionAccounting.sol` | public | `0x86d918808b48ad543c9c816b5303b7dbcb0e321f` |
| SC-econ-stable | StablecoinTreasury | `contracts/src/StablecoinTreasury.sol` | **commercial** | `0x1f17fc3525e540cfd14ed0270a87c159c56aadee` |
| SC-econ-mm | MarketMakerAllocation | `contracts/src/MarketMakerAllocation.sol` | **commercial** | `0x8b36c15552394ce44173a29d054dc5ca482e65d3` |

> Addresses from `contracts/DEPLOYED_ADDRESSES.md` (testnet-beta, chain 40204).
> `IPFSIncentivesV2` is not in the deployed table at this SHA; only v1 is listed.
> Always cross-verify an address with `eth_getCode` against
> `https://rpc.citrate.ai`.

---

## WrappedSALT (wSALT)

Source: `contracts/src/WrappedSALT.sol` (MIT), `is IERC3009, ReentrancyGuard`.

**Purpose.** An ERC-20 wrapper around native SALT with **EIP-3009**
`transferWithAuthorization` support, powering gasless / authorized transfers for
x402 payment flows. `name="Wrapped SALT"`, `symbol="wSALT"`, `decimals=18`. The
EIP-712 domain separator is rebuilt when `block.chainid` changes (SOL-02 fix,
preventing cross-fork replay after a re-genesis). A dedicated
fee-authorization typehash binds `(treasury, fee)` into the signed digest
(RFI-01 fix) so a caller cannot redirect the fee leg.

### Key functions

| Function | Purpose |
|---|---|
| `deposit()` / `receive()` (payable) | Wrap native SALT → wSALT. |
| `withdraw(uint256 amount)` | Unwrap wSALT → native SALT. |
| `transfer`, `approve`, `transferFrom` | Standard ERC-20. |
| `transferWithAuthorization(from, to, value, validAfter, validBefore, nonce, v, r, s)` | EIP-3009 signed transfer (gasless). |
| `transferWithFeeAuthorization(from, to, treasury, value, fee, validAfter, validBefore, nonce, v, r, s)` | One signed auth for gross `value`, split internally into `value-fee` → `to` and `fee` → `treasury` (RFI-01: `(treasury, fee)` bound to the digest). |
| `receiveWithAuthorization(...)` | EIP-3009 pull-style transfer (`to` must be caller). |
| `cancelAuthorization(authorizer, nonce, v, r, s)` | Cancel an unused authorization. |
| `DOMAIN_SEPARATOR()` → `bytes32` | Current-chainId EIP-712 domain separator. |
| `authorizationState(authorizer, nonce)` → `bool` | Whether a nonce is used/cancelled. |
| `balanceOf`, `allowance`, `totalSupply` | Public state getters. |

Type-hash constants: `TRANSFER_WITH_AUTHORIZATION_TYPEHASH`,
`TRANSFER_WITH_FEE_AUTHORIZATION_TYPEHASH`, `RECEIVE_WITH_AUTHORIZATION_TYPEHASH`,
`CANCEL_AUTHORIZATION_TYPEHASH`.

### Events / errors

`Transfer`, `Approval`, `Deposit`, `Withdrawal`; `AuthorizationUsed`,
`AuthorizationCanceled` (from `IERC3009`). Error `InvalidFeeAuthorization`.

---

## LiquidStakingPool (stSALT)

Source: `contracts/src/LiquidStakingPool.sol` (MIT),
`is ReentrancyGuard, Governable`.

**Purpose.** Lido-style liquid staking for compute. Deposit SALT, receive
**stSALT** shares; rewards accrue to the pool and raise the share price.
Withdrawals queue for `WITHDRAWAL_DELAY` (50400 blocks, ≈7 days). A BFT oracle
committee reports rewards/slashing under a 67% quorum with nonce replay
protection and per-report caps. Compute providers post collateral (Rocket-Pool
pattern) that governance can slash back into the pool. The open `receive()` was
closed (SOL-16 first-depositor inflation fix): unsolicited SALT reverts; use
`deposit()` or `donate()`. `name="Staked SALT"`, `symbol="stSALT"`,
`decimals=18`.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `deposit()` (payable) → `uint256 sharesOut` | any | Stake SALT, mint stSALT shares. |
| `requestWithdrawal(uint256 shareAmount)` → `uint256 requestId` | any | Burn shares, queue SALT release. |
| `claimWithdrawal(uint256 requestId)` | requester | Claim after `WITHDRAWAL_DELAY`. |
| `reportRewards(uint256 rewards, uint256 slashed)` | `isOracle` | Oracle vote; applied at quorum. |
| `depositCollateral()` (payable) / `withdrawCollateral(uint256)` | provider | Provider collateral. |
| `slashProvider(address, uint256)` | `onlyGovernance` | Slash collateral into the pool. |
| `donate()` (payable) | any | Donate without affecting share math. |
| `addOracle(address)` / `removeOracle(address)` | `onlyGovernance` | Manage oracle committee. |
| `getSharePrice()`, `balanceOf(address)`, `previewDeposit(uint256)`, `previewWithdraw(uint256)` | view | Share/value math. |
| `transferGovernance` / `acceptGovernance` | inherited | Two-step governance. |

Constants: `WITHDRAWAL_DELAY=50400`, `ORACLE_QUORUM=67`, `MIN_COLLATERAL_BPS=1000`,
`MAX_REWARD_RATE_BPS=20000`, `MAX_SLASH_RATE_BPS=1000`.

### Events

`Deposited`, `WithdrawalRequested`, `WithdrawalClaimed`, `RewardsReported`,
`ProviderSlashed`, `OracleAdded`, `OracleRemoved`, `CollateralDeposited`,
`CollateralWithdrawn`, `Donated`; `GovernanceTransferred` (from `Governable`).

---

## IPFSIncentives (v1) & IPFSIncentivesV2

Source: `contracts/src/IPFSIncentives.sol` and
`contracts/src/IPFSIncentivesV2.sol` (both MIT, `is AccessControl,
ReentrancyGuard`).

**Purpose.** Reward operators for pinning model/data content on IPFS.

**v1** is a report-and-claim model: an authorized reporter (`REPORTER_ROLE`)
attests that an operator pinned a CID of a given size and `ModelType`; the
contract accrues a reward (per-call and per-`(cid, reporter)` caps, RFI26-06);
operators claim accrued SALT.

**v2** is a sealed-PoRep / Proof-of-Spacetime mechanism with economic security:
pinners register, post a bond, and `sealCommit` with a PoRep proof to activate a
storage slot; storage is challenged and answered via `submitPoSt`; reward vests
per passing round; failure to prove leads to `slash` (bond split between
challenger and burn). **Proof verification is delegated to Citrate precompile
`0x0108`** (Halo2-KZG, version-multiplexed): a STATICCALL returning 1 == valid
proof, revert/0 == no proof. No money moves without a `0x0108` success
(invariant `NoPayWithoutProof`). Invariants are asserted by the Foundry suite
`test/IPFSIncentivesV2Invariant.t.sol`.

### Key functions — v1 (`IPFSIncentives`)

| Function | Access | Purpose |
|---|---|---|
| `reportPinning(string cid, uint256 sizePinned, ModelType modelType)` | `REPORTER_ROLE` | Attest a pin; accrues reward. |
| `claimRewards()` | any | Withdraw accrued SALT (reentrancy-guarded). |
| `depositRewards()` (payable) | `DEFAULT_ADMIN_ROLE` | Fund the reward pool. |
| `updateBaseReward(uint256 newRate)` | `DEFAULT_ADMIN_ROLE` | Set base reward rate. |
| `calculateReward(uint256 sizePinned, ModelType)` → `uint256` | view | Reward preview. |
| `getModelPinners(string cid)` → `address[]` | view | Pinners of a CID. |

Events: `PinReported`, `RewardClaimed`, `BaseRewardUpdated`, `RewardsDeposited`.

### Key functions — v2 (`IPFSIncentivesV2`)

| Function | Access | Purpose |
|---|---|---|
| `registerPinner()` | any | Register as a pinner. |
| `fund()` (payable) | `DEFAULT_ADMIN_ROLE` | Fund a slot budget. |
| `sealCommit(bytes32 cid, uint256 sector, bytes32 commD, bytes32 commR, bytes32 commC, bytes porepProof)` (payable) | registered | Post exact bond + valid PoRep → active slot. |
| `submitPoSt(...)` | pinner | Answer a storage challenge (PoSt via `0x0108`); vests a round. |
| `challenge(bytes32 cid, uint256 sector)` | any | Open a storage challenge. |
| `claim(bytes32 cid, uint256 sector)` → `uint256 owed` | pinner | Withdraw vested-minus-claimed reward. |
| `slash(address pinner, bytes32 cid, uint256 sector)` | any | Slash on missed/failed proof; split bond. |
| `clearSlashed(bytes32 cid, uint256 sector)` | — | Reset per-attempt counters (re-seal prep). |
| `returnBond(bytes32 cid, uint256 sector)` → `uint256` | pinner | Return bond once done + fully claimed. |
| `withdrawChallengerCredit()` → `uint256` | challenger | Withdraw challenger rewards. |
| `pinId`, `slotId`, `deriveReplicaId` (pure), `owedOf(...)` (view) | — | Id/accounting helpers. |

Events: `PinnerRegistered`, `Sealed`, `Challenged`, `PoStPassed`, `Claimed`,
`Slashed`, `Missed`, `SlashedCleared`, `BondReturned`, `SlotFunded`.

---

## ContributionAccounting

Source: `contracts/src/ContributionAccounting.sol` (MIT), `is Governable`.

**Purpose.** Tracks contributions across **7 types** with weighted scores and
distributes SALT rewards proportionally. Types:
`Validation, ModelHosting, AdapterCreation, DataProvision, AppDevelopment,
BridgeInfra, Governance`. Weights are basis points (10000 = 1.0x). Authorized
recorders (or governance) record contributions; scores are recomputed on each
record. The contributor set is bounded (`MAX_CONTRIBUTORS`, RFI-03/04) to keep
distribution gas bounded. Also tracks per-`(address, dimension)` scores used by
`MentorMatcher`.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `recordContribution(address contributor, ContributionType ctype, uint256 amount)` | recorder or governance | Record a contribution; updates weighted score. |
| `recordDimensionContribution(...)` | recorder or governance | Record a per-dimension contribution. |
| `fundRewards()` (payable) | any | Add SALT to the reward pool. |
| `distributeRewards()` | `onlyGovernance` | Distribute pool pro-rata by score. |
| `claimRewards()` | any | Claim pending reward. |
| `updateWeight(ContributionType ctype, uint256 newWeight)` | `onlyGovernance` | Change a type weight (rescores). |
| `addRecorder(address)` / `removeRecorder(address)` | `onlyGovernance` | Manage recorder allowlist. |
| `getScore(address)`, `pendingReward(address)`, `contributorCount()`, `getContributorCount()` | view | Read accessors. |
| Public mappings `scores`, `contributions`, `weights` | view | Direct state reads. |

### Events

`ContributionRecorded`, `DimensionContributionRecorded`, `RewardsDistributed`,
`RewardClaimed`, `WeightUpdated`, `RecorderAdded`, `RecorderRemoved`;
`GovernanceTransferred` (from `Governable`).

---

## StablecoinTreasury

Source: `contracts/src/StablecoinTreasury.sol` (MIT),
`is ReentrancyGuard, Governable`.

**Tier: commercial.** Treasury operator surface for the network's institutional
revenue — narrative gated to contracted principals (bytecode/ABI remain public
on-chain). No secrets on this page.

**Purpose.** Accumulates stablecoins from institutional compute purchases across
an allowlist of accepted tokens, tracks per-epoch revenue and activity, and
distributes to recipients under governance control. Includes an emergency
withdraw escape hatch.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `deposit(address stablecoin, uint256 amount)` | any | Deposit an accepted stablecoin (reentrancy-guarded). |
| `distribute(address stablecoin, address[] recipients, uint256[] amounts)` | `onlyGovernance` | Distribute to recipients (length-matched). |
| `addStablecoin(address)` / `removeStablecoin(address)` | `onlyGovernance` | Manage accepted-token allowlist. |
| `recordActivity(uint256 jobCount, uint256 inferenceCount)` | activity recorder | Record per-epoch activity. |
| `emergencyWithdraw(address stablecoin, address to)` | `onlyGovernance` | Escape hatch. |
| `totalValueLocked()`, `stablecoinCount()`, `getAcceptedStablecoins()`, `getEpochRevenue(uint256)`, `getCurrentEpoch()` | view | Read accessors. |

### Events

`StablecoinAdded`, `StablecoinRemoved`, `Deposited`, `Distributed`,
`EmergencyWithdrawal`, `EpochAdvanced`, `ActivityRecorderSet`,
`ActivityRecorded`; `GovernanceTransferred` (from `Governable`).

---

## MarketMakerAllocation

Source: `contracts/src/MarketMakerAllocation.sol` (MIT), `is Governable`.

**Tier: commercial.** Strategic-partner economics (CEX-listing / liquidity
arrangement) surfaced to contracted principals; ABI remains public on-chain. No
secrets on this page.

**Purpose.** Receives a configurable share (default 1000 bps = 10%) of gas-pool
fees — skimmed before the network's 7-way revenue split — as a cooperative
incentive for the designated market maker, who provides liquidity and handles CEX
listings. The market maker withdraws accumulated SALT; governance can change the
market-maker address and the allocation rate.

### Key functions

| Function | Access | Purpose |
|---|---|---|
| `receive()` (payable) | block producer / revenue distributor | Receive the gas-fee allocation. |
| `withdraw(uint256 amount)` | `onlyMarketMaker` | Withdraw a portion of accrued SALT. |
| `withdrawAll()` | `onlyMarketMaker` | Withdraw the full balance. |
| `changeAllocationRate(uint256 newBps)` | `onlyGovernance` | Change the skim rate. |
| `calculateAllocation(uint256 gasFees)` | view | Preview the skim for a fee amount. |
| `availableBalance()`, `changeHistoryCount()` | view | Read accessors. |
| `transferGovernance` / `acceptGovernance` | inherited | Two-step governance (market-maker change is governance-gated). |

Default `allocationBps = 1000` (10%).

### Events

`AllocationReceived`, `Withdrawn`, `MarketMakerChanged`, `AllocationRateChanged`;
`GovernanceTransferred` (from `Governable`).

---

## Tutorials

- [Read a verified contract](/contracts/tutorials/read-a-contract) — query any of
  these contracts over `eth_call` / an SDK without sending a transaction.

## Security & access

- **Tier rationale.** WrappedSALT, LiquidStakingPool, the IPFS incentives, and
  ContributionAccounting are **public** — the open economic primitives a builder
  needs, with inherently-public on-chain ABIs. **StablecoinTreasury and
  MarketMakerAllocation are commercial**: they describe the network's revenue and
  strategic-partner economics, surfaced to contracted principals. Only the
  narrative is gated; the deployed bytecode/ABI are public on-chain.
- **No secrets here.** No keys, mnemonics, private endpoints, or credentials
  appear on this page or are needed to read these contracts. Deployed addresses
  are public testnet values.
- **Pre-audit.** SECREM-01 / re-audit remediations (SOL-01, SOL-02, RFI-01,
  SOL-16, RFI-03/04, RFI26-06, etc.) are landed and noted in the source NatSpec,
  and Foundry invariant suites exist, but no external third-party audit has been
  completed. Not a certification.

## Source & verification

- **Source repo:** `citrate-chain` at SHA `03d7851`.
- **Paths:** `contracts/src/WrappedSALT.sol`,
  `contracts/src/LiquidStakingPool.sol`, `contracts/src/IPFSIncentives.sol`,
  `contracts/src/IPFSIncentivesV2.sol`,
  `contracts/src/ContributionAccounting.sol`,
  `contracts/src/StablecoinTreasury.sol`,
  `contracts/src/MarketMakerAllocation.sol`.
- **Deployed addresses:** `contracts/DEPLOYED_ADDRESSES.md` (chain 40204).
- Verify any address with `eth_getCode` against `https://rpc.citrate.ai`.
