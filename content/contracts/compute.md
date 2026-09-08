---
title: Compute contracts
codex_slug: /contracts/compute
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src (ComputeMarketplace.sol, ComputePool.sol, ComputePoolTraining.sol, ComputeVerifier.sol, BulkComputeGateway.sol, ComputePricingOracle.sol, interfaces/IComputePricingOracle.sol)
surfaces: [SC-compute-marketplace, SC-compute-pool, SC-compute-training, SC-compute-verifier, SC-compute-bulk, SC-compute-oracle]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

These are the contracts that let a machine operator sell compute on Citrate Market and let a buyer pay
for verified work. Six contracts form one settlement loop: a buyer posts a job, an operator runs it,
the result is verified by tier, and payment settles on the public ledger. This page is for operators,
buyers, and anyone integrating against the marketplace.

## What it is

Citrate Market is the part of the public ledger where compute is bought and sold. An operator runs a
Citrate Node off-chain to do the actual work, on hardware they control; the contracts here record the
agreement, hold the escrow, decide whether the returned work was valid, and split the payment. The
heavy data, the model weights and the inputs, never live on-chain. What the ledger keeps is a hash, a
proof, and a receipt.

The loop has six parts:

- **ComputeMarketplace** runs the single-provider job lifecycle: post, bid, assign, execute, verify,
  settle.
- **ComputePool** and **ComputePoolTraining** are the multi-provider variants, one for pooled inference
  with a throughput guarantee, one for distributed training across many workers.
- **ComputeVerifier** decides whether a returned result is valid, by one of three tiers.
- **ComputePricingOracle** maps compute cost and SALT price so a job can be quoted.
- **BulkComputeGateway** lets an institution pre-fund credits with a stablecoin and spend them later.

All six share one governance pattern. Each inherits a `Governable` mixin with a two-step transfer
(`transferGovernance` then `acceptGovernance`), an `onlyGovernance` modifier, and a `governance()`
reader. Five of the six also inherit `ReentrancyGuard`; the pricing oracle does not move value, so it
does not need it.

Operators sell into this surface through [Operators, sell compute](/operators/sell-compute) and run the
daemon described in [run a node](/operators/run-a-node). The on-chain verification leans on the compute
[precompiles](/chain/precompiles), in particular the Halo2-KZG inference verifier at `0x0108`.

## How to use it

The single-provider path, from a buyer's side, runs like this.

1. Quote the work. Ask **ComputePricingOracle** what one PFLOP-hour costs in SALT with
   `saltPerPflopHour()`, or estimate a specific job with `estimateJobCost(modelHash, inputTokens,
   outputTokens, verificationTier)`.
2. Post the job. Call `postJobWithMethod(...)` on **ComputeMarketplace** with the model hash, the input
   hash, a maximum price, a verification tier, a payment method, a bid window, and an execution window.
   The escrow is taken from `msg.value` in SALT, or debited from bulk credits if you chose that method.
3. Wait for bids and assign. Operators call `bidOnJob`. Anyone can then call `assignBestBid`, which
   scores the bids on price, reputation, current load, and verification fit, and assigns the winner.
4. The operator executes. They call `startExecution`, optionally post a Tier-1 commitment with
   `submitCommitment`, then return the result with `submitResult`. Submitting the result triggers
   verification inline.
5. Settle. Once the verifier returns Valid and no dispute is open, call `completeJob`. Payment splits
   into the provider's share, a burn, and a treasury fee.

To sell instead of buy, register first: `registerProvider(supportedModels)` with a stake of at least
`MIN_PROVIDER_STAKE`, then bid on jobs that match your models. To pool with other operators, see
**ComputePool** below; to join a training run, see **ComputePoolTraining**.

## Reference

The audited public surface of each contract, with the function names as they appear in source. The
canonical truth is the Solidity in `contracts/src`; treat ABIs as coming from the published package, not
hand-copied from here.

### ComputeMarketplace

`contracts/src/ComputeMarketplace.sol`, `contract ComputeMarketplace is ReentrancyGuard, Governable`.
The single-provider job lifecycle, with escrow in SALT or bulk credits, a burn and a treasury fee on
settlement, provider staking and slashing, timeouts, and disputes. The constructor takes a verifier and
a treasury address and deploys a fresh `Burner` at construction.

