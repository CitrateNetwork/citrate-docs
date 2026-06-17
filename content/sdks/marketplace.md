---
title: Citrate Marketplace SDK
codex_slug: /sdks/marketplace
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-sdk-marketplace/src/index.ts
surfaces: [SDK-MKT-client, SDK-MKT-x402, SDK-MKT-wallet, SDK-MKT-abi]
audited_against_sha: 41211bd
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Marketplace SDK

> The TypeScript SDK for the Citrate compute marketplace (chainId `40204`) — read marketplace state,
> pay per-inference over HTTP 402 (x402), manage a buyer wallet, and build the calldata for posting
> inference + training jobs and buying compute credits. For integrators and app builders.

## Overview

`@citratenetwork/marketplace-sdk` (`package.json#name`, `version 0.1.0`) wraps the on-chain compute
marketplace into a typed API so a buyer-side app can list providers, estimate cost, pay for inference,
and post jobs without hand-rolling calldata. It is built on [viem](https://viem.sh) (`^2.21.0`, a direct
dependency) and ships four documented surfaces:

- **`MarketplaceClient`** — read-only marketplace queries (`src/client.ts`).
- **`X402Client`** — auto-pay-on-`402` HTTP client + the x402 EIP-712 payment codec (`src/x402.ts`).
- **`CitrateWallet` / `InjectedSigner`** — buyer wallet: native passphrase keystore or browser-injected
  signer (`src/wallet/`).
- **ABIs + calldata builders** — contract ABIs and the calldata/event helpers for jobs, credits, and
  training (`src/contracts.ts`, plus `src/jobs.ts`, `src/credits.ts`, `src/training.ts`).

Mental model: read state with `MarketplaceClient`; pay for an inference request with `X402Client`; sign
with a `CitrateWallet` (key in browser) or `InjectedSigner` (MetaMask/Rabby); for on-chain actions
(post a job, buy credits, request training) build calldata with the builder functions and send it with
your wallet/viem.

> **Status — pre-1.0 / pre-audit.** The package is `0.1.0` and classified **Tier 1** in-repo
> (`AUDIT_TIER.md`): a full external crypto audit is required before any `v1.0.0` stable release; no
> stable release ships without written audit attestation. Treat all surfaces as experimental. Known
> slice-2 gaps: model-name resolution (slice 1 accepts pinned hashes only), `watchJob` event
> subscription, and seed-phrase export.

## Install / Setup

```bash
npm install @citratenetwork/marketplace-sdk
```

- Published to the GitHub npm registry (`registry: https://npm.pkg.github.com`).
- Requires Node `>=20`. `viem ^2.21.0` is bundled as a direct dependency.
- Contract addresses for testnet (chainId `40204`) are vendored; `defaultAddresses()` returns them.

```ts
import { createPublicClient, http } from "viem";
import { MarketplaceClient, defaultAddresses } from "@citratenetwork/marketplace-sdk";

const publicClient = createPublicClient({ transport: http("<citrate-rpc-url>") });
const market = new MarketplaceClient({ publicClient, addresses: defaultAddresses() });
```

## Reference

### `MarketplaceClient` (`src/client.ts`)

Constructed with `new MarketplaceClient(opts)` where `opts: { publicClient: PublicClient; addresses?:
MarketplaceAddresses }`. Read-only; never holds keys. Exposes `publicClient` and `addresses` as
readonly properties.

