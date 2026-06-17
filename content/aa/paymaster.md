---
title: Paymaster and bundler topology
codex_slug: /aa/paymaster
tier: commercial
org_scope: ~
source_kind: authored
source: contracts/src/aa/paymaster/CitratePaymaster.sol + citrate-bundler (gate/src, README, Caddyfile)
surfaces: [AA-paymaster, SC-aa-paymaster, API-BUNDLER]
audited_against_sha: 54d1f2c
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A paymaster sponsors the gas for an operation so a person can transact with no SALT in hand, which is what
lets someone use a Citrate Keyring on their first visit. Citrate sponsors gas with a contract paymaster
under per-account budgets, fronted by a bundler that authorizes and pre-checks operations at the edge. If
you build or operate against sponsored operations, this is the page you work from.

## What it is

There is no native gas-sponsorship operation on the network; sponsorship is done with an ERC-4337 paymaster
contract. Sponsorship has two layers.

The authoritative layer is `CitratePaymaster`, an ERC-4337 v0.7 paymaster that extends `BasePaymaster`. It
enforces a per-account budget: every sponsored operation passes its `_validatePaymasterUserOp` check and
settles in `_postOp`. The edge layer is the bundler: a self-hosted eth-infinitism reference bundler behind
Caddy, fronted by a thin Citrate gate that does key authorization, rate limiting, and a paymaster pre-check,
so an operation that is certain to fail is refused at the edge instead of taking a bundle slot. The edge is
an optimization; the contract re-validates everything.

A related but separate mechanism serves the education stack. There, sponsored student actions go through an
EIP-2771 forwarder (`contracts/src/edu/Forwarder.sol`), a meta-transaction relay where a relayer pays gas
on behalf of a device-bound signer. That is a different path from the ERC-4337 paymaster described here; we
note it so the two are not confused.

## How to use it

For an integrator the steps are: tag the operation, send it, watch the budget.

1. **Tag.** Build the operation with a one-byte category in `paymasterAndData`. The SDK does this for you;
   the category names the budget the operation should draw from.
2. **Send.** Post the operation to the bundler at `https://bundler.citrate.ai/rpc`. When you have a `bk_`
   key, send it as a Bearer token for the higher rate limit.
3. **Watch.** Read `remainingStandard(account)` on the paymaster to show a person how much of their daily
   sponsorship is left.

A new account's first operation is unconditional, within its cap, so a person can deploy and act without
SALT. After that, ordinary operations draw from a daily allowance, and recovery operations draw from their
own budget so recovery is never blocked by a spent daily allowance.

## Reference

### Categories

The bundler embeds a one-byte category at offset 52 of `paymasterAndData`, right after the ERC-4337 v0.7
prefix of `paymaster(20) | verificationGasLimit(16) | postOpGasLimit(16)`. The contract reads it at
`PMD_TAG_OFFSET`.

| Tag | Category | Budget behavior |
|---|---|---|
| `0x00` | Standard | draws from the per-account daily gas-unit allowance, `dailyCap`; the counter resets at the first sponsored operation of a new UTC day |
| `0x01` | Recovery | draws from a per-event budget, `recoveryEventCap`, that does not touch the daily counter, so recovery works even when the daily allowance is spent |
| `0x02` | First-op | one unconditional sponsorship for an account's first operation, bounded by `firstOpCap`; the `hasUsedFirstOp` flag then flips so it cannot be reused |

### Caps and accounting

The caps live in `CitratePaymaster` as owner-settable values. The as-deployed defaults, set in
`script/aa/DeployAA.s.sol`, are:

| Cap | Default | Set with |
|---|---|---|
| `dailyCap` | 100,000 gas units | `setDailyCap` |
| `recoveryEventCap` | 200,000 gas units | `setRecoveryEventCap` |
| `firstOpCap` | 300,000 gas units | `setFirstOpCap` |

Setting any cap to `0` disables that category. Standard usage is recorded against the daily counter in
`_postOp` with a saturating add; the day key is `block.timestamp / 86400`, so the counter resets at the UTC
day boundary. Recovery and first-op need no running counter. `remainingStandard(account)` returns what is
left of the daily allowance for dashboards and the SDK. An operator may change any of these on-chain, so
treat the numbers above as the shipped defaults, not guarantees.

If the relevant budget cannot cover the cost the EntryPoint reports, validation reverts with a precise
error rather than sponsoring anyway. It fails closed.

| Error | Reverts when |
|---|---|
| `Paused()` | sponsorship is paused |
| `NotARegisteredCitrateWallet(account)` | the account is not registered |
| `StandardCapExceeded(account, used, cap, wouldUse)` | a standard operation would exceed `dailyCap`, or `dailyCap` is 0 |
| `RecoveryCapExceeded(account, cap, wouldUse)` | a recovery operation would exceed `recoveryEventCap`, or it is 0 |
| `FirstOpAlreadyUsed(account)` | the account already used its first-op sponsorship |
| `FirstOpCapExceeded(cap, wouldUse)` | a first operation would exceed `firstOpCap`, or it is 0 |
| `UnknownCategory(tag)` | the category byte is greater than 2 |
| `MissingCategoryTag()` | `paymasterAndData` has no category byte |

### Eligibility, the registrar gate

