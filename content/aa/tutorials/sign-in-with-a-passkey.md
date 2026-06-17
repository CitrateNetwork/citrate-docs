---
title: Sign In With a Passkey
codex_slug: /aa/tutorials/sign-in-with-a-passkey
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/aa/webauthn.ts + userop.ts + bundler.ts
surfaces: [AA-passkeys, SDK-JS-aa]
audited_against_sha: bc5a830
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Sign In With a Passkey

> Create a passkey-backed Citrate smart wallet and send your first sponsored
> transaction — no seed phrase. Runnable end-to-end. For developers.

> **Status: pre-audit.** The AA stack (validators, factory, paymaster, bundler,
> SDK encoders) is experimental and **not yet third-party audited**. Use testnet
> values; do not custody material value.

Every API call below exists in `citrate-sdk-js/src/aa/` at SHA `bc5a830`.

## Prerequisites

- Node 18+ and `npm install citrate-js` (AA helpers are the `aa` namespace:
  `import { aa } from 'citrate-js'`).
- A **secure context** (HTTPS or `localhost`) — passkeys require
  `navigator.credentials`, which only runs in the browser. Run these steps in a
  browser app (e.g. a Vite/Next page), not a plain Node script.
- Chain **40204** access: the Citrate identity authority (`auth.citrate.ai`) and
  bundler (`bundler.citrate.ai`).
- The deployed AA addresses (factory, kernel impl, EntryPoint, paymaster,
  validators) from the chain's `40204.json` / `DEPLOYED_ADDRESSES.md`.

## Step 1 — Derive the user's wallet address

```ts
import { aa } from 'citrate-js';
const { uuidToUserId, predictWalletAddress } = aa;

const userId = uuidToUserId(citrateUserId);        // keccak256(utf8(lowercase uuid))
const sender = predictWalletAddress(FACTORY, KERNEL_IMPL, userId);
// `sender` is this user's ONE wallet address on every surface (counterfactual).
```

## Step 2 — Build the first UserOperation (with deploy)

Get the deploy permit from the authority, then assemble `initCode` and the call:

```ts
import { aa } from 'citrate-js';
const {
  encodeDeployFor, packInitCode, encodeExecuteSingle,
  buildPackedUserOp, packCitratePaymasterAndData, PaymasterCategory,
} = aa;

// Permit from auth.citrate.ai (the identity signer authorizes the deploy):
const permit = await fetch('https://auth.citrate.ai/aa/enroll-validator', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ /* userId, initialValidator, initData … */ }),
}).then((r) => r.json());

const factoryData = encodeDeployFor({
  userId,
  initialValidator: WEBAUTHN_VALIDATOR,
  initData: permit.initData,
  expiresAt: BigInt(permit.expiresAt),
  signature: permit.signature,
});

const op = buildPackedUserOp({
  sender,
  nonce,                                 // EntryPoint.getNonce(sender, key)
  initCode: packInitCode(FACTORY, factoryData),
  callData: encodeExecuteSingle({ to: recipient, value: 0n, data: '0x' }),
  callGasLimit, verificationGasLimit, preVerificationGas,
  maxFeePerGas, maxPriorityFeePerGas,
  // First-ever op → sponsored unconditionally under the first-op cap:
  paymasterAndData: packCitratePaymasterAndData({
    paymaster: PAYMASTER,
    paymasterVerificationGasLimit, paymasterPostOpGasLimit,
    category: PaymasterCategory.FirstOp,
  }),
});
```

## Step 3 — Hash and sign with the passkey

```ts
import { aa } from 'citrate-js';
const { getUserOpHash, signUserOpWithPasskey } = aa;

const hash = getUserOpHash(op, ENTRYPOINT, 40204n);

// Triggers the platform authenticator (Face ID / Touch ID / Windows Hello).
// Encodes the assertion for WebAuthnP256Validator and normalizes `s` to low-half.
const signature = await signUserOpWithPasskey(hash);
const signedOp = { ...op, signature };
```

## Step 4 — Submit to the bundler and wait

```ts
import { aa } from 'citrate-js';
const { BundlerClient } = aa;

const bundler = new BundlerClient(); // defaults to https://bundler.citrate.ai/rpc

// Optional sanity check — bundler must be on 40204:
if ((await bundler.chainId()) !== 40204n) throw new Error('wrong chain');

const userOpHash = await bundler.sendUserOperation(signedOp, ENTRYPOINT);
const receipt = await bundler.waitForUserOperationReceipt(userOpHash);
console.log('mined:', receipt);
```

On a revert the client throws `BundlerRpcError` carrying the JSON-RPC payload, so
you can surface AA codes (e.g. `AA31` paymaster deposit too low) directly.

## What just happened

- The wallet **deployed itself** on its first op (`initCode`), and the factory
  registered it with the paymaster so sponsorship was allowed.
- The **passkey** authorized the op via `WebAuthnP256Validator` — no seed phrase
  ever existed.
- The **paymaster** paid gas under the first-op budget.

Next: add a recovery method in [Guardians](/aa/guardians), or read the full
[Passkeys reference](/aa/passkeys).

## Security & access

**Tier: public.** Runnable builder tutorial; nothing here is secret. No private
keys, mnemonics, or credentials appear — the access token is the user's own OIDC
token and the deploy permit is fetched at runtime; passkey private material never
leaves the authenticator.

## Source & verification

- `citrate-sdk-js/src/aa/{webauthn,userop,kernel,bundler,address}.ts` @ `bc5a830`
- Validators/factory: `citrate-chain/contracts/src/aa/` @ `03d7851`

Pre-audit. Use testnet. Re-verify symbols against the SHAs.
