---
title: Compute Marketplace (Buyer)
codex_slug: /apps/buyer
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-buyer-webapp/app
surfaces: [APP-buyer]
audited_against_sha: 573da03
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Compute Marketplace (Buyer)

> The buyer side of the Citrate Compute Marketplace — browse providers and pools, post a job, pay per call with x402, and track the result to settlement.

## Overview

The buyer web app (`citrate-buyer-webapp`) is the buyer-facing front end of the
Citrate Compute Marketplace. It's a self-contained client SPA (hash router, ~20
screens) mounted at `/` that lets you discover model providers and compute pools, run
inference jobs through the Citrate gateway, and pay per request using the **x402**
payment protocol settled in wSALT on chain `40204`.

Payment is real and bounded by design: jobs submit through `@citratenetwork/marketplace-sdk`,
and the wallet's per-round auto-pay is capped (default ceiling 1 SALT) and restricted to
a single allowed pay token (wSALT) on the Citrate chain — a challenge naming any other
token/chain is rejected. (Source: `citrate-buyer-webapp/app/page.tsx`,
`app/design/DesignMount.tsx`, `lib/submitJob.ts`, `lib/marketplace.ts`.)

## Who it's for

- **Buyers of inference/compute** who want to run models on the open marketplace and pay per call.
- **Teams** that need verifiable results (commitment, ZK-proof, or TEE-attested tiers).
- **Developers** integrating marketplace job submission and x402 auto-pay into their own flows via the SDK.

## Key features & screens

The SPA's screens (in `app/design/DesignApp.jsx`) cover the buyer journey:

| Area | What you do | Code |
|---|---|---|
| **Marketplace / browse** | Browse models (with provider/pool counts and per-1K pricing), providers (reputation, stake, region, supported verification tiers, live status), and compute pools (mode, GPUs, throughput, price). | `app/design/DesignApp.jsx` |
| **Provider detail** | Inspect a single provider's reputation, capacity/load, supported models, and verification tiers. | `app/design/DesignApp.jsx` |
| **Post a job** | Choose a model and verification tier — **Standard** (commitment, 1.0×), **Cryptographic proof** (ZK Groth16, 1.5×), or **Secure enclave** (TEE attestation, 2.0×) — set a max price, and post on-chain into the auction. | `app/design/DesignApp.jsx`, `lib/submitJob.ts`, `lib/submitDirectJob.ts`, `lib/submitTrainingJob.ts` |
| **Track results** | Follow a job through its lifecycle: Posted → Bidding → Assigned → Executing → Verifying → Completed, plus terminal states (Expired/refunded, Timed out/slashed, Failed/refunded, Disputed/bisection). | `app/design/DesignApp.jsx` |
| **Pay (x402)** | Pay per call with bounded auto-pay in wSALT; the SDK enforces the per-round ceiling and the allowed token/chain. | `lib/submitJob.ts`, `lib/buyCredits.ts`, `lib/creditsClient.ts` |
| **Copilot (chat)** | An in-app assistant that streams from the Citrate gateway (OpenAI-compatible) to answer marketplace/chain questions. | `app/api/chat/route.ts` |

### Browse providers & pools

The marketplace surfaces models, providers, and pools with their economics — reputation,
stake, region, load/capacity, throughput, and per-1K pricing — and which verification
tiers each provider supports. A server-side `MarketplaceClient` (viem + the marketplace
SDK) backs live reads against chain `40204`. (Source: `lib/marketplace.ts`,
`lib/poolsClient.ts`.)

### Post a job & pay with x402

Posting a job locks escrow at your `maxPrice` and opens an auction; providers bid, the
best bid is assigned, the provider executes, and the result is verified at your chosen
tier before funds settle. Inference jobs submit through `submitJob` with **x402
auto-pay**: the wallet auto-signs up to a bounded per-round ceiling
(`DEFAULT_MAX_PAY_WEI = 1 SALT`, overridable lower by the UI) and only in the single
allowed token, wSALT on chain 40204. (Source: `lib/submitJob.ts`.)

### Track results

Each job moves through clearly described states (with on-chain events like `JobPosted`,
`BidPlaced`, `JobAssigned`). Terminal outcomes are explicit: Completed (settled),
Expired (refunded), Timed out (provider slashed, you refunded), Failed (verification
invalid, refunded), and Disputed (resolved by bisection). (Source:
`app/design/DesignApp.jsx`.)

## How to use

1. Open the app and browse the **Marketplace** to compare models, providers, and pools.
2. Open a provider to check reputation, load, and supported verification tiers.
3. **Post a job:** pick a model, choose a verification tier, set a max price, and submit.
4. Approve the **x402** payment in your wallet (Privy-connected) — auto-pay stays within
   the bounded ceiling and only pays in wSALT.
5. **Track** the job through Bidding → Assigned → Executing → Verifying → Completed; on a
   bad outcome you're refunded (or the provider is slashed).

## Tutorials

- A "post your first inference job and pay with x402" tutorial is tracked as a stub.
  For inspecting the resulting on-chain settlement, see
  [Explore a transaction](/apps/tutorials/explore-a-transaction) on CitrateScan.

## Security & access

**Tier: commercial.** This is paid marketplace operation — job posting, provider
economics, and payment — intended for contracted buyers; access is gated through the
Codex chokepoint (`PLANSET/02_ARCHITECTURE.md` §4).

- **Bounded auto-pay:** the wallet never signs an unbounded x402 amount; a finite
  per-round ceiling is always applied and only the allowed token/chain (wSALT, 40204)
  is accepted (audits `RM-F1` / `BUYER_WEBAPP-002`).
- **Fail-closed copilot:** the chat route applies an IP rate limit *before* any
  gateway/inference call, because every request costs real money (SECREM-01 WEB-3).
- **Gateway allowlist:** outbound gateway targets are restricted by an allowlist.
- **No secrets in this page.** Gateway/RPC hostnames are public; keys and signer
  material live in environment/wallet, never in docs.

## Source & verification

- **Source repo:** `citrate-buyer-webapp` (split from the Citrate monorepo, 2026-05-18).
- **Audited against:** `573da03` (`git -C citrate-buyer-webapp rev-parse --short HEAD`).
- **Key paths:** `app/page.tsx`, `app/design/DesignMount.tsx`, `app/design/DesignApp.jsx`,
  `app/api/chat/route.ts`, `lib/submitJob.ts`, `lib/marketplace.ts`,
  `lib/buyCredits.ts`, `lib/gatewayAllowlist.ts`.
- **Status:** The browse/marketplace SPA renders the design prototype with **sample
  catalog data** for models/providers/pools; the **live, wired** paths are x402 job
  submission (via `@citratenetwork/marketplace-sdk`), credits, the gateway-backed
  copilot, and the server-side `MarketplaceClient`. Treat catalog figures in the UI as
  illustrative until live indexing is fully wired. This page mirrors code at the pinned
  SHA (Rule 9 — link, don't copy); the repo README is monorepo-split boilerplate, so
  screens here are audited against the app code, not the README.