| Function | Notes |
|---|---|
| `postJob(bytes32 modelHash, bytes inputHash, uint256 maxPrice, ComputeVerifier.VerificationTier tier, uint256 bidWindow, uint256 execWindow) payable returns (uint256)` | Legacy poster; escrow defaults to SALT. |
| `postJobWithMethod(bytes32 modelHash, bytes inputHash, uint256 maxPrice, ComputeVerifier.VerificationTier tier, PaymentMethod paymentMethod, uint256 bidWindow, uint256 execWindow) payable returns (uint256)` | Choose `SALT` or `BulkCredits` escrow. |
| `autoAssignJob(bytes32 modelHash, bytes inputHash, ComputeVerifier.VerificationTier tier) payable returns (uint256)` | One-shot post and assign; requires at least `MIN_AUTO_ASSIGN_PAYMENT` (0.01 SALT). |
| `bidOnJob(uint256 jobId, uint256 price, uint256 estimatedLatency)` | Operator bids during the bid window. |
| `assignBestBid(uint256 jobId)` | Permissionless; scores bids by price, reputation, load, and verification fit. |
| `startExecution(uint256 jobId)` / `submitCommitment(uint256 jobId, bytes32 commitment)` | Assigned provider begins work, or posts a Tier-1 commitment. |
| `submitResult(uint256 jobId, bytes outputHash, bytes proof)` | Returns output and proof; runs verification inline. |
| `completeJob(uint256 jobId)` | Settles: provider payment, burn, treasury fee. |
| `expireJob(uint256 jobId)` | Refunds escrow if no assignment by the bid deadline. |
| `timeoutJob(uint256 jobId)` | Slashes the assigned provider `TIMEOUT_SLASH_BPS` (5%) on a missed execution deadline. |
| `failJob(uint256 jobId)` | Provider self-reports failure. |
| `disputeResult(uint256 jobId) payable` | Files a dispute with a `DISPUTE_BOND` of 10 SALT. |
| `resolveDispute(uint256 jobId, bool requesterWins)` | `onlyGovernance`. |
| `registerProvider(bytes32[] supportedModels) payable` / `addStake() payable` | Onboarding; stake at least `MIN_PROVIDER_STAKE` (1000 SALT). |

Views include `getJob`, `getJobBids`, `getProvider`, `getProviderCount`, and `providerSupportsModel`.
Governance setters are `setTreasury`, `setSlashingContract`, `setBurner`, `setBulkGateway`, and
`setPricingOracle`.

The settlement receipt is one event:

```solidity
event JobCompleted(
    uint256 indexed jobId,
    address indexed provider,
    uint256 providerPayment,
    uint256 burned,
    uint256 treasuryFee
);
```

The split is 95% to the provider, 2.5% burned, and 2.5% to the treasury. The burn and the fee each
equal the price divided by `BME_BURN_DIVISOR` and `TREASURY_DIVISOR`, both 40. The lifecycle is captured
in `enum JobState { Posted, Bidding, Assigned, Executing, Verifying, Completed, Expired, Timeout, Failed,
Disputed }`, and the payment choice in `enum PaymentMethod { SALT, BulkCredits }`.

### ComputePool

`contracts/src/ComputePool.sol`, `contract ComputePool is ReentrancyGuard, Governable`. Multi-provider
GPU pools with per-GPU staking, payment shared in proportion to GPU contribution, slashing on a missed
throughput guarantee, and a coordinator election. The constructor takes no arguments; the deployer
becomes governance.

