---
title: Citrate Bundler
codex_slug: /sdks/bundler
tier: public
org_scope: ~
source_kind: authored
source: citrate-bundler/gate/src/server.ts, citrate-bundler/gate/src/precheck.ts, citrate-bundler/gate/src/config.ts, citrate-bundler/Caddyfile, citrate-bundler/Dockerfile
surfaces: [API-BUNDLER]
audited_against_sha: e1aa264
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The Citrate Bundler is the ERC-4337 service that accepts UserOperations for Citrate Keyring accounts on
the Citrate Network, chain id 40204, and submits them on chain. It is the piece that lets a person act
through a smart-contract account without holding native SALT for gas, because a paymaster sponsors the
work. This page is for integrators wiring an account-abstraction flow against it.

## What it is

The bundler is two parts on one host. The first is an eth-infinitism v0.7 reference bundler, vendored as a
Docker image and run unchanged. The second is a thin Citrate gate written in TypeScript that sits in front
of it. A client never talks to the reference bundler directly; it talks to the gate, and the gate proxies
the call upstream after it has checked the request.

The gate does three things, in order, before it forwards a call: it validates an API key, it applies a
per-IP and a per-key rate limit, and on `eth_sendUserOperation` it runs a paymaster precheck against the
chain. Every other JSON-RPC method passes through to the reference bundler unchanged, so a standard
ERC-4337 SDK treats this as an ordinary bundler. The gate is the only Citrate-specific code in the path;
the method surface is the standard one.

The bundler is one corner of the Citrate Keyring account-abstraction topology. A Citrate Keyring account
is a smart-contract account, often controlled by a passkey rather than a stored secret, described in
[passkeys](/aa/passkeys). When that account wants to act, it builds a UserOperation, names the
[CitratePaymaster](/aa/paymaster) to cover gas, and sends it to this bundler. The bundler hands the
operation to the EntryPoint, the EntryPoint validates it and pulls gas from the paymaster's deposit, and
the account's intent lands on chain. The JavaScript helpers that build and sign those operations live in
the [JavaScript SDK](/sdks/js).

## How to use it

1. Point your ERC-4337 client at the bundler host. The public endpoint is a JSON-RPC POST to `/rpc`, with
   TLS terminated at the edge by the reverse proxy. Use a placeholder host such as `<bundler-host>` until
   you have the deployed name.
2. Confirm you are talking to chain 40204 by calling `eth_chainId`. It returns `0x9d0c`. This call needs
   no API key.
3. Obtain an API key. Keys are issued by the operator and carry a `bk_` prefix. Send it as
   `Authorization: Bearer <your-api-key>` on any call that submits work.
4. Build a UserOperation in your SDK, name the CitratePaymaster, and submit it with
   `eth_sendUserOperation`. The gate runs its precheck, then forwards to the reference bundler, which
   bundles and submits it.
5. Poll for the result with `eth_getUserOperationReceipt`, passing the hash returned by the send call.

## Reference

The surface is `API-BUNDLER`, the JSON-RPC methods reachable at `POST /rpc`. The gate special-cases only
`eth_sendUserOperation`; the rest are served by the eth-infinitism v0.7 upstream, so the standard v0.7
method set applies.

| Method | Params | Returns | Handled by |
|---|---|---|---|
| `eth_chainId` | `[]` | hex chain id, `0x9d0c` for 40204 | proxied to upstream |
| `eth_supportedEntryPoints` | `[]` | array of configured EntryPoint addresses | proxied to upstream |
| `eth_sendUserOperation` | `[userOp, entryPoint]` | UserOperation hash | gate precheck, then upstream |
| `eth_estimateUserOperationGas` | `[userOp, entryPoint]` | gas estimate | proxied to upstream |
| `eth_getUserOperationByHash` | `[hash]` | UserOperation and its location | proxied to upstream |
| `eth_getUserOperationReceipt` | `[hash]` | receipt | proxied to upstream |

The host also answers two non-RPC routes. `GET /health` returns the string `ok` and is served by the
reverse proxy without touching the bundler, a cheap liveness probe. `GET /healthz` returns a composite
status served by the gate, `{ "status": "ok", "redis": true, "upstream": true }`, which checks Redis and
the upstream bundler. The `/metrics` route is Prometheus exposition and is not public; the edge returns
`403` and operators scrape it from inside the host.

### The paymaster precheck

When a UserOperation names the CitratePaymaster and a paymaster is configured on the gate, the gate runs an
off-chain precheck before it forwards the call (`gate/src/precheck.ts`). The precheck is an optimization,
not a security boundary; the EntryPoint re-validates everything on chain regardless. Its three steps:

1. The category byte, the first byte of `paymasterData`, must be a known category, `0`, `1`, or `2`.
2. The sender must be registered on the paymaster, read as `CitratePaymaster.isRegistered(sender)`.
3. The paymaster must hold a non-zero EntryPoint deposit, read as `EntryPoint.balanceOf(paymaster)`,
   because a zero deposit would surface as an AA31 revert.

