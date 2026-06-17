---
title: Account-Abstraction Contracts
codex_slug: /aa/contracts
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts/src/aa/* (+ contracts/src/edu/Forwarder.sol)
surfaces: [SC-aa-forwarder, SC-aa-factory, SC-aa-paymaster, SC-aa-validators, SC-aa-guardian]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Account-Abstraction Contracts

> The contract reference for Citrate's embedded-wallet (EW-S1) stack: wallet
> factory, paymaster, signer validators, social-recovery module, and the
> EIP-2771 forwarder. Pairs with the conceptual pages at `/aa/identity`,
> `/aa/passkeys`, `/aa/guardians`, and `/aa/paymaster`.

## Overview

Citrate's smart wallet is a fork of ZeroDev **Kernel v3** (ERC-4337 v0.7 +
ERC-7579 modules). A user's wallet address is derived from their Citrate
`userId` alone (stable across signer changes); each surface (gui-native,
wallet-extension, passkey) installs its own validator module.

| Contract | Tier | Role |
|---|---|---|
| `CitrateWalletFactory` | commercial | Identity-keyed CREATE2 deploy of Kernel proxies |
| `CitratePaymaster` | commercial | Per-user-per-day budgeted gas sponsorship |
| `CitrateECDSAValidator` | commercial | secp256k1 EOA-signer validator module |
| `WebAuthnP256Validator` | commercial | Passkey (P-256 / WebAuthn) validator module |
| `GuardianRecoveryModule` | commercial | M-of-N social-recovery validator module |
| `Forwarder` (EIP-2771) | commercial | Sponsored meta-tx forwarder (edu surface) |

> **Status: pre-audit.** These are EW-S1 contracts carrying inline ADR and
> remediation references; they have **not** completed a final third-party audit.
> A known design caveat is documented in `CitrateWalletFactory` (see below).
> Addresses are not yet listed (pre-deployment).

## Reference

### CitrateWalletFactory
`contracts/src/aa/factory/CitrateWalletFactory.sol`. Per
`ADR-2026-06-05-ew-surface-interop`, salt = `keccak256(abi.encodePacked(userId))`
— **init data is deliberately not mixed into the salt** so the address is stable.
To stop a third party deploying someone else's `userId` with hostile init data,
every deploy requires an EIP-191 signature from a configured `identitySigner`
(operated by `auth.citrate.ai`) committing to `(this, chainId, userId,
keccak256(initData), expiresAt)`.

Functions:
- `predictAddress(userId)` — view; offline-computable deterministic address
- `deployFor(userId, initialValidator, initData, expiresAt, signature)` —
  `payable`; permit-gated, idempotent (returns existing account if already
  deployed). `initialValidator` is informational (for the event), not the source
  of truth — `initData` instructs the Kernel which validator to install
- `permitDigest(userId, initData, expiresAt)` — view; the digest the signer signs
- `setIdentitySigner(newSigner)` / `transferOwnership(newOwner)` — `owner` only

Public state: `implementation` (immutable Kernel v3), `identitySigner`, `owner`.
Events: `AccountDeployed`, `IdentitySignerRotated`, `OwnerTransferred`.
Errors: `ImplementationNotDeployed`, `PermitExpired`, `InvalidSigner`,
`InitializeFailed`, `ZeroAddress`, `NotOwner`.

### CitratePaymaster
`contracts/src/aa/paymaster/CitratePaymaster.sol` — extends `@account-abstraction`
`BasePaymaster`. Three sponsorship categories selected by a 1-byte tag at offset
52 of `paymasterAndData` (after the ERC-4337 v0.7 prefix): `0x00` standard,
`0x01` recovery, `0x02` first-op. Only `registrar`-registered wallets are
sponsorable.

Hooks (override): `_validatePaymasterUserOp` (fail-closed: reverts on pause,
unregistered account, missing/unknown tag, or cap exceeded) and `_postOp`
(records actual gas against the daily counter for standard ops; flips the
first-op flag).

Admin (`onlyOwner`): `setRegistrar`, `setPaused`, `setDailyCap`,
`setRecoveryEventCap`, `setFirstOpCap`. Registrar-only: `registerWallet(account)`,
`unregisterWallet(account)`. Views: `todayKey()`, `remainingStandard(account)`;
public mappings `dailyUsage`, `isRegistered`, `hasUsedFirstOp`; `registrar`,
`paused`, `dailyCap`, `recoveryEventCap`, `firstOpCap`.

Events: `WalletRegistered`, `WalletUnregistered`, `RegistrarSet`,
`SponsorshipUsed`, `PausedSet`, `DailyCapSet`, `RecoveryEventCapSet`,
`FirstOpCapSet`. (See `/aa/paymaster` for the full policy + bundler topology.)

### CitrateECDSAValidator
`contracts/src/aa/validators/CitrateECDSAValidator.sol` — `IValidator` + `IHook`
module binding ONE owner EOA per install. Install data is `address owner | uint8
source` (21 bytes); `Source` is metadata only (`GuiNative`, `WalletExtension`,
`Other`). `validateUserOp` accepts a raw 65-byte ECDSA sig over `userOpHash` or
the EIP-191-prefixed variant; EIP-1271 via `isValidSignatureWithSender`.

Lifecycle: `onInstall`, `onUninstall`, `isModuleType`, `isInitialized`. Hooks
`preCheck`/`postCheck` are no-ops. Public `ownerOf(smartAccount)`.
Events: `OwnerRegistered`, `OwnerUninstalled`. Errors: `AlreadyInstalled`,
`InvalidInstallData`, `InvalidOwner`.

### WebAuthnP256Validator
`contracts/src/aa/validators/WebAuthnP256Validator.sol` — `IValidator` + `IHook`
passkey module; one P-256 passkey `(x, y)` + `credentialIdHash` per install
(install data 97 bytes: `credentialIdHash | x | y | uint8 requireUV`).
`validateUserOp` ABI-decodes `(authenticatorData, clientDataJSON,
challengeLocation, responseTypeLocation, r, s)` and delegates to the Daimo
`WebAuthn` library (`../lib/webauthn/`), which checks UP/UV flags, the
`"webauthn.get"` type, the challenge == `userOpHash`, and the P-256 signature.
EIP-1271 via `isValidSignatureWithSender`.

Public `passkeyOf(smartAccount)`. Events: `PasskeyRegistered`,
`PasskeyUninstalled`. Errors: `AlreadyInstalled`, `InvalidInstallData`,
`PreCheckSenderMismatch`. (See `/aa/passkeys`.)

### GuardianRecoveryModule
`contracts/src/aa/recovery/GuardianRecoveryModule.sol` — `IValidator` + `IHook`
M-of-N social recovery. Guardians: min 2, max 7. Install data is
`uint8 threshold | uint8 count | address[count]` (2 + 20×count bytes); duplicate
or zero guardians revert. Citrate is never a guardian.

`validateUserOp` checks a blob of exactly `threshold × 65` concatenated ECDSA
signatures against the digest `keccak256(userOpHash || account)` (bound to both
the UserOp and the account to prevent cross-wallet replay); each guardian counts
once (bitmap dedup); raw and EIP-191 signature shapes are both tried. EIP-1271
returns `ERC1271_INVALID` (recovery is UserOp-only).

Lifecycle `onInstall`/`onUninstall`; view `configOf(smartAccount)` →
`(threshold, guardians[])`. Events: `GuardiansRegistered`, `GuardiansUninstalled`.
Errors: `AlreadyInstalled`, `InvalidInstallData`, `InvalidGuardianCount`,
`InvalidThreshold`, `DuplicateGuardian`, `ZeroGuardian`, `MalformedSignatureBlob`.
(See `/aa/guardians`.)

### Forwarder (EIP-2771)
`contracts/src/edu/Forwarder.sol` — EIP-2771 meta-transaction forwarder for
sponsored student actions (the edu/classroom surface; implements the 8 invariants
of `Q-006 ForwarderReplaySafety.tla`). EIP-712 domain `"CitrateEduForwarder"` v1.

> **Path note:** the registry lists this at `contracts/src/aa/Forwarder.sol`, but
> no Forwarder exists under `aa/`. The actual file is
> `contracts/src/edu/Forwarder.sol`. See registry corrections below.

Functions:
- `execute(ForwardRequest request, bytes signature)` — `onlyRelayer`; enforces
  nonce monotonicity, no-replay (consumed tx-hash set), device binding +
  principal-not-revoked (via `IClassroomCluster`), session expiry, and
  "relayer cannot call the vault" (CEI ordering)
- Admin (`onlyGovernance`): `addRelayer`, `removeRelayer`, `setTargetAllowed`,
  `setClusterContract`, `setVaultAddress`
- Two-step governance (closes RFI26-05): `proposeGovernance(newGovernance)` then
  `acceptGovernance()`
- Views: `getNonce(orgPrincipalId, classroomId)`, `isAuthorizedRelayer`,
  `isAllowedTarget`, `DOMAIN_SEPARATOR()`, `hashForwardRequest(request)`,
  `FORWARD_REQUEST_TYPEHASH`

Public state: `governance`, `pendingGovernance`, `clusterContract`,
`vaultAddress`. Events: `MetaTxExecuted`, `TargetAllowedUpdated`,
`GovernanceProposed`, `GovernanceAccepted` (`MetaTxExecuted` /
`TargetAllowedUpdated` are declared on `IForwarder`).

## Examples

```solidity
// 1. Deploy a wallet for a Citrate user (permit signed off-chain by auth.citrate.ai)
address wallet = factory.deployFor(userId, ecdsaValidator, initData, expiresAt, sig);

// 2. Register it with the paymaster (called by the registrar/factory)
paymaster.registerWallet(wallet);

// 3. The wallet then submits sponsored UserOps via the bundler with the
//    appropriate category tag (0x00 standard / 0x01 recovery / 0x02 first-op).
```

## Tutorials

See `/aa/tutorials` for the embedded-wallet onboarding and recovery walkthroughs.

## Security & access

**Tier: commercial.** This is the embedded-wallet implementation depth a
competitor would want to clone (identity-keyed deploy, fail-closed sponsorship,
per-surface validators, social recovery), gated to contracted builders. **No
secrets here** — `identitySigner` and the `registrar`/`owner` are roles, not
keys; no private keys, mnemonics, or internal endpoints are present.
`auth.citrate.ai` is named as the operator role, not a credential. **Pre-audit:**
the `CitrateWalletFactory` salt-without-initData design is mitigated by the
required `identitySigner` permit but should be re-reviewed in the final audit.

## Source & verification

Source repo: `citrate-chain`, files under `contracts/src/aa/`
(`factory/CitrateWalletFactory.sol`, `paymaster/CitratePaymaster.sol`,
`validators/CitrateECDSAValidator.sol`, `validators/WebAuthnP256Validator.sol`,
`recovery/GuardianRecoveryModule.sol`) plus `contracts/src/edu/Forwarder.sol`.
Audited against SHA `03d7851`.
