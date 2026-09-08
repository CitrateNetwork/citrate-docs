---
title: Account-abstraction contracts
codex_slug: /aa/contracts
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src/aa/* (+ contracts/src/edu/Forwarder.sol)
surfaces: [SC-aa-wallet, SC-aa-factory, SC-aa-paymaster, SC-aa-validators, SC-aa-guardian]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The contract reference for Citrate Keyring, the account-abstraction stack that gives a Citrate user a
smart-contract account with no seed phrase. This is the on-chain half: the account implementation, the
account factory, the gas paymaster, two signer validators, and the guardian recovery module. It pairs with
the concept pages at [passkeys](/aa/passkeys), [guardians](/aa/guardians), [paymaster](/aa/paymaster), and
[identity](/aa/identity), and with the [JavaScript SDK](/sdks/js) that builds calldata against these
contracts.

## What it is

Citrate Keyring is an ERC-4337 v0.7 account-abstraction stack built on the ZeroDev Kernel v3.3 account
(ERC-7579 modules). A user does not hold a private key for an externally owned account. Instead they hold a
signer, a passkey or an EOA, that authorizes operations against a smart-contract account deployed for them.

The mental model has three pieces. The account contract (`CitrateWallet`) is one deployed implementation;
every user account is a minimal proxy that delegate-calls into it. The account factory
(`CitrateWalletFactory`) deploys those proxies at an address derived from the user's Citrate identity, so
the address is known before any deployment and is the same on every device. Validator modules decide which
signatures authorize an operation: an ECDSA validator for EOA signers and a WebAuthn-P256 validator for
passkeys. A paymaster can pay gas under per-account budgets, and a guardian module lets a quorum of trusted
addresses rotate the signer if the user loses it.

| Contract | Tier | Role |
|---|---|---|
| `CitrateWallet` | commercial | The Kernel v3.3 account implementation behind every proxy |
| `CitrateWalletFactory` | commercial | Identity-keyed CREATE2 deploy of account proxies |
| `CitratePaymaster` | commercial | Per-account, per-day budgeted gas sponsorship |
| `CitrateECDSAValidator` | commercial | secp256k1 EOA-signer validator module |
| `WebAuthnP256Validator` | commercial | Passkey (P-256, WebAuthn) validator module |
| `GuardianRecoveryModule` | commercial | M-of-N guardian recovery validator module |
| `Forwarder` (EIP-2771) | commercial | Sponsored meta-transaction forwarder, education surface |

This whole surface is pre-audit. The contracts carry inline ADR and remediation references and an
end-to-end Forge test, but they have not completed a final third-party audit, and addresses are not yet
listed. The status is honest per contract in [source and verification](#source-and-verification) below.

## How to use it

The lifecycle a surface drives, from signup to a first sponsored operation:

1. Derive the account address offline from the user's Citrate identity, before anything is deployed, with
   `CitrateWalletFactory.predictAddress(userId)`.
2. Obtain a deploy permit from the identity authority, then call `deployFor(...)` on the factory. The first
   operation carries this as its ERC-4337 `initCode`, so the account deploys itself on first use.
3. Register the new account with the paymaster (`registerWallet`), called by the registrar, so the
   paymaster will sponsor it.
4. Submit operations through the bundler. The account's installed validator checks the signature; the
   paymaster pays gas under the budget for the category the operation is tagged with.

The [JavaScript SDK](/sdks/js) builds the calldata for every step. The
[sign in with a passkey](/aa/tutorials/sign-in-with-a-passkey) tutorial walks the full path.

## Reference

### CitrateWallet

`contracts/src/aa/wallet/CitrateWallet.sol`. A Citrate-named adapter over ZeroDev's Kernel v3.3 account
(MIT). The factory deploys ERC-1967 minimal proxies that delegate-call into one deployment of this
contract; each user account is one such proxy. The Kernel v3 surface is preserved unchanged, so the
validators and the recovery module install and execute through the standard ERC-7579 module ABI. The
constructor takes the EntryPoint v0.7 address as an immutable and passes it to Kernel. The adapter does not
override the EIP-712 domain: signatures are already separated by the proxy address and chain id. It exists
to carry a Citrate-named symbol in artifacts and logs, and to hold any future Citrate-specific account
state in its own assembly storage slot rather than touching the vendored submodule.

### CitrateWalletFactory

`contracts/src/aa/factory/CitrateWalletFactory.sol`. Per `ADR-2026-06-05-ew-surface-interop`, the account
address must be stable across signer changes, so the CREATE2 salt is derived from the Citrate `userId`
alone, `keccak256(abi.encodePacked(userId))`, and init data is deliberately not mixed into the salt. The
trade-off, that a third party could otherwise deploy someone's `userId` with hostile init data, is closed
by requiring every deploy to carry an EIP-191 signature from a configured `identitySigner` operated by the
identity authority. The signature commits to `(this contract, chainId, userId, keccak256(initData),
expiresAt)`, so a leaked permit cannot be reused across users, deploys, or networks.

| Function | Visibility | Purpose |
|---|---|---|
| `predictAddress(userId)` | view | The deterministic account address; offline-computable |
| `deployFor(userId, initialValidator, initData, expiresAt, signature)` | payable | Permit-gated deploy; idempotent, returns the existing account if already deployed |
| `permitDigest(userId, initData, expiresAt)` | view | The digest the identity signer signs |
| `setIdentitySigner(newSigner)` | owner | Rotate the permit signer |
| `transferOwnership(newOwner)` | owner | Transfer ownership |

`initialValidator` is informational, recorded in the event for dashboards; `initData` is the source of
truth for which validator the account installs. The deploy uses Solady `LibClone.createDeterministicERC1967`
over a 95-byte minimal proxy. Immutable: `implementation`. State: `identitySigner`, `owner`. Events:
`AccountDeployed`, `IdentitySignerRotated`, `OwnerTransferred`. Errors: `ImplementationNotDeployed`,
`PermitExpired`, `InvalidSigner`, `InitializeFailed`, `ZeroAddress`, `NotOwner`.

### CitratePaymaster

`contracts/src/aa/paymaster/CitratePaymaster.sol`, extending `@account-abstraction` `BasePaymaster`. Per
`ADR-2026-06-05-ew-paymaster-policy` it sponsors gas in three categories, and every sponsored operation
carries a signed suffix on `paymasterAndData` after the ERC-4337 v0.7 prefix of paymaster address and two
packed gas limits: a one-byte category at offset 52 (`0x00` standard, `0x01` recovery, `0x02` first-op), a
`[validAfter, validUntil]` window, and a 65-byte ECDSA signature from the paymaster's `sponsorSigner`. The
signature binds the chain id, this paymaster, the sender, the category, the window, and the operation nonce,
so it is single-use for one operation. Standard and recovery operations additionally require a registered
account; first-op is authorized by the signature alone, so a counterfactual account's first operation is
sponsorable before registration. All budgets are denominated in WEI.

| Surface | Members |
|---|---|
| Hooks (override) | `_validatePaymasterUserOp`, `_postOp` |
| Admin (owner) | `setRegistrar`, `setSponsorSigner`, `setPaused`, `setDailyCap`, `setRecoveryEventCap`, `setFirstOpCap`, `setRecoveryDailyCountCap`, `setMaxFeePerGasCeiling`, `setGlobalDailyCap` |
| Registrar only | `registerWallet(account)`, `unregisterWallet(account)` |
| Views | `todayKey()`, `remainingStandard(account)`, `sponsorDigest(...)`, plus `dailyUsage`, `isRegistered`, `hasUsedFirstOp`, `registrar`, `sponsorSigner`, `paused`, `dailyCap`, `recoveryEventCap`, `firstOpCap`, `recoveryDailyCountCap`, `maxFeePerGasCeiling`, `globalDailyCap` |

`_validatePaymasterUserOp` fails closed: it reverts when paused, when the sponsor signature is missing or
does not recover to `sponsorSigner`, when the current time is outside the signed window, when the operation's
`maxFeePerGas` exceeds `maxFeePerGasCeiling`, when the day's aggregate spend would exceed `globalDailyCap`,
when a standard or recovery account is not registered, when the category tag is missing or unknown, or when
the relevant per-account budget cannot cover the EntryPoint-reported `maxCost`. Every budget is reserved
during validation so that same-bundle sibling operations cannot each pass against a stale counter. A standard
operation draws from a per-account daily WEI allowance that resets at the next UTC day; recovery draws a
per-event budget, bounded by a per-account daily recovery-op count, that never touches the daily counter; the
first operation is sponsored once per account under a per-call cap. `_postOp` trues the reserved cost up to
the actual gas cost and flips the first-op flag. Events: `WalletRegistered`, `WalletUnregistered`,
`RegistrarSet`, `SponsorSignerSet`, `SponsorshipUsed`, `PausedSet`, `DailyCapSet`, `RecoveryEventCapSet`,
`FirstOpCapSet`, `RecoveryDailyCountCapSet`, `MaxFeePerGasCeilingSet`, `GlobalDailyCapSet`. The full policy
and the bundler topology are on [paymaster](/aa/paymaster).

### CitrateECDSAValidator

`contracts/src/aa/validators/CitrateECDSAValidator.sol`, an `IValidator` and `IHook` module that binds one
owner EOA per install. This is the path a surface uses to enroll an existing local EOA as an authorized
signer on the account without importing the EOA's private key; the EOA simply signs operation hashes.
Install data is 21 bytes, `address owner | uint8 source`, where `source` is metadata only (`Unknown`,
`GuiNative`, `WalletExtension`, `Other`) for dashboard display. `validateUserOp` accepts a raw 65-byte
ECDSA signature over the operation hash or the EIP-191 prefixed variant. EIP-1271 is served by
`isValidSignatureWithSender`. Lifecycle: `onInstall`, `onUninstall`, `isModuleType`, `isInitialized`; the
hooks `preCheck` and `postCheck` are no-ops. View: `ownerOf(smartAccount)`. Events: `OwnerRegistered`,
`OwnerUninstalled`. Errors: `AlreadyInstalled`, `InvalidInstallData`, `InvalidOwner`.

### WebAuthnP256Validator

`contracts/src/aa/validators/WebAuthnP256Validator.sol`, an `IValidator` and `IHook` passkey module that
stores one P-256 passkey per install: a public key `(x, y)`, a `credentialIdHash`, and a
`requireUserVerification` flag. Install data is 97 bytes, `bytes32 credentialIdHash | uint256 x | uint256 y
| uint8 requireUserVerification`; the contract reverts on any other length and on a zero key.
`validateUserOp` ABI-decodes `(authenticatorData, clientDataJSON, challengeLocation, responseTypeLocation,
r, s)` and delegates to the vendored Daimo WebAuthn library, which checks the authenticator flags (user
presence, and user verification if required), that the client-data type is `webauthn.get`, that the
challenge equals the operation hash, and the P-256 signature itself. EIP-1271 is served by
`isValidSignatureWithSender`. View: `passkeyOf(smartAccount)`. Events: `PasskeyRegistered`,
`PasskeyUninstalled`. Errors: `AlreadyInstalled`, `InvalidInstallData`, `PreCheckSenderMismatch`. The
verification helpers live under `contracts/src/aa/lib/webauthn/` (`WebAuthn.sol`, `P256.sol`,
`Base64URL.sol`). See [passkeys](/aa/passkeys).

### GuardianRecoveryModule

`contracts/src/aa/recovery/GuardianRecoveryModule.sol`, an `IValidator` and `IHook` module for M-of-N
recovery. Per `ADR-2026-06-05-ew-recovery` the user nominates N guardians at install (minimum 2, maximum 7)
and a threshold M; install data is `uint8 threshold | uint8 count | address[count]`, and duplicate or zero
guardians revert. Citrate is never a guardian. `validateUserOp` expects a signature blob of exactly
`threshold × 65` concatenated ECDSA signatures over the digest `keccak256(userOpHash || account)`, bound to
both the operation and the account so a recovery signature cannot be replayed on another account that
shares a guardian. Each guardian counts once, deduplicated by a bitmap, and both raw and EIP-191 signature
shapes are tried. EIP-1271 returns `ERC1271_INVALID`, because recovery is an operation-only path. Lifecycle:
`onInstall`, `onUninstall`. View: `configOf(smartAccount)` returns `(threshold, guardians[])`. Events:
`GuardiansRegistered`, `GuardiansUninstalled`. Errors: `AlreadyInstalled`, `InvalidInstallData`,
`InvalidGuardianCount`, `InvalidThreshold`, `DuplicateGuardian`, `ZeroGuardian`, `MalformedSignatureBlob`.
The chain enforces only M-of-N; the SDK constrains the action to a signer rotation. See
[guardians](/aa/guardians).

### Forwarder, EIP-2771, cross-reference

`contracts/src/edu/Forwarder.sol`. The EIP-2771 meta-transaction forwarder for sponsored student actions
lives in the education stack, not under `aa/`. It is the relayer path for the classroom surface, distinct
from the ERC-4337 stack above, and is documented here only as a cross-reference; it is not part of Citrate
Keyring and is not relocated.

```solidity
// 1. Deploy the account for a Citrate user (permit signed off-chain by the identity authority).
address account = factory.deployFor(userId, ecdsaValidator, initData, expiresAt, sig);

// 2. Register it with the paymaster (called by the registrar / factory).
paymaster.registerWallet(account);

// 3. The account then submits sponsored operations through the bundler with the
//    category tag: 0x00 standard, 0x01 recovery, 0x02 first-op.
```

## Design rationale

The address is derived from the Citrate identity alone, not from the initial signer, because a user should
see one account address on every device and keep it when they rotate a signer or add a passkey. That choice
opens a deploy-squatting risk, which the required identity-signer permit closes: a deploy is only valid if
the identity authority signed off on the exact init data and an expiry. Sponsorship is budgeted and fails
closed rather than open, so a misconfigured or exhausted budget refuses an operation at validation rather
than silently draining the paymaster. Recovery binds each guardian signature to both the operation and the
account, so guardians shared across accounts cannot be turned into a cross-account replay. The account
itself is a thin adapter over an audited upstream account, which keeps Citrate-specific code in one file and
lets upstream patches arrive through the submodule.

## Failure modes

- A deploy with an expired or wrong-signer permit reverts (`PermitExpired`, `InvalidSigner`); the account
  is never created with hostile init data.
- An unregistered account, a missing or unknown category tag, or a budget too small for `maxCost` reverts
  at `_validatePaymasterUserOp`; the operation is refused, not sponsored on credit.
- The first-op category is single-use per account (`FirstOpAlreadyUsed`), so it cannot be replayed to dodge
  the daily cap.
- A WebAuthn install with the wrong length or a zero key reverts (`InvalidInstallData`); a high-`s`
  signature is rejected by the P-256 verifier, which the SDK pre-empts by normalizing `s`.
- A recovery blob of the wrong length, a non-guardian signer, or a repeated guardian fails validation; the
  signer rotation does not execute.

## Access and canon

Commercial tier. This is the implementation depth a competitor would want to clone, identity-keyed deploy,
fail-closed sponsorship, per-surface validators, and recovery, so it is gated to contracted builders. No
secrets appear here: `identitySigner`, `registrar`, and `owner` are roles, not keys, and no private keys,
mnemonics, or internal endpoints are present. The identity authority is named as an operator role. Every
node operator and machine on the public network is identity-verified through VERI, Citrate's in-house verification; Citrate keeps the
verification result, not the personal data behind it.

## Source and verification

Source repo `citrate-chain`, files under `contracts/src/aa/`: `wallet/CitrateWallet.sol`,
`factory/CitrateWalletFactory.sol`, `paymaster/CitratePaymaster.sol`,
`validators/CitrateECDSAValidator.sol`, `validators/WebAuthnP256Validator.sol`,
`recovery/GuardianRecoveryModule.sol`, and `lib/webauthn/{WebAuthn,P256,Base64URL}.sol`. The EIP-2771
forwarder is `contracts/src/edu/Forwarder.sol`. Audited against SHA `9d5959e`.

Status: Implemented, pre-audit. The contracts exist and pass an end-to-end Forge test under
`contracts/test/aa/`, but have not had a final external audit and are not yet deployed at listed addresses.
Do not custody material value on this surface until the audit closes.
