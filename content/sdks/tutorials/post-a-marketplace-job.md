---
title: Post a marketplace job
codex_slug: /sdks/tutorials/post-a-marketplace-job
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-sdk-marketplace/src/index.ts
surfaces: [SDK-MKT-client, SDK-MKT-x402, SDK-MKT-account, SDK-MKT-abi]
audited_against_sha: 5cc1f39
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A runnable, end-to-end walkthrough. You will pick a model, estimate its cost, build job calldata, and submit
it to Citrate Market on chain id `40204` with the [Marketplace SDK](/sdks/marketplace), then optionally pay
for a single inference over the x402 path instead. For integrators building buyer-side. Every API used here
exists in `citrate-sdk-marketplace` at `5cc1f39`.

## What it is

A short Node and TypeScript script that reads marketplace state with `MarketplaceClient`, loads an account
with `CitrateWallet`, builds `postJob` calldata with `postJobCalldata` and submits it, reads back the result
events, and, as an alternative, calls a paid gateway route over x402 with `X402Client`. The SDK is `0.1.0`
and Tier 1, so it is pre-audit; run against testnet only, and use a throwaway account. Never paste a real
key, passphrase, or mnemonic. The compute marketplace and its contracts are described under
[Citrate Market](/compute) and [the compute contracts](/contracts/compute); the per-request payment path is
the [x402 contract path](/contracts/x402).

## How to use it

You will need Node 20 or newer, a Citrate testnet RPC URL, and a small SALT balance on a test account. Then
install the SDK and viem:

```bash
npm install @citratelabs/marketplace-sdk viem
```

### Step 1, set up clients

```ts
import { createPublicClient, http } from "viem";
import { MarketplaceClient, defaultAddresses, CITRATE_TESTNET_CHAIN_ID } from "@citratelabs/marketplace-sdk";

const RPC_URL = process.env.CITRATE_RPC_URL!;          // never hardcode
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const market = new MarketplaceClient({ publicClient, addresses: defaultAddresses() });

console.log("chainId:", CITRATE_TESTNET_CHAIN_ID);     // 40204
```

### Step 2, pick a model and inspect providers

Slice 1 requires a fully pinned model hash (`0x` plus 64 hex). Validate it, then list active providers:

```ts
const modelHash = market.resolveModelHash(process.env.MODEL_HASH!); // throws if not a pinned hash
const providers = await market.listProviders(modelHash);
console.log(`${providers.length} active providers`, providers.map(p => p.endpoint));
```

### Step 3, estimate cost

```ts
import { VerificationTier, grainsToSaltDisplay } from "@citratelabs/marketplace-sdk";

const cost = await market.estimateCost({
  modelHash,
  inputTokens: 1200n,
  outputTokens: 800n,
  tier: VerificationTier.Commitment,   // 0 is cheapest; ZKProof is 1.5x, TEE is 2.0x
});
console.log("estimated cost:", grainsToSaltDisplay(cost)); // e.g. "0.0123 SALT"
```

### Step 4, load an account

Use a passphrase-encrypted keystore that stays in the local key store. The passphrase comes from the
environment, never from source. This is the Citrate Keyring integration; the code symbol is `CitrateWallet`.

```ts
import { CitrateWallet } from "@citratelabs/marketplace-sdk";
import { defineChain } from "viem";

const citrate = defineChain({
  id: 40204,
  name: "Citrate Testnet",
  nativeCurrency: { name: "SALT", symbol: "SALT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

// First run: CitrateWallet.createWallet(process.env.WALLET_PASSPHRASE!) to generate and persist a key.
const account = (await CitrateWallet.unlockWallet(process.env.WALLET_PASSPHRASE!))
  .connect(citrate, RPC_URL);                // connect() is required before sendTransaction
```

### Step 5, build job calldata and submit

