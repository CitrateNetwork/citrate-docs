---
title: Build your first app with the JS SDK
codex_slug: /sdks/tutorials/first-app-with-sdk-js
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/index.ts
surfaces: [SDK-JS-CitrateClient]
audited_against_sha: bc5a830
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Build your first app with the JS SDK

> A runnable, end-to-end first project: install `citrate-js`, connect to Citrate testnet, read chain
> state, and run an inference. ~10 minutes. For developers new to the SDK.

## Overview

You'll create a tiny Node/TypeScript script that uses `CitrateClient` to talk to Citrate testnet
(chainId `40204`). No smart-account / `aa` flow here, that's covered separately; this is the smallest
working path. Every symbol used is verified against `citrate-sdk-js` at SHA `bc5a830`.

## Install / Setup

Prerequisites: Node `>=16` (the SDK's declared `engines.node`), npm.

```bash
mkdir citrate-first-app && cd citrate-first-app
npm init -y
npm pkg set type=module
npm install citrate-js
npm install -D typescript tsx @types/node
```

> **No secrets in code.** If you later add write operations, put the private key in an env var
> (`CITRATE_PRIVATE_KEY`), never in source. This tutorial's read steps need no key.

## Steps

### 1. Connect to testnet

Create `index.ts`:

```ts
import { CitrateClient, CHAIN_IDS, DEFAULT_RPC_URLS } from 'citrate-js';

const client = new CitrateClient({
  // multi-RPC fallback array (audit SDK-02); resolves to ['https://rpc.citrate.ai']
  rpcUrl: DEFAULT_RPC_URLS[CHAIN_IDS.TESTNET],
});

console.log('RPC endpoints:', client.getRpcUrls());
```

`CitrateClient` validates each RPC URL at construction (`src/client/CitrateClient.ts`), so a typo fails
fast with a `ValidationError`.

### 2. Read chain state

```ts
const chainId = await client.getChainId();   // -> 40204
console.log('chainId:', chainId);

// Replace with any address you want to inspect
const addr = '0x0000000000000000000000000000000000000000';
const balance = await client.getBalance(addr); // bigint (wei)
console.log('balance (wei):', balance.toString());
console.log('nonce:', await client.getNonce(addr));
```

These map to `getChainId` / `getBalance` / `getNonce` in `src/client/CitrateClient.ts`.

### 3. List and inspect models

```ts
const models = await client.listModels(undefined, 10); // listModels(owner?, limit=100)
console.log('models found:', models.length);

if (models.length > 0) {
  const info = await client.getModelInfo(models[0].id);
  console.log('first model:', info);
}
```

### 4. Run an inference

```ts
// Shape of InferenceRequest is defined in src/types/Inference.ts.
const result = await client.inference({
  // model id + input per your target model; see InferenceRequest
  // modelId: '<a model id from step 3>',
  // input: { /* ... */ },
} as any);
console.log('inference result:', result);
```

> Inspect `src/types/Inference.ts` (`InferenceRequest` / `InferenceResult`) in the source repo for the
> exact fields, they are the auditable contract for this call.

### 5. Run it

```bash
npx tsx index.ts
```

Expected: the RPC list, `chainId: 40204`, a balance/nonce for the address, and (if models exist) a
model listing.

## Tutorials

- Back to the [JS SDK reference](/sdks/js).

## Security & access

- **Tier: `public`.** A getting-started tutorial for the open SDK, public per the tier decision tree.
- **No secrets here.** Read operations need no key. For writes, source keys from the environment, never
  inline. The RPC hostname (`rpc.citrate.ai`) is a public default already shipped in the SDK.

## Source & verification

- **Source repo:** `citrate-sdk-js`, package `citrate-js@0.2.0`.
- **Audited against SHA:** `bc5a830`.
- **Symbols used:** `CitrateClient` + `getRpcUrls`/`getChainId`/`getBalance`/`getNonce`/`listModels`/
  `getModelInfo`/`inference` (`src/client/CitrateClient.ts`); `CHAIN_IDS`/`DEFAULT_RPC_URLS`
  (`src/utils/constants.ts`); `InferenceRequest`/`InferenceResult` (`src/types/Inference.ts`).
- `source_kind: authored`, narrative tutorial authored in Codex (no single code file is the truth);
  every symbol referenced is verified against the source at the pinned SHA.