| Function | Notes |
|---|---|
| `createPool(string name, PoolMode mode, uint256 minProviders, uint256 guaranteedThroughput, uint256 pricePerUnit) returns (uint256 poolId)` | The creator does not auto-join. |
| `joinPool(uint256 poolId, uint256 gpuCount) payable` | Stake `MIN_STAKE_PER_GPU` (10 SALT) per GPU. |
| `leavePool(uint256 poolId)` / `dissolvePool(uint256 poolId)` | Leaving requires no active jobs; dissolve is creator-only. |
| `pausePool(uint256 poolId)` / `resumePool(uint256 poolId)` | Creator only. |
| `requestPoolCompute(uint256 poolId, bytes jobSpec, uint256 maxPrice) payable returns (uint256 jobId)` | Legacy bytes spec. |
| `requestPoolComputeStruct(uint256 poolId, PoolJobSpec spec, uint256 maxPrice) payable returns (uint256 jobId)` | Typed spec; requires `spec.version == 1`. |
| `completeJob(uint256 jobId)` / `failJob(uint256 jobId)` | Callable by governance, the pool creator, or the dispatcher. |
| `reclaimExpiredJob(uint256 jobId)` | Requester refund after `JOB_DEADLINE` (600 blocks). |
| `reportSLAViolation(uint256 poolId, uint256 actualThroughput)` | `onlyGovernance`; slashes `SLA_PENALTY_BPS` (10%). |
| `recordDispatch(uint256 jobId)` / `reassignCoordinator(uint256 jobId)` | The elected coordinator records dispatch; a member can reassign after `COORDINATION_TIMEOUT` (20 blocks). |

Views include `getPool`, `getPoolMembers`, `getPoolGPUCount`, `getMember`, `getJob`, `isPoolSolvent`,
`coordinatorFor(poolId, epoch)`, and `decodePoolJobSpec`. The pool kinds are `enum PoolMode {
InferencePool, DataParallel, PipelineParallel }`.

### ComputePoolTraining

`contracts/src/ComputePoolTraining.sol`, `contract ComputePoolTraining is ReentrancyGuard, Governable`.
A distributed-training lifecycle: recruit workers, commit one Merkle root per epoch, challenge a step
with a fraud proof, finalize. Only the per-epoch roots are stored on-chain; the individual step
commitments live off-chain in the training mesh. The constructor takes a governance address.

| Function | Notes |
|---|---|
| `requestTrainingJob(TrainingJobSpec spec) payable returns (uint256 jobId)` | `msg.value` must equal the per-epoch budget times the epoch count. |
| `joinTrainingJob(uint256 jobId) payable` | A worker posts the per-worker stake. |
| `closeRecruitment(uint256 jobId, address coordinator_)` | Permissionless once the minimum workers have joined. |
| `commitEpoch(uint256 jobId, uint32 epoch, bytes32 root)` | Coordinator commits an epoch's Merkle root; pays that epoch's budget across the workers still in good standing. |
| `challengeStep(uint256 jobId, uint32 epoch, uint32 step, address target, bytes32 leaf, bytes32[] merkleProof) payable` | Fraud proof; `CHALLENGE_BOND` is 1 SALT. |
| `voteChallenge(uint256 jobId, uint32 epoch, uint32 step, address target, bool uphold)` | Committee vote; `COMMITTEE_QUORUM` is 2. |
| `reassignCoordinator(uint256 jobId, address newCoordinator)` | After `COORDINATION_TIMEOUT` (100 blocks). |
| `finalizeTrainingJob(uint256 jobId)` / `abortRecruiting(uint256 jobId)` | Finalize after the challenge window; abort returns stakes. |
| `claimDeferredPayout(uint256 jobId)` | Pull-payment fallback when a push payout fails. |
| `setCommittee(address member, bool active)` | `onlyGovernance`. |

Views include `getJob`, `getWorker`, `getWorkerList`, `getEpochRoot`, `getChallenge`, and `heldStake`.
The job states are `enum JobState { Recruiting, Training, Awaiting, Finalized, Aborted }` and a challenge
runs through `enum ChallengeState { None, Voting, ResolvedUphold, ResolvedReject }`.

### ComputeVerifier

`contracts/src/ComputeVerifier.sol`, `contract ComputeVerifier is ReentrancyGuard, Governable`. The
output-verification dispatcher. Every entry point is `onlyMarketplace`: the marketplace configures a
job's tier, then asks the verifier to rule. There are three tiers, plus a bisection-bounded dispute
path. The constructor takes the marketplace address.

