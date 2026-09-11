---
title: Guardians and social recovery
codex_slug: /aa/guardians
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-identity/src/aa (guardians.ts, guardian-routes.ts, install-data.ts) + contracts/src/aa/recovery/GuardianRecoveryModule.sol
surfaces: [ID-guardians, SC-aa-guardian]
audited_against_sha: 9664fa8
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Social recovery is how a person gets back into their Citrate Keyring after losing their signing device,
without a seed phrase and without trusting Citrate to hold a spare key. The person names a small set of
people they trust, their guardians, and a threshold of those guardians can together approve a recovery. If
you build the recovery experience, this is the page you build against.

## What it is

A person nominates between two and seven guardians, each an address they control or trust, and an M-of-N
threshold. If they lose their device, M of their N guardians sign a recovery operation that rotates the
account's signing key to a new one. The on-chain `GuardianRecoveryModule` enforces the threshold; the
identity service holds the nomination until it can ride on-chain with the account's first deploy.

One rule sits above all of this, and it is enforced in code, not just stated as policy: **Citrate is never
a guardian.** A person chooses their own guardians. The nomination service stores only the addresses the
person chose, and it defensively refuses the authority's own signer address if it is ever submitted, with a
clear error citing `ADR-2026-06-05-ew-recovery`. The recovery contract grants no role to the deployer or to
anyone other than the account. Recovery is non-custodial; there is no key Citrate could hand over or be
compelled to hand over.

## How to use it

The flow has three steps: nominate, install, recover.

1. **Nominate.** From the page shown just after sign-in, the person posts their chosen guardians and
   threshold to `POST /auth/guardians`. The request is gated by the live sign-in interaction cookie, the
   same gate the password and passkey routes use, so the nomination binds to the authenticated account.

   ```ts
   await fetch('https://auth.citrate.ai/auth/guardians', {
     method: 'POST',
     headers: { 'content-type': 'application/json' },
     body: JSON.stringify({
       guardians: ['0xGuardianA', '0xGuardianB', '0xGuardianC'],
       threshold: 2, // two of three
     }),
   });
   ```

2. **Install.** The SDK reads the nomination back from `GET /aa/guardians`, gated by the caller's own
   access token. When the recovery-module address is configured, the response carries a ready-to-use
   `initConfig` entry: a Kernel `installModule` call for the `GuardianRecoveryModule`. The SDK appends that
   entry to the account's `initialize` calldata, so guardians are installed at the account's first deploy
   with no extra transaction.

   ```ts
   const res = await fetch('https://auth.citrate.ai/aa/guardians', {
     headers: { authorization: `Bearer ${accessToken}` },
   });
   const { nominated, guardians, threshold, initConfig } = await res.json();
   // append initConfig (when present) to the account's initialize() calldata
   ```

3. **Recover.** If the device is lost, the person builds a recovery operation whose call data rotates the
   account to a fresh signing key. M guardians sign the recovery digest, and their signatures are
   concatenated into the operation's signature field. The module verifies them on-chain and, if at least M
   distinct guardians signed, the rotation succeeds. Recovery operations are sponsored from a separate
   budget so they work even when a person's daily sponsorship is spent; see [Paymaster](/aa/paymaster).

## Reference

### Nomination rules

Off-chain, `normalizeNomination` in `citrate-identity/src/aa/guardians.ts` validates a nomination before it
is stored. The same bounds are enforced again on-chain so a person sees a failure at nomination time, not as
a revert at deploy.

| Rule | Value |
|---|---|
| Guardian count | between 2 and 7 |
| Threshold M | an integer in `[1, N]`, where N is the guardian count |
| Duplicates | rejected |
| Address form | normalized to lowercase, each a valid address |
| Forbidden | the authority's own signer address is refused, "the Citrate authority cannot be a guardian" |

The install payload is packed by `guardianInstallData` in `src/aa/install-data.ts` as `uint8 threshold |
uint8 count | address[count] guardians`, two bytes followed by twenty bytes per guardian. The same 2-to-7
and `[1, N]` bounds are enforced there too.

### HTTP routes

| Route | Method | Gate | Source |
|---|---|---|---|
| `/auth/guardians` | POST | sign-in interaction cookie | `src/aa/guardian-routes.ts` |
| `/aa/guardians` | GET | Bearer access token, own subject | `src/aa/guardian-routes.ts` |

