---
title: Citrate Identity, the OIDC issuer
codex_slug: /aa/identity
tier: public
org_scope: ~
source_kind: authored
source: citrate-identity/src (server.ts, config.ts, siwe.ts, kyc.ts, kyc-engine.ts, entitlements.ts, identity-registry.ts, aa/, auth/)
surfaces: [ID-oidc, ID-kyc, ID-entitlement]
audited_against_sha: 9664fa8
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate Identity is the sign-in authority for the network. It is an ordinary OpenID Connect provider: a
person signs in once, with a passkey, an email and password, a Google account, or by signing a message
with their own key, and the service issues standard ID and access tokens that carry their canonical
Citrate Keyring address. If you build a relying party that needs Citrate sign-in, this is the page you
integrate against.

## What it is

Citrate Identity is a generic OpenID Connect issuer built on the panva `oidc-provider` library
(`src/server.ts`, `src/config.ts`). You talk to it the way you talk to any OIDC provider: read the
discovery document at `/.well-known/openid-configuration`, fetch the signing keys at `/jwks`, and run the
Authorization Code flow with PKCE. The reference relying party is CitrateScan, the network explorer, which
runs as a public client with refresh-token rotation enabled.

The service knows a person by one of two subject shapes, resolved in `findAccount` (`src/config.ts`):

- A **UUID**, for accounts created by passkey, email and password, or Google sign-in. The Citrate Keyring
  for that person exists as a prediction, a CREATE2 address derived from the user id, until they first
  transact. See [Passkeys](/aa/passkeys).
- An **EIP-55 address**, for accounts that sign in by proving control of a key, the EIP-4361 flow we call
  SIWE. Here the key is the identity, and a VERI verification result is keyed on the address.

The service stores almost nothing about a person. It holds sign-in records, the set of addresses a person
has linked, and a VERI verification result that is a status and two dates, never the documents behind it.
Verification is done in-house by VERI, Citrate's own check (`src/kyc-engine.ts`). It is server-side
processing: the server decrypts the identity, document and face evidence to decide the case. Evidence is
sealed per case at rest, the biometric is destroyed once the decision is reached, and no outside vendor
holds the personal data. The OIDC service persists only the closed
`{status, verified_at, expires_at}` record and an opaque case reference. This follows the on-premise default
that holds across the network: the public ledger, and the authority in front of it, see only what they must.

## How to use it

You integrate Citrate Identity as a relying party.

1. Register your client and a redirect URI with the authority.
2. Read the discovery document and cache the JWKS:

   ```bash
   curl -s https://auth.citrate.ai/.well-known/openid-configuration
   curl -s https://auth.citrate.ai/jwks
   ```

3. Send the person to the authorization endpoint with PKCE and the scopes you need. Ask for `wallet` when
   you need the person's Citrate Keyring address, and `kyc` when you need their verification status. The
   access-tier claim rides under `openid`, so you do not request a scope for it:

   ```
   GET https://auth.citrate.ai/auth
       ?response_type=code
       &client_id=<your_client>
       &redirect_uri=<your_callback>
       &scope=openid%20wallet%20kyc
       &code_challenge=<S256>&code_challenge_method=S256
       &state=<state>&nonce=<nonce>
   ```

4. Exchange the returned code at `/token` for an ID token and an access token.
5. Read claims from the ID token, or call `/userinfo` with the access token. Claims are recomputed on every
   `/userinfo` call, so a verification that was revoked or that expired after the token was minted shows up
   on the next read, not stale at mint time.

## Reference

Scopes and the claims they release, defined in `citrate-identity/src/config.ts`:

| Scope | Claims |
|---|---|
| `openid` | `sub`, `https://citrate.ai/entitlement` |
| `profile` | `name`, `email`, `email_verified` |
| `wallet` | `wallet_address`, `wallet_bound`, `wallets`, `signing_method` |
| `kyc` | `kyc_status`, `kyc_verified_at`, `kyc_expires_at` |
| `offline_access` | (enables refresh tokens) |

The `https://citrate.ai/entitlement` claim rides under `openid`, always granted, rather than behind its own
scope, so every relying party receives the access tier without asking for it (`src/config.ts`, `claims`
block). It is minted only when the principal is on the entitlements roster; when absent the relying party
falls back to the public tier.

