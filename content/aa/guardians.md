---
title: Guardians & Social Recovery
codex_slug: /aa/guardians
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-identity/src/aa/guardians.ts + guardian-routes.ts
surfaces: [ID-guardians, SC-aa-guardian]
audited_against_sha: 4aa869c
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Guardians & Social Recovery

> How a Citrate embedded-wallet user nominates guardians and recovers their
> account with M-of-N approval, without a seed phrase, and **without Citrate
> ever being a guardian**. For integrators building recovery UX.

> **Status: pre-audit.** The guardian nomination service, the recovery module,
> and the end-to-end install path shipped in EW-S1 (WP-10) and are **not yet
> third-party audited**. The wire shape is proven in
> `citrate-chain/test/aa/GuardianRecoveryE2E.t.sol` but treat the stack as
> experimental.

> **Transclusion note.** This is a draft of a `transcluded` reference, the truth
> lives in `citrate-identity/src/aa/guardians.ts` + `guardian-routes.ts` (and the
> on-chain `GuardianRecoveryModule`). Final wiring (S6) points Codex at the source
> repo at its SHA. Summarized + linked per Rule 9, not copied.

## Overview

Citrate uses **social recovery**: a user names a small set of trusted **guardian
EOAs** and an **M-of-N threshold**. If they lose their signing device, M of their
N guardians can approve a recovery that rotates the wallet's validator to a new
key. The Kernel `GuardianRecoveryModule` enforces it on-chain.

The defining invariant (`ADR-2026-06-05-ew-recovery`): **Citrate is never a
guardian.** The nomination service stores only user-chosen addresses and
*defensively refuses* the authority's own identity-signer address.

## Reference

Source: `citrate-identity/src/aa/guardians.ts` + `aa/guardian-routes.ts` @
`4aa869c`; on-chain `citrate-chain/contracts/src/aa/recovery/GuardianRecoveryModule.sol`.

### Nomination rules (`normalizeNomination`)

- **2–7 guardians**, each a valid EOA address; **duplicates rejected**;
  normalized to lowercase.
- **Threshold M** an integer in `[1, N]` where N = guardian count.
- The **forbidden set** (the authority's identity-signer address) is refused with
  a clear error, mirrors the contract's bounds so the user sees the failure at
  nomination time, not as a revert at deploy.

### How it gets on-chain (install at first deploy)

1. **`POST /auth/guardians`**, from the post-sign-in page, gated by the live OIDC
   interaction cookie (same posture as password/WebAuthn routes). Stores the
   nomination bound to the authenticated account.
2. **`GET /aa/guardians`**, Bearer-gated to the caller's own `sub`. Returns the
   stored nomination and, when the recovery-module address is configured, a
   ready-to-append Kernel **`initConfig`** entry (an `installModule` self-call for
   the `GuardianRecoveryModule`, including the `execute`-selector grant non-root
   validators require).
3. The SDK appends that `initConfig` entry to the wallet's `initialize()` calldata
   so guardians are installed at the wallet's **first deploy**, no extra
   transaction. The exact wire shape is proven in
   `citrate-chain/test/aa/GuardianRecoveryE2E.t.sol`.

The on-chain install payload is `uint8 threshold | uint8 count |
address[count]` (`citrate-sdk-js/src/aa/kernel.ts` `guardianInstallData`,
2–7 bounds enforced there too).

### Recovery & the paymaster

Recovery UserOps are tagged with the paymaster **Recovery** category, which draws
from a separate per-event budget so recovery succeeds even when the user's daily
sponsorship allowance is spent (see [Paymaster](/aa/paymaster)).

## Examples

```ts
// 1. User nominates guardians (interaction-cookie gated; from the post-signin page)
await fetch('https://auth.citrate.ai/auth/guardians', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    guardians: ['0xGuardianA…', '0xGuardianB…', '0xGuardianC…'],
    threshold: 2, // 2-of-3
  }),
});

// 2. SDK reads the install entry to append to the wallet's first deploy
const res = await fetch('https://auth.citrate.ai/aa/guardians', {
  headers: { authorization: `Bearer ${accessToken}` },
});
const { nominated, guardians, threshold, initConfig } = await res.json();
// initConfig (when present) is appended to kernelInitializeCalldata({ ..., initConfig })
```

## Security & access

**Tier: commercial.** Recovery UX + the install seam are integrator depth a
contracted builder should have; the public conceptual story lives alongside
[Passkeys](/aa/passkeys).

No secrets here. No keys or credentials appear on this page. The nomination
service stores **only** user-chosen guardian addresses; it refuses the Citrate
authority's own signer as a guardian (the system is non-custodial of recovery).

## Source & verification

- Nomination logic: `citrate-identity/src/aa/guardians.ts` @ `4aa869c`
- HTTP surface: `citrate-identity/src/aa/guardian-routes.ts` @ `4aa869c`
- Install encoder: `citrate-sdk-js/src/aa/kernel.ts` (`guardianInstallData`) @ `bc5a830`
- On-chain module + E2E: `citrate-chain/contracts/src/aa/recovery/GuardianRecoveryModule.sol`,
  `test/aa/GuardianRecoveryE2E.t.sol` @ `03d7851`

Pre-audit. Re-verify against the source SHAs before relying on this page.
