---
title: Compute Contracts — Marketplace, Pools, Pricing, Bulk & Verification
codex_slug: /contracts/compute
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts (src/ComputeMarketplace.sol, ComputePool.sol, ComputePoolTraining.sol, ComputePricingOracle.sol, BulkComputeGateway.sol, ComputeVerifier.sol)
surfaces: [SC-compute-marketplace, SC-compute-pool, SC-compute-oracle, SC-compute-bulk, SC-compute-verifier]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Compute Contracts

> The on-chain machinery for buying and selling verified AI compute on Citrate
> (chain **40204**): a job marketplace, multi-provider GPU pools (inference and
> distributed training), a BFT pricing oracle, an institutional bulk-credit
> gateway, and the tiered verification dispatcher they all settle through.
> For compute buyers, GPU providers, and integrators.

> **Rule 9 / transclusion.** The canonical truth is the Solidity source in
> `citrate-chain/contracts/src/`. This page summarises the audited public/external
> surface at a pinned SHA; the final Codex wiring pulls signatures from the source
> repo. ABIs come from `@CitrateNetwork/contracts-abi` — do not hand-copy them.

> **Tier: commercial** (except [ComputeVerifier](#computeverifier), which is
> **academic**). These contracts are open on-chain, but their full lifecycle
> design is paid-seat / contracted implementation depth — see
> [Security & access](#security--access).

## Overview

The system is one settlement loop. A buyer posts a job (or buys bulk credits);
providers register stake and bid; the winning provider executes off-chain and
submits a result; **ComputeVerifier** decides validity by tier (commitment / ZK /
TEE); payment is split between provider, a BME burn, and the treasury. Pricing is
fed by **ComputePricingOracle**; institutional buyers pre-fund through
**BulkComputeGateway**. **ComputePool** / **ComputePoolTraining** are the
multi-provider variants for guaranteed-throughput inference and distributed
training.

All six contracts inherit the project's two-step `Governable` mixin
(`governance()`, `transferGovernance`/`acceptGovernance`, `onlyGovernance`).

```
                ComputePricingOracle ──prices──┐
BulkComputeGateway ──credits──┐                │
                              ▼                ▼
   buyer ──postJob──▶ ComputeMarketplace ──verify──▶ ComputeVerifier ──▶ 0x0108 (ZK precompile)
                              │
   ComputePool / ComputePoolTraining  (multi-provider inference & training)
```

## ComputeMarketplace

`src/ComputeMarketplace.sol` — `contract ComputeMarketplace is ReentrancyGuard, Governable`.

Implements the full single-provider job lifecycle:
`Posted → Bidding → Assigned → Executing → Verifying → Completed`, with escrow in
SALT or institutional bulk credits, BME burn + treasury fee on settlement,
provider staking/slashing, timeouts, and disputes.

**Constructor:** `constructor(address _verifier, address _treasury)`. Deploys a
fresh `Burner` at construction.

### Job lifecycle

| Function | Notes |
|---|---|
| `postJob(bytes32 modelHash, bytes inputHash, uint256 maxPrice, ComputeVerifier.VerificationTier tier, uint256 bidWindow, uint256 execWindow) payable returns (uint256)` | Legacy poster; escrow defaults to SALT. |
| `postJobWithMethod(bytes32 modelHash, bytes inputHash, uint256 maxPrice, ComputeVerifier.VerificationTier tier, PaymentMethod paymentMethod, uint256 bidWindow, uint256 execWindow) payable returns (uint256)` | Choose `SALT` or `BulkCredits` escrow. |
| `bidOnJob(uint256 jobId, uint256 price, uint256 estimatedLatency)` | Provider bids during the bid window. |
| `assignBestBid(uint256 jobId)` | Selects the best eligible bid by the price/reputation/load/verification score. |
| `autoAssignJob(bytes32 modelHash, bytes inputHash, ComputeVerifier.VerificationTier tier) payable returns (uint256)` | One-shot post + assign. Requires `>= MIN_AUTO_ASSIGN_PAYMENT` (0.01 SALT). |
| `startExecution(uint256 jobId)` / `submitCommitment(uint256 jobId, bytes32 commitment)` | Provider begins work / posts a Tier-1 commitment. |
| `submitResult(uint256 jobId, bytes outputHash, bytes proof)` | Submits output + verification proof. |
| `completeJob(uint256 jobId)` | Settles: provider payment, BME burn, treasury fee. |

### Failure & disputes

| Function | Notes |
|---|---|
| `expireJob(uint256 jobId)` | Refund escrow if no assignment by the bid deadline. |
| `timeoutJob(uint256 jobId)` | Slash assigned provider `TIMEOUT_SLASH_BPS` (5%) on missed exec deadline. |
| `failJob(uint256 jobId)` | Provider self-reports failure. |
| `disputeResult(uint256 jobId) payable` | File a dispute with a `DISPUTE_BOND` (10 SALT). |
| `resolveDispute(uint256 jobId, bool requesterWins)` | `onlyGovernance`. |

### Views & governance

`getJob`, `getJobBids`, `getProvider`, `getProviderCount`,
`providerSupportsModel`. Provider onboarding: `registerProvider(bytes32[] supportedModels) payable`
(stake `>= MIN_PROVIDER_STAKE`, 1000 SALT), `addStake() payable`. Governance
setters: `setTreasury`, `setSlashingContract`, `setBurner`, `setBulkGateway`,
`setPricingOracle`. `receive()` is payable.

### Key events

`JobPosted`, `JobPaymentMethodSet`, `BidPlaced`, `JobAssigned`,
`ExecutionStarted`, `ResultSubmitted`,
`JobCompleted(uint256 indexed jobId, address indexed provider, uint256 providerPayment, uint256 burned, uint256 treasuryFee)`,
`JobExpired`, `JobTimedOut`, `JobFailed`, `DisputeFiled`, `DisputeResolved`,
`ProviderRegistered`, `ProviderStakeUpdated`, `EscrowRefunded`,
`BulkGatewayUpdated`, `PricingOracleUpdated`, `BurnerUpdated`.

### Types

`enum JobState { Posted, Bidding, Assigned, Executing, Verifying, Completed, Expired, Timeout, Failed, Disputed }`,
`enum PaymentMethod { SALT, BulkCredits }`, and structs `Job`, `Bid`,
`ProviderProfile`. Key constants: `BME_BURN_DIVISOR = 40` (2.5%),
`TREASURY_DIVISOR = 40` (2.5%), `MIN_PROVIDER_STAKE = 1000 ether`,
`DISPUTE_BOND = 10 ether`, `TIMEOUT_SLASH_BPS = 500`, `BPS = 10000`.

> **Pre-audit note.** `timeoutJob` currently **refunds** escrow to the requester
> rather than holding it for reassignment — there is no reassignment path in this
> state yet (deviates from the stated TimeoutEscrowHeld invariant). The
> execution-deadline derivation in `assignBestBid` is a heuristic default. The
> `RM-B1 / SOL-08/15/19` tags in source are *remediated* findings, not open ones.

## ComputePool

`src/ComputePool.sol` — `contract ComputePool is ReentrancyGuard, Governable`.

Multi-provider GPU pools (`InferencePool` / `DataParallel` / `PipelineParallel`)
with per-GPU staking, GPU-proportional payment distribution, SLA-violation
slashing, and a VRF-style coordinator election/reassignment scheme.

**Constructor:** `constructor()` (deployer becomes governance).

### Pool & job functions

| Function | Notes |
|---|---|
| `createPool(string name, PoolMode mode, uint256 minProviders, uint256 guaranteedThroughput, uint256 pricePerUnit) returns (uint256 poolId)` | |
| `joinPool(uint256 poolId, uint256 gpuCount) payable` | Stake `MIN_STAKE_PER_GPU` (10 SALT) per GPU. |
| `leavePool(uint256 poolId)` / `dissolvePool(uint256 poolId)` | Leave requires no active jobs. |
| `pausePool(uint256 poolId)` / `resumePool(uint256 poolId)` | Creator only. |
| `requestPoolCompute(uint256 poolId, bytes jobSpec, uint256 maxPrice) payable returns (uint256 jobId)` | Legacy bytes spec. |
| `requestPoolComputeStruct(uint256 poolId, PoolJobSpec spec, uint256 maxPrice) payable returns (uint256 jobId)` | Typed spec (`version == 1`). |
| `completeJob(uint256 jobId)` / `failJob(uint256 jobId)` | |
| `reclaimExpiredJob(uint256 jobId)` | Requester refund after `JOB_DEADLINE` (600 blocks). |
| `reportSLAViolation(uint256 poolId, uint256 actualThroughput)` | `onlyGovernance`; slashes `SLA_PENALTY_BPS` (10%). |

### Coordinator (CM-05)

`coordinatorFor(uint256 poolId, uint256 epoch) view returns (address)`,
`recordDispatch(uint256 jobId)`, `reassignCoordinator(uint256 jobId)`.

### Views & types

`getPool`, `getPoolMembers`, `getPoolGPUCount`, `getMember`, `getJob`,
`isPoolSolvent`, `decodePoolJobSpec`. Governance: `setSlashingContract`.
`enum PoolMode { InferencePool, DataParallel, PipelineParallel }`,
`enum PoolState { Active, Paused, Dissolved }`,
`enum JobStatus { Pending, Executing, Completed, Failed }`; structs `Pool`,
`PoolMember`, `PoolJob`, `PoolJobSpec`.

### Key events

`PoolCreated`, `ProviderJoined`, `ProviderLeft`, `PoolPaused`, `PoolResumed`,
`PoolDissolved`, `ComputeRequested`, `JobCompleted`, `JobFailed`, `JobReclaimed`,
`SLAViolationReported`, `SlashingContractUpdated`, `CoordinatorReassigned`,
`CoordinatorSlashedForLiveness`, `DispatchRecorded`.

> **Pre-audit note.** `coordinatorFor` derives randomness from
> `blockhash(epochStart)`, which is only reliable for the most recent ~256 blocks;
> production depends on an **off-chain coordinator binary** to record seeds. The
> `CoordinatorElected` event is declared for ABI completeness but is fired
> off-chain, not by the contract; `reassignCoordinator` deliberately leaves the
> "next" coordinator unresolved on-chain. `LEAVE_COOLDOWN` is defined but not
> enforced; liveness-slash funds stay in the contract for now.

## ComputePoolTraining

`src/ComputePoolTraining.sol` — `contract ComputePoolTraining is ReentrancyGuard, Governable`.

DataParallel distributed-training lifecycle: recruit workers → per-epoch Merkle
root commitments → fraud-proof step challenges → finalize. Only per-epoch roots
are stored on-chain; individual step commitments live off-chain.

**Constructor:** `constructor(address _governance)`.

### Functions

| Function | Notes |
|---|---|
| `requestTrainingJob(TrainingJobSpec spec) payable returns (uint256 jobId)` | |
| `joinTrainingJob(uint256 jobId) payable` | Worker posts `perWorkerStake`. |
| `closeRecruitment(uint256 jobId, address coordinator_)` | |
| `commitEpoch(uint256 jobId, uint32 epoch, bytes32 root)` | Coordinator commits an epoch's Merkle root. |
| `challengeStep(uint256 jobId, uint32 epoch, uint32 step, address target, bytes32 leaf, bytes32[] merkleProof) payable` | Fraud proof; `CHALLENGE_BOND` = 1 SALT. |
| `voteChallenge(uint256 jobId, uint32 epoch, uint32 step, address target, bool uphold)` | Committee vote (`COMMITTEE_QUORUM` = 2). |
| `reassignCoordinator(uint256 jobId, address newCoordinator)` | |
| `finalizeTrainingJob(uint256 jobId)` / `abortRecruiting(uint256 jobId)` | |
| `claimDeferredPayout(uint256 jobId)` | Pull-payment for deferred payouts. |
| `setCommittee(address member, bool active)` | `onlyGovernance`. |

### Views & types

`getJob`, `getWorker`, `getWorkerList`, `getEpochRoot`, `getChallenge`,
`heldStake`. `enum JobState { Recruiting, Training, Awaiting, Finalized, Aborted }`,
`enum ChallengeState { None, Voting, ResolvedUphold, ResolvedReject }`; structs
`TrainingJobSpec`, `TrainingJob`, `WorkerInfo`, `Challenge`.

### Key events

`TrainingJobOpened`, `WorkerJoined`, `RecruitmentClosed`, `CoordinatorReassigned`,
`EpochCommitted`, `EpochPaymentReleased`, `ChallengeOpened`, `ChallengeVoted`,
`ChallengeResolved`, `WorkerStakeReturned`, `TrainingJobCompleted`,
`TrainingJobAborted`, `PayoutDeferred`, `DeferredPayoutClaimed`,
`CommitteeUpdated`.

> **Pre-audit note.** Merkle hashing is domain-separated (leaf prefix `0x00`,
> internal prefix `0x01`) per audit SOL-20 — **off-chain proof generators must
> match this scheme** or proofs will be rejected. The flat worker-list design is
> cheap for small pools only. Per-epoch VRF coordinator rotation is deferred to a
> future sprint.

## ComputePricingOracle

`src/ComputePricingOracle.sol` — `contract ComputePricingOracle is IComputePricingOracle, Governable`.

BFT-quorum oracle that maps compute cost (USD cents per PFLOP-hour) and SALT price
(USD cents) via a 67%-quorum committee vote, rate-limited to a 10% change per
update, with staleness tracking.

**Constructor:** `constructor(uint256 _computePriceUsdCents, uint256 _saltPriceUsdCents)`
(both must be `> 0`).

### Functions

| Function | Notes |
|---|---|
| `addOracleMember(address member)` / `removeOracleMember(address member)` | `onlyGovernance`. |
| `proposeComputePrice(uint256 newPrice)` / `proposeSaltPrice(uint256 newPrice)` | `onlyOracle`; price updates on quorum. |
| `saltPerPflopHour() view returns (uint256)` | |
| `computeToSalt(uint256 pflopHours) view returns (uint256 saltCost)` | |
| `estimateJobCost(bytes32 modelHash, uint256 inputTokens, uint256 outputTokens, uint8 verificationTier) view returns (uint256 saltCost)` | `modelHash` reserved for future per-model overrides (currently unused). |
| `isPriceStale() view returns (bool)` | True after `MAX_STALENESS` (7200 blocks). |

Plus history/state views: `priceHistoryLength`, `getPriceSnapshot`,
`getPendingVotes`, and the public getters `computePriceUsdCents`,
`saltPriceUsdCents`, `lastUpdateBlock`, `isOracleMember`, `oracleCount`,
`computePriceNonce`, `saltPriceNonce`, `priceHistory`.

### Events & constants

`ComputePriceProposed`, `ComputePriceUpdated`, `SaltPriceProposed`,
`SaltPriceUpdated`, `OracleMemberAdded`, `OracleMemberRemoved`. Struct
`PriceSnapshot`. Constants: `QUORUM = 67`, `MAX_STALENESS = 7200`,
`MAX_PRICE_CHANGE_BPS = 1000`, `TOKENS_TO_PFLOP_FACTOR = 1e12`, verification
multipliers (Commitment 1.0×, ZK 1.5×, TEE 2.0×).

> **Pre-audit note.** Membership changes bump `computePriceNonce` (invalidating
> in-flight compute proposals) but **not** `saltPriceNonce`, and the
> `votesNeeded` floor-to-1 guard is present on the compute path but not the SALT
> path — flag both asymmetries for audit.

## BulkComputeGateway

`src/BulkComputeGateway.sol` — `contract BulkComputeGateway is ReentrancyGuard, Governable`.

Lets institutions buy compute credits (PFLOP-hours) with stablecoins routed to a
`StablecoinTreasury`, priced via the oracle; authorized spenders (e.g.
`ComputeMarketplace`) debit those credits.

**Constructor:** `constructor(address _treasury, address _oracle, address _governance)`
(treasury and oracle must be non-zero).

### Functions

| Function | Notes |
|---|---|
| `purchaseComputeCredits(address stablecoin, uint256 amount) returns (uint256 creditsReceived)` | `MIN_PURCHASE_USD` = $10.00 (6-dec). |
| `spendCredits(address institution, uint256 creditAmount) returns (bool success)` | `onlyAuthorizedSpender`. |
| `getCreditBalance(address institution) view returns (uint256 credits)` | |
| `estimateCallsRemaining(address institution, uint256 avgTokensPerCall) view returns (uint256)` | |
| `currentCreditPriceUsd() view returns (uint256 priceUsd6)` | |
| `getPurchaseHistory(address institution) view returns (Purchase[])` | Plus `purchaseCount`, `institutionPurchaseCount`. |
| `authorizeSpender` / `revokeSpender` / `setOracle` / `setTreasury` | `onlyGovernance`. |

### Events & types

`CreditsPurchased`, `CreditsSpent`, `SpenderAuthorized`, `SpenderRevoked`,
`OracleUpdated`, `TreasuryUpdated`; struct `Purchase`. Audit SOL-14 hardens token
transfers with a `token.code.length > 0` check.

> **Pre-audit note.** Stablecoins are assumed to be **6-decimal USD** tokens; the
> pricing math hardcodes that conversion and does not enforce per-token decimals.

## ComputeVerifier

`src/ComputeVerifier.sol` — `contract ComputeVerifier is ReentrancyGuard, Governable`.

> **Tier: academic.** Tiered output-verification dispatcher for compute jobs:
> Tier 1 Commitment, Tier 2 ZKProof (via the live `0x0108` Halo2-KZG inference
> precompile), Tier 3 TEE attestation — plus a bisection-bounded dispute flow.
> All entry points are **marketplace-only** (`onlyMarketplace`).

**Constructor:** `constructor(address _marketplace)` (marketplace must be non-zero;
deployer is governance).

### Functions

| Function | Notes |
|---|---|
| `configureJob(uint256 jobId, uint256 value, VerificationTier requestedTier)` | Marketplace registers a job's tier. |
| `overrideTierToTEE(uint256 jobId)` | |
| `submitCommitment(uint256 jobId, address provider, bytes32 commitment)` | Tier-1 commit. |
| `verify(uint256 jobId, VerificationTier tier, bytes proofData) returns (VerificationResult)` | Dispatched verification (length-prefixed `proofData`). |
| `verifyCommitment(uint256 jobId, bytes32 commitment, bytes output, bytes32 nonce) returns (bool)` | |
| `verifyZKProof(uint256 jobId, bytes proof, bytes publicInputs) returns (bool)` | Calls `0x0108` via STATICCALL. |
| `verifyTEEAttestation(uint256 jobId, bytes attestation, bytes signature) returns (bool)` | 65-byte EIP-191 ecrecover against registered TEE oracles. |
| `initiateDispute(uint256 jobId)` / `performBisectionStep(uint256 jobId)` | `MAX_BISECTION_ROUNDS` = 10. |
| `resolveDispute(uint256 jobId, VerificationResult outcome)` | Governance or marketplace. |
| `addTEEOracle` / `removeTEEOracle` / `setMarketplace` | `onlyGovernance`. |

### Views & types

`getResult`, `getRecord`, `isConfigured`, `isDisputeActive`,
`getEffectiveTier(uint256 value, VerificationTier requestedTier) pure`.
`enum VerificationTier { Commitment, ZKProof, TEE }`,
`enum VerificationResult { Pending, Valid, Invalid }`; struct `VerificationRecord`.
Key constants: `VALUE_THRESHOLD = 10 ether` (jobs above must use ZK/TEE),
`INFERENCE_PROOF_VERIFY = address(0x0108)` (the live Halo2-KZG verifier precompile).

### Events

`JobConfigured`, `CommitmentSubmitted`, `ProofSubmitted`, `VerificationCompleted`,
`DisputeInitiated`, `BisectionStep`, `DisputeResolved`, `TierOverridden`,
`TEEOracleAdded`, `TEEOracleRemoved`, `MarketplaceUpdated`.

> **Pre-audit note.** A prior defect (D2) where the legacy `0x0104` commitment
> precompile never performed real ZK verification has been **remediated**: the ZK
> tier now targets `0x0108`. A failed/wrong-length/non-1 precompile verdict is
> treated as Invalid (fail-closed). Two parallel ZK/TEE entry paths exist
> (`verify()` vs. the standalone `verifyZKProof`/`verifyTEEAttestation`); callers
> must use the matching ABI encoding.

## Deployed addresses (chain 40204)

> Public on-chain data — re-verify with `eth_getCode`. **Testnet-beta; pre-audit.**
> Source: `citrate-chain/contracts/DEPLOYED_ADDRESSES.md`.

| Contract | Address |
|---|---|
| ComputeMarketplace | `0xc12dbcdb80ef2ae675315f455210f39a736a373c` |
| ComputePool | `0xf1eae5dd4a1639922ea610142f7ce51330065b57` |
| ComputePoolTraining | `0x25051e90a110fbe4569f124274ce387eb033bc9c` |
| ComputePricingOracle | `0x4ee0bef59a87a9ea3f91b80fd68ebfe69e72075a` |
| ComputeVerifier | `0xf7c3180dda79fb046173d96d172bf43b70174031` |
| BulkComputeGateway | `0x3bc867e60d13a825a57a5fbc3a53c4f710ac8f76` |

## Examples

```bash
# Read a posted job (ABI from @CitrateNetwork/contracts-abi)
cast call 0xc12dbcdb80ef2ae675315f455210f39a736a373c \
  "getJob(uint256)" 1 --rpc-url https://rpc.citrate.ai

# Current SALT cost of 1 PFLOP-hour
cast call 0x4ee0bef59a87a9ea3f91b80fd68ebfe69e72075a \
  "saltPerPflopHour()(uint256)" --rpc-url https://rpc.citrate.ai

# An institution's remaining bulk credits
cast call 0x3bc867e60d13a825a57a5fbc3a53c4f710ac8f76 \
  "getCreditBalance(address)(uint256)" <institution> --rpc-url https://rpc.citrate.ai
```

## Tutorials

See the [Compute](/compute) section and
[Operators → Sell compute](/operators/sell-compute) for end-to-end provider and
buyer walkthroughs.

## Security & access

- **Tier: commercial** for the marketplace, pools, oracle, and gateway —
  open on-chain, but the full lifecycle/scoring/settlement design is paid-seat
  implementation depth. **ComputeVerifier is academic** (formal-methods / proof
  surface).
- **No secrets here.** No private keys, mnemonics, internal hostnames, or
  credentials. The only hardcoded address is the public protocol precompile
  `0x0108`.
- **Honest status:** **pre-audit, testnet-beta.** Open/deferred items are flagged
  inline above (timeout-reassignment gap; off-chain coordinator-seed dependency;
  oracle SALT-path asymmetries; assumed 6-decimal stablecoins). `RM-B1` / `SOL-xx`
  tags in source denote *remediated* findings unless noted otherwise.

## Source & verification

- Source: `citrate-chain/contracts/src/` — `ComputeMarketplace.sol`,
  `ComputePool.sol`, `ComputePoolTraining.sol`, `ComputePricingOracle.sol`,
  `BulkComputeGateway.sol`, `ComputeVerifier.sol`.
- Audited against `citrate-chain` SHA **`03d7851`**.
- Status: **pre-audit, testnet-beta.** Re-verify deployed bytecode via
  `eth_getCode` if the chain has been re-rolled.
