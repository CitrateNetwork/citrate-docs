---
title: Passkeys, WebAuthn & Kernel UserOps
codex_slug: /aa/passkeys
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/aa/ + citrate-chain/contracts/src/aa/
surfaces: [AA-passkeys, SDK-JS-aa, SC-aa-validators, SC-aa-factory]
audited_against_sha: bc5a830
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Passkeys, WebAuthn & Kernel UserOps

> How a Citrate user gets a smart wallet with no seed phrase, sign in with a
> passkey (or an EOA), and send sponsored transactions through the ERC-4337 stack.
> For developers building on the embedded wallet.

> **Status: pre-audit.** The Citrate account-abstraction (AA) stack, validators,
> factory, paymaster, recovery module, bundler, and the SDK encoders, shipped in
> the EW-S1 sprint and is **not yet third-party audited**. The on-chain
> EntryPoint / Kernel encodings are pinned against vectors and an end-to-end Forge
> test (`citrate-chain/test/aa/`), but treat the whole stack as experimental and
> do not custody material value on it until the audit closes.

## Overview

Citrate's embedded wallet is an **ERC-4337 v0.7** smart account built on
**Kernel v3 (ERC-7579)**. The mental model:

- **One user → one wallet address, derivable offline.** A Citrate user id (a
  UUID, or a wallet address for SIWE logins) maps deterministically to a single
  CREATE2 smart-wallet address. The wallet is *counterfactual*, it exists at a
  known address from signup and is deployed lazily on the first transaction.
- **Sign-in is the key.** Instead of a seed phrase, the user holds a **passkey**
  (a WebAuthn P-256 credential bound to their device/platform authenticator) or
  an **EOA** (a browser/extension/hardware secp256k1 key). Either is installed as
  a Kernel *validator* that authorizes UserOperations.
- **Gas can be sponsored.** A paymaster ([AA-paymaster](/aa/paymaster)) can pay
  gas under per-user daily caps, so a user with zero balance can still transact.

The pieces and where the truth lives (audited against `citrate-sdk-js` @
`bc5a830` and `citrate-chain` @ `03d7851`):

| Concern | Code (source repo) |
|---|---|
| Address derivation (UUID → userId → CREATE2) | `citrate-sdk-js/src/aa/address.ts`, `wallet-claims.ts` (identity) |
| Passkey (WebAuthn P-256) signing | `citrate-sdk-js/src/aa/webauthn.ts` |
| EOA (secp256k1) signing | `citrate-sdk-js/src/aa/eoa.ts` |
| Kernel v3 nonce / execute / install encoders | `citrate-sdk-js/src/aa/kernel.ts` |
| UserOperation build + hash + wire conversion | `citrate-sdk-js/src/aa/userop.ts` |
| Bundler JSON-RPC client | `citrate-sdk-js/src/aa/bundler.ts` |
| On-chain validators | `citrate-chain/contracts/src/aa/validators/{WebAuthnP256Validator,CitrateECDSAValidator}.sol` |
| Wallet factory | `citrate-chain/contracts/src/aa/factory/CitrateWalletFactory.sol` |

## Install / Setup

```bash
npm install citrate-js   # AA helpers are exported as the `aa` namespace
```

The AA helpers are re-exported from the package root as the `aa` namespace
(`citrate-sdk-js/src/index.ts`: `export * as aa from './aa'`):

```ts
import { aa } from 'citrate-js';
const {
  uuidToUserId,
  predictWalletAddress,
  encodeExecuteSingle,
  buildPackedUserOp,
  getUserOpHash,
  signUserOpWithPasskey,
  signUserOpWithEoa,
  BundlerClient,
} = aa;
```

Prerequisites:

- Chain **40204** (Citrate). The bundler enforces this.
- The Citrate identity authority at `auth.citrate.ai` (issues the deploy permit;
  see [Identity](/aa/identity)).
- The Citrate bundler (`bundler.citrate.ai`; see [AA-paymaster](/aa/paymaster)).
- A **secure context** (HTTPS or `localhost`) for passkeys, `navigator.credentials`.

## Reference

The end-to-end flow, with the symbol that implements each step (all in
`citrate-sdk-js/src/aa/`):

1. **userId**, `uuidToUserId(citrateUserId)` returns the 32-byte AA userId,
   `keccak256(utf8(lowercase uuid))` (`wallet-claims.ts` mirrors this server-side
   so the ID-token `wallet_address` claim matches).
2. **predict address**, `predictWalletAddress(factory, kernelImpl, userId)`
   returns the one CREATE2 address this user has on every surface
   (`address.ts`).
