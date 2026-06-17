---
title: Security & Slashing Contracts
codex_slug: /contracts/security
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src/NematocystSlashing.sol
surfaces: [SC-sec-slashing, SC-sec-kyc, SC-sec-tee]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Security & Slashing Contracts

> The on-chain economic-security surface of Citrate (chainId **40204**): the
> graduated provider-slashing contract (public), plus two identity/attestation
> registries whose internals are gated. For protocol researchers, validators, and
> compute providers.

## Overview

Citrate's security contracts enforce economic accountability for the actors who
stake on the network. This page documents the one contract that is public-good in
full detail, **NematocystSlashing**, and notes the existence of two further
registries (**KYCRegistry**, **TEEAttestationRegistry**) whose implementation
detail is **Confidential** and is not authored here.

| Contract | What it does | Tier |
|---|---|---|
| `NematocystSlashing` | Graduated 3-tier provider slashing with a correlation multiplier | **public** (this page) |
| `KYCRegistry` | On-chain mirror of a revocable off-chain KYC claim | **Confidential / gated**, see "Gated surfaces" below |
| `TEEAttestationRegistry` | Per-worker TEE (VM + GPU) attestation state for confidential inference | **Confidential / gated**, see "Gated surfaces" below |

---

## NematocystSlashing (public)

**Source:** `citrate-chain/contracts/src/NematocystSlashing.sol`
**Deployed (testnet-beta, chain 40204):** `0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6`
**Status:** pre-audit; testnet-beta. Do not treat as certified.

The slashing model is named for the *nematocyst*, the stinging cell of a
cnidarian, and maps three severities of provider misbehaviour onto three sting
types, each with an escalating penalty on the provider's staked SALT.

### Slashing tiers

`SlashTier` is an `enum { Latency, Inconsistency, Byzantine }`. The base penalty
per tier (in basis points of the provider's stake) is fixed at deploy time:

| Tier | `SlashTier` | Trigger (design intent) | Base penalty |
|---|---|---|---|
| 1, Spirocyst | `Latency` | Missed checkpoints / latency faults | `LATENCY_PENALTY_BPS = 500` (5%) |
| 2, Mastigophore | `Inconsistency` | Belnap `Both` fraction too high (inconsistent results) | `INCONSISTENCY_PENALTY_BPS = 2000` (20%) |
| 3, Penetrant | `Byzantine` | Equivocation / double-signing | `BYZANTINE_PENALTY_BPS = 10000` (100%) + permanent ban |

A Tier-3 (`Byzantine`) slash always sets `banned[provider] = true`, forfeits any
remaining stake, and emits `Banned`. A banned provider can never re-stake.

### Staking lifecycle

- `stake()` (payable, `nonReentrant`), deposit SALT to become a slashable
  provider. Reverts on zero value, on a banned sender, or if the cumulative stake
  would fall below `MIN_STAKE = 100 ether` (100 SALT). The first qualifying stake
  increments `totalProviders`.
- `unstake()` (`nonReentrant`), withdraw the full stake and deregister. Reverts
  for banned providers or with no stake.
- `isSlashable(address)`, view: `true` iff staked and not banned.

### The correlation multiplier

The novel part of the design is the **correlation multiplier**, taken from
Ethereum slashing research: penalties scale up when many providers are slashed in
the same window, so coordinated/correlated failures hurt far more than isolated
ones.

```
multiplier = clamp( slashedInWindow * 30 / totalProviders, 1x, 3x )
```

Implemented in `getCorrelationMultiplier()` (all arithmetic scaled by `1e18`):

- `CORRELATION_WINDOW = 50` blocks. `slashesInBlock[block.number]` is incremented
  on every `slash()`; `_slashesInWindow()` sums the counter across the last 50
  blocks.
- Floor at `ONE` (`1e18`, i.e. 1x), **penalties are never reduced** below the base.
- Cap at `MAX_CORRELATION_MUL` (`3e18`, i.e. 3x).
- When `totalProviders == 0` the multiplier is `1x`.

### Applying a slash

`slash(address provider, SlashTier tier, bytes calldata evidence)` is
`onlyGovernance` (governance lives in the `Governable` mixin, audit ref SOL-21):

1. Require non-empty `evidence`, an un-banned, currently-staked provider.
2. Record the slash for correlation tracking (`slashesInBlock[block.number]++`).
3. `rawPenalty = stake * baseBps / 10000`, then
   `penalty = rawPenalty * correlationMultiplier / 1e18`, capped at the full stake.
4. Deduct the penalty; for `Byzantine`, also forfeit the remainder and ban.
5. Emit `Slashed(provider, tier, penalty, correlationMultiplier)`.

### Events

`Staked`, `Unstaked`, `Slashed`, `Banned` (and `GovernanceTransferred` from the
`Governable` mixin).

### Reading it on-chain

`stakes(address)`, `banned(address)`, `totalProviders`, `slashesInWindow()`,
`getCorrelationMultiplier()`, and `isSlashable(address)` are all public/view, see the [read-only tutorial](/contracts/tutorials/interact-read-only) for an
`eth_call` walkthrough.

---

## Gated surfaces (Confidential, not authored here)

Two further security contracts exist in `citrate-chain/contracts/src/` and are
**deployed on chain 40204**, but their implementation detail is **Confidential**
(competitive identity/attestation IP). Only their existence, purpose, and public
deployed addresses are listed here; their internals (claim shapes, signer-hash
governance, attestation state machines, verification paths) are served at request
time to KYC'd / contracted principals through the Codex access chokepoint, not in
the public build.

| Contract | One-line purpose | Deployed (chain 40204) |
|---|---|---|
| `KYCRegistry` | On-chain mirror of a revocable, PII-free KYC claim (anti-Sybil gate for PIN). Holds **no value**. | `0x…` (see [reference](/contracts/reference)) |
| `TEEAttestationRegistry` | Per-worker TEE attestation state (VM + GPU) for confidential pipeline-parallel inference. | `0x4a86659bdab24dc444c72fbbad4cd83491820e40` |

> Why gated: per the Codex tier rules (§3), deep implementation depth whose
> anonymous theft would materially help a competitor is **commercial.kyc /
> confidential**, not public. Deployed addresses are public on-chain data and are
> fine to list; the contract internals are not authored in the public Codex.
> **No secrets appear in any tier.**

## Security & access

- **Tier: public.** NematocystSlashing is public-good economic-security design;
  documenting it helps researchers and providers reason about staking risk.
- KYCRegistry and TEEAttestationRegistry internals are **Confidential / gated**
  and intentionally omitted. This page authors only the public-safe overview of
  their *existence and purpose*.
- **No secrets here.** No keys, no credentials, no private endpoints. The listed
  addresses are public on-chain data verifiable via `eth_getCode`.

## Source & verification

- Source: `citrate-chain/contracts/src/NematocystSlashing.sol`
- Audited against `citrate-chain` SHA **`03d7851`**.
- Status: **pre-audit, testnet-beta**, not certified. Verify the deployed
  bytecode yourself via `eth_getCode` against the address above on chain 40204.
