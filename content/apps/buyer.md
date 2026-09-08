---
title: Citrate Market (buyer)
codex_slug: /apps/buyer
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-buyer-webapp
surfaces: [APP-buyer]
audited_against_sha: 7d44b29
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The buyer side of Citrate Market, where you find a model provider, post a job, and pay for each
request as it runs. It is for teams that want to buy compute and inference on the open marketplace
and settle the cost per call rather than holding a balance.

## What it is

Citrate Market is where compute is bought and sold on the Citrate Network. This app
(`citrate-buyer-webapp`) is the buyer-facing front end of that market. You browse the catalog of
models, providers, and compute pools, post a job at a price you set, and the work settles back to
you when a provider has run it and the result has been checked.

Two purchase paths run side by side, and the app picks one for you depending on how you start. The
gateway path posts a chat completion to the Citrate gateway and pays for each request with x402, a
per-request payment protocol covered under [the x402 contract](/contracts/x402). The direct path
posts the job on the public ledger itself, locking escrow at your maximum price and opening an
auction that providers bid into. Both settle in wSALT on chain 40204. The gateway path is the
quicker route; the direct path keeps the whole transaction on the public ledger, where you can read
it back yourself.

Payment is bounded by design. The x402 client signs for at most a fixed amount per round, defaulting
to one SALT, and it will only ever pay in a single allowed token on a single chain. A payment
request naming any other token or chain is rejected before it is signed. You can find the wider
market in [the compute overview](/compute) and the client library in
[the marketplace SDK](/sdks/marketplace).

## How to use it

1. Open the app and browse the marketplace. Compare models by their per-1K pricing, providers by
   reputation, stake, region, load, and the verification tiers they support, and compute pools by
   mode, GPU count, throughput, and price.
2. Open a provider to read its reputation, current capacity and load, supported models, and
   verification tiers in one place.
3. Post a job. Pick a model, choose a verification tier, set a maximum price, and submit. The gateway
   path runs the request and auto-pays with x402; the direct path posts the job on the public ledger
   and opens the auction.
4. Approve the payment in your account when prompted. Auto-pay stays inside the per-round ceiling and
   pays only in wSALT on chain 40204.
5. Track the job through its states. On a bad outcome you are refunded, and a provider that misses its
   deadline is slashed.

## Reference

The buyer journey is built from the screens below. Each cites the code that backs it.

| Area | What you do | Source |
|---|---|---|
| Marketplace browse | Compare models, providers, and compute pools by price, reputation, stake, region, load, throughput, and supported verification tiers. | `app/design/DesignApp.jsx` |
| Provider detail | Inspect one provider's reputation, capacity and load, supported models, and verification tiers. | `app/design/DesignApp.jsx` |
| Post a job | Choose a model and a verification tier, set a maximum price, and submit through the gateway or direct path. | `lib/submitJob.ts`, `lib/submitDirectJob.ts`, `lib/submitTrainingJob.ts` |
| Track results | Follow a job through its lifecycle, including the terminal outcomes. | `app/design/DesignApp.jsx` |
| Pay with x402 | Pay per request with bounded auto-pay in wSALT; the client enforces the ceiling and the allowed token and chain. | `lib/submitJob.ts`, `lib/buyCredits.ts`, `lib/creditsClient.ts` |
| Copilot | Ask marketplace and network questions in an in-app assistant that streams from the Citrate gateway. | `app/api/chat/route.ts` |

### Verification tiers

When you post a job you choose how the result is checked. The tier sets a price multiplier, defined
in `app/design/DesignApp.jsx`.

| Tier | Technique | Price multiplier |
|---|---|---|
| Standard | commitment | 1.0x |
| Cryptographic proof | ZK proof, Groth16 | 1.5x |
| Secure enclave | TEE attestation | 2.0x |

### Job lifecycle

A job moves through a defined set of states. The happy path is documented in `DESIGN_HANDOFF.md` and
backed by on-chain events such as `JobPosted`, `JobAssigned`, and `JobCompleted` parsed through the
SDK.

