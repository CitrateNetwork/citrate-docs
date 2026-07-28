---
title: Citrate Identity, the OIDC issuer
codex_slug: /aa/identity
tier: public
org_scope: ~
source_kind: authored
source: citrate-identity/src (server.ts, config.ts, siwe.ts, kyc.ts, identity-registry.ts, aa/, auth/)
surfaces: [ID-oidc, ID-kyc, ID-entitlement]
audited_against_sha: 4aa869c
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
The person's sensitive personal data stays with the verification vendor, who remains its controller. This
follows the on-premise default that holds across the network: the public ledger, and the authority in
front of it, see only what they must.

## How to use it

You integrate Citrate Identity as a relying party.

1. Register your client and a redirect URI with the authority.
2. Read the discovery document and cache the JWKS:

   ```bash
   curl -s https://auth.citrate.ai/.well-known/openid-configuration
   curl -s https://auth.citrate.ai/jwks
   ```

3. Send the person to the authorization endpoint with PKCE and the scopes you need. Ask for `wallet` when
   you need the person's Citrate Keyring address, and `kyc` when you need their verification status:

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
| `openid` | `sub` |
| `profile` | `name`, `email` |
| `wallet` | `wallet_address`, `wallets`, `signing_method` |
| `kyc` | `kyc_status`, `kyc_verified_at`, `kyc_expires_at` |
| `offline_access` | (enables refresh tokens) |

Claim shapes, derived in `findAccount` (`src/config.ts`) and `src/aa/wallet-claims.ts`:

| Claim | Meaning |
|---|---|
| `sub` | the subject: a lowercase UUID, or an EIP-55 address for a SIWE sign-in |
| `email` | present for accounts that carry an email (email and password, Google) |
| `wallet_address` | the person's one canonical Citrate Keyring address; for a UUID account this is a bound primary address if set, otherwise the CREATE2 prediction; omitted when the account-abstraction environment is unconfigured |
| `wallets` | every address the person has linked, primary first, capped at ten per identity |
| `signing_method` | the most recent successful sign-in method (`siwe`, `passkey`, `email-pw`, `google`) |

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
| `/kyc/_set`, `/kyc/_revoke` | POST | the verification vendor webhook, guarded by a shared secret (`src/kyc-routes.ts`) |
| `/logout`, `/sessions/events` | POST, GET | revoke a session and stream logout events |

### Verification status, Implemented

The `kyc` scope releases `kyc_status`, with `kyc_verified_at` and `kyc_expires_at`. The status is one of
`verified`, `pending`, `revoked`, `expired`, or `none`. A person reaches `verified` after a VERI check; if
the recorded `expires_at` has passed, the same record reads as `expired` and prompts a re-check. The stored
record is a closed type (`src/kyc.ts`): a status, two dates, and an opaque vendor reference, and nothing
else. There is no field where a name, a document, or an identifier could be added. The verification vendor
is the controller of the personal data behind the check.

The vendor wiring, webhook verification, and operator runbook are gated to operators and are not on this
page. A relying party consumes only the claim shapes above. See [compliance](/enterprise/compliance) for the
verification posture.

### Entitlement claim, Specified

Citrate Atlas decides which gated pages a request may read from an `entitlement` claim that names a
caller's tier. As of `4aa869c` the identity service does not mint that claim. We grep the source for it and
it is absent: there is no `entitlement` scope and no `entitlement` claim in `config.ts`. For now a relying
party resolves the tier itself, from a person's contract or seat together with their verification status.
The intended design is that the authority would mint `entitlement` from those same inputs and the single
server-side Atlas chokepoint would read it. We describe that here so the shape is known, and mark it
Specified, not built. No secret ever rides in any tier.

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
  Citrate Atlas. They live in operator environment only.

## Access and canon

Public. The OIDC issuer and the claim shapes are what a relying party needs to integrate, and they are
standard. The verification internals are gated to operators. The `entitlement` claim is described at the
academic tier and only as a design, since it is not yet built. Every person on the public network is
identity-verified through VERI, Citrate's in-house verification, and Citrate keeps the verification result, not the personal data behind it.

## Source and verification

| Surface | Source | Status |
|---|---|---|
| OIDC issuer, routes, boot checks | `citrate-identity/src/server.ts`, `src/config.ts` | Implemented (pre-audit) |
| SIWE sign-in | `citrate-identity/src/siwe.ts`, `src/siwe-routes.ts` | Implemented (pre-audit) |
| Keyring address-claim derivation | `citrate-identity/src/aa/wallet-claims.ts` | Implemented (pre-audit) |
| Verification status and record | `citrate-identity/src/kyc.ts`, `src/kyc-pg.ts`, `src/kyc-routes.ts` | Implemented (pre-audit) |
| Identity to address registry | `citrate-identity/src/identity-registry.ts` | Implemented (pre-audit) |
| `entitlement` claim | not present in source | Specified |

Verified against `citrate-identity` at `4aa869c`, package version 0.1.0. The service has shipped and runs;
it has not had an external audit, so the implemented surfaces are pre-audit. The `entitlement` claim is not
in the code and is resolved relying-party side for now. Re-verify against the SHA before relying on this
page.
