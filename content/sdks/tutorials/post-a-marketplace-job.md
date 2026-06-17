---
title: "Tutorial: Post a Marketplace Job"
codex_slug: /sdks/tutorials/post-a-marketplace-job
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-sdk-marketplace/src/index.ts
surfaces: [SDK-MKT-client, SDK-MKT-x402, SDK-MKT-wallet, SDK-MKT-abi]
audited_against_sha: 41211bd
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Tutorial: Post a Marketplace Job

> A runnable, end-to-end walkthrough: pick a model, estimate cost, build job calldata, and submit it to
> the Citrate compute marketplace (chainId `40204`) with the [Marketplace SDK](/sdks/marketplace). Also
> shows the pay-per-inference path over the [Inference Gateway](/sdks/inference-gateway) via x402.

## What you'll build

By the end you'll have a Node/TypeScript script that:

1. Reads marketplace state (providers, cost estimate) with `MarketplaceClient`.
2. Loads a buyer wallet (`CitrateWallet`).
3. Builds `postJob` calldata with `postJobCalldata` and submits it on-chain.
4. (Optional) Calls a paid gateway route over x402 with `X402Client`.

> **Pre-audit.** All surfaces here are `0.1.0` / Tier 1 (pre-audit). Run against testnet only and use a
> throwaway wallet. **Never** paste a real private key, passphrase, or mnemonic.

## Prerequisites

- Node `>=20`.
- A Citrate testnet RPC URL and a small SALT balance on a test wallet.
- The SDK installed:

```bash
npm install @citratenetwork/marketplace-sdk viem
```

## Step 1 — Set up clients

```ts
import { createPublicClient, http } from "viem";
import { MarketplaceClient, defaultAddresses, CITRATE_TESTNET_CHAIN_ID } from "@citratenetwork/marketplace-sdk";

const RPC_URL = process.env.CITRATE_RPC_URL!;          // never hardcode
const publicClient = createPublicClient({ transport: http(RPC_URL) });
const market = new MarketplaceClient({ publicClient, addresses: defaultAddresses() });

console.log("chainId:", CITRATE_TESTNET_CHAIN_ID);     // 40204
```

## Step 2 — Pick a model and inspect providers

Slice 1 requires a fully pinned model hash (`0x` + 64 hex). Validate it, then list providers:

```ts
const modelHash = market.resolveModelHash(process.env.MODEL_HASH!); // throws if not a pinned hash
const providers = await market.listProviders(modelHash);
console.log(`${providers.length} active providers`, providers.map(p => p.endpoint));
```

## Step 3 — Estimate cost

```ts
import { VerificationTier, grainsToSaltDisplay } from "@citratenetwork/marketplace-sdk";

const cost = await market.estimateCost({
  modelHash,
  inputTokens: 1200,
  outputTokens: 800,
  tier: VerificationTier.Commitment,   // 0 = cheapest; ZKProof ×1.5, TEE ×2.0
});
console.log("estimated cost:", grainsToSaltDisplay(cost)); // e.g. "0.0123 SALT"
```

## Step 4 — Load a buyer wallet

Use a passphrase-encrypted keystore that stays in the local key store. The passphrase comes from the
environment, never from source:

```ts
import { CitrateWallet } from "@citratenetwork/marketplace-sdk";
import { defineChain } from "viem";

const citrate = defineChain({
  id: 40204,
  name: "Citrate Testnet",
  nativeCurrency: { name: "SALT", symbol: "SALT", decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] } },
});

// First run: CitrateWallet.createWallet(process.env.WALLET_PASSPHRASE!) to generate + persist a key.
const wallet = (await CitrateWallet.unlockWallet(process.env.WALLET_PASSPHRASE!))
  .connect(citrate, RPC_URL);                // connect() is required before sendTransaction
```

## Step 5 — Build job calldata and submit

```ts
import { postJobCalldata, PaymentMethod } from "@citratenetwork/marketplace-sdk";

const { data, inputHash } = postJobCalldata({
  modelHash,
  input: new TextEncoder().encode("Summarize the Citrate whitepaper."),
  maxPriceGrains: cost * 2n,               // headroom over the estimate
  tier: VerificationTier.Commitment,
  bidWindowBlocks: 20n,
  execWindowBlocks: 200n,
  paymentMethod: PaymentMethod.SALT,       // SALT → value = maxPriceGrains
});

const txHash = await wallet.sendTransaction({
  to: market.addresses.computeMarketplace,
  data,
  value: cost * 2n,                        // BulkCredits would send value: 0n instead
});
console.log("posted job:", txHash, "inputHash:", inputHash);
```

## Step 6 — Read back the result events

```ts
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
const { parseJobEvents } = await import("@citratenetwork/marketplace-sdk");
console.log(parseJobEvents(receipt.logs));
```

## Optional — Pay-per-inference over the gateway (x402)

Instead of posting an on-chain job, you can call a paid Inference Gateway route and settle per request:

```ts
import { X402Client } from "@citratenetwork/marketplace-sdk";

const x402 = new X402Client({
  signer: wallet,
  chainId: 40204,
  maxPayWei: cost * 2n,                     // hard per-request cap
  allowedTokens: [process.env.WSALT_ADDRESS as `0x${string}`],
});

const res = await x402.send(`${process.env.GATEWAY_URL}/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ model: process.env.MODEL_ID, messages: [{ role: "user", content: "hi" }] }),
});
console.log(await res.json());              // X402Client signs the 402 challenge and retries once
```

See the [gateway page](/sdks/inference-gateway#x402) for the server side of the handshake.

## Recap

You read marketplace state, estimated cost, loaded a wallet, posted a job on-chain, and (optionally)
paid for inference over x402 — all with the typed SDK and no hand-rolled calldata.

## Security & access

**Tier: commercial.** This tutorial walks buyer-side marketplace integration depth, gated from anonymous
scraping per `00_SCHEMA_AND_AUTHORING.md` §3.5.

**No secrets.** Every credential (`CITRATE_RPC_URL`, `WALLET_PASSPHRASE`, `MODEL_HASH`, `WSALT_ADDRESS`,
`GATEWAY_URL`) is read from the environment — never hardcode a key, passphrase, or mnemonic. The wallet
key stays encrypted in the local Web3-v3 keystore.

## Source & verification

- Built against `citrate-sdk-marketplace` — `src/index.ts`, `src/client.ts`, `src/jobs.ts`,
  `src/x402.ts`, `src/wallet/`.
- Audited against SHA: `41211bd`.