| Method | Signature | Purpose |
|---|---|---|
| `resolveModelHash` | `(input: string) => Hex` | Validate a pinned `0x`+64-hex model hash. Slice 1 requires a full hash (no name lookup). |
| `listProviders` | `(modelHash: Hex) => Promise<ProviderInfo[]>` | Active providers for a model from `InferenceRouter` (endpoint, stake, load, inference count). |
| `estimateCost` | `({ modelHash, inputTokens, outputTokens, tier }) => Promise<bigint>` | Wei cost via `ComputePricingOracle.estimateJobCost`. |
| `getCreditBalance` | `(institution: Address) => Promise<bigint>` | PFLOP-hour credit balance from `BulkComputeGateway` (18 decimals); `0n` if gateway unset. |
| `fetchCreditsLogs` | `(institution, fromBlock, toBlock) => Promise<Log[]>` | `CreditsPurchased` + `CreditsSpent` logs for a history view. |
| `erc20Allowance` | `(token, owner, spender) => Promise<bigint>` | ERC-20 allowance; `0n` on failure. |
| `erc20BalanceOf` | `(token, account) => Promise<bigint>` | ERC-20 balance for form validation; `0n` on failure. |
| `minPurchaseUsd` | `() => Promise<bigint>` | `MIN_PURCHASE_USD` (defaults `10_000_000` = $10 at 6 decimals). |
| `getProviderProfile` | `(address: Address) => Promise<ProviderProfile \| null>` | Full provider profile; `null` if unregistered. |

### `X402Client` (`src/x402.ts`)

Constructed with `new X402Client(opts)`:

```ts
new X402Client({
  signer,                 // Signer (required)
  maxPayWei,              // bigint hard cap per request (required; no infinite mode)
  chainId,               // number (required)
  allowedTokens,         // Address[] (required, ≥1)
  allowedRecipients?,    // Address[] (optional payee pin)
  fetch?,                // optional fetch override (tests)
});
```

`send(input, init?) => Promise<Response>` sends a request and, on an HTTP `402` with a valid challenge,
**signs and retries once**. Policy is checked *before* signing: `chain_id` must match; token must be in
`allowedTokens`; recipient must be in `allowedRecipients` if set; amount must be `≤ maxPayWei`;
`valid_before` must be in the future. Any failure returns the unsigned 402 instead of paying.