### GuardianRecoveryModule

The contract is at `contracts/src/aa/recovery/GuardianRecoveryModule.sol`. It is a Kernel module that acts
as both a validator and a hook.

| Function | Purpose |
|---|---|
| `onInstall(bytes data)` | reads `threshold \| count \| guardians`, checks count in `[2, 7]` and threshold in `[1, N]`, stores the config, emits `GuardiansRegistered` |
| `onUninstall(bytes)` | clears the config, emits `GuardiansUninstalled` |
| `configOf(address account)` | returns the threshold and guardian list in install order |
| `isInitialized(address account)` | true when a config is stored |
| `isModuleType(uint256 typeID)` | true for the validator and hook module types |
| `validateUserOp(PackedUserOperation op, bytes32 opHash)` | the recovery check: succeeds when at least M distinct guardians signed |
| `isValidSignatureWithSender(...)` | always rejects; recovery is an operation-only path, not a sign-anything path |

The threshold model is stored as `uint8 threshold` (M) and `uint8 count` (N) with a fixed `address[7]`
guardian slot. In `validateUserOp` the module computes a recovery digest over the operation hash bound to
the account, expects M concatenated 65-byte signatures, recovers each one, and matches it against the
guardian set. Both plain key signatures and EIP-1271 contract signatures are honored, so a guardian can be
a person's key or another smart-contract account. A bitmap tracks which guardians have signed, so a repeated
signature from the same guardian does not count twice. Validation succeeds only when the count of distinct
confirming guardians reaches M. There is no timelock; the check is synchronous within the operation.

## Design rationale

A seed phrase is a single point of failure that a person carries alone. Social recovery spreads that trust
across people the person already knows, with a threshold so that no single guardian can move the account and
losing one guardian does not lock the person out. We cap guardians between two and seven because the lower
bound rules out a one-guardian setup that is no better than a single key, and the upper bound keeps the
on-chain signature check cheap, M signatures of 65 bytes each, with a one-byte bitmap big enough for seven.
We forbid Citrate from being a guardian, in code, because the moment the authority could approve a recovery
it would become a custodian and a target; keeping that impossible is the point of the design. Installing the
module at first deploy means guardians cost the person no extra transaction.

## Failure modes

- **Below threshold.** If fewer than M guardians sign, `validateUserOp` returns failure and the rotation
  does not happen. Recovery fails closed.
- **A guardian signs twice.** The signing bitmap counts each guardian once, so duplicate signatures cannot
  reach the threshold on their own.
- **A submitted guardian is the authority.** The nomination is rejected with a clear error before it is
  stored, and again at install if it somehow reached the chain.
- **Bounds at the edge.** Counts outside 2 to 7, or a threshold outside `[1, N]`, are rejected both
  off-chain and on-chain, so a person sees the error at nomination rather than at deploy.
- **Secrets.** The nomination service stores only the addresses the person chose. No key or credential
  appears in Citrate Almanac.

## Access and canon

Commercial. The recovery experience and the install seam are the depth a contracted builder needs. The
public, conceptual account of recovery lives alongside [Passkeys](/aa/passkeys), and the on-chain account
model is in [contracts](/aa/contracts). Recovery is non-custodial by construction: Citrate holds no
guardian role and no spare key.

## Source and verification

| Surface | Source | Status |
|---|---|---|
| Nomination rules and store | `citrate-identity/src/aa/guardians.ts` | Implemented (pre-audit) |
| HTTP routes | `citrate-identity/src/aa/guardian-routes.ts` | Implemented (pre-audit) |
| Install payload encoder | `citrate-identity/src/aa/install-data.ts` | Implemented (pre-audit) |
| Recovery module | `contracts/src/aa/recovery/GuardianRecoveryModule.sol` | Implemented (pre-audit) |
| End-to-end recovery | `test/aa/GuardianRecoveryE2E.t.sol` | Verified (testnet 40204) |

Off-chain surfaces verified against `citrate-identity` at `9664fa8`; the recovery contract and its
end-to-end test verified against the `citrate-chain` contracts repo at `9d5959e`. The "Citrate is never a guardian"
invariant is enforced in `guardians.ts` and in the contract install. The stack has shipped and is exercised
end to end, deploy through M-of-N recovery through a fresh-key operation, but has not had an external audit.
Re-verify against the SHAs before relying on this page.
