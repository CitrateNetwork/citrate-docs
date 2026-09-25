---
title: Citrate JavaScript SDK
codex_slug: /sdks/js
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/index.ts
surfaces: [SDK-JS-CitrateClient, SDK-JS-aa, SDK-JS-crypto, SDK-JS-react]
audited_against_sha: 2f8da46
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

`@citratelabs/sdk` is the canonical TypeScript SDK for building on Citrate Network. It wraps the chain's JSON-RPC,
the model and inference operations, and the account-abstraction stack into a typed API, so a Node or browser
app can talk to Citrate without hand-rolling calldata. This page is for the developer writing that app.

## What it is

The SDK is the typed front door to Citrate Network from JavaScript and TypeScript. The package is named
`@citratelabs/sdk` (formerly `@citratelabs/citrate-js`, retained as a deprecated alias) and the version of record is
`0.2.0` in `package.json`. It is the canonical SDK; the other language SDKs follow it and stay non-canonical
until a pilot integrator needs parity.

Several surfaces sit behind one import, and most apps only ever touch the first:

- The client, `CitrateClient` and `WebSocketClient`, for reading chain state, deploying models, and running
  inference against the chain (`src/client/`).
- The account-abstraction helpers, exported under the `aa` namespace, for Citrate Keyring accounts built on
  Kernel v3 and ERC-4337 v0.7: counterfactual address derivation, passkey and EOA signing, UserOperation
  building, guardian recovery, and a bundler client (`src/aa/`).
- The **identity spine and embedded Keyring account**, exported under the `identity` namespace: OIDC PKCE and
  SIWE sign-in, hardened ID-token verification, and smart-account address prediction verified against the
  on-chain factory. See [identity and the embedded Keyring account](/sdks/identity).
- The **entitlement capabilities**, exported under the `entitlements` namespace: the canonical `normalizeTier`
  and capability map. See [entitlements](/sdks/entitlements).
- The **inference gateway client**, exported under the `gateway` namespace: an OpenAI-compatible client for
  `infer.citrate.ai`.
- The **memory client**, exported under the `memory` namespace: a typed client for a `citrate-memories`
  gateway (`src/memory/client.ts`), with `MemoryClient` over the OIDC REST surface (recall, search, neighbors,
  verify, review, assert) and `ByomMemoryClient` for the bring-your-own-model MCP path.
- The cryptography utilities, `CryptoManager`, `KeyManager`, and Shamir secret sharing (`src/crypto/`).
- The optional React hooks (`src/react/hooks.ts`), which are not re-exported from the package root.

The mental model is two layers. Reach for `CitrateClient` when you hold a key and want to read or write the
chain directly. Reach for `aa` when you want a Citrate Keyring account that a passkey controls and a paymaster
can sponsor, instead of a raw key-pair account. Passkeys are covered under [passkeys](/aa/passkeys) and
sponsorship under [the paymaster](/aa/paymaster).

The `aa` module is labeled EW-S1 WP-7 in source and points at infrastructure that is live but still moving
(`bundler.citrate.ai`, `auth.citrate.ai`). Treat it as in development. The exported `VERSION` constant now
reads `0.2.0` (`src/index.ts`), matching `package.json`.

## How to use it

The package targets Node 16 and newer (`engines.node`), and runs in modern browsers through the Web Crypto
API.

1. Install the package.

   ```bash
   npm install @citratelabs/sdk
   ```

   The runtime dependencies are `ethers ^6.17`, `axios ^1.20`, and `eventemitter3 ^5.0`. The React hooks need
   `react >=16.8` and `react-dom >=16.8`, which are optional peer dependencies; install them only if you use
   the hooks.