Wire types and codec (all in `src/x402.ts`): `PaymentChallenge` (server's `402` body), `PaymentPayload`
(client's signed reply), `Signer` / `TxSigner` interfaces, `signChallenge(challenge, signer)`,
`encodePaymentHeader` / `decodePaymentHeader` (`X-PAYMENT` header, URL-safe base64), and the EIP-712
digest helpers (`wsaltDomainSeparator`, `transferWithAuthorizationStructHash`, `eip712Digest`). Payment
authorization is `transferWithAuthorization` on the wrapped-SALT token; browser wallets must sign via
`signEip712` (`eth_signTypedData_v4`), not `personal_sign`.

See [the gateway page](/sdks/inference-gateway#x402) for the server side of this handshake.

### Wallet (`src/wallet/`)

- **`CitrateWallet`** (`src/wallet/citrate.ts`) — native keystore wallet. Factories: `createWallet(passphrase)`
  (generates a 32-byte key, encrypts under the passphrase, persists to `localStorage`; passphrase must be
  `≥12` chars) and `unlockWallet(passphrase)`. Instance: `sign({ hash })`, `sendTransaction(tx)` (requires
  `connect(chain, rpcUrl?)` first), `lock()`, `get unlocked()`. Helpers: `peekKeystoreAddress()`,
  `hasStoredKeystore()`, `clearKeystore()` (unrecoverable).
- **`InjectedSigner`** (`src/wallet/injected.ts`) — browser-extension adapter. `InjectedSigner.connect(opts?)`
  requests accounts and asserts/switches chain. Implements `sign` (`personal_sign`), `signEip712`
  (`eth_signTypedData_v4`, required for x402), `sendTransaction`. `hasInjectedProvider()` detects
  `window.ethereum`. Re-checks the chain before every sign/tx (TOCTOU guard).
- **Keystore** (`src/wallet/keystore.ts`) — Web3 Secret Storage v3: `encryptKeystore` / `decryptKeystore`
  (AES-128-CTR + PBKDF2-SHA256 at 262144 iterations; constant-time MAC check). Portable to geth/MetaMask.

### ABIs + calldata builders (`src/contracts.ts`, `src/jobs.ts`, `src/credits.ts`, `src/training.ts`)

Exported ABIs: `computeMarketplaceAbi`, `inferenceRouterAbi`, `computePricingOracleAbi`,
`bulkComputeGatewayAbi`, `computePoolTrainingAbi`, `erc20Abi`. Addresses:
`CITRATE_TESTNET_CHAIN_ID` (`40204`), `TESTNET_ADDRESSES`, `defaultAddresses()`, the `MarketplaceAddresses`
interface. Enums: `PaymentMethod` (`SALT=0`, `BulkCredits=1`), `VerificationTier` (`Commitment=0`,
`ZKProof=1` ×1.5, `TEE=2` ×2.0). Error: `MarketplaceError`.

| Builder | Signature | Notes |
|---|---|---|
| `postJobCalldata` | `(args: PostJobArgs) => { data: Hex; inputHash: Hex }` | Inference job; `SALT` sends `value = maxPriceGrains`, `BulkCredits` sends `value = 0n`. |
| `erc20ApproveCalldata` | `(args) => { data: Hex }` | Approve stablecoin for the credits flow. |
| `purchaseComputeCreditsCalldata` | `(args) => { data: Hex }` | Buy compute credits (`amount ≥ MIN_PURCHASE_USD`). |
| `requestTrainingJobCalldata` | `(spec) => { data: Hex; requiredEscrow: bigint }` | `requiredEscrow = perEpochBudget × epochCount`. |
| `joinTrainingJobCalldata` / `closeRecruitmentCalldata` / `commitEpochCalldata` / `challengeStepCalldata` / `reassignCoordinatorCalldata` / `voteChallengeCalldata` / `finalizeTrainingJobCalldata` | various | Training lifecycle calldata. |
| `parseJobEvents` / `parseCreditsEvents` / `parseTrainingEvents` | `(logs: Log[]) => Event[]` | Decode receipt logs. |
| `grainsToSalt` / `grainsToSaltDisplay` | `(grains: bigint) => string` | Display formatters (SALT has 18 decimals; "grains" = wei). |

## Examples

```ts
import { X402Client, CitrateWallet } from "@citratenetwork/marketplace-sdk";

const wallet = await CitrateWallet.unlockWallet(userPassphrase); // key stays in the browser
const x402 = new X402Client({
  signer: wallet,
  chainId: 40204,
  maxPayWei: 10n ** 16n,          // 0.01 SALT cap per request
  allowedTokens: [wsaltAddress],
});

// Pay-per-inference against an OpenAI-compatible gateway route:
const res = await x402.send(`${gatewayBaseUrl}/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: "<model-id>", messages: [{ role: "user", content: "hi" }] }),
});
```

## Tutorials

- [Post a marketplace job](/sdks/tutorials/post-a-marketplace-job) — end-to-end runnable walkthrough.

## Security & access

**Tier: commercial.** This is buyer-side marketplace integration depth (job/credit/training calldata,
the x402 payment codec, provider selection) — exactly the implementation work that benefits a contracted
integrator and that we gate from anonymous scraping per `00_SCHEMA_AND_AUTHORING.md` §3.5. It is not
secret: every symbol resolves to public on-chain ABIs and an open SDK package.

**No secrets here.** Private keys never leave the user's browser: `CitrateWallet` stores only a Web3 v3
keystore (passphrase-encrypted) in `localStorage`; `InjectedSigner` delegates to the wallet extension.
The repo source contains no hardcoded keys or mnemonics (verified at the audited SHA). Do not paste a
private key, passphrase, or mnemonic into any example.

## Source & verification

- Source: `citrate-sdk-marketplace` — `src/index.ts` (public surface), `src/client.ts`, `src/x402.ts`,
  `src/wallet/`, `src/contracts.ts`.
- Audited against SHA: `41211bd`.
- Reference is `transcluded`: the truth lives in the repo at the pinned SHA; this page mirrors it.