| Function | Notes |
|---|---|
| `configureJob(uint256 jobId, uint256 value, VerificationTier requestedTier)` | Marketplace registers a job's tier. |
| `overrideTierToTEE(uint256 jobId)` | Forces the TEE tier. |
| `submitCommitment(uint256 jobId, address provider, bytes32 commitment)` | Tier-1 commit. |
| `verify(uint256 jobId, VerificationTier tier, bytes proofData) returns (VerificationResult)` | Dispatches to the tier handler. |
| `verifyCommitment(uint256 jobId, bytes32 commitment, bytes output, bytes32 nonce) returns (bool)` | Tier 1. |
| `verifyZKProof(uint256 jobId, bytes proof, bytes publicInputs) returns (bool)` | Tier 2; calls the precompile at `0x0108` by `staticcall`. |
| `verifyTEEAttestation(uint256 jobId, bytes attestation, bytes signature) returns (bool)` | Tier 3; a 65-byte signature recovered against a registered TEE oracle. |
| `initiateDispute(uint256 jobId)` / `performBisectionStep(uint256 jobId)` | `MAX_BISECTION_ROUNDS` is 10. |
| `resolveDispute(uint256 jobId, VerificationResult outcome)` | Governance or marketplace. |
| `addTEEOracle(address)` / `removeTEEOracle(address)` / `setMarketplace(address)` | `onlyGovernance`. |

The tiers are `enum VerificationTier { Commitment, ZKProof, TEE }` and the verdict is
`enum VerificationResult { Pending, Valid, Invalid }`. A job above `VALUE_THRESHOLD` (10 SALT) cannot
settle on a bare commitment; the verifier upgrades it to the ZK tier. The constant
`INFERENCE_PROOF_VERIFY = address(0x0108)` points at the live Halo2-KZG verifier precompile, described in
[precompiles](/chain/precompiles).

### ComputePricingOracle

`contracts/src/ComputePricingOracle.sol`, `contract ComputePricingOracle is IComputePricingOracle,
Governable` (interface at `contracts/src/interfaces/IComputePricingOracle.sol`). A quorum oracle that
maps compute cost in USD cents per PFLOP-hour and SALT price in USD cents, by a 67% committee vote, rate
limited to a 10% change per update, with staleness tracking. The constructor takes the two opening
prices, both of which must be above zero.

| Function | Notes |
|---|---|
| `addOracleMember(address)` / `removeOracleMember(address)` | `onlyGovernance`. |
| `proposeComputePrice(uint256 newPrice)` / `proposeSaltPrice(uint256 newPrice)` | `onlyOracle`; the price updates once the vote reaches quorum. |
| `saltPerPflopHour() view returns (uint256)` | Current SALT cost of one PFLOP-hour. |
| `computeToSalt(uint256 pflopHours) view returns (uint256 saltCost)` | Converts PFLOP-hours to SALT. |
| `estimateJobCost(bytes32 modelHash, uint256 inputTokens, uint256 outputTokens, uint8 verificationTier) view returns (uint256 saltCost)` | `modelHash` is reserved for future per-model overrides and is unused today. |
| `isPriceStale() view returns (bool)` | True after `MAX_STALENESS` (7200 blocks). |

Key constants: `QUORUM = 67`, `MAX_STALENESS = 7200`, `MAX_PRICE_CHANGE_BPS = 1000`,
`TOKENS_TO_PFLOP_FACTOR = 1e12`, and verification multipliers of 1.0x for Commitment, 1.5x for ZK, and
2.0x for TEE.

### BulkComputeGateway

`contracts/src/BulkComputeGateway.sol`, `contract BulkComputeGateway is ReentrancyGuard, Governable`.
Lets an institution buy compute credits in PFLOP-hours with a stablecoin, routed to a treasury and
priced through the oracle; an authorized spender, typically the marketplace, debits those credits. The
constructor takes a treasury, an oracle, and a governance address.

| Function | Notes |
|---|---|
| `purchaseComputeCredits(address stablecoin, uint256 amount) returns (uint256 creditsReceived)` | `MIN_PURCHASE_USD` is $10.00 at 6 decimals. |
| `spendCredits(address institution, uint256 creditAmount) returns (bool success)` | `onlyAuthorizedSpender`. |
| `getCreditBalance(address institution) view returns (uint256 credits)` | Current credit balance. |
| `estimateCallsRemaining(address institution, uint256 avgTokensPerCall) view returns (uint256)` | Rough call budget. |
| `currentCreditPriceUsd() view returns (uint256 priceUsd6)` | Credit price in USD at 6 decimals. |
| `getPurchaseHistory(address institution) view returns (Purchase[])` | Plus `purchaseCount` and `institutionPurchaseCount`. |
| `authorizeSpender` / `revokeSpender` / `setOracle` / `setTreasury` | `onlyGovernance`. |

