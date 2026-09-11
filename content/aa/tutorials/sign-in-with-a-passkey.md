---
title: Sign in with a passkey
codex_slug: /aa/tutorials/sign-in-with-a-passkey
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/aa/{address,userop,kernel,webauthn,bundler}.ts
surfaces: [AA-passkeys, SDK-JS-aa]
audited_against_sha: bc5a830
created: 2026-06-17T00:00:00Z
author: Citrate team
status: Implemented
---

Create a passkey-backed Citrate Keyring account and send your first sponsored transaction, with no seed
phrase, using `citrate-js`. You will derive the account address before it exists, then deploy and use it in
a single operation. For the concepts behind each step see [passkeys](/aa/passkeys); for the contracts see
[account-abstraction contracts](/aa/contracts).

## What it is

A runnable walkthrough of the four moves a surface makes to onboard a user: derive the counterfactual
address, build a first operation that carries the deploy, sign it with the device authenticator, and submit
it to the bundler. Every call below is a real export of `citrate-sdk-js/src/aa/` at SHA `bc5a830`. Passkeys
need `navigator.credentials`, which only runs in a secure browser context, so run these steps in a browser
app, a Vite or Next page, not a plain Node script.

## How to use it

You will need Node 18 or newer with `npm install citrate-js`; a secure context (HTTPS or `localhost`); chain
40204 access to the Citrate identity authority and the Citrate bundler; and the deployed addresses for the
stack (factory, account implementation, EntryPoint, paymaster, validators), read from the chain's deployed
addresses file. The account-abstraction helpers are the `aa` namespace: `import { aa } from 'citrate-js'`.

### Step 1, derive the account address

```typescript
import { aa } from 'citrate-js';
const { uuidToUserId, predictWalletAddress } = aa;

const userId = uuidToUserId(citrateUserId);             // keccak256(utf8(lowercase uuid))
const sender = predictWalletAddress(FACTORY, IMPLEMENTATION, userId);
// `sender` is this user's one account address on every surface, counterfactual.
```

`predictWalletAddress` is pure: it computes the CREATE2 address with no chain read, so you can show the user
their address before anything is deployed. It returns the same value the factory's `predictAddress` returns
on chain.

### Step 2, build the first operation with the deploy

Fetch the deploy permit from the identity authority, then assemble the `initCode` and the call. The first
operation carries the deploy, so the account creates itself on first use.

```typescript
import { aa } from 'citrate-js';
const {
  encodeDeployFor, packInitCode, encodeExecuteSingle,
  buildPackedUserOp, packCitratePaymasterAndData, PaymasterCategory,
} = aa;

// The identity signer authorizes the deploy, see /aa/identity.
const permit = await fetch('https://auth.citrate.ai/aa/enroll-validator', {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ /* userId, initialValidator, initData ... */ }),
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
  nonce,                                  // EntryPoint.getNonce(sender, key)
  initCode: packInitCode(FACTORY, factoryData),
  callData: encodeExecuteSingle({ to: recipient, value: 0n, data: '0x' }),
  callGasLimit, verificationGasLimit, preVerificationGas,
  maxFeePerGas, maxPriorityFeePerGas,
  // First-ever op, sponsored under the first-op budget:
  paymasterAndData: packCitratePaymasterAndData({
    paymaster: PAYMASTER,
    paymasterVerificationGasLimit, paymasterPostOpGasLimit,
    category: PaymasterCategory.FirstOp,
  }),
});
```

The `nonce` and the gas fields come from a chain read and the bundler's gas estimate; `buildPackedUserOp`
takes them as inputs so the builder stays pure. The endpoint path and request body shape belong to the
identity authority, not to the SDK; the SDK exports the encoders (`encodeDeployFor`, `packInitCode`), so the
permit fetch is described generically here.

### Step 3, hash and sign with the passkey