A failed precheck returns JSON-RPC error code `-32002` with a reason. If the chain itself is unreachable
the precheck fails open with a logged reason, since on-chain validation remains authoritative. Operations
that pay their own gas, with no paymaster named, skip the precheck entirely.

### citrate_getUserAddress

A method named `citrate_getUserAddress(userId)`, which would predict the smart-contract account address
for a Citrate user id, is described in the repository README. It is **not implemented**. We searched the
gate and the upstream method surface at the audited SHA and found no handler for it; the README documents
an intended method that has not landed. Do not call it on the public endpoint. To predict an account
address today, use the on-chain factory through the [JavaScript SDK](/sdks/js). Status for this method:
Specified.

### Examples

```bash
# Confirm chain connectivity, no API key required.
curl -s -X POST https://<bundler-host>/rpc \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}
```

```bash
# List the configured EntryPoints.
curl -s -X POST https://<bundler-host>/rpc \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_supportedEntryPoints","params":[]}'
```

```bash
# Submit a UserOperation, API key required.
curl -s -X POST https://<bundler-host>/rpc \
  -H 'content-type: application/json' \
  -H 'Authorization: Bearer <your-api-key>' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_sendUserOperation","params":[{ /* userOp */ }, "<entryPoint>"]}'
```

## Design rationale

The gate is deliberately thin. The reference bundler is a known quantity, audited upstream and run without
modification, so the only Citrate logic in the path is the gate, which is small enough to read in one
sitting. The split also isolates failure: the bundler lives on its own host, so a bundler outage cannot
take down the identity service or the inference gateway.

The reference bundler runs in `--unsafe` mode (`Dockerfile`). That mode skips the `debug_traceCall`
full-validation step, which the Citrate Network RPC does not yet expose, a method that exists only on
certain client implementations. For the current single-tenant deployment, where every UserOperation
originates from verified Citrate clients rather than an open mempool, signature, nonce, and paymaster
validation are sufficient. The flag is dropped once the chain gains the trace method. We note this here so
the trade-off is visible, not buried.

## Failure modes

This surface is security relevant, and it fails closed where it matters.

- **Missing or invalid API key.** When the gate requires a key, a missing key returns `-32001` and a bad
  key returns `-32001`; neither reaches the bundler. The key requirement is configurable, and the default in
  `gate/src/config.ts` is now on (`GATE_REQUIRE_API_KEY` defaults to `true`). An operator who wants an open
  endpoint must set `GATE_REQUIRE_API_KEY=false`, and in production must also set `GATE_ALLOW_ANONYMOUS=true`
  to accept the risk, or the gate warns.
- **Rate limit exceeded.** A per-IP limit, default 60 per minute, and a per-key limit, default 600 per
  minute, both return `-32005`. If the backing Redis store is unavailable the rate limiter fails closed,
  rejecting rather than waving traffic through.
- **Doomed sponsored operation.** The paymaster precheck rejects an unregistered sender, a bad category
  byte, or an empty paymaster deposit with `-32002`, before a bundler slot is spent. If the chain is
  unreachable the precheck fails open and the EntryPoint catches the same conditions on chain.
- **Upstream unreachable.** If the gate cannot reach the bundler it returns `-32003` rather than hanging.
- **Production config gaps.** In production the gate refuses to boot if a security-relevant value is unset,
  for example a missing Redis URL or an unset paymaster address; in development the same gaps degrade to
  logged warnings with safe defaults.

## Access and canon

Tier: commercial. The method surface itself is standard ERC-4337, but operating against the bundler, API
keys, the precheck semantics, the rate-limit behavior, the EntryPoint configuration, is integration depth
for contracted builders and is gated from anonymous scraping.

No secrets appear here. The deployment runbook holds operator material, an operator account mnemonic and a
generated store password, which live only in a `0600` `.env` on the host and are never transcribed into
documentation. Examples use a placeholder host and `<your-api-key>`. Do not paste any key, password,
mnemonic, or private host detail into an example.

## Source and verification

- Source: `citrate-bundler`. Routing, auth, and rate limits in `gate/src/server.ts`; the paymaster
  precheck in `gate/src/precheck.ts`; the fail-closed config in `gate/src/config.ts`; public routing and
  the `/health` versus `/healthz` split in `Caddyfile`; the `--unsafe` upstream invocation in `Dockerfile`.
  The `citrate_getUserAddress` reference is in `README.md`. Operator secrets live in `DEPLOY.md` and are
  not reproduced here.
- Audited against SHA: `e1aa264`.
- Status: Implemented (pre-audit). The gate, the precheck, the rate limits, and the standard method surface
  exist and run; this slice has not had an external audit. The `citrate_getUserAddress` method is
  Specified, declared in the README but not implemented at this SHA.