Claim shapes, derived in `findAccount` (`src/config.ts`) and `src/aa/wallet-claims.ts`:

| Claim | Meaning |
|---|---|
| `sub` | the subject: a lowercase UUID, or an EIP-55 address for a SIWE sign-in |
| `email` | present for accounts that carry an email (email and password, Google) |
| `email_verified` | whether that email has been proven, gating any entitlement keyed on it |
| `wallet_address` | the person's one canonical Citrate Keyring address; for a UUID account this is a bound primary address if set, otherwise the CREATE2 prediction; omitted when the account-abstraction environment is unconfigured |
| `wallet_bound` | `true` when `wallet_address` is a bound primary the person committed to, `false` when it is only the CREATE2 prediction; a relying party that pays this address must require `true` |
| `wallets` | every address the person has linked, primary first, capped at ten per identity |
| `signing_method` | the most recent successful sign-in method (`siwe`, `passkey`, `email-pw`, `google`) |
| `https://citrate.ai/entitlement` | the access-tier grant, `{ tier, orgId, citrateRole?, milestone?, expiresAt? }`, resolved by `resolveEntitlementClaim` (`src/entitlements.ts`); present only for a principal on the roster |

Sign-in routes mounted in `src/server.ts`:

| Route | Method | What it does |
|---|---|---|
| `/siwe/challenge` | GET | issues a fresh nonce for a message-signing sign-in (`src/siwe-routes.ts`) |
| `/siwe/verify` | POST | verifies an EIP-4361 message and signature |
| `/auth/password/register`, `/auth/password/login` | POST | email and password, Argon2id hashing (`src/auth/password-routes.ts`) |
| `/auth/webauthn/*` | POST | passkey enrollment and sign-in (`src/auth/webauthn-routes.ts`) |
| `/auth/google/start`, `/auth/google/callback` | GET | Google sign-in, mounted only when both `CITRATE_AA_GOOGLE_CLIENT_ID` and the matching secret are set (`src/auth/google-routes.ts`) |
| `/identity/:sub/wallets*` | GET, POST, DELETE | link, list, and unlink addresses for an identity, gated to the caller's own subject (`src/identity-registry.ts`) |
| `/aa/address`, `/aa/enroll-validator`, `/aa/validators` | GET, POST | Citrate Keyring address prediction and validator enrollment (`src/aa/aa-routes.ts`) |
| `/kyc/_set`, `/kyc/_revoke` | POST | the VERI decision webhook that records or revokes a verification, guarded by a shared secret (`src/kyc-routes.ts`) |
| `/logout`, `/sessions/events` | POST, GET | revoke a session and stream logout events |

### Verification status, Implemented

The `kyc` scope releases `kyc_status`, with `kyc_verified_at` and `kyc_expires_at`. The stored status is one
of `verified`, `pending`, or `revoked` (`KycStatus` in `src/kyc.ts`); `/userinfo` computes two more from the
record, so a relying party can also read `expired` (a verified record whose `expires_at` has passed) or
`none` (no record at all). A person reaches `verified` after a VERI check; once `expires_at` passes the same
record reads as `expired` and prompts a re-check. The stored record is a closed type: a status, two dates,
and an opaque case reference, and nothing else. There is no field where a name, a document, or an identifier
could be added.

VERI is Citrate's in-house verification. It processes evidence server-side and keeps it sealed at
rest. The engine (`src/kyc-engine.ts`) decides a captured case with
no outside call: it unseals the per-case evidence, runs the liveness and 1:1 face-match
analyzers, the document OCR and MRZ check, and the in-house sanctions screener, then destroys the biometric
immediately and records only the decision. It fails closed: with no model backend a case routes to human
review, never to an auto-`verified`. The engine wiring and operator runbook are gated to operators and are
not on this page. A relying party consumes only the claim shapes above. See
[compliance](/enterprise/compliance) for the verification posture.

### Entitlement claim, Implemented