```typescript
import { aa } from 'citrate-js';
const { getUserOpHash, signUserOpWithPasskey } = aa;

const hash = getUserOpHash(op, ENTRYPOINT, 40204n);

// Triggers the platform authenticator; encodes the assertion for the
// WebAuthn validator and normalizes `s` to the lower half-order.
const signature = await signUserOpWithPasskey(hash);
const signedOp = { ...op, signature };
```

`getUserOpHash` commits to every field of the operation, including the chain id, so the signature is valid
only for this operation on chain 40204. `signUserOpWithPasskey` drives `navigator.credentials.get()` and
throws `WebAuthnSigningError` outside a secure context.

### Step 4, submit to the bundler and wait

```typescript
import { aa } from 'citrate-js';
const { BundlerClient } = aa;

const bundler = new BundlerClient();    // defaults to https://bundler.citrate.ai/rpc

// Sanity check, the bundler must be on 40204:
if ((await bundler.chainId()) !== 40204n) throw new Error('wrong chain');

const userOpHash = await bundler.sendUserOperation(signedOp, ENTRYPOINT);
const receipt = await bundler.waitForUserOperationReceipt(userOpHash);
console.log('mined:', receipt);
```

On a revert the client throws `BundlerRpcError` carrying the JSON-RPC payload, so you can surface ERC-4337
codes (for example `AA31`, paymaster deposit too low) directly. `waitForUserOperationReceipt` polls every
two seconds for up to sixty seconds by default, which covers a normal inclusion plus a bundle interval.

## Reference

The exports used above, all in `citrate-sdk-js/src/aa/`:

| Symbol | Returns | Source |
|---|---|---|
| `uuidToUserId(uuid)` | the 32-byte userId | `address.ts` |
| `predictWalletAddress(factory, impl, userId)` | the counterfactual account address | `address.ts` |
| `encodeDeployFor(args)` | factory `deployFor` calldata | `userop.ts` |
| `packInitCode(factory, factoryData)` | ERC-4337 `initCode` | `userop.ts` |
| `encodeExecuteSingle(call)` | Kernel `execute` calldata | `kernel.ts` |
| `buildPackedUserOp(args)` | the packed operation struct | `userop.ts` |
| `packCitratePaymasterAndData(args)` | `paymasterAndData` with the category tag | `userop.ts` |
| `PaymasterCategory` | `Standard`, `Recovery`, `FirstOp` | `types.ts` |
| `getUserOpHash(op, entryPoint, chainId)` | the operation hash | `userop.ts` |
| `signUserOpWithPasskey(hash, opts)` | the WebAuthn signature blob | `webauthn.ts` |
| `BundlerClient` | the bundler JSON-RPC client | `bundler.ts` |

## Design rationale

The deploy travels with the first operation rather than as a separate transaction, so onboarding is one
signature and an account that is never used costs nothing. The operation hash commits to the chain id and
every field, so a passkey signs exactly one operation on exactly one chain. The builder functions are pure
and take chain reads as inputs, so the same code runs in the browser against the live bundler and in tests
against pinned vectors.

## What just happened

- The account deployed itself on its first operation, through the `initCode`, and the factory registered it
  with the paymaster so sponsorship was allowed.
- The passkey authorized the operation through `WebAuthnP256Validator`; no seed phrase ever existed.
- The paymaster paid gas under the first-op budget.

Next, add a recovery method in [guardians](/aa/guardians), or read the full [passkeys](/aa/passkeys)
reference.

## Access and canon

Public tier. A runnable builder tutorial; nothing here is secret. No private keys, mnemonics, or
credentials appear: the access token is the user's own identity token, the deploy permit is fetched at
runtime, and passkey private material never leaves the authenticator. Use testnet values on chain 40204.

## Source and verification

- `citrate-sdk-js/src/aa/{address,userop,kernel,webauthn,bundler}.ts` at SHA `bc5a830`.
- Validators and factory: `citrate-chain-laneB/contracts/src/aa/` at SHA `54d1f2c`.

Status: Implemented, pre-audit. Use testnet; do not custody material value. Re-verify the exports against
the SHAs before relying on this tutorial.