The receipt is `event CreditsPurchased(address indexed institution, address indexed stablecoin, uint256
usdAmount, uint256 creditsReceived, uint256 purchaseIndex)`.

## Design rationale

The split between on-chain record and off-chain work is the whole point. A model run is large and
private, so it happens on the operator's own hardware; the ledger keeps only the hash, the proof, and
the receipt. That is why ComputeVerifier offers three tiers rather than one. A small job can settle on a
cheap commitment, a job above the value threshold must carry a real zero-knowledge proof against the
`0x0108` precompile, and a job that needs hardware attestation can require a TEE signature. The buyer
chooses how much assurance to pay for, and the contract enforces a floor for high-value work.

The training pool stores only one Merkle root per epoch. Putting every step commitment on-chain would be
ruinous, so the design keeps the steps in the off-chain mesh and lets any worker challenge a step with a
fraud proof. The chain has to store little and still adjudicate honestly. Pricing sits behind a quorum
oracle rather than a single feed so that no one member can move the price more than 10% or push a stale
number through.

## Failure modes

These contracts hold escrow and stake, so the failure paths matter.

- **A provider misses the execution deadline.** Anyone calls `timeoutJob`, which slashes 5% of the
  provider's stake. In this build the escrow is refunded to the requester rather than held for
  reassignment; there is no reassignment path yet.
- **A returned result is wrong.** The verifier fails closed. A ZK proof that reverts, returns the wrong
  length, or returns anything other than the success word is treated as Invalid, so a bad proof never
  settles as valid. Above the value threshold a bare commitment is rejected and upgraded to the ZK tier.
- **A buyer disputes a result.** They post the 10 SALT dispute bond and the marketplace runs a bounded
  bisection, at most 10 rounds, with governance or the marketplace resolving the outcome.
- **A pool misses its throughput guarantee.** Governance calls `reportSLAViolation`, which slashes 10%
  of the pool's stake.
- **A training worker commits a bad step.** A challenger posts the 1 SALT bond and submits a Merkle
  fraud proof; a committee vote at a quorum of 2 upholds or rejects it, and an upheld challenge slashes
  the cheating worker.

The pool coordinator election depends on an off-chain coordinator binary to record seeds, because the
on-chain `coordinatorFor` derives randomness from a recent block hash and that is only reliable for the
most recent few hundred blocks. Off-chain proof generators for both ZK verification and training Merkle
proofs must match the on-chain wire format exactly, or valid-looking proofs will be rejected.

## Access and canon

Tier: commercial for the marketplace, pools, gateway, and oracle, and academic for ComputeVerifier,
which is the formal-methods and proof surface. These contracts are open on the public ledger and anyone
can read them; the full lifecycle, scoring, and settlement design is paid-seat depth.

No secrets appear on this page. There are no private keys, mnemonics, internal hostnames, or
credentials. The only hardcoded address is the public protocol precompile `0x0108`. Every operator on
the public network is identity-verified through VERI, Citrate's in-house verification before they can register and stake; Citrate keeps
the verification result, not the personal data behind it.

## Source and verification

- Source: `citrate-chain/contracts/src/`, in `ComputeMarketplace.sol`, `ComputePool.sol`,
  `ComputePoolTraining.sol`, `ComputeVerifier.sol`, `BulkComputeGateway.sol`, `ComputePricingOracle.sol`,
  and the interface `interfaces/IComputePricingOracle.sol`.
- Audited against `citrate-chain` SHA `9d5959e`.
- Status: Implemented, pre-audit, on testnet 40204. The timeout-reassignment gap, the off-chain
  coordinator-seed dependency, and the assumed 6-decimal stablecoins are open items noted above and not
  yet externally audited. Re-verify deployed bytecode with `eth_getCode` if the chain has been re-rolled.
