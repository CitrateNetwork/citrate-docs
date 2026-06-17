---
title: Citrate Identity, OIDC Issuer & Claims
codex_slug: /aa/identity
tier: public
org_scope: ~
source_kind: authored
source: citrate-identity/src/server.ts + src/config.ts
surfaces: [ID-oidc, ID-entitlement, ID-kyc]
audited_against_sha: 4aa869c
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Identity, OIDC Issuer & Claims

> Citrate's identity authority is a standard **OpenID Connect** provider at
> `auth.citrate.ai`. It logs a user in (passkey, email/password, Google, or
> SIWE) and issues ID/access tokens carrying their canonical smart-wallet
> address. For RP (relying-party) developers integrating Citrate sign-in.

> **Status: pre-audit.** The identity authority shipped across the IDP / EW-S1
> sprints and is **not yet third-party audited**. Some surfaces noted below are
> *planned* (the `entitlement` claim) or env-gated (Google federation); they are
> marked as such.

## Overview

`citrate-identity` is the `oidc-provider` (panva) authority for the federation
(`src/server.ts`, `src/config.ts` @ `4aa869c`). It is a **generic OIDC issuer**:
RPs integrate it like any OIDC provider via discovery at
`/.well-known/openid-configuration` and the JWKS at `/jwks`. The reference RP is
`citrate-explorer` (public client, Authorization Code + PKCE/S256, refresh-token
rotation + revocation enabled).

Two `sub` (subject) shapes flow through the authority (`findAccount` in
`config.ts`):

- **UUID**, a user record (passkey / email-password / Google sign-in). The
  smart wallet exists counterfactually; the `wallet_address` claim is the CREATE2
  prediction for that user id (see [Passkeys](/aa/passkeys)).
- **EIP-55 wallet address**, a SIWE (Sign-In With Ethereum, EIP-4361) login.
  The wallet *is* the identity; KYC is keyed on the address.

Login methods mounted in `server.ts`: SIWE (`/siwe/*`), email/password
(`/auth/password/*`), WebAuthn (`/auth/webauthn/*`), and, **only when both
`CITRATE_AA_GOOGLE_CLIENT_ID` and `..._SECRET` are set**, Google
(`/auth/google/*`). With the AA env configured, `/aa/*` (address prediction +
deploy permit) and guardian routes mount too.

## Reference, scopes & claims

Defined in `config.ts` (`scopes` / `claims`):

| Scope | Claims |
|---|---|
| `openid` | `sub` |
| `profile` | `name`, `email` |
| `wallet` | `wallet_address`, `wallets`, `signing_method` |
| `kyc` | `kyc_status`, `kyc_verified_at`, `kyc_expires_at` |
| `offline_access` | (enables refresh tokens) |

### Claim shapes

- **`sub`**, the canonical subject: a lowercase UUID, or an EIP-55 wallet
  address for SIWE logins.
- **`email`**, present for users with an email-bearing record (email/password,
  Google). Standard `profile`-scope claim.
- **`wallet_address`**, the user's one canonical smart-wallet address (EIP-55).
  For UUID users it is the CREATE2 prediction unless they have explicitly bound a
  `primary_wallet`, which wins. Omitted when the AA env is unconfigured (dev).
- **`wallets`**, the list of linked wallet addresses (grows via the IDP-S3
  identity↔wallet registry).
- **`signing_method`**, the most recent successful sign-in method
  (`'siwe'`, passkey, etc.); per-session method is the standard `amr` claim.

Claims are computed fresh at `claims()` time, panva re-invokes `claims()` on
every `/userinfo` call, so a KYC revoke/expiry that lands after a token was
minted is reflected on the next `/userinfo`, not stale at mint time.

### KYC status (claim only, internals are gated)

The `kyc` scope surfaces `kyc_status` (`verified` / `pending` / `revoked` /
`expired` / `none`) plus `kyc_verified_at` / `kyc_expires_at`. **The claim record
holds no PII**, only status + dates + an opaque vendor reference
(ADR-2026-06-03); the KYC vendor remains the PII data controller.

> The KYC *internals*, vendor wiring (e.g. CLEAR / Sumsub), webhook
> verification, the data-controller schema, and the operator runbook, are
> **Confidential / gated** (registry `ID-kyc`, tier `X`, `source_kind: gated`)
> and are **not documented here**. RPs consume only the claim shape above.

### `entitlement` claim (planned, conceptual)

> **Not yet implemented.** As of `4aa869c` there is no `entitlement` scope/claim
> in `config.ts`. This describes the *intended* design only.

The `entitlement` claim (registry `ID-entitlement`, tier `academic`) is the
planned mechanism that lets the Codex documentation chokepoint resolve a caller's
**access tier** (public / commercial / commercial.kyc / academic / confidential).
Conceptually: the authority would mint an `entitlement` claim derived from a
principal's contract/seat + KYC state, and the single server-side Codex chokepoint
(`PLANSET/02_ARCHITECTURE.md` §4) would read it to decide which gated pages a
request may see. Access stays enforced by the protocol, not by obscurity; **no
secrets ever ride in any tier**. Treat this section as a spec sketch until the
claim lands.

## Examples

Standard OIDC discovery + an authorization request asking for wallet claims:

```
GET https://auth.citrate.ai/.well-known/openid-configuration
GET https://auth.citrate.ai/jwks

GET /auth?response_type=code
        &client_id=<your_rp>
        &redirect_uri=<your_callback>
        &scope=openid%20wallet
        &code_challenge=<S256>&code_challenge_method=S256
        &state=<state>&nonce=<nonce>
```

Resulting ID token / `/userinfo` (UUID user, AA configured):

```json
{
  "sub": "3f2a…-…-…",
  "wallet_address": "0xAbc…",
  "wallets": ["0xAbc…"],
  "signing_method": "passkey",
  "kyc_status": "none"
}
```

## Security & access

**Tier: public** for the OIDC issuer + claim shapes, an RP developer needs them
to integrate, and they are standard OIDC. **`ID-kyc` internals are confidential**
and excluded. **`ID-entitlement` is academic** and described conceptually only.

No secrets here. No client secrets, cookie keys, JWKS private keys, webhook
secrets, or vendor credentials appear on this page. The interaction-cookie,
`COOKIE_KEYS`, `KYC_WEBHOOK_SECRET`, and Google client secret are all operator env
and never built into Codex. The authority fails closed on deploy-unsafe config
(`assertProductionConfig`).

## Source & verification

- Issuer + routes: `citrate-identity/src/server.ts` @ `4aa869c`
- Scopes / claims / `findAccount`: `citrate-identity/src/config.ts` @ `4aa869c`
- Wallet-claim derivation: `citrate-identity/src/aa/wallet-claims.ts` @ `4aa869c`
- KYC claim record (internals gated): `citrate-identity/src/kyc-pg.ts` @ `4aa869c`

Pre-audit. The `entitlement` claim is not yet in code. Re-verify against the SHA.
