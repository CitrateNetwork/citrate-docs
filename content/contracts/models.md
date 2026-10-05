---
title: Model contracts
codex_slug: /contracts/models
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src (ModelRegistry.sol, ModelMarketplace.sol, LoRAFactory.sol, ModelAccessControl.sol, InferenceRouter.sol, interfaces/IModelRegistry.sol, interfaces/IModelMarketplace.sol)
surfaces: [SC-model-registry, SC-model-marketplace, SC-model-lora, SC-model-access, SC-model-router]
audited_against_sha: fa7c913
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team; precompile section Larry Klosowski + Claude Opus 5.5
branch: hup/n7-chain-precompile-followups
updated: 2026-10-04
---

These are the contracts that register a model on the public ledger, sell access to it, route inference
to the operators that serve it, and build adapters on top of it. A model is registered once and from
there it can be listed, gated, adapted, and called. This page is for model owners, inference consumers,
and integrators.

## What it is

A model on Citrate is a record, not a file. The weights stay where the owner put them, usually behind an
IPFS CID; the public ledger keeps the model's identity, its owner, its price, and a count of the work it
has done. Inference itself runs off chain on the operators that serve the model; the contracts here
charge for it, route it, and gate it. Where a contract asks a [precompile](/chain/precompiles) for an
answer, it does so through one library that refuses to treat "no answer" as an answer (see
[Precompile calls](#precompile-calls) below).

Five contracts cover the model economy:

- **ModelRegistry** is the root record. Registering a model yields a `modelHash`; `requestInference`
  asks the model inference precompile at `0x0101`, which contract code cannot reach on 40204 today.
- **InferenceRouter** load-balances inference across staked operators, with a cache and a refund path.
- **ModelMarketplace** lets owners list a model and sell access, with bulk discounts and a treasury fee.
- **LoRAFactory** builds, trains, merges, and cryptographically verifies low-rank adapters on top of a
  base model.
- **ModelAccessControl** is a separate, tiered access registry with paid or approval-based grants,
  staking, revenue sharing, and an encrypted-inference path.

A point worth holding onto: there are two access systems here, and they are not wired together.
ModelRegistry, the marketplace, the router, and the factory share one role-based registry. ModelAccessControl
is a standalone contract with its own level-based grants. Pick the one your integration targets and stay
in it.

You can register and call a model from the RPC surface with `citrate_deployModel` and read the catalog
with `citrate_getModels`; see [chain RPC](/chain/rpc). Federated training that produces models lives on
[Citrate Orchard](/research/learning), which is a separate surface from the adapter factory described
below.

## How to use it

The shortest path from nothing to a paid inference call.

1. Register the model. Call `registerModel(...)` on **ModelRegistry** with the name, framework, version,
   IPFS CID, size, an inference price, and the metadata struct. Send at least `REGISTRATION_FEE`
   (0.1 SALT). You get back the `modelHash`.
2. Decide who can call it. For a simple owner-priced model, `requestInference` on the registry already
   charges and forwards payment to you. To sell in a catalog with reviews and discounts, list it on
   **ModelMarketplace**. For tiered or approval-gated access with staking, register it instead on
   **ModelAccessControl**.
3. Serve it. Operators register on **InferenceRouter** with `registerProvider(endpoint, minPrice,
   supportedModels)`, staking at least the minimum, and the router scores and assigns requests across
   them.
4. Call it. A consumer calls `requestInference(modelHash, inputData, maxPrice)` on the router. A cache
   hit returns the stored output with a partial refund; otherwise the assigned operator returns the
   result with `completeInference` and is paid, with any excess refunded.
5. Adapt it, optionally. Build a LoRA adapter on the base model with `createLoRA(...)` on
   **LoRAFactory**, have an operator train it off chain and record the weights, and verify the adapter
   against the inference proof precompile before anyone relies on it.

## Reference

The audited public surface of each contract, with function names as they appear in source. The
canonical truth is the Solidity in `contracts/src`; treat ABIs as coming from the published package, not
hand-copied from here.

### ModelRegistry

`contracts/src/ModelRegistry.sol`, `contract ModelRegistry is IModelRegistry, AccessControl,
ReentrancyGuard` (the project-local `AccessControl` and `ReentrancyGuard`, not OpenZeppelin; interface at
`contracts/src/interfaces/IModelRegistry.sol`). Stores model metadata, manages owner permissions, and
charges a fixed registration fee. Registration and updates are records only: no precompile is called, and
the weights stay at the IPFS CID. `requestInference` calls `0x0101` MODEL_INFERENCE through the
`CitratePrecompiles` library. The constructor grants the deployer the admin and operator roles.

| Function | Notes |
|---|---|
| `registerModel(string name, string framework, string version, string ipfsCID, uint256 sizeBytes, uint256 inferencePrice, IModelRegistry.ModelMetadata metadata) payable returns (bytes32)` | Requires `REGISTRATION_FEE` (0.1 SALT); returns the `modelHash`. |
| `updateModel(bytes32 modelHash, string newVersion, string newIpfsCID)` | Owner only. |
| `setInferencePrice(bytes32 modelHash, uint256 newPrice)` | Owner only. |
| `deactivateModel(bytes32 modelHash)` / `activateModel(bytes32 modelHash)` | Owner or operator role. |
| `grantPermission(bytes32 modelHash, address user)` / `revokePermission(bytes32 modelHash, address user)` | Owner only. |
| `requestInference(bytes32 modelHash, bytes inputData) payable returns (bytes)` | Forwards the full `msg.value` to the model owner; no marketplace fee is retained. Calls `0x0101` with `modelHash || msg.sender || inputData`; reverts with `PrecompileUnavailable(0x0101)` on every 40204 node today, payment included. |
| `withdrawFees()` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |

Views include `getModel` (an 8-tuple of owner, name, framework, version, IPFS CID, inference price, total
inferences, and active flag), `getModelsByOwner`, `getModelRevenue`, `hasPermission`,
`getAllModelHashes`, and `getModelsInfo`. Constant: `REGISTRATION_FEE = 0.1 ether` (the old
`MODEL_PRECOMPILE = 0x1000` and `ARTIFACT_PRECOMPILE = 0x1002` constants are gone; nothing served those
addresses). Note that `setRegistrationFee` is intentionally inert: it is a `view` that
always reverts with "Registration fee is immutable", so the fee cannot be changed.

### InferenceRouter

`contracts/src/InferenceRouter.sol`, `contract InferenceRouter is AccessControl, ReentrancyGuard`
(project-local). Routes inference to registered operators by a load-balancing score, with response
caching, operator staking, and payment or refund distribution. The constructor takes the registry
address and grants the deployer admin and operator roles.

| Function | Notes |
|---|---|
| `registerProvider(string endpoint, uint256 minPrice, bytes32[] supportedModels) payable` | Stake at least `minProviderStake` (100 SALT default). |
| `requestInference(bytes32 modelHash, bytes inputData, uint256 maxPrice) payable returns (uint256)` | A cache hit returns the cached output with a partial refund. |
| `completeInference(uint256 requestId, bytes outputData)` | Assigned operator only; pays the operator, refunds the excess, caches the output. |
| `cancelRequest(uint256 requestId)` | Requester only, while pending; full refund. |
| `updateProviderStatus(bool isActive)` / `addStake() payable` / `withdrawStake(uint256 amount)` | Operator stake management. |
| `withdrawEarnings()` | Operator pulls accrued earnings. |
| `setCaching(bytes32 modelHash, bool enabled)` | `onlyRole(OPERATOR_ROLE)`. |
| `setPlatformFee(uint256 newFee)` / `setMinProviderStake(uint256 newStake)` / `withdrawPlatformFees()` | `onlyRole(DEFAULT_ADMIN_ROLE)`; the fee is capped at 1000 bps. |

Views include `getRequest`, `getUserRequests`, `getProviders`, and `getProviderInfo`. Config:
`minProviderStake = 100 ether`, `platformFee = 250` (2.5%), and `cacheReward = 100` (1%). Requests move
through `enum RequestStatus { Pending, Processing, Completed, Failed, Cancelled }`.

### ModelMarketplace

`contracts/src/ModelMarketplace.sol`, `contract ModelMarketplace is IModelMarketplace, AccessControl,
ReentrancyGuard` (project-local; interface at `contracts/src/interfaces/IModelMarketplace.sol`). A
marketplace layered on the registry: owners list models, buyers purchase inference access with bulk
discounts, and a fee splits to a treasury. Adds reviews, categories, and featuring. The constructor takes
the registry and treasury addresses, both non-zero; the registry is immutable.

| Function | Notes |
|---|---|
| `listModel(bytes32 modelId, uint256 basePrice, uint256 discountPrice, uint256 minimumBulkSize, uint8 category, string metadataURI)` | Price in `[MIN_PRICE, MAX_PRICE]`; category at most 10. |
| `purchaseAccess(bytes32 modelId, uint256 quantity) payable` | Bulk discount above `minimumBulkSize`; fee `MARKETPLACE_FEE_BASIS_POINTS` (2.5%); refunds the excess. |
| `updatePricing(...)` / `updateCategory(...)` | Owner only. |
| `deactivateListing(bytes32 modelId)` / `activateListing(bytes32 modelId)` | Owner only. |
| `featureModel(bytes32 modelId) payable` | Admin free; owner pays `FEATURED_FEE` (1 SALT). |
| `unfeatureModel(bytes32 modelId)` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |
| `addReview(bytes32 modelId, uint8 rating, string comment)` | Rating 1 to 5; comment at most 500 bytes. |
| `updateTreasuryAddress(address newTreasury)` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |

Views include `getListing`, `getModelsByCategory`, `getFeaturedModels`, `getTopRatedModels`,
`getModelsByOwner`, `getPurchaseHistory`, `getModelReviews`, and `getMarketplaceStats`. Constants:
`MARKETPLACE_FEE_BASIS_POINTS = 250`, `MIN_PRICE = 0.001 ether`, `MAX_PRICE = 1000 ether`, and
`FEATURED_FEE = 1 ether`. A review does not require a verified purchase; the review carries a `verified`
flag set from the reviewer's purchase history, but an unverified review still counts toward the average
rating.

### LoRAFactory

`contracts/src/LoRAFactory.sol`, `contract LoRAFactory is AccessControl` (project-local; it does not
inherit `ReentrancyGuard`). A factory for creating, training, merging, and cryptographically verifying
low-rank adapters against base models in the registry. Training and merges run off chain (the compute
pool or an operator) and are recorded here: `createLoRA` emits `TrainingStarted`, `mergeLoRAs` emits
`MergeRequested`, and the operator records the results with `completeTraining` and `completeMerge`.
Verification goes through the Halo2-KZG inference-proof verifier at `0x0108`; adapter inference goes to
`0x0101` with the adapter's id. The constructor takes the registry address and grants the deployer admin
and operator roles.

| Function | Notes |
|---|---|
| `createLoRA(bytes32 baseModelHash, string name, string description, uint256 rank, uint256 alpha, uint256 dropout, TrainingConfig config) payable returns (bytes32)` | Requires permission on the base model; fee is `trainingFeePerEpoch` times the epoch count. Emits `TrainingStarted`; no precompile call. |
| `completeTraining(bytes32 loraHash, string ipfsCID)` | `onlyRole(OPERATOR_ROLE)`; records the trained-weights CID. |
| `setAdapterModelCommitment(bytes32 loraHash, bytes32 commitment)` | `onlyRole(OPERATOR_ROLE)`; one-shot. |
| `verifyAdapterAt(bytes32 loraHash, bytes32 inputCommitment, bytes32 outputCommitment, bytes proofBytes)` | Proof-backed verification through `0x0108`. |
| `isAdapterVerified(bytes32 loraHash) view returns (bool)` | Whether the adapter has a verified proof. |
| `mergeLoRAs(bytes32[] loraHashes, uint256[] weights, uint256 mergeType) payable returns (bytes32)` | Weights must sum to `1e18`. Emits `MergeRequested`; the merge itself runs off chain. |
| `completeMerge(bytes32 requestHash, string resultCID)` | `onlyRole(OPERATOR_ROLE)`. |
| `inferWithLoRA(bytes32 baseModelHash, bytes32 loraHash, bytes inputData) payable returns (bytes)` | Calls `0x0101` with `loraHash || msg.sender || inputData`, then splits 20% to the adapter creator and 80% through `modelRegistry.requestInference`. Reverts with `PrecompileUnavailable(0x0101)` on 40204 today, so nobody is paid. |
| `setPublicStatus` / `grantPermission` / `revokePermission` | Creator only. |
| `setTrainingFee` / `setMergeFee` / `withdrawFees` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |

Views include `getLoRA`, `getUserLoRAs`, `getModelLoRAs`, and `getMergeRequest`. Constants:
`trainingFeePerEpoch = 0.01 ether`, `mergeFee = 0.05 ether`, `INFERENCE_PROOF_VERIFY = 0x0108`, and
`INFERENCE_CIRCUIT_V1 = 1`. The old `LORA_PRECOMPILE = 0x1001` constant is gone: nothing served that
address, and its `startTraining`, `mergeLoras` and `applyAndInfer` calls never ran. On-chain LoRA
arithmetic is now the pair of precompiles at `0x0112` and `0x0113` described under
[Precompile calls](#precompile-calls).

Adapter provenance, as this contract implements it, ties to three things and no more: the base model
hash, which must exist in the registry; the IPFS CIDs for the trained weights and for the dataset, the
latter carried as `datasetCID` inside the `TrainingConfig` struct; and a cryptographic commitment plus a
proof. An operator sets a one-shot `adapterModelCommitment`, then `verifyAdapterAt` submits a Halo2-KZG
proof to the `0x0108` precompile over the tuple of input commitment, model commitment, output commitment,
circuit version, and chain id. A passing proof flips `isAdapterVerified` to true. That proof shows an
adapter produces a committed output for a committed input against the committed model. It does not, in
this build, link the adapter to a learning round, a contributor, or a contribution-accounting record;
there is no reference to those systems in the contract. Federated learning and contribution live on the
separate [Citrate Orchard](/research/learning) surface.

### ModelAccessControl

`contracts/src/ModelAccessControl.sol`, `contract ModelAccessControl is Ownable, ReentrancyGuard` (the
OpenZeppelin versions, the one contract on this page that does). A standalone tiered access registry,
distinct from ModelRegistry: paid or approval-based grants, per-model staking, revenue sharing, and an
encrypted-inference path through the runtime precompiles for model inference at `0x0101` and model
encryption at `0x0106`, both called through the `CitratePrecompiles` library, so both fail closed on 40204
today. The constructor makes the deployer the owner.

| Function | Notes |
|---|---|
| `registerModel(bytes32 modelId, string ipfsCid, bool isEncrypted, uint256 accessPrice)` | Registrant gets `ACCESS_ADMIN` on the model. |
| `updateModel(...)` / `setModelMetadata(...)` | Owner only. |
| `grantAccess(bytes32 modelId, address user, uint8 level, uint256 expiresAt, uint256 usageLimit)` | Owner only. |
| `revokeAccess(bytes32 modelId, address user)` | Owner only. |
| `requestAccess(bytes32 modelId, uint8 level, string reason) payable returns (uint256 requestId)` | Requires at least the access price. |
| `approveAccessRequest(uint256 requestId, uint256 expiresAt, uint256 usageLimit)` | Model owner. |
| `executeInference(bytes32 modelId, bytes inputData) payable returns (bytes)` | Requires `ACCESS_INFERENCE`. |
| `executeEncryptedInference(bytes32 modelId, bytes encryptedInput, bytes32 proofCommitment) payable returns (bytes)` | Through the encryption precompile. |
| `setStakingRequirement` / `stakeForAccess` / `unstake` | Per-model staking. |
| `withdrawRevenue()` / `emergencyWithdraw()` | `emergencyWithdraw` is `onlyOwner`. |

Views include `getModelStats`, `hasAccessToModel`, `getUserAccessLevel`, and `getModel`. Access levels
are `ACCESS_NONE = 0`, `ACCESS_INFERENCE = 1`, `ACCESS_FULL = 2`, and `ACCESS_ADMIN = 3`. Note that
`getModelStats` returns `uniqueUsers` as a placeholder zero, and `updatePrecompileAddress` is a
non-functional placeholder.

## Precompile calls

Every precompile call in these contracts goes through one library, `CitratePrecompiles`
(`contracts/src/lib/CitratePrecompiles.sol`). It encodes each precompile's native input (the node does not
decode Solidity ABI selectors) and fails closed: a call that fails or returns nothing reverts with
`PrecompileUnavailable(address)`, and a wrong-shaped answer reverts with
`PrecompileBadOutput(address, length)`. This matters because a call to an address with no code succeeds
with empty data, so a contract that checks only the success flag would read "no precompile here" as a
result and pay for it.

| Address | Name | Used by | On 40204 today |
|---|---|---|---|
| `0x0101` | MODEL_INFERENCE | ModelRegistry, LoRAFactory, ModelAccessControl | not served to contract code; the call reverts |
| `0x0106` | MODEL_ENCRYPTION | ModelAccessControl | not served to contract code; the call reverts |
| `0x0108` | INFERENCE_PROOF_VERIFY | LoRAFactory adapter verification | live where the node build carries the verifier |
| `0x0112` | LORA_APPLY | library helper `loraApply` | active from genesis (2026-10-05 re-roll) |
| `0x0113` | LORA_MERGE | library helper `loraMerge` | active from genesis, as above |
| `0x0121` | MEMORY_ANCHOR_VERIFY | library helpers `memoryAnchorCommitment`, `AnchorProofs.isRecordAnchored` | active from genesis, as above |
| `0x0122` | AGENT_OPS | library helpers `deviceLinkValid`, `deviceRevocationValid` | active from genesis, as above |

`0x0112` applies one LoRA adapter to one tile of weights (`W + (alpha / r) (B . A)` in Q16.16 fixed
point) and `0x0113` merges up to 16 adapters on one tile, which is what lets a challenger recompute one
disputed tile of an aggregate instead of the whole tensor. `0x0121` checks a nightly decision-anchor
inclusion proof and returns the day commitment to look up in `AnchorRegistry`. `0x0122` checks device link
and revocation signatures. All four are pure byte functions that every node computes identically.

**Activation.** The four agent precompiles go live from a fork height H that a release pin sets per
network. On 40204 the pin is 0, so from the 2026-10-05 re-roll they are active from genesis. On a network
whose H is later, below H the addresses behave as they did before the fork: every library call to them
reverts with `PrecompileUnavailable`, so no contract can mistake a missing precompile for a "valid" or
"invalid" verdict. The [precompile addresses](/chain/precompile-addresses) page is generated from the chain
source and reports the activation it pins.

The byte layouts, gas formulas, activation rules and test evidence are specified once, in the chain
repository's
[agent precompile specification](https://github.com/CitrateNetwork/citrate-chain/blob/main/docs/precompiles/AGENT_PRECOMPILES.md)
(`docs/precompiles/AGENT_PRECOMPILES.md`). This page does not repeat them.

## Design rationale

The registry keeps a model as a small record and pushes the work to the precompiles because the weights
are large and often private; the ledger needs only the identity, the price, and the receipt. Charging
through `requestInference` and forwarding the whole payment to the owner keeps the base case simple, and
the marketplace and access-control contracts layer richer policy on top when an owner wants it.

The two access systems exist for two audiences. A developer who wants a model in a public catalog with
reviews and discounts uses the registry and the marketplace. An institution that wants approval-gated,
staked, or encrypted access uses ModelAccessControl. Keeping them separate avoids forcing one set of
assumptions on the other, at the cost of an integrator having to choose.

The adapter factory proves what it can prove on-chain, which is a proof that a committed adapter produces
a committed output, and no more. Tying an adapter back to who contributed which gradient is a learning-
round concern, and that belongs to Citrate Orchard, not to this factory. The honest framing is that the
factory verifies adapter behavior, not adapter origin.

## Failure modes

These contracts move value and gate access, so the sharp edges are worth naming.

- **A bad adapter is trusted.** Until `isAdapterVerified` returns true, an adapter has no on-chain proof
  behind it. Check it before relying on an adapter, because creation and training alone do not verify
  anything. The proof, when present, attests behavior, not origin.
- **Reentrancy surface.** LoRAFactory does not inherit `ReentrancyGuard` even though `inferWithLoRA`,
  `mergeLoRAs`, and `withdrawFees` move value. On InferenceRouter only `requestInference` carries the
  guard; `completeInference`, `cancelRequest`, `withdrawEarnings`, `withdrawStake`, and
  `withdrawPlatformFees` rely on careful ordering rather than a guard. Both are flagged for external
  audit and should not be treated as verified.
- **Unverified reviews.** A marketplace review does not require a verified purchase, so the average
  rating can be moved by addresses that never bought the model; the `verified` flag distinguishes them
  but does not exclude them from the average.
- **Inference calls revert on 40204.** `requestInference` on the registry, `inferWithLoRA`, and both
  inference paths of ModelAccessControl revert with `PrecompileUnavailable(0x0101)` (or `0x0106`) on every
  40204 node today, and any payment sent with them is returned by the revert. Earlier builds called
  addresses (`0x1000`, `0x1001`) that nothing served; those calls are gone.
- **Agent precompiles before H.** Code that uses `0x0112`, `0x0113`, `0x0121` or `0x0122` through the
  library reverts until the fork height is reached on that network. Handle the revert; do not catch it and
  treat it as a negative answer.
- **Inert and placeholder surfaces.** `setRegistrationFee` on the registry always reverts by design.
  On ModelAccessControl, `getModelStats` reports a placeholder zero for unique users and
  `updatePrecompileAddress` does nothing.

## Access and canon

Tier: ModelRegistry and InferenceRouter are public developer reference, since a builder needs them to
register a model and consume inference. ModelMarketplace, LoRAFactory, and ModelAccessControl are
commercial, the paid-seat depth covering marketplace economics, the adapter pipeline, and the access and
staking design.

No secrets appear on this page. There are no private keys, mnemonics, internal hostnames, or
credentials. The only hardcoded addresses are public protocol precompiles: `0x0101`, `0x0106`, `0x0108`,
`0x0112`, `0x0113`, `0x0121`, and `0x0122` (and the retired `0x1000`, `0x1001` and `0x1002`, named only to
say they are gone). Identity verification through VERI, Citrate's in-house verification, is part of membership; node and consensus code do not check operator identity.

## Source and verification

- Source: `citrate-chain/contracts/src/`, in `ModelRegistry.sol`, `InferenceRouter.sol`,
  `ModelMarketplace.sol`, `LoRAFactory.sol`, and `ModelAccessControl.sol`, with interfaces
  `interfaces/IModelRegistry.sol` and `interfaces/IModelMarketplace.sol`.
- Audited against `citrate-chain` SHA `fa7c913`, the head of the agent precompile fork stack (pull
  request 273 and the stack above it). Until that stack reaches `main`, the deployed contracts and `main`
  still carry the old constants; this page describes the code that ships with the fork.
- Status: Implemented, pre-audit, on testnet 40204. The LoRAFactory reentrancy gap, the InferenceRouter
  guard mismatch, the unverified-review weighting, and the ModelAccessControl placeholders are open items
  noted above and not yet externally audited. Re-verify deployed bytecode with `eth_getCode` if the chain
  has been re-rolled.