2. Construct a client. The defaults for testnet, chain id `40204`, live in `src/utils/constants.ts`.

   ```typescript
   import { CitrateClient, CHAIN_IDS, DEFAULT_RPC_URLS } from '@citratelabs/sdk';

   const client = new CitrateClient({
     // DEFAULT_RPC_URLS[40204] is ['https://rpc.citrate.ai']. An array
     // enables fallback across endpoints; a bare string is the single-RPC form.
     rpcUrl: DEFAULT_RPC_URLS[CHAIN_IDS.TESTNET],
     // privateKey: process.env.CITRATE_PRIVATE_KEY, // optional; from env, never inline
   });
   ```

   The constructor validates every RPC URL and any private key before it builds a provider, so a typo fails
   immediately with a `ValidationError` rather than at first use.

3. Read chain state. Read methods need no key.

   ```typescript
   console.log(await client.getChainId());                 // 40204
   console.log((await client.getBalance('0xYourAddress'))); // bigint, wei
   ```

4. Write to the chain. Methods that send a transaction, `deployModel`, `inference`, and `batchInference`,
   require a `privateKey` in the config. Without one they throw. To send a sponsored write through a Citrate
   Keyring account instead of a raw key, build a UserOperation with the `aa` helpers and submit it through the
   bundler client; the [first-app tutorial](/sdks/tutorials/first-app-with-sdk-js) walks the whole path.

For a step-by-step build, follow [build your first app](/sdks/tutorials/first-app-with-sdk-js).

## Reference

Each item names its export and source path in `citrate-sdk-js` so a reader can check it against the code.

### Client, `src/client/CitrateClient.ts`

The constructor takes a `CitrateClientConfig`: `rpcUrl` as a string or string array, and optional
`privateKey`, `timeout`, `retries`, `headers`, and `ipfsApiUrl`. Exported from `src/index.ts` alongside
`WebSocketClient` (`src/client/WebSocketClient.ts`) for streaming and subscriptions.

| Method | Signature | What it does |
|---|---|---|
| `getRpcUrls()` | `(): readonly string[]` | The current fallback list, primary first. |
| `getChainId()` | `(): Promise<number>` | The chain id reported by the provider. |
| `getBalance(address?)` | `(): Promise<bigint>` | Native balance in wei. |
| `getNonce(address?)` | `(): Promise<number>` | Pending transaction count. |
| `getAddress()` | `(): string \| undefined` | The configured account address, if a key was given. |
| `deployModel(modelData, config)` | `(): Promise<ModelDeployment>` | Deploy a model artifact. Needs a key. |
| `inference(request)` | `(): Promise<InferenceResult>` | One inference call. Needs a key. |
| `batchInference(request)` | `(): Promise<BatchInferenceResult>` | Batched inference. Needs a key. |
| `getModelInfo(modelId)` | `(): Promise<ModelInfo>` | Model metadata, via `citrate_getModel`. |
| `listModels(owner?, limit=100)` | `(): Promise<ModelInfo[]>` | List models, via `citrate_listModels`. |
| `purchaseModelAccess(modelId, amount)` | `(): Promise<string>` | Disabled, fails closed. See failure modes. |

### Account abstraction, `src/aa/`

Imported as a namespace, `import { aa } from '@citratelabs/sdk'`; the module index is `src/aa/index.ts`. The flow
it documents is: derive a userId, predict the address, enroll a validator, then build, sign, and send a
UserOperation. The market side of this is covered in [the marketplace SDK](/sdks/marketplace).

- Address derivation (`src/aa/address.ts`): `uuidToUserId`, `accountIdToAaUserId`, `predictWalletAddress`,
  `erc1967MinimalInitCodeHash`, and `AddressPredictionError`. The derivation is the cross-surface seam that
  gives one user the same account address on every device. `uuidToUserId` is `keccak256(utf8(lowercase
  uuid))`; `predictWalletAddress(factory, implementation, userId)` returns the CREATE2 address the factory
  deploys the Kernel proxy to.