3. **first op (deploy)**, `POST auth.citrate.ai/aa/enroll-validator` returns the
   identity signer's permit; `encodeDeployFor({ userId, initialValidator,
   initData, expiresAt, signature })` + `packInitCode(factory, factoryData)`
   build `initCode` (`userop.ts`). Subsequent ops use `initCode = '0x'`.
4. **callData**, `encodeExecuteSingle({ to, value, data })` or
   `encodeExecuteBatch(calls)` (`kernel.ts`).
5. **nonce**, `EntryPoint.getNonce(sender, key)`; for the root validator use the
   sequence directly (`rootValidatorNonce`), for an installed validator build the
   key with `validatorNonceKey(validator)` (`kernel.ts`).
6. **build + hash**, `buildPackedUserOp(args)` then `getUserOpHash(op,
   entryPoint, 40204n)` (`userop.ts`). The hash is verified against the live
   EntryPoint v0.7 on chain 40204 in the SDK unit tests.
7. **sign**, `signUserOpWithPasskey(userOpHash, opts)` (browser; drives
   `navigator.credentials.get()`) **or** `signUserOpWithEoa(signer, userOpHash)`
   (any ethers `Signer`).
8. **submit**, `new BundlerClient().sendUserOperation(op, entryPoint)` then
   `waitForUserOperationReceipt(hash)` (`bundler.ts`).

### Validators (how a key authorizes an op)

- **`WebAuthnP256Validator`**, verifies a passkey assertion on-chain via the
  vendored Daimo WebAuthn library. The SDK encodes `userOp.signature` as
  `abi.encode(authenticatorData, clientDataJSON, challengeLocation,
  responseTypeLocation, r, s)` and **normalizes `s` to the low half-order** (the
  verifier rejects malleable high-s signatures), see `webauthn.ts`
  (`normalizeP256S`, `encodeWebauthnValidatorSignature`). Install payload is the
  97-byte `credentialIdHash | x | y | requireUv` (`kernel.ts`
  `webauthnInstallData`).
- **`CitrateECDSAValidator`**, verifies a 65-byte secp256k1 signature over the
  userOpHash, accepting both raw and EIP-191 ("personal_sign") shapes. The SDK's
  `signUserOpWithEoa` emits the EIP-191 shape (`eoa.ts`). Install payload is the
  21-byte `owner | source` (`kernel.ts` `ecdsaInstallData`).

### EOA enrollment

An EOA path is used by the GUI-native and wallet-extension link flows: install
`CitrateECDSAValidator` with the EOA as `owner`, then sign UserOps with
`signUserOpWithEoa`. The same wallet can hold a passkey *and* an EOA validator;
adding a guardian recovery module is covered in [Guardians](/aa/guardians).

## Examples

Sponsored transfer, signed with a passkey (browser):

```ts
import { aa } from 'citrate-js';
const {
  encodeExecuteSingle, buildPackedUserOp, getUserOpHash,
  signUserOpWithPasskey, packCitratePaymasterAndData, BundlerClient,
} = aa;

const callData = encodeExecuteSingle({ to: recipient, value: 0n, data: '0x' });

const op = buildPackedUserOp({
  sender, nonce, callData,
  callGasLimit, verificationGasLimit, preVerificationGas,
  maxFeePerGas, maxPriorityFeePerGas,
  // Sponsored: tag the op with a paymaster category (see /aa/paymaster).
  paymasterAndData: packCitratePaymasterAndData({
    paymaster, paymasterVerificationGasLimit, paymasterPostOpGasLimit,
    category, // PaymasterCategory.Standard | Recovery | FirstOp
  }),
});

const hash = getUserOpHash(op, entryPoint, 40204n);
const opSigned = { ...op, signature: await signUserOpWithPasskey(hash) };

const bundler = new BundlerClient();
const sent = await bundler.sendUserOperation(opSigned, entryPoint);
const receipt = await bundler.waitForUserOperationReceipt(sent);
```

Self-paid transfer signed with an EOA: omit `paymasterAndData` (defaults to
`'0x'`) and swap the signer for `await signUserOpWithEoa(signer, hash)`.

## Tutorials

- [Sign in with a passkey](/aa/tutorials/sign-in-with-a-passkey)

## Security & access

**Tier: public.** This is the open builder reference for the embedded wallet, a
developer needs it to build, and nothing here is a competitive moat or a secret.

No secrets here. No private keys, mnemonics, credentials, or private endpoints
appear on this page. The deploy permit is fetched at runtime from
`auth.citrate.ai`; the identity signer's key never leaves the authority. Passkey
private material never leaves the user's authenticator.

Paymaster policy, caps, and the bundler auth/pre-check topology are
commercial-tier, see [Paymaster](/aa/paymaster).

## Source & verification

- SDK: `citrate-sdk-js/src/aa/` @ `bc5a830`
- Contracts: `citrate-chain/contracts/src/aa/` @ `03d7851`
- E2E: `citrate-chain/test/aa/` (UserOp-hash + WebAuthn + guardian vectors)

Pre-audit. Re-verify symbols against the source SHAs before relying on this page.
