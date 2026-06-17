---
title: Paymaster Policy & Bundler Topology
codex_slug: /aa/paymaster
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src/aa/paymaster/CitratePaymaster.sol + citrate-bundler
surfaces: [AA-paymaster, SC-aa-paymaster, API-BUNDLER]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Paymaster Policy & Bundler Topology

> How Citrate sponsors gas for embedded wallets: the per-user budget model in
> `CitratePaymaster`, and the bundler edge that authorizes and pre-checks
> sponsored UserOperations. For contracted integrators and operators.

> **Status: pre-audit.** The paymaster, bundler gate sidecar, and the off-chain
> pre-check shipped in EW-S1 and are **not yet third-party audited**. Caps and
> defaults below are the as-shipped values and the operator may change them on
> chain; treat numbers as illustrative, not guaranteed.

## Overview

Gas sponsorship has two layers:

1. **On-chain policy, `CitratePaymaster`** (`BasePaymaster`, ERC-4337 v0.7).
   Enforces *per-account* budgets and is the authoritative gate: every sponsored
   op passes `_validatePaymasterUserOp` and settles in `_postOp`.
2. **Off-chain edge, the bundler.** A self-hosted eth-infinitism reference
   bundler behind Caddy, fronted by a thin Citrate **gate** sidecar that does
   Bearer-key auth, rate limiting, and a paymaster **pre-check** so doomed ops
   are refused at the edge instead of burning a bundle slot. The edge is an
   optimization; the chain re-validates everything.

## Reference, paymaster policy

Source: `citrate-chain/contracts/src/aa/paymaster/CitratePaymaster.sol` @
`03d7851`. Policy follows `ADR-2026-06-05-ew-paymaster-policy`.

### Categories (1-byte tag in `paymasterAndData`)

The bundler embeds a category byte at **offset 52** of `paymasterAndData` (after
the ERC-4337 v0.7 prefix `paymaster(20) | verificationGasLimit(16) |
postOpGasLimit(16)`), read on-chain as `PMD_TAG_OFFSET`:

| Tag | Category | Budget behavior |
|---|---|---|
| `0x00` | **Standard** | Draws from the per-account **daily** gas-unit allowance (default `dailyCap` = 100,000). Resets at the first sponsored op of a new UTC day. |
| `0x01` | **Recovery** | Draws from a per-event budget (`recoveryEventCap`, default 200,000) that does **not** consume the daily counter, recovery must work even when the daily allowance is spent. |
| `0x02` | **First-op** | Unconditional sponsorship for an account's first-ever op (bounded by `firstOpCap`); the `hasUsedFirstOp` flag flips so it cannot be reused. |

The SDK builds the tag with `packCitratePaymasterAndData({ ..., category })`
(`citrate-sdk-js/src/aa/userop.ts`); `PaymasterCategory` enumerates the three.

### Caps & accounting

- `dailyCap`, `recoveryEventCap`, `firstOpCap` are owner-settable
  (`setDailyCap` / `setRecoveryEventCap` / `setFirstOpCap`). Setting a cap to `0`
  **disables** that category.
- **Fail-closed:** if the relevant budget can't cover the EntryPoint-reported
  `maxCost`, validation reverts with a precise error (`StandardCapExceeded`,
  `RecoveryCapExceeded`, `FirstOpCapExceeded`, `UnknownCategory`,
  `MissingCategoryTag`).
- Standard usage is recorded against the daily counter in `_postOp` (saturating
  add); recovery/first-op need no counter.
- `remainingStandard(account)` is a read for dashboards/SDK.

### Eligibility, the registry gate

Only **registered** accounts can be sponsored. A single `registrar` address
(typically `CitrateWalletFactory`) calls `registerWallet(account)` after a
successful deploy; `_validatePaymasterUserOp` reverts
`NotARegisteredCitrateWallet` otherwise.

> **Known gap (pre-audit):** sponsorship requires the account to be registered on
> the paymaster, and registration is gated to the `registrar`. Operators wiring
> the factory as registrar must confirm the factory actually calls
> `registerWallet` on deploy, or first-op sponsorship will revert. This
> registrar wiring is tracked as an open item in the EW-S1 / Lane C handoffs.

### Admin

- `setPaused(true)` halts all sponsorship for incident response (owner =
  operator multisig).
- `setRegistrar(addr)` rotates the registrar.

## Reference, bundler topology

Source: `citrate-bundler` @ `a3287de` (README + `gate/src/`).

```
client (browser / SDK / gui-native / wallet-extension)
   │  HTTPS JSON-RPC
   ▼
Caddy @ bundler.citrate.ai, TLS, per-IP + per-API-key rate limit
   ▼
Citrate gate sidecar (Node), bk_ Bearer auth + paymaster pre-check
   ▼
eth-infinitism bundler v0.7, standard ERC-4337 JSON-RPC
   ▼
citrate-chain RPC, EntryPoint v0.7 on chain 40204
```

- Runs on its own host so a bundler outage cannot take down `auth.citrate.ai` or
  the gateway.
- **Rate limits:** per-IP for anonymous traffic, higher per-`bk_`-API-key. (Exact
  numbers are operator config in the gate/Caddy; not reproduced here.)
- **Pre-check** (`gate/src/precheck.ts`): for ops naming the Citrate paymaster it
  `eth_call`s `CitratePaymaster.isRegistered(sender)` and
  `EntryPoint.balanceOf(paymaster)`, and validates the category byte. Self-paid
  ops (no paymaster) pass through untouched. **Fails open** on chain
  unreachability, the EntryPoint re-validates on-chain, so the pre-check is an
  optimization, not a security boundary.

### Bundler API

Standard ERC-4337 v0.7 methods (`eth_sendUserOperation`,
`eth_estimateUserOperationGas`, `eth_getUserOperationReceipt`,
`eth_supportedEntryPoints`, `eth_chainId`) plus the Citrate extension
`citrate_getUserAddress(userId)` (predicts the smart-wallet address; mirrors the
on-chain factory + the Rust `citrate-wallet-aa` crate). The SDK's `BundlerClient`
defaults to `https://bundler.citrate.ai/rpc` and forwards a `bk_` key as a Bearer
token when configured (`citrate-sdk-js/src/aa/bundler.ts`).

## Security & access

**Tier: commercial.** The budget model and the edge topology are
operator/integrator depth: a contracted builder should have it, but anonymous
publication of the full policy + topology aids an abuse actor more than a public
developer. The *public* developer-facing piece (how to tag and send an op) is on
the public [Passkeys](/aa/passkeys) page.

No secrets here. No `bk_` keys, multisig addresses, deposit balances, private
RPC/host endpoints, or droplet credentials appear on this page, those live only
in operator config (`.env`, Caddyfile) and are never built into Codex.

## Source & verification

- Paymaster: `citrate-chain/contracts/src/aa/paymaster/CitratePaymaster.sol` @ `03d7851`
- Bundler + gate: `citrate-bundler` (`README.md`, `gate/src/precheck.ts`, `Caddyfile`) @ `a3287de`
- SDK paymaster encoder: `citrate-sdk-js/src/aa/userop.ts` @ `bc5a830`

Pre-audit. Caps shown are defaults; verify on-chain values and re-check symbols
against the source SHAs.