Citrate Almanac decides which gated pages a request may read from the `https://citrate.ai/entitlement` claim,
which names a caller's access tier. The identity service mints it: `resolveEntitlementClaim`
(`src/entitlements.ts`) looks the principal up in the entitlements roster (a Postgres table keyed on `sub`,
`wallet`, or a verified `email`) and returns `{ tier, orgId, citrateRole?, milestone?, expiresAt? }`, which
rides in the token under `openid`. The tiers are `public`, `commercial`, `commercial.kyc`, `academic`, and
`confidential`. Resolution is fail-safe and KYC-gated: an absent or expired grant mints no claim and the
relying party falls back to public; a role-bearing principal (admin, auditor, exec) is authorized by the
roster without a KYC check; an unverified consumer keeps `public` and `commercial`, a `commercial.kyc` grant
collapses to `commercial`, and the higher `academic` and `confidential` tiers require a verified VERI check.
Passing VERI auto-grants the `commercial.kyc` baseline if the principal has no grant yet
(`grantKycBaseline`). When no database is configured the service mints no entitlement claim at all. No secret
ever rides in any tier.

## Design rationale

We made the identity authority a plain OIDC provider so that any team that has integrated OIDC before can
integrate Citrate sign-in without learning a Citrate-specific protocol. The two subject shapes exist
because two kinds of people arrive: one brings a key and wants the key to be the identity, the other brings
an email and wants a Citrate Keyring created for them. Holding only a verification status and never the
personal data behind it keeps the authority outside the scope of the heaviest data-protection duties, and
it is the same discipline the rest of the network follows. Recomputing claims on every read, rather than
freezing them at mint time, means a revoked verification takes effect promptly instead of lingering for the
life of a token.

## Failure modes

- **A stale token after revocation.** Claims are recomputed on each `/userinfo` call, so a relying party
  that re-reads `/userinfo` sees a revocation or expiry promptly. A relying party that trusts only the
  original ID token for the token's full lifetime will lag; re-read for anything verification-sensitive.
- **Unsafe production configuration.** At boot the service runs `assertProductionConfig` (`src/config.ts`).
  In production it refuses to start if the cookie keys are the development default or shorter than 32
  characters, if the issuer or origins point at localhost, or if the database or session store is unset. It
  fails closed rather than starting in a weak state.
- **Account-abstraction environment unset.** When the account-abstraction environment is not configured,
  `wallet_address` is simply omitted rather than guessed. A relying party should treat the claim as
  optional.
- **Secrets.** No client secret, cookie key, signing key, webhook secret, or vendor credential appears in
  Citrate Almanac. They live in operator environment only.

## Access and canon

Public. The OIDC issuer and the claim shapes are what a relying party needs to integrate, and they are
standard. The verification internals are gated to operators. The `https://citrate.ai/entitlement` claim is
minted by the authority and the tier meanings are public, while the roster of who holds which tier is not.
VERI is Citrate's in-house, server-side verification. Node and consensus code do not check identity.
After a decision Citrate keeps the verification result, and any retained evidence stays sealed at rest.

## Source and verification

| Surface | Source | Status |
|---|---|---|
| OIDC issuer, routes, boot checks | `citrate-identity/src/server.ts`, `src/config.ts` | Implemented (pre-audit) |
| SIWE sign-in | `citrate-identity/src/siwe.ts`, `src/siwe-routes.ts` | Implemented (pre-audit) |
| Keyring address-claim derivation | `citrate-identity/src/aa/wallet-claims.ts` | Implemented (pre-audit) |
| Verification status and record | `citrate-identity/src/kyc.ts`, `src/kyc-pg.ts`, `src/kyc-routes.ts` | Implemented (pre-audit) |
| VERI verification engine | `citrate-identity/src/kyc-engine.ts` | Implemented (pre-audit) |
| Identity to address registry | `citrate-identity/src/identity-registry.ts` | Implemented (pre-audit) |
| `https://citrate.ai/entitlement` claim | `citrate-identity/src/entitlements.ts`, `src/config.ts` | Implemented (pre-audit) |

Verified against `citrate-identity` at `9664fa8`, package version 0.1.0. The service has shipped and runs;
it has not had an external audit, so the implemented surfaces are pre-audit. The entitlement claim is now
minted by the authority under `openid` and is KYC-gated. Re-verify against the SHA before relying on this
page.
