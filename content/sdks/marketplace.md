---
title: Marketplace SDK
codex_slug: /sdks/marketplace
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-sdk-marketplace/src/index.ts
surfaces: [SDK-MKT-client, SDK-MKT-x402, SDK-MKT-account, SDK-MKT-abi]
audited_against_sha: 41211bd
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The TypeScript client for Citrate Market. It reads marketplace state, pays per inference request over the
x402 path, signs from a Citrate Keyring or a browser-injected account, and builds the calldata for posting
inference and training jobs and buying compute credits, all on chain id `40204`. For integrators and app
builders working buyer-side.

## What it is

`@citratelabs/marketplace-sdk` (version `0.1.0`) wraps the on-chain compute marketplace into a typed API
so a buyer-side app can list providers, estimate cost, pay for inference, and post jobs without hand-rolling
calldata. It is built on [viem](https://viem.sh) (`^2.21.0`, a direct dependency) and presents four surfaces:

- `MarketplaceClient`, read-only marketplace queries (`src/client.ts`).
- `X402Client`, an auto-pay-on-402 HTTP client and the x402 payment codec (`src/x402.ts`).
- `CitrateWallet` and `InjectedSigner`, the account integration: a native passphrase keystore or a
  browser-injected signer (`src/wallet/`). In prose we call this the Citrate Keyring integration; the code
  symbols keep their historical names.
- ABIs and calldata builders for jobs, credits, and training (`src/contracts.ts`, with `src/jobs.ts`,
  `src/credits.ts`, `src/training.ts`).

The mental model: read state with `MarketplaceClient`; pay for an inference request with `X402Client`; sign
with a `CitrateWallet` (key held in the browser) or an `InjectedSigner` (an extension such as MetaMask or
Rabby); and for on-chain actions, posting a job, buying credits, requesting training, build calldata with the
builder functions and send it through your signer and viem. The compute marketplace it talks to is described
under [Citrate Market](/compute) and [the compute contracts](/contracts/compute); the per-request payment
handshake is the [x402 contract path](/contracts/x402); account recovery and passkeys are covered under
[accounts](/aa).

The package classifies itself Tier 1 in `AUDIT_TIER.md`: a full external audit of its cryptographic
primitives, key handling, and supply chain is required before any `v1.0.0` stable release, and no stable
release ships without written attestation against an exact commit. At `0.1.0` it is pre-audit. Treat every
surface as experimental, and note three known gaps for a later slice: model-name resolution (slice 1 accepts
pinned hashes only), event subscription on a posted job, and key export from the keystore.

## How to use it

1. Install the package and its peer. It is published to the GitHub npm registry
   (`https://npm.pkg.github.com`) and needs Node 20 or newer.

   ```bash
   npm install @citratelabs/marketplace-sdk viem
   ```

2. Build a read-only client. Contract addresses for testnet (`40204`) are vendored, so `defaultAddresses()`
   returns a working set.

   ```ts
   import { createPublicClient, http } from "viem";
   import { MarketplaceClient, defaultAddresses } from "@citratelabs/marketplace-sdk";

   const publicClient = createPublicClient({ transport: http("<citrate-rpc-url>") });
   const market = new MarketplaceClient({ publicClient, addresses: defaultAddresses() });
   ```

3. To pay per request, construct an `X402Client` with a signer and a hard cap. There is no uncapped mode;
   `maxPayWei` is required and the client signs at most once per request.

   ```ts
   import { X402Client, unlockWallet } from "@citratelabs/marketplace-sdk";

   const account = await unlockWallet(userPassphrase); // key stays in the browser
   const x402 = new X402Client({
     signer: account,
     chainId: 40204,
     maxPayWei: 10n ** 16n,        // 0.01 SALT cap per request
     allowedTokens: [wsaltAddress],
   });

   const res = await x402.send(`${gatewayBaseUrl}/v1/chat/completions`, {
     method: "POST",
     headers: { "content-type": "application/json" },
     body: JSON.stringify({ model: "<model-id>", messages: [{ role: "user", content: "hi" }] }),
   });
   ```

4. To post a job, build calldata and send it with your signer. The end-to-end version is in
   [post a marketplace job](/sdks/tutorials/post-a-marketplace-job).

## Reference

Verified against `citrate-sdk-marketplace` at `41211bd`. The public surface is re-exported from
`src/index.ts`.

### MarketplaceClient

`src/client.ts`. Constructed with `new MarketplaceClient(opts)` where `opts` is
`{ publicClient: PublicClient; addresses?: MarketplaceAddresses }`. Read-only; it never holds keys, and
exposes `publicClient` and `addresses` as readonly properties.

| Method | Signature | Purpose |
|---|---|---|
| `resolveModelHash` | `(input: string) => Hex` | Validate a pinned `0x`+64-hex model hash. Slice 1 requires a full hash; there is no name lookup. |
| `listProviders` | `(modelHash: Hex) => Promise<ProviderInfo[]>` | Active providers for a model from `InferenceRouter`, with endpoint, stake, load, and lifetime inference count. |
| `estimateCost` | `({ modelHash, inputTokens, outputTokens, tier }) => Promise<bigint>` | Cost in grains via `ComputePricingOracle.estimateJobCost`. |
| `getCreditBalance` | `(institution: Address) => Promise<bigint>` | Compute-credit balance from `BulkComputeGateway` (18 decimals); `0n` if the gateway is unset. |
| `fetchCreditsLogs` | `(institution, fromBlock, toBlock) => Promise<Log[]>` | Raw `CreditsPurchased` and `CreditsSpent` logs for a history view; parse them with `parseCreditsEvents`. |
| `erc20Allowance` | `(token, owner, spender) => Promise<bigint>` | ERC-20 allowance; `0n` on read failure. |
| `erc20BalanceOf` | `(token, account) => Promise<bigint>` | ERC-20 balance for form validation; `0n` on read failure. |
| `minPurchaseUsd` | `() => Promise<bigint>` | `MIN_PURCHASE_USD`, defaulting to `10_000_000` (= $10 at 6 decimals). |
| `getProviderProfile` | `(address: Address) => Promise<ProviderProfile \| null>` | Full provider profile; `null` if unregistered. |

`ProviderInfo` carries `address`, `endpoint`, `stake`, `currentLoad`, `totalInferences`, and `isActive`.
`ProviderProfile` adds `isRegistered`, `totalJobsCompleted`, `totalJobsFailed`, `reputationScore` (basis
points), `currentActiveJobs`, and `maxConcurrentJobs`.

### X402Client

`src/x402.ts`. Constructed with `new X402Client(opts)`:

```ts
new X402Client({
  signer,             // Signer (required)
  maxPayWei,          // bigint hard cap per request (required; no uncapped mode)
  chainId,            // number (required)
  allowedTokens,      // Address[] (required, at least one)
  allowedRecipients,  // Address[] (optional payee pin)
  fetch,              // optional fetch override, for tests
});
```

`send(input, init?) => Promise<Response>` makes the request and, on an HTTP `402` carrying a valid challenge,
signs and retries exactly once. Policy is checked before signing: `chain_id` must match `chainId`; the token
must be in `allowedTokens`; the recipient must be in `allowedRecipients` if that list is set; the amount must
be at most `maxPayWei`; and `valid_before` must still be in the future. Any failure returns the unsigned
`402` instead of paying.

The wire types and codec live in the same file: `PaymentChallenge` (the server's `402` body),
`PaymentPayload` (the client's signed reply), the `Signer` and `TxSigner` interfaces, `signChallenge`,
`encodePaymentHeader` and `decodePaymentHeader` (the `x-payment` header, URL-safe base64),
`paymentToBytes` and `bytesToPayment` (a fixed 233-byte form, `PAYLOAD_BYTES`), and the EIP-712 digest
helpers `wsaltDomainSeparator`, `transferWithAuthorizationStructHash`, and `eip712Digest`. The payment is a
`transferWithAuthorization` on the wrapped-SALT token; browser accounts must sign it via `signEip712`
(`eth_signTypedData_v4`), not `personal_sign`, because the EIP-191 prefix `personal_sign` adds would break
recovery. The server side of this handshake is the [x402 contract path](/contracts/x402).

### Account integration

`src/wallet/`. The directory keeps its historical name; in prose this is the Citrate Keyring integration.

- `CitrateWallet` (`src/wallet/citrate.ts`), a native keystore account. Factories: `createWallet(passphrase)`
  generates a 32-byte key, encrypts it under the passphrase, and persists it to `localStorage` (the
  passphrase must be at least 12 characters); `unlockWallet(passphrase)` reopens it. Instance methods:
  `sign({ hash })`, `sendTransaction(tx)` (which needs `connect(chain, rpcUrl?)` first), `lock()`, and the
  `unlocked` getter. Helpers: `peekKeystoreAddress()`, `hasStoredKeystore()`, and `clearKeystore()` (which
  is unrecoverable).
- `InjectedSigner` (`src/wallet/injected.ts`), a browser-extension adapter. `InjectedSigner.connect(opts?)`
  requests accounts and asserts or switches the chain. It implements `sign` (`personal_sign`), `signEip712`
  (`eth_signTypedData_v4`, required for x402), and `sendTransaction`, and `hasInjectedProvider()` detects an
  injected provider. It re-checks the chain before every sign and send, closing a time-of-check window.
- Keystore (`src/wallet/keystore.ts`), Web3 Secret Storage v3: `encryptKeystore` and `decryptKeystore`,
  AES-128-CTR with PBKDF2-SHA256 at 262144 iterations and a constant-time MAC check. The format is portable
  to geth and to other v3 readers.

### ABIs and calldata builders

`src/contracts.ts`, `src/jobs.ts`, `src/credits.ts`, `src/training.ts`. Exported ABIs:
`computeMarketplaceAbi`, `inferenceRouterAbi`, `computePricingOracleAbi`, `bulkComputeGatewayAbi`,
`computePoolTrainingAbi`, `erc20Abi`. Addresses and config: `CITRATE_TESTNET_CHAIN_ID` (`40204`),
`TESTNET_ADDRESSES`, `defaultAddresses()`, and the `MarketplaceAddresses` interface. Enums: `PaymentMethod`
(`SALT` = 0, `BulkCredits` = 1) and `VerificationTier` (`Commitment` = 0, `ZKProof` = 1 at 1.5×, `TEE` = 2
at 2.0×). Error type: `MarketplaceError`.

| Builder | Signature | Notes |
|---|---|---|
| `postJobCalldata` | `(args: PostJobArgs) => { data: Hex; inputHash: Hex }` | Inference job. `SALT` sends `value = maxPriceGrains`; `BulkCredits` sends `value = 0n`. |
| `erc20ApproveCalldata` | `(args) => { data: Hex }` | Approve a stablecoin for the credits flow. |
| `purchaseComputeCreditsCalldata` | `(args) => { data: Hex }` | Buy compute credits; `amount` must be at least `MIN_PURCHASE_USD`. |
| `requestTrainingJobCalldata` | `(spec) => { data: Hex; requiredEscrow: bigint }` | `requiredEscrow = perEpochBudget × epochCount`. |
| `joinTrainingJobCalldata`, `closeRecruitmentCalldata`, `commitEpochCalldata`, `challengeStepCalldata`, `reassignCoordinatorCalldata`, `voteChallengeCalldata`, `finalizeTrainingJobCalldata` | various | Training lifecycle calldata. |
| `parseJobEvents`, `parseCreditsEvents`, `parseTrainingEvents` | `(logs: Log[]) => Event[]` | Decode receipt logs into typed events. |
| `grainsToSalt`, `grainsToSaltDisplay` | `(grains: bigint) => string` | Display formatters; SALT has 18 decimals, and "grains" are its wei. |

`PostJobArgs` carries `modelHash`, `input` (bytes or a CID; keccak256-hashed if bytes), `maxPriceGrains`,
`tier`, `bidWindowBlocks`, `execWindowBlocks`, and an optional `paymentMethod`.

## Design rationale

The split between calldata builders and a signer is deliberate. The builders are pure: they take typed
arguments and return `data` plus, where it matters, a derived value such as `inputHash` or `requiredEscrow`,
and they never touch a key or a network. Signing and sending stay with the account integration, so a key
lives in exactly one place. `X402Client` is built to be hard to misuse: `maxPayWei` is required so there is
no path to an uncapped auto-pay, every policy field is checked before a signature exists, and the client
retries a paid request at most once. The trade is verbosity. You assemble calldata and send it yourself
rather than calling a single do-everything method, and in return the dangerous step is small, explicit, and
auditable.

## Failure modes

- `X402Client` refuses to sign and returns the unsigned `402` if the challenge fails any policy check: wrong
  chain, an unallowed token or recipient, an amount over `maxPayWei`, or an expired `valid_before`.
- An uncapped `X402Client` is not constructible; a missing or malformed `maxPayWei` throws at construction.
- A browser account that signs an x402 payment with `personal_sign` produces an unrecoverable signature; use
  `signEip712`. The SDK's `signChallenge` already prefers it.
- `InjectedSigner` re-checks the chain before every sign and send and throws if the provider has switched
  underneath it.
- `decryptKeystore` compares the MAC in constant time, so a wrong passphrase fails closed without leaking how
  many bytes matched.
- `CitrateWallet.sendTransaction` throws if `connect(chain, rpcUrl?)` has not been called, and any signing
  call throws once the account is locked.

## Access and canon

Commercial. This is buyer-side integration depth, job, credit, and training calldata, the x402 codec, and
provider selection, the implementation work that benefits a contracted integrator and that we gate from
anonymous scraping. It is not secret: every symbol resolves to public on-chain ABIs and an open package. No
keys or mnemonics appear here, and none are hardcoded in the source at the audited SHA. A `CitrateWallet`
holds only a passphrase-encrypted v3 keystore in `localStorage`; an `InjectedSigner` delegates to the
extension. Do not paste a key, passphrase, or mnemonic into any example.

## Source and verification

- Source repo: `citrate-sdk-marketplace`.
- Paths: `src/index.ts` (public surface), `src/client.ts`, `src/x402.ts`, `src/wallet/`, `src/contracts.ts`,
  `src/jobs.ts`, `src/credits.ts`, `src/training.ts`, `src/types.ts`, `src/format.ts`, `AUDIT_TIER.md`.
- Audited against SHA: `41211bd`.
- Status: Implemented, pre-audit (Tier 1; a full external audit is required before any `v1.0.0` stable
  release).
