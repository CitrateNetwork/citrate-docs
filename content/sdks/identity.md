---
title: Identity and the embedded Keyring account
codex_slug: /sdks/identity
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-js/src/identity/index.ts
surfaces: [SDK-identity, SDK-wallet, SDK-gateway]
audited_against_sha: 9664fa8
status: Implemented
created: 2026-07-25T00:00:00Z
author: Citrate team
---

The identity module is the turnkey authorization spine for Citrate Network. It lets an app sign a user in
against `auth.citrate.ai`, verify the resulting token safely, give that user a Citrate Keyring account they own
without ever handling a private key, and read their entitlement, all from one typed surface. It ships in both
the TypeScript SDK (`@citratelabs/sdk`, the `identity` namespace) and the Python SDK (`citrate_sdk.identity`),
with the same behavior and the same account address on both.

## What it is

Three things sit behind the module, and they compose:

- **Sign-in.** OIDC Authorization Code flow with PKCE, and Sign-In With Ethereum (EIP-4361). Either way you
  get an ID token that the SDK verifies before you trust a single claim.
- **The embedded account.** An OIDC subject deterministically owns a counterfactual ERC-4337 Citrate Keyring
  account. The SDK computes that address locally and can verify it against the on-chain factory. You never see
  or hold a key.
- **Claims and capabilities.** After sign-in, `userInfo` returns the subject, account address, KYC status, and
  a normalized entitlement tier with a capability set (see [entitlements](/sdks/entitlements)).

Endpoints, scopes, chain addresses, and the entitlement claim URI are all read from the generated federation
contract, so nothing is hand-typed and nothing goes stale against a chain reroll.

## How to use it

### Sign in with OIDC (PKCE)

```typescript
import { identity } from '@citratelabs/sdk';

const client = new identity.IdentityClient({
  clientId: 'your-app',
  redirectUri: 'http://127.0.0.1:8899/auth/callback',
});

// 1. Send the user to the authorize URL; keep the PKCE verifier.
const { url, pkce } = client.authorizeUrl({ state, nonce });
// ...redirect the browser to `url`, receive `code` on the callback...

// 2. Exchange the code. The returned ID token is already verified.
const tokens = await client.exchangeCode({ code, codeVerifier: pkce.verifier, nonce });
console.log(tokens.claims.sub);
```

In Python the shape is identical:

```python
from citrate_sdk.identity import IdentityClient

client = IdentityClient(client_id="your-app", redirect_uri="http://127.0.0.1:8899/auth/callback")
url, pkce = client.authorize_url(state=state, nonce=nonce)
tokens = client.exchange_code(code=code, code_verifier=pkce.verifier, nonce=nonce)
```

### The embedded account

An app never derives the address from the authority's `/aa/address` endpoint. It computes the address locally
and verifies it against the factory, which is the deployer and therefore the only ground truth.

```typescript
import { identity } from '@citratelabs/sdk';

const userId = identity.uuidToUserId(tokens.claims.sub);   // keccak256(utf8(lowercase uuid))
const address = identity.predictWalletAddress(userId);      // local, offline

// Where an RPC is available, confirm against the on-chain factory:
const confirmed = await identity.verifyWalletAddressOnChain(userId, provider);
```

To stand the account up, request a factory deploy permit. The authority signs it with its identity-signer, and
the SDK never signs.

```typescript
const permit = await client.requestDeployPermit({ userId, initData, expiresAt }, tokens.accessToken);
```

### Read claims and capabilities

```typescript
const info = await client.userInfo(tokens.accessToken);
info.tier;                       // normalized: unknown values collapse to "public"
info.capabilities.ecosystemTx;   // what this principal may do
info.walletAddress;              // the Keyring account, if the claim carried one
```

## Reference

Each name below is exported from `@citratelabs/sdk` (`identity` namespace) and mirrored in
`citrate_sdk.identity`.

### Sign-in

| Name | What it does |
|---|---|
| `IdentityClient(config)` | The client. Config: `clientId`, `redirectUri`, optional `scopes`, injectable `fetch`. |
| `discover()` | Fetch and cache the OIDC discovery document; the issuer is pinned to the artifact. |
| `authorizeUrl({state, nonce, pkce?})` | Build the PKCE S256 authorize URL; returns the URL and the PKCE pair. |
| `exchangeCode({code, codeVerifier, nonce?})` | Exchange a code for tokens; the ID token is verified before return. |
| `refresh(refreshToken)` | Rotate tokens with a refresh token. |
| `siweChallenge(address)` / `siweVerify({message, signature})` | EIP-4361 sign-in with a single-use nonce. |
| `userInfo(accessToken)` | Fresh claims plus a normalized tier and capability set. |
| `logout(accessToken)` | End the session; fires the cross-instance revocation cascade. |

### ID-token verification

`verifyIdToken(token, { issuer, audience, jwks })` is the trust boundary and is called for you by
`exchangeCode` and `refresh`. It accepts only `RS256`, verifies the signature before reading any claim, and
rejects `alg:none`, algorithm confusion, a wrong audience or issuer, an expired or not-yet-valid token, a
tampered payload, and a token whose `kid` matches no key.

### The embedded account

| Name | What it does |
|---|---|
| `uuidToUserId(uuid)` | `keccak256(utf8(lowercase uuid))`, the 32-byte AA userId for a UUID subject. |
| `addressToUserId(address)` | Left-pad a 20-byte EOA to a 32-byte userId (SIWE subjects). |
| `predictWalletAddress(userId, opts?)` | The counterfactual Citrate Keyring address. Pure and offline. |
| `verifyWalletAddressOnChain(userId, provider, opts?)` | Verify the local prediction against the factory; throws on mismatch. |
| `requestDeployPermit({userId, initData, expiresAt}, accessToken)` | Ask the authority to sign a factory deploy permit. |
| `listValidators(userId)` / `guardianConfig(accessToken)` | Read installed validators and the guardian nomination. |

## Design rationale

The module holds no keys and verifies every token, so a claim is never trusted before its signature. Account
address prediction is duplicated byte-for-byte across the TypeScript SDK, the Python SDK, the Rust `wallet-aa`
crate, and the on-chain factory, on purpose: the address a user funds must be identical no matter which surface
computes it. The SDK computes it locally and checks it against the factory rather than trusting a service,
because a service can drift out of sync with the chain while still answering confidently.

## Failure modes

This surface guards money and identity, so it fails closed.

- `verifyIdToken` throws on any verification failure. There is no best-effort path; an unverifiable token is
  rejected.
- `predictWalletAddress` throws on a malformed userId, and `verifyWalletAddressOnChain` throws if the local
  address and the on-chain factory disagree, with a do-not-fund message. Prefer the on-chain check before
  showing a deposit address to a user.
- The client is fail-closed without a `fetch` implementation, and the module never returns or logs a private
  key, seed, or bearer secret.

## Access and canon

Public. This is open SDK reference and carries no secrets. Access tokens, refresh tokens, and gateway keys are
the caller's to hold; the module never persists them. The hostnames named here, `auth.citrate.ai` and
`rpc.citrate.ai`, are public production endpoints, not credentials.

## Source and verification

- Source repos: `citrate-sdk-js` (`src/identity/`), `citrate-sdk-python` (`citrate_sdk/identity/`).
- Zero new runtime dependencies: TypeScript uses `node:crypto` and `ethers`; Python uses `cryptography`,
  `eth_utils`, and `requests`.
- Status: Implemented (pre-audit), unit-tested including the OIDC attack rejections and the on-chain
  account-address parity vector.
