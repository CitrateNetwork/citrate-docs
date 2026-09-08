---
title: Passkeys and Kernel operations
codex_slug: /aa/passkeys
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/aa/ + citrate-chain/contracts/src/aa/
surfaces: [AA-passkeys, SDK-JS-aa, SC-aa-validators, SC-aa-factory]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

How a Citrate user signs in with a passkey and sends transactions with no seed phrase, end to end, plus the
EOA path for users who already hold a signer. This is the builder reference for Citrate Keyring: the
WebAuthn-P256 validator on chain, the Kernel v3 account, the address that is known before deployment, and
the first operation that deploys the account. For the on-chain contract reference see
[account-abstraction contracts](/aa/contracts); for the runnable walkthrough see
[sign in with a passkey](/aa/tutorials/sign-in-with-a-passkey).

## What it is

Citrate Keyring is an ERC-4337 v0.7 smart-contract account built on the Kernel v3 account (ERC-7579
modules). The model has three parts.

- One user, one account address, derivable offline. A Citrate user id, a UUID or an EOA address for SIWE
  sign-ins, maps deterministically to a single CREATE2 account address. The account is counterfactual: it
  exists at a known address from signup and deploys itself lazily on the first operation.
- The sign-in is the key. Instead of a seed phrase the user holds a passkey, a WebAuthn P-256 credential
  bound to their device authenticator, or an EOA, a browser, extension, or hardware secp256k1 key. Either
  one installs as a Kernel validator module that authorizes operations.
- Gas can be sponsored. The [paymaster](/aa/paymaster) can pay gas under per-account daily budgets, so a
  user with a zero balance can still transact.

The on-chain object is a smart-contract account, never a key the user has to back up. Losing a device is a
recovery event, handled by [guardians](/aa/guardians), not a lost-funds event.

The pieces, and where the truth for each lives:

| Concern | Code |
|---|---|
| Address derivation, UUID to userId to CREATE2 | `citrate-sdk-js/src/aa/address.ts` |
| Passkey (WebAuthn P-256) signing | `citrate-sdk-js/src/aa/webauthn.ts` |
| EOA (secp256k1) signing | `citrate-sdk-js/src/aa/eoa.ts` |
| Kernel v3 nonce, execute, install encoders | `citrate-sdk-js/src/aa/kernel.ts` |
| Operation build, hash, wire conversion | `citrate-sdk-js/src/aa/userop.ts` |
| Bundler JSON-RPC client | `citrate-sdk-js/src/aa/bundler.ts` |
| On-chain validators | `contracts/src/aa/validators/{WebAuthnP256Validator,CitrateECDSAValidator}.sol` |
| Account factory | `contracts/src/aa/factory/CitrateWalletFactory.sol` |

## How to use it

Install the SDK. The account-abstraction helpers are re-exported from the package root as the `aa`
namespace.

```bash
npm install citrate-js
```

```typescript
import { aa } from 'citrate-js';
const {
  uuidToUserId,
  predictWalletAddress,
  encodeDeployFor,
  packInitCode,
  encodeExecuteSingle,
  buildPackedUserOp,
  getUserOpHash,
  signUserOpWithPasskey,
  signUserOpWithEoa,
  packCitratePaymasterAndData,
  PaymasterCategory,
  BundlerClient,
} = aa;
```

You will need chain 40204 (Citrate), the Citrate identity authority that issues the deploy permit (see
[identity](/aa/identity)), the Citrate bundler, and, for passkeys, a secure context (HTTPS or `localhost`)
where `navigator.credentials` is available. The end-to-end flow, with the symbol that implements each step,
all in `citrate-sdk-js/src/aa/`:

1. Derive the userId. `uuidToUserId(citrateUserId)` returns the 32-byte userId,
   `keccak256(utf8(lowercase uuid))` (`address.ts`). For other identity shapes, `accountIdToAaUserId`
   resolves a 32-byte hex, a 20-byte EOA, or a UUID to the userId.
2. Predict the address. `predictWalletAddress(factory, implementation, userId)` returns the one CREATE2
   address this user has on every surface (`address.ts`); it is the same value the factory's
   `predictAddress` returns on chain.
3. Build the first operation, which deploys the account. Fetch the permit from the identity authority, then
   `encodeDeployFor({ userId, initialValidator, initData, expiresAt, signature })` and
   `packInitCode(factory, factoryData)` build the `initCode` (`userop.ts`). Later operations use
   `initCode = '0x'`.
4. Build the call. `encodeExecuteSingle({ to, value, data })` or `encodeExecuteBatch(calls)` (`kernel.ts`).
5. Set the nonce. Read it from `EntryPoint.getNonce(sender, key)`. For the account's root validator use the
   sequence directly (`rootValidatorNonce`); for an installed validator build the key with
   `validatorNonceKey(validator)` (`kernel.ts`).
6. Build and hash. `buildPackedUserOp(args)` then `getUserOpHash(op, entryPoint, 40204n)` (`userop.ts`).
7. Sign. `signUserOpWithPasskey(userOpHash, opts)` in the browser, which drives
   `navigator.credentials.get()`, or `signUserOpWithEoa(signer, userOpHash)` with any ethers signer.
8. Submit. `new BundlerClient().sendUserOperation(op, entryPoint)`, then
   `waitForUserOperationReceipt(hash)` (`bundler.ts`).

## Reference

### Counterfactual address

`predictWalletAddress` computes the CREATE2 address the factory deploys to, without any chain read. The
salt is `keccak256(userId)`; the init code is Solady's 95-byte minimal ERC-1967 proxy with the account
implementation embedded, and the address is `keccak256(0xff ++ factory ++ salt ++ initCodeHash)[12..]`
(`address.ts`, `predictWalletAddress` and `erc1967MinimalInitCodeHash`). The SDK pins this against the live
factory on chain 40204 in its unit tests, and it matches the on-chain `predictAddress` byte for byte. The
practical effect: a user has a stable address from the moment they sign up, before any transaction exists.

