---
title: Cross-chain bridge
codex_slug: /chain/bridge
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/bridge/ (internals gated)
surfaces: [CHAIN-bridge]
audited_against_sha: e68af83
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is a brief, sober overview of the Citrate cross-chain bridge. The bridge is pre-alpha and its
implementation internals are gated; this page states what it is and where it stands, and nothing more.

## What it is

The bridge is a cross-chain relay between Ethereum and the Citrate Network. It moves value in by watching
for events on Ethereum, on the Sepolia testnet today, and crediting the corresponding amount on Citrate once
those events are independently confirmed.

Confirmation does not rest on a single observer. An M-of-N oracle set independently verifies each Ethereum
event and signs an attestation over it, using ed25519 signatures with a five-minute freshness window so that
stale attestations are not honoured. The relay acts only once a quorum of attestations has been collected,
and it rejects duplicate or inconsistent attestations rather than acting on a contested view. Deposit
pricing uses a bonding curve, with per-transaction limits and a hard cap on total deposits.

The bridge is pre-alpha. It runs only in a development configuration today, and the audited mainnet bridge
ceremony has not been scheduled. Do not treat it as production-ready.

## Access and canon

This page is public, but it is intentionally brief. The bridge's implementation internals, its trust model,
oracle and relay design, signature and freshness handling, and the bonding-curve and limit parameters, are
gated and confidential, held in `core/bridge/` and its `SECURITY.md` rather than authored here. No keys,
endpoints, thresholds, or mechanism internals appear on this page.

## Source and verification

- Source: `citrate-chain/core/bridge/`, internals gated; this public page does not transclude or summarise
  them.
- Audited against SHA: `9d5959e`.
- Status: Specified, pre-alpha. Runs in a development configuration only; no external audit has been
  completed and the mainnet ceremony is not yet scheduled.
