---
title: Citrate JavaScript/TypeScript SDK
codex_slug: /sdks/js
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-sdk-js/src/index.ts
surfaces: [SDK-JS-CitrateClient, SDK-JS-aa, SDK-JS-crypto, SDK-JS-react]
audited_against_sha: bc5a830
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate JavaScript/TypeScript SDK

> The canonical TypeScript SDK for building on Citrate Network (chainId `40204`), chain RPC, model
> deployment + inference, the embedded-wallet / ERC-4337 (`aa`) helpers, crypto utilities, and optional
> React hooks. For app developers and integrators.

## Overview

`citrate-js` is the **canonical** Citrate SDK (`package.json#name: citrate-js`, `version 0.2.0`); all
other language SDKs are non-canonical until a pilot integrator requires parity. It wraps the chain's
JSON-RPC, the AI inference/model precompiles, and the account-abstraction stack into a typed API so a
web/Node app can talk to Citrate without hand-rolling calldata.

The SDK is organized into four documented surfaces:

- **`CitrateClient` / `WebSocketClient`**, the chain + AI client (`src/client/`).
- **`aa`**, embedded wallet helpers: ERC-4337 v0.7 UserOps, ZeroDev Kernel v3 encoding, passkey/WebAuthn
  + EOA signing, guardian recovery, and a bundler JSON-RPC client (`src/aa/`).
- **crypto**, `CryptoManager`, `KeyManager`, and Shamir secret-sharing helpers (`src/crypto/`).
- **react**, optional connection/model/inference hooks (`src/react/hooks.ts`).

Mental model: build with `CitrateClient` for read/write chain + inference; reach for `aa` when you need a
gasless / passkey-backed smart account instead of a raw EOA.

> **Status, pre-1.0 / pre-audit surfaces.** The package is `0.2.0`. The `aa` module is labeled
> *EW-S1 WP-7* in-source (embedded-wallet sprint 1) and points at live-but-evolving infrastructure
> (`bundler.citrate.ai`, `auth.citrate.ai`); treat it as experimental. The exported `VERSION` constant is
> `0.1.1` and is **stale** relative to `package.json` (`0.2.0`), see corrections. Use `package.json`
> as the version of record.

## Install / Setup

Real package name and version are from `citrate-sdk-js/package.json` (`name: citrate-js`, `version 0.2.0`,
`engines.node >=16`):

```bash
npm install citrate-js
# peer deps (optional, only for the React hooks): react >=16.8, react-dom >=16.8
```

Runtime dependencies (declared in `package.json`): `ethers ^6.8`, `axios ^1.7`, `eventemitter3 ^5`.

```ts
import { CitrateClient, CHAIN_IDS, DEFAULT_RPC_URLS } from 'citrate-js';

const client = new CitrateClient({
  // multi-RPC fallback array supported (audit SDK-02); a bare string is the legacy single-RPC form
  rpcUrl: DEFAULT_RPC_URLS[CHAIN_IDS.TESTNET], // ['https://rpc.citrate.ai']
  // privateKey: process.env.CITRATE_PRIVATE_KEY,   // optional; from env, never hardcoded
});
```

Defaults (`src/utils/constants.ts`): testnet chainId `40204`, RPC `https://rpc.citrate.ai`, WS
`wss://rpc.citrate.ai/ws`.

## Reference

Each item cites its code symbol/path in `citrate-sdk-js` for auditability. This is a summary; the truth
lives in the source (Rule 9, `source_kind: transcluded`).

### CitrateClient, `src/client/CitrateClient.ts` (SDK-JS-CitrateClient)

Exported from `src/index.ts`. Constructor takes `CitrateClientConfig` (`rpcUrl: string | string[]`,
optional `privateKey`, `timeout`, `retries`, `headers`, `ipfsApiUrl`). Both `rpcUrl` and `privateKey`
are validated at construction (`validateRpcUrl` / `validatePrivateKey`; SECREM-02 trust-boundary fix).

