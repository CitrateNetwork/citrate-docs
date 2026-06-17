---
title: Citrate Cross-Chain Bridge — Overview
codex_slug: /chain/bridge
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/bridge/ (design detail Confidential — gated)
surfaces: [CHAIN-bridge]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Cross-Chain Bridge — Overview

> A public, non-implementation overview. The bridge's design and internals are
> **confidential** and intentionally not documented on this page.

## Overview

Citrate is building a cross-chain bridge to move value between an external chain
and the Citrate network, so assets and credits can flow into the Citrate economy.
The bridge is **pre-alpha**: it currently runs only in a development
configuration, and the **mainnet bridge ceremony is pending an external security
audit**. Do not treat it as production-ready, and do not bridge funds you cannot
afford to lose.

There is nothing else to document publicly here yet. As the bridge matures and
the audited mainnet ceremony is scheduled, this page will gain user-facing
instructions (supported assets, deposit/withdraw flows, finality expectations).

## Security & access

- **Tier of this page: public** — but it is a stub by design. The bridge's
  **trust model, oracle/relay design, signature and finality mechanisms, and
  parameters are Confidential (tier X)** and are **gated**, not authored here.
  The home repo's `core/bridge/SECURITY.md` (which exists) and the bridge source
  remain confidential.
- **No secrets here.** No keys, no endpoints, no thresholds, no mechanism
  internals.
- **Honest status:** pre-alpha; mainnet ceremony pending audit. No external
  audit has been completed.

## Source & verification

- **Source repo / path:** `citrate-chain/core/bridge/` — **confidential**; this
  public page does not transclude or summarize its internals.
- **Audited against SHA:** `03d7851`
  (`git -C citrate-chain rev-parse --short HEAD`).