```text
Posted -> Bidding -> Assigned -> Executing -> Verifying -> Completed
```

The terminal outcomes are explicit. Completed settles to the provider. Expired refunds you when no
bid arrives. Timeout slashes a provider that misses its deadline and refunds you. Failed refunds you
when verification does not pass. Disputed is resolved by the contract.

### x402 payment bounds

The x402 client enforces two limits, defined in `lib/submitJob.ts`.

```ts
export const DEFAULT_MAX_PAY_WEI = 1_000_000_000_000_000_000n; // 1 SALT
export const ALLOWED_PAY_TOKENS: Address[] = [
  '0x1f73bb479f397a34b5e3145e51d25bc5007273bf', // wSALT
];
```

The per-round ceiling defaults to one SALT and the UI may set it lower. The allowed token is wSALT
and the chain is 40204. Any other token or chain is refused.

## Design rationale

Paying for each request, rather than topping up a balance, keeps the buyer in control of cost at the
finest grain the market allows. The bounded auto-pay follows from that: a client that signs payments
on your behalf must never be able to sign an open-ended amount, so a finite per-round ceiling and a
single allowed token and chain are applied to every request before it is signed. Offering the two
purchase paths is the other deliberate trade. The gateway path is faster and hides the auction; the
direct path keeps the transaction on the public ledger where you can audit settlement yourself. We
let the buyer choose which property matters more for a given job.

## Failure modes

This surface moves real funds, so it is built to fail closed.

- The payment client never signs an unbounded x402 amount. A finite per-round ceiling is always
  applied, and a request naming any token other than wSALT or any chain other than 40204 is rejected
  before signing (audited as `RM-F1` and `BUYER_WEBAPP-002`).
- The copilot route applies an IP rate limit before any gateway or inference call, because every
  request costs real money (tracked under SECREM-01 WEB-3). The default is 20 requests per minute,
  overridable by environment.
- Outbound gateway targets are restricted by an allowlist in `lib/gatewayAllowlist.ts`, validated
  before a payment is signed.
- No secrets appear in this page. Gateway and RPC hostnames are public; signer material lives in the
  account and environment, never in documentation.

## Access and canon

Commercial. This is paid marketplace operation: job posting, provider economics, and payment,
intended for contracted buyers, and gated through the Codex chokepoint (`PLANSET/02_ARCHITECTURE.md`
section 4). Market participation settles in SALT, which pays for work and is not treated here as
anything to hold. The wider network is on-premise by default and every node operator on the public
network is identity-verified through VERI, Citrate's in-house verification; that envelope is described in
[what Citrate is](/start/what-is-citrate).

## Source and verification

- Source repo: `citrate-buyer-webapp`, split from the Citrate monorepo on 2026-05-18.
- Audited against: `7d44b29`.
- Key paths: `app/page.tsx`, `app/design/DesignApp.jsx`, `app/design/sdkBridge.ts`,
  `app/api/chat/route.ts`, `lib/submitJob.ts`, `lib/submitDirectJob.ts`, `lib/marketplace.ts`,
  `lib/buyCredits.ts`, `lib/gatewayAllowlist.ts`, `lib/chatGuard.ts`, `DESIGN_HANDOFF.md`.
- Status: **Implemented (pre-audit).** The x402 job submission, credits, server-side
  `MarketplaceClient` reads via `@citratelabs/marketplace-sdk`, and the gateway-backed copilot are
  wired and run against chain 40204. The browse catalog renders live SDK reads when a default model
  hash is configured and otherwise falls back to sample provider data, which the UI labels as
  `source: 'sample'` so the screen stays honest. Treat catalog figures as illustrative until live
  indexing is fully wired. This app has not completed an external audit. The README is monorepo-split
  boilerplate, so the screens here are audited against the app code and `DESIGN_HANDOFF.md`, not the
  README.