- Kernel v3 encoding (`src/aa/kernel.ts`): nonce helpers `rootValidatorNonce`, `validatorNonceKey`, and
  `composeNonce`; `encodeExecuteSingle` and `encodeExecuteBatch`; module management
  `encodeInstallModule`, `encodeUninstallModule`, and `encodeChangeRootValidator`; and the install-data
  builders `kernelInitializeCalldata`, `webauthnInstallData`, `ecdsaInstallData`, and `guardianInstallData`.
  The guardian builder enforces a count in [2, 7] and a threshold in [1, count].
- UserOperation building (`src/aa/userop.ts`): `buildPackedUserOp`, `getUserOpHash`, `encodeDeployFor`,
  `packInitCode`, `packCitratePaymasterAndData`, `toRpcUserOperation`, and the gas-packing helpers
  `packAccountGasLimits` and `packGasFees`. `getUserOpHash` is verified against the live EntryPoint v0.7 on
  chain 40204.
- Passkey signing (`src/aa/webauthn.ts`): `signUserOpWithPasskey` drives the browser's
  `navigator.credentials.get()`; the pure encoders `encodeWebauthnValidatorSignature`,
  `parseDerEcdsaSignature`, `normalizeP256S`, and `base64UrlEncode` are testable without a browser. The
  validator rejects high-s signatures, so `normalizeP256S` folds `s` into the lower half of the curve order.
- EOA signing (`src/aa/eoa.ts`): `signUserOpWithEoa(signer, userOpHash)` signs with any ethers `Signer` and
  produces the EIP-191 shape the ECDSA validator accepts.
- Guardian recovery (`src/aa/recovery.ts`): `guardianRecoveryDigest`, `packGuardianSignatures`,
  `buildRotateSignerCall`, and `RecoveryError`. The recovery op rotates the account's root validator toward a
  fresh passkey, validated by M-of-N guardian signatures bound to the account.
- Bundler client (`src/aa/bundler.ts`): `BundlerClient` with `sendUserOperation`, `estimateUserOperationGas`,
  `getUserOperationReceipt`, `waitForUserOperationReceipt`, `supportedEntryPoints`, and `chainId`. The default
  endpoint is `CITRATE_BUNDLER_URL`, `https://bundler.citrate.ai/rpc`, a public RPC, not a secret. Errors
  surface the bundler's `AAxx` codes through `BundlerRpcError`.
- Types (`src/aa/types.ts`): `PackedUserOperation`, `RpcUserOperation`, `UserOperationReceipt`,
  `CitrateAaConfig`, and the `PaymasterCategory` enum (`Standard`, `Recovery`, `FirstOp`).

### Cryptography, `src/crypto/`

- `CryptoManager` (`src/crypto/CryptoManager.ts`): SHA-256 hashing, AES-256-GCM, and PBKDF2 over the Web
  Crypto API. The default work factor is `PBKDF2_DEFAULT_ITERATIONS`, 600,000 iterations.
- `KeyManager` (`src/crypto/KeyManager.ts`): key handling and model encryption, returning
  `EncryptedModelResult`. Encryption ECDH-wraps the symmetric key to the recipient. Options include
  `accessControl` (default `true`) and threshold key sharing (`thresholdShares`, `totalShares`).
- Shamir secret sharing (`src/crypto/FiniteField.ts`): `splitSecretBytes`, `reconstructSecretBytes`, `GF256`,
  and `ShamirSecretSharing`. Share coefficients are drawn from a cryptographic RNG and fail closed if none is
  available.

### React hooks, `src/react/hooks.ts`

The hooks are not re-exported from the package root, because React is an optional peer dependency. Import them
from the build path; each hook throws if React is not installed.

```typescript
import { useCitrateClient } from '@citratelabs/sdk/react/hooks';
```

The hooks are `useCitrateClient`, `useModelDeployment`, `useInference`, `useModelInfo`, and `useModelList`.

### Constants and errors

