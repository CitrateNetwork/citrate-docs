---
title: Citrate Bundler (ERC-4337 JSON-RPC)
codex_slug: /sdks/bundler
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-bundler/gate/src/server.ts
surfaces: [API-BUNDLER]
audited_against_sha: a3287de
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Bundler

> The ERC-4337 (v0.7) account-abstraction bundler for Citrate (chainId `40204`). A JSON-RPC endpoint that
> accepts UserOperations, fronted by an auth + rate-limit + paymaster-precheck gate. For integrators
> building gasless smart-account flows.

## Overview

The bundler is an eth-infinitism v0.7 reference bundler with a Citrate **gate** sidecar in front
(`gate/src/`). The gate validates API keys, applies per-IP and per-key rate limits, runs a
`CitratePaymaster` precheck on `eth_sendUserOperation`, exports metrics, and proxies all other JSON-RPC
methods to the upstream bundler unchanged. Standard ERC-4337 wallets/SDKs talk to it as an ordinary
bundler.

Single documented surface: **`API-BUNDLER`**, the JSON-RPC methods (standard ERC-4337 plus the custom
`citrate_getUserAddress`).

> **Status, pre-1.0 / pre-audit.** The upstream bundler runs in `--unsafe` mode because Citrate RPC
> does not yet expose `debug_traceCall` (drop `--unsafe` once it does), acceptable for the current
> single-tenant deployment. See the per-method honesty note on `citrate_getUserAddress` below.

## Reference, JSON-RPC methods (`API-BUNDLER`)

The gate accepts JSON-RPC `POST` requests and proxies them to the upstream bundler; only
`eth_sendUserOperation` gets an extra precheck (`gate/src/precheck.ts`). Standard ERC-4337 v0.7 methods:

| Method | Params | Returns |
|---|---|---|
| `eth_chainId` | `[]` | hex chain id (`0x9d0c` = `40204`) |
| `eth_supportedEntryPoints` | `[]` | `Address[]`, configured EntryPoint(s) |
| `eth_sendUserOperation` | `[userOp, entryPoint]` | UserOp hash (gated + prechecked) |
| `eth_estimateUserOperationGas` | `[userOp, entryPoint]` | gas estimate (proxied) |
| `eth_getUserOperationByHash` | `[hash]` | UserOp + location (proxied) |
| `eth_getUserOperationReceipt` | `[hash]` | receipt (proxied) |

**`eth_sendUserOperation` precheck** (`gate/src/precheck.ts`, only when a paymaster is configured):

1. **Sender registration**, `CitratePaymaster.isRegistered(sender)`; rejects unregistered senders.
2. **Paymaster category byte**, first byte of `paymasterData` must be `0`, `1`, or `2`.
3. **EntryPoint deposit**, `EntryPoint.balanceOf(paymaster)` must be non-zero (else AA31 would follow).

Failed prechecks return JSON-RPC error code `-32002`.

### `citrate_getUserAddress`

`citrate_getUserAddress(userId)` is documented in the repo README as predicting the smart-wallet address
for a Citrate user id (mirroring `citrate-wallet-aa::predict_address` in Rust and
`CitrateWalletFactory.predictAddress` on-chain).

> **Honest status:** the gate has **no dedicated handler** for this method at the audited SHA, it is
> declared in the README but not yet implemented in the gate/bundler in this slice. Documenting it as the
> intended surface; do not depend on it on the public endpoint until a handler lands. Address prediction
> today is available via the AA SDK / on-chain factory.

## Endpoint

- Public JSON-RPC endpoint: `POST` to the bundler host root (TLS-terminated by the reverse proxy).
- Health: `GET /health` → `200 "ok"`. Composite health: `GET /healthz` → `{ status, redis, upstream }`.
- `eth_sendUserOperation` (and other gated methods) require an `Authorization: Bearer <api-key>` header.
- Rate limits: per-IP (default 60/min) and per-key (default 600/min), fail-closed if the backing store
  is unavailable.
- `/metrics` is Prometheus exposition and is intentionally **not** public (scrape from the host).

## Examples

```bash
# Prove chain connectivity (no auth)
curl -s -X POST https://<bundler-host>/ \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# → {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}

# List supported EntryPoints
curl -s -X POST https://<bundler-host>/ \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_supportedEntryPoints","params":[]}'

# Submit a UserOperation (requires an API key)
curl -s -X POST https://<bundler-host>/ \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <your-api-key>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_sendUserOperation","params":[{ /* userOp */ }, "<entryPoint>"]}'
```

## Tutorials

- For gasless smart-account flows that submit UserOps through this bundler, see the AA section's
  tutorials (`/aa`).

## Security & access

**Tier: commercial.** Operating against the bundler (API keys, paymaster precheck semantics, rate-limit
behavior, EntryPoint config) is integration depth for contracted builders, gated from anonymous scraping
per `00_SCHEMA_AND_AUTHORING.md` §3.5. The method surface itself is standard ERC-4337.

**No secrets here, endpoints only.** The deployment runbook (`DEPLOY.md`) contains operator secrets
(an operator wallet mnemonic, a generated store password). Those are **not** transcribed here and must
never appear in documentation; they live only in a `0600` `.env` on the host. Do not paste any key,
password, mnemonic, or private host detail into examples, use placeholder hosts and `<your-api-key>`.

## Source & verification

- Source: `citrate-bundler`, `gate/src/server.ts` (routing/auth), `gate/src/precheck.ts` (paymaster
  precheck), `README.md` (method surface). Deployment: `DEPLOY.md` (secrets, not documented here).
- Audited against SHA: `a3287de`.
- Reference is `transcluded`: the truth lives in the repo at the pinned SHA.