### WebAuthnP256Validator, how a passkey authorizes an operation

The validator verifies a passkey assertion on chain through the vendored Daimo WebAuthn library. The SDK
encodes `userOp.signature` as `abi.encode(authenticatorData, clientDataJSON, challengeLocation,
responseTypeLocation, r, s)` and normalizes `s` into the lower half of the P-256 group order, because the
verifier rejects malleable high-`s` signatures (`webauthn.ts`, `normalizeP256S` and
`encodeWebauthnValidatorSignature`). `challengeLocation` is the byte index in `clientDataJSON` where the
exact substring `"challenge":"<base64url(userOpHash)>"` begins, and `responseTypeLocation` likewise for
`"type":"webauthn.get"`. On chain the operation hash is the WebAuthn challenge, so a passkey assertion is
only valid for the one operation it signed. The install payload is the 97-byte
`credentialIdHash | x | y | requireUserVerification` (`kernel.ts`, `webauthnInstallData`).

`signUserOpWithPasskey` is the browser path: it asks the platform authenticator (Face ID, Touch ID, Windows
Hello) to sign the operation hash, parses the DER ECDSA signature the assertion carries
(`parseDerEcdsaSignature`), and returns the encoded blob. The pure encoding and parsing helpers are
exported separately so they can be unit-tested without a browser.

### CitrateECDSAValidator, the EOA path

The ECDSA validator verifies a 65-byte secp256k1 signature over the operation hash, accepting both the raw
shape and the EIP-191 personal-sign shape. The SDK's `signUserOpWithEoa` emits the EIP-191 shape via an
ethers `signMessage`, which is what browser signers produce by default (`eoa.ts`). The install payload is
the 21-byte `owner | source` (`kernel.ts`, `ecdsaInstallData`, where `source` is the `EcdsaValidatorSource`
label `GuiNative`, `WalletExtension`, or `Other`). This path enrolls an existing local EOA as an authorized
signer on the account without importing its private key. One account can hold both a passkey and an EOA
validator; adding guardians is covered in [guardians](/aa/guardians).

### Kernel v3 account and the first operation

The account is a Kernel v3 modular account (ERC-7579). The factory's `deployFor` runs the account's
`initialize(bytes21 rootValidator, address hook, bytes validatorData, bytes hookData, bytes[] initConfig)`
on the fresh proxy, installing the chosen validator as the root (`kernel.ts`, `kernelInitializeCalldata`,
`packValidationId`). Calls are made through Kernel's `execute(bytes32 execMode, bytes executionCalldata)`,
single or batch. The Kernel nonce layout is `1B mode | 1B validator-type | 20B validator | 2B nonceKey | 8B
sequence`; `validatorNonceKey` builds the 192-bit key that routes an operation to an installed validator,
and the EntryPoint appends the 8-byte sequence. The first operation carries the factory `initCode`, so the
account deploys itself, installs its root validator, and runs its first call in one operation; every later
operation sets `initCode = '0x'`.

## Design rationale

A passkey is the right default because the private material never leaves the device's secure element, the
user authenticates with a fingerprint or face rather than a phrase to copy down, and the same credential
works across that user's platform. Verifying P-256 on chain is more work than secp256k1, which is why the
account delegates to an audited WebAuthn library and the SDK normalizes `s` rather than asking the verifier
to accept malleable signatures. The address is derived from the identity rather than the first signer so it
survives signer changes, and the account deploys on first use rather than at signup so an account that is
never used costs nothing to create.

## Failure modes

- Outside a secure context, or with no authenticator, `signUserOpWithPasskey` throws
  `WebAuthnSigningError`; run it in a browser served over HTTPS or `localhost`.
- A passkey assertion whose `clientDataJSON` lacks the expected challenge or is not a `webauthn.get` type is
  rejected by the encoder before it ever reaches the chain.
- A high-`s` signature would be rejected on chain; the SDK normalizes `s` so a correctly built operation
  does not hit that path.
- A first operation without the factory `initCode` will fail at the EntryPoint for an undeployed account;
  the deploy and the first call must travel together.
- The bundler enforces chain 40204; an operation built for another chain id will not verify, because the
  operation hash commits to the chain id.

## Access and canon

Public tier. This is the open builder reference for Citrate Keyring; a developer needs it to build, and
nothing here is a secret or a competitive moat. No private keys, mnemonics, credentials, or private
endpoints appear on this page. The deploy permit is fetched at runtime from the identity authority, whose
signing key never leaves it, and passkey private material never leaves the user's authenticator. The
paymaster policy, caps, and the bundler authentication topology are commercial tier, on
[paymaster](/aa/paymaster).

## Source and verification

- SDK: `citrate-sdk-js/src/aa/` at SHA `bc5a830`.
- Contracts: `citrate-chain/contracts/src/aa/` at SHA `9d5959e`.
- End to end: `citrate-chain/contracts/test/aa/` (operation-hash, WebAuthn, and guardian vectors); the
  SDK pins the address and operation-hash helpers against the live factory and EntryPoint v0.7 on chain
  40204 in `citrate-sdk-js/tests/unit/`.

Status: Implemented, pre-audit. The validators, factory, paymaster, recovery module, bundler, and the SDK
encoders shipped in the EW-S1 sprint and have not had a final external audit. Treat the surface as
experimental and do not custody material value on it until the audit closes. Re-verify symbols against the
source SHAs before relying on this page.