Only registered accounts can be sponsored. A single `registrar` address, typically the account factory,
calls `registerWallet(account)` after a successful deploy; `unregisterWallet(account)` reverses it. Any
sponsored operation from an unregistered account reverts `NotARegisteredCitrateWallet`. The owner can rotate
the registrar with `setRegistrar` and halt all sponsorship with `setPaused(true)` for incident response.

An operator wiring the factory as registrar should confirm the factory actually calls `registerWallet` on
deploy, or first-operation sponsorship will revert for new accounts. This registrar wiring is tracked as an
open item in the EW-S1 handoffs.

### Bundler topology

The bundler runs on its own host, so a bundler outage cannot take down the identity authority or the
gateway. The path an operation takes:

```
client (browser, SDK, native app)
   |  HTTPS JSON-RPC
   v
Caddy at bundler.citrate.ai, TLS, per-IP rate limit
   v
Citrate gate (Node), bk_ Bearer auth, rate limiting, paymaster pre-check
   v
eth-infinitism bundler v0.7, standard ERC-4337 JSON-RPC
   v
network RPC, EntryPoint v0.7 on chain 40204
```

The gate (`citrate-bundler/gate/src`) authenticates `bk_` keys by SHA-256 hash held in Redis, so a dump of
the store cannot be replayed as a credential. It rate-limits anonymous traffic per IP and authenticated
traffic per key, with the limits as operator configuration. Its pre-check (`gate/src/precheck.ts`), for an
operation naming the Citrate paymaster, calls `CitratePaymaster.isRegistered(sender)` and
`EntryPoint.balanceOf(paymaster)` and validates the category byte. Self-paid operations, those naming no
paymaster, pass through untouched. The pre-check fails open if the chain is unreachable, since the
EntryPoint re-validates on-chain; the pre-check is an optimization, not a security boundary.

The bundler exposes the standard ERC-4337 v0.7 methods, `eth_sendUserOperation`,
`eth_estimateUserOperationGas`, `eth_getUserOperationReceipt`, `eth_supportedEntryPoints`, and
`eth_chainId`, plus the Citrate extension `citrate_getUserAddress(userId)`, which predicts a Citrate Keyring
address and mirrors the on-chain factory. The SDK's bundler client defaults to
`https://bundler.citrate.ai/rpc`. See the [bundler SDK](/sdks/bundler) for the client.

## Design rationale

We made sponsorship contract-based because the network has no built-in way to sponsor gas, and a contract
paymaster is the standard ERC-4337 answer that existing tooling already understands. Per-account budgets,
rather than a single shared pool, mean one account cannot drain sponsorship for everyone, and the three
categories exist so the budgets that must never fail, a person's first operation and an account recovery,
draw from separate allowances than ordinary daily use. The registrar gate keeps sponsorship to accounts the
network actually issued, so an arbitrary contract cannot spend the paymaster's deposit. The edge gate is
there to save bundle slots and to rate-limit abuse, but we kept it strictly an optimization: it fails open,
and the contract is the one place that decides whether an operation is sponsored. The cost is that operators
must keep the paymaster funded and the registrar correctly wired; we think a clear on-chain budget is worth
that. The economics of who funds sponsorship are in [network economics](/chain/economics).

## Failure modes

- **Over budget.** A standard operation past the daily cap, a recovery past the event cap, or a reused
  first operation reverts with the matching error above. The contract never sponsors past a budget.
- **Unregistered account.** Sponsorship reverts `NotARegisteredCitrateWallet`. If the factory is not wired
  to register on deploy, new accounts cannot be sponsored until they are registered.
- **Missing or unknown tag.** An operation with no category byte, or a byte greater than 2, reverts at
  validation rather than being sponsored under a guessed category.
- **Bundler outage.** The bundler is on its own host; if it is down, sponsored operations cannot be
  submitted, but the identity authority and gateway keep running. Self-paid operations are unaffected.
- **Edge fails open.** If the chain is unreachable the pre-check is skipped and the operation goes to the
  bundler, where the EntryPoint and the paymaster contract re-validate. The edge skipping a check never
  causes an over-budget sponsorship.
- **Secrets.** No `bk_` key, multisig address, deposit balance, private RPC endpoint, or host credential
  appears in Citrate Atlas. Those live only in operator configuration.

## Access and canon

Commercial. The budget model and the edge topology are operator and integrator depth; publishing the full
policy and topology to anyone aids an abuse actor more than it helps a public developer. The public,
developer-facing piece, how to tag and send a sponsored operation, sits on [Passkeys](/aa/passkeys). SALT
settles the work the network performs, including the gas a paymaster fronts; it is the unit of account, not
a product to hold.

## Source and verification

| Surface | Source | Status |
|---|---|---|
| Paymaster policy, caps, errors | `contracts/src/aa/paymaster/CitratePaymaster.sol` | Implemented (pre-audit) |
| Deployed cap defaults | `contracts/script/aa/DeployAA.s.sol` | Implemented (pre-audit) |
| EIP-2771 forwarder (education stack) | `contracts/src/edu/Forwarder.sol` | Implemented (pre-audit) |
| Bundler gate, pre-check, routing | `citrate-bundler/gate/src`, `README.md`, `Caddyfile` | Implemented (pre-audit) |

Paymaster and forwarder verified against the contracts repo at `54d1f2c`; the bundler verified against
`citrate-bundler` at `a3287de`. The caps shown are the as-deployed defaults and an operator may change them
on-chain. The stack has shipped and runs on testnet 40204; it has not had an external audit. Re-verify the
on-chain cap values and the source symbols against the SHAs before relying on this page.
