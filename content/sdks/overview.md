---
title: SDKs overview
codex_slug: /sdks/overview
tier: public
org_scope: ~
source_kind: authored
source: npm @citratelabs + PyPI citrate-labs-sdk (published packages)
surfaces: [SDK-overview]
audited_against_sha: ~
status: Implemented
created: 2026-07-29T00:00:00Z
author: Citrate team
---

The Citrate SDKs are published and installable today. They run against testnet chain 40204 and are
pre-audit. This page is the honest map of what exists, what each one is for, and exactly where identity
verification (KYC) is required and where it is not.

## The packages

| Package | Registry | What it is |
|---|---|---|
| **`@citratelabs/sdk`** | npm | The canonical TypeScript/JavaScript SDK: the client, account-abstraction wallet, identity/OIDC, entitlements, and the inference-gateway client. Start here. |
| **`@citratelabs/marketplace-sdk`** | npm | The compute-marketplace SDK: contract bindings, ABI decoders, and the x402 payment client. |
| **`citrate-labs-sdk`** | PyPI | The Python SDK. Non-canonical and opt-in; it may lag the TypeScript SDK. |

`@citratelabs/citrate-js` is **deprecated** — it was renamed to `@citratelabs/sdk` and only re-exports it for
one migration cycle. Use `@citratelabs/sdk`.

```bash
npm i @citratelabs/sdk               # TypeScript / JavaScript
npm i @citratelabs/marketplace-sdk   # marketplace + x402
pip install citrate-labs-sdk         # Python
```

## What each SDK gives you

- **`@citratelabs/sdk`** — a `CitrateClient` over the 40204 RPC; the account-abstraction surface (predict a
  counterfactual ERC-4337 wallet from an identity, verify it on-chain, request a factory deploy permit, no
  key custody); the OIDC/SIWE identity client; the entitlement capability map; and an OpenAI/Anthropic-shaped
  inference-gateway client.
- **`@citratelabs/marketplace-sdk`** — post and watch marketplace jobs, decode receipts, and pay metered
  endpoints over x402 with a spend-capped client.
- **`citrate-labs-sdk`** — a Python surface over the same chain and gateway for teams that live in Python.

## Where KYC is required, and where it is not

We are explicit about this because it is the first thing an integrator needs to know. Identity verification
on Citrate is **in-house (VERI)**, keyed to a real human or institutional account through the authorization
spine; Citrate keeps a status and two dates, never the documents.

**No KYC required** — build and read freely:

- Installing any SDK and reading the chain (blocks, transactions, receipts, contract state).
- Predicting and verifying an account-abstraction wallet address.
- Signing in with OIDC or SIWE at the `public` tier.
- Calling public inference-gateway routes and the public x402 sandbox.

**KYC required** (the `commercial.kyc` entitlement tier) — actions that touch money, regulated compute, or
gated artifacts:

- Selling compute on the marketplace (operator-side).
- Paid membership grants and validator staking.
- Downloading tier-gated artifacts from the Commissary, and reading `commercial.kyc` docs.
- Requesting scoped access to the not-yet-public repositories.

The gate is an entitlement claim the authority mints from the account's verified status; the SDK reads it and
fails closed. A call that needs `commercial.kyc` on an unverified account is refused with a clear reason, not
a silent partial success.

## Status

Published and pre-audit, running against testnet 40204. External audits gate the stable and mainnet releases.
See [the JS SDK](/sdks/js), [the Python SDK](/sdks/python), [the marketplace SDK](/sdks/marketplace),
[identity](/sdks/identity), and [entitlements](/sdks/entitlements) for the per-surface detail.