- `src/utils/constants.ts`: `CHAIN_IDS` (`TESTNET: 40204`; releases before 0.2.3 also carried `MAINNET: 1`, which is Ethereum mainnet's chain id, not Citrate's. It was removed in 0.2.3. Citrate's network is 40204, and mainnet keeps that id), `DEFAULT_RPC_URLS`,
  `DEFAULT_WS_URLS`, `PRECOMPILE_ADDRESSES`, `GAS_LIMITS`, `TIMEOUTS`, `MODEL_LIMITS`, `ENCRYPTION`, `EVENTS`,
  and `API_ENDPOINTS`.
- `src/errors/CitrateError.ts`: `CitrateError`, `ModelNotFoundError`, `InsufficientFundsError`, and
  `ValidationError`.

## Design rationale

The client holds the RPC fallback list and rotates through it on transport errors rather than wrapping
ethers' automatic failover, which would double the connection budget. The trade is a little manual rotation
in exchange for a predictable connection count. The `aa` helpers are written as pure functions: chain reads,
nonces and deploy status, are passed in as arguments, so the same code that runs in a browser against
`auth.citrate.ai` and the bundler also runs against pinned test vectors. Address derivation is duplicated
byte-for-byte across the JavaScript, identity-TS, and Rust implementations on purpose, because the address a
user controls must be identical no matter which surface computes it.

## Failure modes

This is the surface where a mistake costs money or leaks data, so several methods fail closed.

- A write method called without a configured key throws rather than silently doing nothing. `deployModel`,
  `inference`, and `batchInference` all require `privateKey` in the config.
- When a model deployment or inference asks for encryption but no key manager is configured, the call throws
  rather than uploading in plaintext.
- `purchaseModelAccess` is disabled and throws. The canonical precompile table has no access-purchase
  operation; the earlier implementation routed buyer funds to the verification precompile, where access was
  never granted and value was never credited. It stays closed until a node-confirmed precompile exists.
- Shamir share generation throws if no cryptographic RNG is present, because the scheme's secrecy depends on
  unpredictable coefficients.
- A bundler rejection surfaces as a `BundlerRpcError` carrying the `AAxx` code verbatim, for example `AA21`
  for an unfunded prefund or `AA31` for a paymaster deposit too low, so the caller can act on the real cause.

## Access and canon

Public. This is open SDK reference a developer needs to build on Citrate Network, and it carries no secrets.
Private keys, mnemonics, and bundler API keys are never inline; they come from the caller's environment
(`config.privateKey`, `BundlerClientOptions.apiKey`). The hostnames named here, `rpc.citrate.ai`,
`bundler.citrate.ai`, and `auth.citrate.ai`, are public production endpoints already shipped as defaults in
the source, not credentials. The SDK holds no identity data.

## Source and verification

- Source repo: `citrate-sdk-js`, package `@citratelabs/sdk@0.2.0` (`package.json`; `@citratelabs/citrate-js` retained as a deprecated alias).
- Audited against SHA: `2f8da46`.
- Audited paths: `src/index.ts`, `src/client/CitrateClient.ts`, `src/client/WebSocketClient.ts`,
  `src/aa/{index,address,kernel,userop,webauthn,eoa,recovery,bundler,types}.ts`,
  `src/crypto/{CryptoManager,KeyManager,FiniteField}.ts`, `src/identity/`, `src/entitlements/capabilities.ts`,
  `src/gateway/client.ts`, `src/memory/client.ts`, `src/react/hooks.ts`, `src/utils/constants.ts`, and
  `src/errors/CitrateError.ts`.
- Status: Implemented (pre-audit). The client and cryptography surfaces are built and run against testnet 40204.
  The `aa` module is Implemented but in development (EW-S1 WP-7) and depends on still-moving bundler and auth
  infrastructure. The `identity`, `entitlements`, `gateway`, and `memory` namespaces are Implemented and
  unit-tested; account-address prediction is verified byte-for-byte against the on-chain factory.
