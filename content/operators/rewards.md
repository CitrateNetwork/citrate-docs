---
title: Rewards, reputation & slashing-protection
codex_slug: /operators/rewards
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-chain core/economics + citrate-node-agent
surfaces: [NODE-rewards]
audited_against_sha: 03d7851
status: draft
created: 2026-06-16T00:00:00Z
author: Codex S6
---

# Rewards, reputation & slashing-protection

> How a node operator earns on Citrate, how reputation is scored, and the guardrails that keep an honest
> operator from being slashed. Pairs with [Sell compute](/operators/sell-compute) and
> [Run node-agent](/compute/node-agent).

## Overview

Operators earn SALT for verifiable work (validation, model hosting, compute jobs). Earnings, reputation,
and penalties are accounted on chain 40204; the `citrate-node-agent` keeps a local operator within the
safe envelope automatically.

## How rewards work

- **Block validation** and **uptime** — base reward + uptime bonus (institutions are exempt from
  scheduled-downtime penalties). See [Chain → Economics](/chain/economics).
- **Model hosting** — per-model reward per epoch (`ModelRegistry` / hosting accounting).
- **Compute jobs** — paid on proof-verified completion via the compute marketplace + x402.

## Reputation & slashing-protection

- Reputation is derived from heartbeat liveness, completed jobs, and proof validity. The node-agent's
  `bidder` only accepts jobs within a **Commitment cap** and capacity it can safely fulfil, so it does not
  over-commit into a slash.
- Slashing categories live on chain (`NematocystSlashing`); see [Contracts → Security](/contracts/security)
  for the category model (penalty math is gated).

## Security & access

Commercial tier (operator implementation depth). No keys here — rewards accrue to the operator's wallet;
claims are signed locally by the node-agent from the operator's own key store.

## Source & verification

Transcluded from `citrate-chain` core/economics @ `03d7851` + `citrate-node-agent`. Reward parameters are
pre-audit/testnet-beta — treat figures as indicative.
