---
title: Model Contracts — Registry, Inference Router, Marketplace, LoRA & Access
codex_slug: /contracts/models
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts (src/ModelRegistry.sol, InferenceRouter.sol, ModelMarketplace.sol, LoRAFactory.sol, ModelAccessControl.sol)
surfaces: [SC-model-registry, SC-model-inferenceRouter, SC-model-marketplace, SC-model-lora, SC-model-access]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Model Contracts

> The on-chain registry and economy for AI models on Citrate (chain **40204**):
> register a model, route inference to providers, sell access in a marketplace,
> create/train/merge LoRA adapters, and gate access by tier. For model owners,
> inference consumers, and integrators.

> **Rule 9 / transclusion.** The canonical truth is the Solidity source in
> `citrate-chain/contracts/src/`. This page summarises the audited public/external
> surface at a pinned SHA; ABIs come from `@CitrateNetwork/contracts-abi` — do not
> hand-copy them.

> **Tiers.** [ModelRegistry](#modelregistry) and
> [InferenceRouter](#inferencerouter) are **public** developer reference;
> [ModelMarketplace](#modelmarketplace), [LoRAFactory](#lorafactory), and
> [ModelAccessControl](#modelaccesscontrol) are **commercial**. See
> [Security & access](#security--access).

## Overview

A model is registered once in **ModelRegistry** (which yields a `modelHash` and
proxies inference through Citrate precompiles). From there:
**InferenceRouter** load-balances inference across staked providers with caching;
**ModelMarketplace** lets owners list and sell access with fees to a treasury;
**LoRAFactory** builds, trains, merges, and cryptographically verifies low-rank
adapters on top of a base model; **ModelAccessControl** is a standalone tiered
access/staking/revenue-share registry with its own encrypted-inference path.

> **Naming note.** On testnet-beta this registry is deployed under the name
> `AIModelRegistryPortable` (see the address table below). The source contract in
> `src/ModelRegistry.sol` is named `ModelRegistry`; no `AIModelRegistryPortable`
> alias exists inside that file.

## ModelRegistry

`src/ModelRegistry.sol` — `contract ModelRegistry is IModelRegistry, AccessControl, ReentrancyGuard`
(project-local `AccessControl`/`ReentrancyGuard`).

Stores model metadata, manages owner permissions, charges a fixed registration
fee, and proxies registration/inference to Citrate precompiles
(`MODEL_PRECOMPILE = 0x...1000`).

**Constructor:** `constructor()` — grants `DEFAULT_ADMIN_ROLE` and `OPERATOR_ROLE`
to the deployer.

### Functions

| Function | Notes |
|---|---|
| `registerModel(string name, string framework, string version, string ipfsCID, uint256 sizeBytes, uint256 inferencePrice, IModelRegistry.ModelMetadata metadata) payable returns (bytes32)` | Requires `REGISTRATION_FEE` (0.1 SALT). Returns the `modelHash`. |
| `updateModel(bytes32 modelHash, string newVersion, string newIpfsCID)` | Owner only. |
| `setInferencePrice(bytes32 modelHash, uint256 newPrice)` | |
| `deactivateModel(bytes32 modelHash)` / `activateModel(bytes32 modelHash)` | |
| `grantPermission(bytes32 modelHash, address user)` / `revokePermission(...)` | |
| `requestInference(bytes32 modelHash, bytes inputData) payable returns (bytes)` | Pays the full `msg.value` to the model owner. |
| `withdrawFees()` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |

Views: `getModel` (8-tuple owner/name/framework/version/ipfsCID/inferencePrice/totalInferences/isActive),
`getModelsByOwner`, `getModelRevenue`, `hasPermission`, `getAllModelHashes`,
`getModelsInfo`.

### Events & constants

`ModelRegistered`, `ModelUpdated`, `ModelDeactivated`, `ModelActivated`,
`InferenceRequested`, `PermissionGranted`, `PermissionRevoked`. Struct `Model`.
Constants: `REGISTRATION_FEE = 0.1 ether`, `MODEL_PRECOMPILE = 0x...1000`,
`ARTIFACT_PRECOMPILE = 0x...1002` (declared, unused).

> **Pre-audit note.** `setRegistrationFee` is an intentionally **inert** `view`
> that ignores its argument and always reverts ("Registration fee is immutable").
> `requestInference` forwards the full `msg.value` to the model owner with no
> marketplace fee retained.

## InferenceRouter

`src/InferenceRouter.sol` — `contract InferenceRouter is AccessControl, ReentrancyGuard`
(project-local).

Routes inference requests to registered compute providers with a load-balancing
score, response caching, provider staking, and payment/refund distribution.

**Constructor:** `constructor(address _modelRegistry)` — grants admin + operator
roles to the deployer.

### Functions

| Function | Notes |
|---|---|
| `registerProvider(string endpoint, uint256 minPrice, bytes32[] supportedModels) payable` | Requires `>= minProviderStake` (100 SALT default). |
| `requestInference(bytes32 modelHash, bytes inputData, uint256 maxPrice) payable returns (uint256)` | Cache-hit fast path returns cached output + partial refund. |
| `completeInference(uint256 requestId, bytes outputData)` | Provider only; pays provider, refunds excess, caches. |
| `cancelRequest(uint256 requestId)` | Requester only, Pending only; full refund. |
| `updateProviderStatus(bool isActive)` / `addStake() payable` / `withdrawStake(uint256 amount)` | |
| `withdrawEarnings()` | |
| `setCaching(bytes32 modelHash, bool enabled)` | `onlyRole(OPERATOR_ROLE)`. |
| `setPlatformFee(uint256 newFee)` / `setMinProviderStake(uint256 newStake)` / `withdrawPlatformFees()` | `onlyRole(DEFAULT_ADMIN_ROLE)`; fee capped at 1000 bps. |

Views: `getRequest`, `getUserRequests`, `getProviders`, `getProviderInfo`.

### Events & types

`InferenceRequested`, `InferenceCompleted`, `ProviderRegistered`,
`ProviderUpdated`, `CacheHit`, `MinProviderStakeUpdated`, `PlatformFeeUpdated`
(and a declared-but-unemitted `RouteUpdated`). Structs `InferenceRequest`,
`ComputeProvider`, `ModelRoute`; `enum RequestStatus { Pending, Processing, Completed, Failed, Cancelled }`.
Config: `minProviderStake = 100 ether`, `platformFee = 250` (2.5%),
`cacheReward = 100` (1%).

> **Pre-audit note.** Only `requestInference` carries `nonReentrant`; the contract
> header comment claiming a guard on every value-moving function is **not** matched
> by the code — `completeInference`, `cancelRequest`, `withdrawEarnings`,
> `withdrawStake`, and `withdrawPlatformFees` issue low-level transfers without it
> (flag for audit). `successRate` is initialized to 100% and never updated, so it
> is a static scoring input.

## ModelMarketplace

`src/ModelMarketplace.sol` — `contract ModelMarketplace is IModelMarketplace, AccessControl, ReentrancyGuard`
(project-local).

Marketplace layered on `ModelRegistry`: owners list models, buyers purchase
inference access (with bulk discounts), and a marketplace fee splits to a
treasury. Adds reviews, categories, and featuring.

**Constructor:** `constructor(address _modelRegistry, address _treasuryAddress)`
(both non-zero; `modelRegistry` is immutable).

### Functions

| Function | Notes |
|---|---|
| `listModel(bytes32 modelId, uint256 basePrice, uint256 discountPrice, uint256 minimumBulkSize, uint8 category, string metadataURI)` | Price in `[MIN_PRICE, MAX_PRICE]`; category `<= 10`. |
| `purchaseAccess(bytes32 modelId, uint256 quantity) payable` | Bulk discount above `minimumBulkSize`; fee `MARKETPLACE_FEE_BASIS_POINTS` (2.5%). |
| `updatePricing(...)` / `updateCategory(...)` | Owner only. |
| `deactivateListing(bytes32 modelId)` / `activateListing(bytes32 modelId)` | Owner only. |
| `featureModel(bytes32 modelId) payable` | Admin free; owner pays `FEATURED_FEE` (1 SALT). |
| `unfeatureModel(bytes32 modelId)` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |
| `addReview(bytes32 modelId, uint8 rating, string comment)` | Rating 1–5; comment ≤ 500 bytes. |
| `updateTreasuryAddress(address newTreasury)` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |

Views: `getListing`, `getModelsByCategory`, `getFeaturedModels`,
`getTopRatedModels`, `getModelsByOwner`, `getPurchaseHistory`, `getModelReviews`,
`getMarketplaceStats`.

### Events & types

Events and structs (`ModelListing`, `Purchase`, `Review`) are declared in the
`IModelMarketplace` interface; emitted here: `ModelListed`, `ModelPurchased`,
`PriceUpdated`, `CategoryUpdated`, `ModelFeatured`, `ModelUnfeatured`,
`ReviewAdded`, `ListingDeactivated`, `ListingActivated`. Constants:
`MARKETPLACE_FEE_BASIS_POINTS = 250`, `MIN_PRICE = 0.001 ether`,
`MAX_PRICE = 1000 ether`, `FEATURED_FEE = 1 ether`.

> **Pre-audit note.** `getTopRatedModels` uses an O(n²) selection sort over all
> listings (self-noted "could be optimized with a heap") — an unbounded-gas view
> as listings grow. `addReview` does not require a verified purchase; unverified
> reviews still affect `averageRating` (they are flagged `verified=false`).

## LoRAFactory

`src/LoRAFactory.sol` — `contract LoRAFactory is AccessControl` (project-local;
**does not** inherit ReentrancyGuard).

Factory for creating, training, merging, and cryptographically verifying LoRA
low-rank adapters against base models in `ModelRegistry`, integrating the LoRA
precompile (`0x...1001`) and the Halo2-KZG inference-proof verifier
(`0x...0108`).

**Constructor:** `constructor(address _modelRegistry)` — grants admin + operator
roles to the deployer.

### Functions

| Function | Notes |
|---|---|
| `createLoRA(bytes32 baseModelHash, string name, string description, uint256 rank, uint256 alpha, uint256 dropout, TrainingConfig config) payable returns (bytes32)` | Fee = `trainingFeePerEpoch` × epochs. |
| `completeTraining(bytes32 loraHash, string ipfsCID)` | `onlyRole(OPERATOR_ROLE)`. |
| `setAdapterModelCommitment(bytes32 loraHash, bytes32 commitment)` | `onlyRole(OPERATOR_ROLE)`; one-shot. |
| `verifyAdapterAt(bytes32 loraHash, bytes32 inputCommitment, bytes32 outputCommitment, bytes proofBytes)` | Proof-backed adapter verification via `0x0108`. |
| `isAdapterVerified(bytes32 loraHash) view returns (bool)` | |
| `mergeLoRAs(bytes32[] loraHashes, uint256[] weights, uint256 mergeType) payable returns (bytes32)` | Weights must sum to `1e18`. |
| `completeMerge(bytes32 requestHash, string resultCID)` | `onlyRole(OPERATOR_ROLE)`. |
| `inferWithLoRA(bytes32 baseModelHash, bytes32 loraHash, bytes inputData) payable returns (bytes)` | Splits 20% to the LoRA creator, 80% via `modelRegistry.requestInference`. |
| `setPublicStatus` / `grantPermission` / `revokePermission` | |
| `setTrainingFee` / `setMergeFee` / `withdrawFees` | `onlyRole(DEFAULT_ADMIN_ROLE)`. |

Views: `getLoRA`, `getUserLoRAs`, `getModelLoRAs`, `getMergeRequest`.

### Events & types

`LoRACreated`, `LoRAMerged`, `TrainingStarted`, `TrainingCompleted`,
`PermissionGranted`, `TrainingFeeUpdated`, `MergeFeeUpdated`,
`AdapterModelCommitmentSet`, `AdapterVerified`. Custom errors:
`AdapterProofRejected`, `AdapterModelCommitmentNotSet`, `AdapterNotFound`.
Structs `LoRAAdapter`, `TrainingConfig`, `MergeRequest`. Constants:
`trainingFeePerEpoch = 0.01 ether`, `mergeFee = 0.05 ether`,
`LORA_PRECOMPILE = 0x...1001`, `INFERENCE_PROOF_VERIFY = 0x...0108`,
`INFERENCE_CIRCUIT_V1 = 1`.

> **Pre-audit note.** Adapter cryptographic verification (`RM-FL-4 / WP-4.7`) is a
> recent flow; the precompile wire format is
> `inputCommitment(32) + modelCommitment(32) + outputCommitment(32) + circuit_version(4 BE) + chain_id(4 BE) + proofBytes`
> — off-chain generators must match it. The contract does **not** inherit
> ReentrancyGuard despite value-moving calls in `inferWithLoRA`/`withdrawFees`;
> flag for audit.

## ModelAccessControl

`src/ModelAccessControl.sol` — `contract ModelAccessControl is Ownable, ReentrancyGuard`
(OpenZeppelin).

A standalone tiered access registry distinct from `ModelRegistry`: paid/
approval-based access grants, per-model staking, revenue sharing, and an encrypted
inference path through Citrate runtime precompiles
(`MODEL_INFERENCE = 0x0101`, `MODEL_ENCRYPTION = 0x0106`).

**Constructor:** `constructor()` — deployer is the Ownable owner.

### Functions

| Function | Notes |
|---|---|
| `registerModel(bytes32 modelId, string ipfsCid, bool isEncrypted, uint256 accessPrice)` | |
| `updateModel(...)` / `setModelMetadata(...)` | Owner only. |
| `grantAccess(bytes32 modelId, address user, uint8 level, uint256 expiresAt, uint256 usageLimit)` | Owner only. |
| `revokeAccess(bytes32 modelId, address user)` | |
| `requestAccess(bytes32 modelId, uint8 level, string reason) payable returns (uint256 requestId)` | |
| `approveAccessRequest(uint256 requestId, uint256 expiresAt, uint256 usageLimit)` | |
| `executeInference(bytes32 modelId, bytes inputData) payable returns (bytes)` | Requires `ACCESS_INFERENCE`. |
| `executeEncryptedInference(bytes32 modelId, bytes encryptedInput, bytes32 proofCommitment) payable returns (bytes)` | |
| `setStakingRequirement` / `stakeForAccess` / `unstake` | |
| `withdrawRevenue()` / `emergencyWithdraw()` | `emergencyWithdraw` is `onlyOwner`. |

Views: `getModelStats`, `hasAccessToModel`, `getUserAccessLevel`, `getModel`.
Access levels (uint8 constants): `ACCESS_NONE=0`, `ACCESS_INFERENCE=1`,
`ACCESS_FULL=2`, `ACCESS_ADMIN=3`.

### Events & types

`ModelRegistered`, `AccessGranted`, `AccessRevoked`, `AccessRequested`,
`InferenceExecuted`, `ModelUpdated`, `RevenueWithdrawn`. Structs `ModelInfo`,
`AccessGrant`, `AccessRequest`.

> **Pre-audit note.** `getModelStats` returns `uniqueUsers = 0` (placeholder; not
> tracked) and `updatePrecompileAddress` is a non-functional placeholder. The
> `gasUsed` field of `InferenceExecuted` logs remaining gas (`gasleft()`), not gas
> consumed. `RM-L / WP-L1.3` hardening (transfer → `Address.sendValue`, defensive
> `nonReentrant` on `unstake`) is applied.

## Deployed addresses (chain 40204)

> Public on-chain data — re-verify with `eth_getCode`. **Testnet-beta; pre-audit.**
> Source: `citrate-chain/contracts/DEPLOYED_ADDRESSES.md`.

| Contract | Address |
|---|---|
| AIModelRegistryPortable (ModelRegistry) | `0x3ff095445b382075971fd5d3e05fd8bb3ff8006c` |
| ModelRegistry | `0x11a5e6f57751d8fa1c5b58ad2bf13528160985f0` |
| InferenceRouter | `0x6884ef1907468a13265a0bbb67da20ef4b52199b` |
| ModelMarketplace | `0x46773aeca885be65cd313b7d9bce9625767d40b5` |
| LoRAFactory | `0xa1eed6ae021504e2a1e310e6c0f7c1a0c5bf4647` |
| ModelAccessControl | `0x05825775315f3d074db9f948713d05059e12a8fd` |

> Two registry addresses are enumerated in the public table
> (`AIModelRegistryPortable` and `ModelRegistry`); confirm which one your
> integration targets via `eth_getCode` and the published ABI.

## Examples

```bash
# Read a registered model (8-tuple)
cast call 0x11a5e6f57751d8fa1c5b58ad2bf13528160985f0 \
  "getModel(bytes32)(address,string,string,string,string,uint256,uint256,bool)" \
  <modelHash> --rpc-url https://rpc.citrate.ai

# Marketplace listing
cast call 0x46773aeca885be65cd313b7d9bce9625767d40b5 \
  "getListing(bytes32)" <modelId> --rpc-url https://rpc.citrate.ai

# Is a LoRA adapter cryptographically verified?
cast call 0xa1eed6ae021504e2a1e310e6c0f7c1a0c5bf4647 \
  "isAdapterVerified(bytes32)(bool)" <loraHash> --rpc-url https://rpc.citrate.ai
```

## Tutorials

See [Apps](/apps) and the [SDK](/sdks) sections for registering a model and
running inference end-to-end.

## Security & access

- **Tier:** `ModelRegistry` and `InferenceRouter` are **public** developer
  reference (a builder needs them to register a model and consume inference).
  `ModelMarketplace`, `LoRAFactory`, and `ModelAccessControl` are **commercial**
  (paid-seat implementation depth: marketplace economics, adapter pipeline,
  access/staking design).
- **No secrets here.** No private keys, mnemonics, internal hostnames, or
  credentials. The only hardcoded addresses are public protocol precompiles
  (`0x1000`, `0x1001`, `0x0101`, `0x0106`, `0x0108`).
- **Honest status:** **pre-audit, testnet-beta.** Open items flagged inline:
  `InferenceRouter` reentrancy-guard comment/code mismatch; `LoRAFactory` lacks
  ReentrancyGuard; `ModelAccessControl` placeholders; `ModelMarketplace`
  unbounded top-rated sort and unverified-review weighting.

## Source & verification

- Source: `citrate-chain/contracts/src/` — `ModelRegistry.sol`,
  `InferenceRouter.sol`, `ModelMarketplace.sol`, `LoRAFactory.sol`,
  `ModelAccessControl.sol`.
- Audited against `citrate-chain` SHA **`03d7851`**.
- Status: **pre-audit, testnet-beta.** Re-verify deployed bytecode via
  `eth_getCode` if the chain has been re-rolled.