| Method | Signature (abridged) | Purpose |
|---|---|---|
| `getRpcUrls()` | `(): readonly string[]` | Current RPC fallback list (primary at index 0). |
| `getChainId()` | `(): Promise<number>` | Chain id from the provider. |
| `getBalance(address?)` | `(): Promise<bigint>` | Native balance. |
| `getNonce(address?)` | `(): Promise<number>` | Account nonce. |
| `getAddress()` | `(): string \| undefined` | Configured wallet address (if a key was given). |
| `deployModel(modelData, config)` | `Promise<ModelDeployment>` | Deploy a model artifact. |
| `inference(request)` | `Promise<InferenceResult>` | Single inference call. |
| `batchInference(request)` | `Promise<BatchInferenceResult>` | Batched inference. |
| `getModelInfo(modelId)` | `Promise<ModelInfo>` | Fetch model metadata. |
| `listModels(owner?, limit=100)` | `Promise<ModelInfo[]>` | List models. |
| `purchaseModelAccess(modelId, amount)` | `Promise<string>` | Purchase access. |

`WebSocketClient` (`src/client/WebSocketClient.ts`) is exported alongside for streaming/subscriptions.

### aa, embedded wallet / ERC-4337 v0.7 (SDK-JS-aa)

Imported via the namespaced re-export `export * as aa from './aa'` in `src/index.ts`; the module index is
`src/aa/index.ts`. Documents the flow: derive userId → predict address → enroll validator → build/sign/send
a UserOp.

- **Address** (`src/aa/address.ts`): `uuidToUserId`, `accountIdToAaUserId`, `predictWalletAddress`,
  `erc1967MinimalInitCodeHash`, `AddressPredictionError`. One deterministic address per user across surfaces.
- **Kernel v3 encoding** (`src/aa/kernel.ts`): nonce helpers (`rootValidatorNonce`, `validatorNonceKey`,
  `composeNonce`), `encodeExecuteSingle` / `encodeExecuteBatch`, module install/uninstall
  (`encodeInstallModule`, `encodeUninstallModule`, `encodeChangeRootValidator`), and install-data builders
  (`kernelInitializeCalldata`, `webauthnInstallData`, `ecdsaInstallData`, `guardianInstallData`).
- **UserOp building** (`src/aa/userop.ts`): `buildPackedUserOp`, `getUserOpHash`, `encodeDeployFor`,
  `packInitCode`, `packCitratePaymasterAndData`, `toRpcUserOperation`, gas-packing helpers.
- **WebAuthn / passkey signing** (`src/aa/webauthn.ts`): `signUserOpWithPasskey`,
  `encodeWebauthnValidatorSignature`, `parseDerEcdsaSignature`, `normalizeP256S` (P-256 low-s
  normalization), `base64UrlEncode`.
- **EOA signing** (`src/aa/eoa.ts`): `signUserOpWithEoa`.
- **Guardian recovery** (`src/aa/recovery.ts`): `guardianRecoveryDigest`, `packGuardianSignatures`,
  `buildRotateSignerCall`, `RecoveryError`.
- **Bundler client** (`src/aa/bundler.ts`): `BundlerClient` with `sendUserOperation`,
  `estimateUserOperationGas`, `getUserOperationReceipt`, `waitForUserOperationReceipt`,
  `supportedEntryPoints`, plus `chainId`. Default endpoint `CITRATE_BUNDLER_URL =
  https://bundler.citrate.ai/rpc` (public RPC; not a secret). Errors surface the bundler's `AAxx` codes
  via `BundlerRpcError`.

### crypto (SDK-JS-crypto)

Exported from `src/index.ts`:

- `CryptoManager` (`src/crypto/CryptoManager.ts`), AES-256-GCM + HKDF/PBKDF2 helpers
  (`PBKDF2_DEFAULT_ITERATIONS = 600_000`).
- `KeyManager` (`src/crypto/KeyManager.ts`), key handling + `EncryptedModelResult`.
- Shamir secret sharing (`src/crypto/FiniteField.ts`): `splitSecretBytes`, `reconstructSecretBytes`,
  `GF256`, `ShamirSecretSharing`.

### react (SDK-JS-react)