```ts
import { postJobCalldata, PaymentMethod } from "@citratelabs/marketplace-sdk";

const { data, inputHash } = postJobCalldata({
  modelHash,
  input: new TextEncoder().encode("Summarize the Citrate whitepaper."),
  maxPriceGrains: cost * 2n,               // headroom over the estimate
  tier: VerificationTier.Commitment,
  bidWindowBlocks: 20n,
  execWindowBlocks: 200n,
  paymentMethod: PaymentMethod.SALT,       // SALT sends value = maxPriceGrains
});

const txHash = await account.sendTransaction({
  to: market.addresses.computeMarketplace,
  data,
  value: cost * 2n,                        // BulkCredits would send value: 0n instead
});
console.log("posted job:", txHash, "inputHash:", inputHash);
```

### Step 6, read back the result events

```ts
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
const { parseJobEvents } = await import("@citratelabs/marketplace-sdk");
console.log(parseJobEvents(receipt.logs));
```

`parseJobEvents` returns typed events: `JobPosted`, `JobAssigned`, and `JobCompleted`, each carrying the job
id and the relevant addresses.

### Step 7, pay per inference over the gateway (optional)

Instead of posting an on-chain job, you can call a paid gateway route and settle a single request over x402:

```ts
import { X402Client } from "@citratelabs/marketplace-sdk";

const x402 = new X402Client({
  signer: account,
  chainId: 40204,
  maxPayWei: cost * 2n,                     // hard per-request cap
  allowedTokens: [process.env.WSALT_ADDRESS as `0x${string}`],
});

const res = await x402.send(`${process.env.GATEWAY_URL}/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: process.env.MODEL_ID, messages: [{ role: "user", content: "hi" }] }),
});
console.log(await res.json());              // X402Client checks policy, signs the 402 challenge, retries once
```

The server side of this handshake is the [x402 contract path](/contracts/x402).

## Reference

The API used in each step, with its source in `citrate-sdk-marketplace`:

| Step | API | Source |
|---|---|---|
| 1 | `MarketplaceClient`, `defaultAddresses`, `CITRATE_TESTNET_CHAIN_ID` | `src/client.ts`, `src/contracts.ts` |
| 2 | `resolveModelHash`, `listProviders` | `src/client.ts` |
| 3 | `estimateCost`, `VerificationTier`, `grainsToSaltDisplay` | `src/client.ts`, `src/types.ts`, `src/format.ts` |
| 4 | `CitrateWallet.unlockWallet`, `connect` | `src/wallet/citrate.ts` |
| 5 | `postJobCalldata`, `PaymentMethod` | `src/jobs.ts`, `src/types.ts` |
| 6 | `parseJobEvents` | `src/jobs.ts` |
| 7 | `X402Client` | `src/x402.ts` |

The full surface is on the [Marketplace SDK](/sdks/marketplace) reference.

## Failure modes

- `resolveModelHash` throws on anything that is not a pinned `0x`+64-hex hash; slice 1 has no name lookup.
- `sendTransaction` throws if you have not called `connect(chain, rpcUrl?)` first, or if the account is
  locked.
- For the `SALT` payment method, `value` must equal `maxPriceGrains`; for `BulkCredits`, `value` must be
  `0n`, or the marketplace rejects the mixed payment.
- `X402Client` returns the unsigned `402` rather than paying if the challenge is for the wrong chain, an
  unallowed token or recipient, an amount over `maxPayWei`, or an expired window.

## Access and canon

Commercial. This walks buyer-side integration depth, which we gate from anonymous scraping. Every credential,
`CITRATE_RPC_URL`, `WALLET_PASSPHRASE`, `MODEL_HASH`, `WSALT_ADDRESS`, and `GATEWAY_URL`, is read from the
environment; never hardcode a key, passphrase, or mnemonic. The account key stays encrypted in the local
Web3 v3 keystore. Run against testnet `40204` only.

## Source and verification

- Source repo: `citrate-sdk-marketplace`.
- Built against `src/index.ts`, `src/client.ts`, `src/jobs.ts`, `src/x402.ts`, `src/wallet/`,
  `src/contracts.ts`, `src/types.ts`, `src/format.ts`.
- Audited against SHA: `5cc1f39`.
- Status: Implemented, pre-audit (Tier 1). Run on testnet only with a throwaway account.