`src/react/hooks.ts`. **Not re-exported from the package root**, `react` is an optional peer dep, so the
hooks are imported from the build path. Each hook throws if React is not installed.

```ts
// import path matches the package layout (dist/react/hooks); src lives at src/react/hooks.ts
import { useCitrateClient } from 'citrate-js/dist/react/hooks';
```

Hooks: `useCitrateClient`, `useModelDeployment`, `useInference`, `useModelInfo`, `useModelList`.

### Constants & errors

- `src/utils/constants.ts`: `CHAIN_IDS` (`MAINNET: 1`, `TESTNET: 40204`), `DEFAULT_RPC_URLS`,
  `DEFAULT_WS_URLS`, `PRECOMPILE_ADDRESSES`, `GAS_LIMITS`, `TIMEOUTS`, `MODEL_LIMITS`, `ENCRYPTION`,
  `EVENTS`, `API_ENDPOINTS`.
- `src/errors/CitrateError.ts`: `CitrateError`, `ModelNotFoundError`, `InsufficientFundsError`,
  `ValidationError`.

## Examples

```ts
// Read chain state
import { CitrateClient, CHAIN_IDS, DEFAULT_RPC_URLS } from 'citrate-js';

const client = new CitrateClient({ rpcUrl: DEFAULT_RPC_URLS[CHAIN_IDS.TESTNET] });
console.log(await client.getChainId());                  // 40204
console.log(await client.getBalance('0xYourAddress'));   // bigint wei
```

```ts
// Run inference
const result = await client.inference({ /* InferenceRequest, see src/types/Inference.ts */ });
```

```ts
// Embedded wallet: predict the user's smart-account address, then send a gasless UserOp
import { aa } from 'citrate-js';

const userId = aa.uuidToUserId(citrateUserId);
const address = aa.predictWalletAddress(factory, walletImpl, userId);

const bundler = new aa.BundlerClient(); // defaults to https://bundler.citrate.ai/rpc
// build callData via aa.encodeExecuteSingle(...), assemble with aa.buildPackedUserOp(...),
// hash with aa.getUserOpHash(...), sign with aa.signUserOpWithPasskey(...) or aa.signUserOpWithEoa(...)
const hash = await bundler.sendUserOperation(op, entryPoint);
const receipt = await bundler.waitForUserOperationReceipt(hash);
```

## Tutorials

- [Build your first app with the JS SDK](/sdks/tutorials/first-app-with-sdk-js), runnable end-to-end
  (install → connect → read chain → run inference).

## Security & access

- **Tier: `public`.** This is open SDK reference a developer needs to build on Citrate, per the tier
  decision tree (§3.6), concepts/quickstarts/open SDK reference are public.
- **No secrets here.** Private keys, mnemonics, and API keys are **never** hardcoded, they come from the
  caller's environment (`config.privateKey`, `BundlerClientOptions.apiKey`). The endpoints named
  (`rpc.citrate.ai`, `bundler.citrate.ai/rpc`, `auth.citrate.ai`) are public production hostnames already
  shipped in the source defaults, not credentials.
- **Pre-audit surfaces flagged.** The `aa` module (EW-S1 WP-7) is experimental and depends on
  still-evolving relayer/bundler infra; the exported `VERSION` constant is stale (see Source &
  verification). Mark this clearly to integrators.

## Source & verification

- **Source repo:** `citrate-sdk-js` (canonical SDK; split from the Citrate monorepo 2026-05-18).
- **Package:** `citrate-js@0.2.0` (`package.json`).
- **Audited against SHA:** `bc5a830` (`git -C citrate-sdk-js rev-parse --short HEAD`).
- **Audited paths:** `src/index.ts`, `src/client/CitrateClient.ts`, `src/client/WebSocketClient.ts`,
  `src/aa/{index,address,kernel,userop,webauthn,eoa,recovery,bundler}.ts`,
  `src/crypto/{CryptoManager,KeyManager,FiniteField}.ts`, `src/react/hooks.ts`,
  `src/utils/constants.ts`, `src/errors/CitrateError.ts`.
- `source_kind: transcluded`, Codex pulls reference from the source repo at the pinned SHA so docs
  cannot drift from code.
