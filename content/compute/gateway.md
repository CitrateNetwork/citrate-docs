---
title: Deploy the inference gateway
codex_slug: /compute/gateway
tier: public
org_scope: ~
source_kind: authored
source: citrate-inference-gateway/gateway/src/, citrate-inference-gateway/crates/x402-axum/src/, citrate-inference-gateway/gateway/RUNBOOK.md
audited_against_sha: 603fe92
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is the operator's side of the Citrate Inference Gateway: how you deploy it on your own hardware, how
you configure it, and how a paid request settles. If you are an application developer who wants to call the
gateway rather than run one, read the [client reference](/sdks/inference-gateway) instead; this page does
not repeat the request and response shapes that live there.

> **Status: paid routes are not deployed.** The released gateway binary starts with `build_router`, which
> serves only the free read routes. The x402-paid and API-key routes below are mounted by
> `build_router_with_auth`, which today is used only by tests, so no public gateway settles paid calls yet.
> This page documents the design and the code so operators can review it; it is not a live service.

## What it is

The gateway is an OpenAI-compatible HTTP service that fronts Citrate Market on the Citrate Network, chain
id 40204. An operator runs it on their own machine, in front of either the marketplace or a resident
inference server, and it turns an OpenAI-shaped request into a metered, paid job. The work it performs is
settled in SALT per request over the x402 handshake; SALT settles the work, it is not something the gateway
holds for you.

It runs in one of two modes, chosen at start by `CITRATE_GATEWAY_MODE`.

- **Marketplace mode**, the default. The gateway reads the on-chain `ModelRegistry`, `ComputePricingOracle`,
  and `InferenceRouter`, selects a provider for the requested model, and gates the paid routes behind x402.
  This is the mode an operator selling into the marketplace runs.
- **Local-proxy mode.** A leaner build that fronts a resident inference server on a single machine, for
  example a llama-server behind your own reverse proxy. It is gated by a `cgk_` API key rather than x402 and
  makes no chain calls. It exists so a single on-premise node can serve the same OpenAI surface without
  joining the marketplace.

The gateway is the thin layer between an OpenAI request and the marketplace. It holds no model weights and
runs no inference itself; the providers it dispatches to are the [operators selling compute](/compute/node-agent),
and the price it quotes comes from the [x402 pricing contracts](/contracts/x402).

## How to use it

The deployment shape is the same in both modes: build the binary, set the environment, bind to loopback,
and front it with your own TLS terminator. The difference is which variables you set.

1. Build the gateway from the `citrate-inference-gateway` workspace, then decide the mode. Marketplace mode
   needs an RPC endpoint and the three contract addresses; local-proxy mode needs an upstream URL.
2. Set the listen address. The default is loopback, `127.0.0.1:9800`. Do not bind to `0.0.0.0` on a host
   reachable from the public network; terminate TLS and apply rate limits at your own reverse proxy and let
   that proxy reach the loopback port.
3. In marketplace mode, provision the operator signer. Settlement is a real on-chain transaction, so the
   gateway needs an account to send it from. That material is loaded from a keystore file or a KMS key
   reference, never from a value in your config; see the signer family below.
4. Start the gateway and confirm liveness with `GET /health`, then point Prometheus at `GET /metrics`.
5. Confirm the read path. `GET /v1/models` is free and reads the on-chain `ModelRegistry`; if it returns
   your expected models, the chain reads are wired. Once the paid router is wired, a paid `POST /v1/chat/completions`
   without a payment header returns an HTTP `402` challenge. With the current binary the paid routes are not
   mounted: expect a `404`, unless you enabled the development-only open chat mode below, which serves chat
   and batch without any payment gate.

## Reference

### Run modes and where they live

The mode is read and dispatched at start in `gateway/src/main.rs` (the `CITRATE_GATEWAY_MODE` variable is
read there); the configuration defaults live in `gateway/src/config.rs`. The full operator reference is
`gateway/RUNBOOK.md` in the repository.

| Mode | Value | Reads chain | Gating | Use |
|---|---|---|---|---|
| Marketplace | `marketplace` (default) | yes | x402 per request | selling into Citrate Market |
| Local-proxy | `local-proxy` | no | `cgk_` API key | a single on-premise inference server |

### Routes the operator runs

Handlers live under `gateway/src/`. The request and response bodies are documented on the
[client page](/sdks/inference-gateway); this table is the operator's view of what is exposed and how each
route is gated.

The paid routes and `/v1/usage` are mounted by the router that receives the operator signer and the x402
settlement configuration, `build_router_with_auth` in `gateway/src/lib.rs`, which is the intended
marketplace path. The gateway binary (`gateway/src/main.rs`) does not call it yet; it calls `build_router`. The default `build_router` without that configuration serves only the free read routes,
`/health`, `/v1/models`, and `/metrics`. Only when both `CITRATE_GATEWAY_OPEN_CHAT` and
`CITRATE_GATEWAY_DEV_MODE` are set does it also mount `/v1/chat/completions`, `/v1/batch`, `/v1/batch/{id}` and
`/v1/batch/{id}/output`, with no x402 gate. That mode is for development only.

| Route | Method | Handler | Gating |
|---|---|---|---|
| `/v1/chat/completions` | POST | `gateway/src/chat.rs` | x402, paid (not mounted by the released binary) |
| `/v1/batch` | POST | `gateway/src/batch.rs` | x402, paid (not mounted by the released binary) |
| `/v1/batch/{id}`, `/v1/batch/{id}/output` | GET | `gateway/src/batch.rs` | submitter-bound reads; mounted only with the paid router or in development open chat mode |
| `/v1/models` | GET | `gateway/src/models.rs` | free |
| `/v1/usage` | GET | `gateway/src/usage.rs` | API-key bearer (not mounted by the released binary) |
| `/health` | GET | `gateway/src/health.rs` | free liveness |
| `/metrics` | GET | `gateway/src/metrics.rs` | bearer token, disabled when unset |

### Configuration

The gateway reads its configuration from environment variables, verified in `gateway/src/config.rs`,
`gateway/src/main.rs`, and the signer, provider, metrics, and key-vault modules. Names and purposes follow;
no values are shown, and account material is never set inline. Contract addresses are published on the
[chain address book](/chain/addresses); do not transcribe them here.

```bash
# Mode and chain wiring
CITRATE_GATEWAY_MODE=marketplace          # or local-proxy; read in gateway/src/main.rs
CITRATE_GATEWAY_CHAIN_ID=40204            # default 40204
CITRATE_GATEWAY_RPC_URL=...               # chain JSON-RPC endpoint, default http://127.0.0.1:8545
CITRATE_GATEWAY_LISTEN_ADDR=127.0.0.1:9800  # default loopback; 0.0.0.0 only behind a proxy

# Marketplace-mode contract addresses (see /chain/addresses)
CITRATE_GATEWAY_MODEL_REGISTRY=0x...
CITRATE_GATEWAY_PRICING_ORACLE=0x...
CITRATE_GATEWAY_INFERENCE_ROUTER=0x...

# Operator signer: keystore file or KMS reference, plus spend caps. Never an inline secret.
CITRATE_GATEWAY_KEYSTORE_PATH=...                    # durable store, required in production
CITRATE_GATEWAY_KMS_KEY_ID=...                       # KMS key reference, an alternative to the keystore
CITRATE_GATEWAY_OPERATOR_KEYSTORE_PASSWORD=...       # keystore passphrase; or _PASSWORD_FILE
CITRATE_GATEWAY_OPERATOR_SPEND_CAP_WEI=...           # per-epoch settlement spend cap
CITRATE_GATEWAY_OPERATOR_EPOCH_BLOCKS=...            # spend-cap epoch length in blocks
CITRATE_GATEWAY_ALLOW_LOCAL_SIGNER=...               # development only, permits an in-process signer

# At-rest money-store master key (note: not CITRATE_GATEWAY_-prefixed)
GATEWAY_STORE_KEY=...                     # or GATEWAY_STORE_KEY_FILE

# Provider dispatch controls
CITRATE_GATEWAY_REQUIRE_SIGNED_RESULTS=...           # require providers to sign their results
CITRATE_GATEWAY_ALLOW_PRIVATE_PROVIDER_ENDPOINTS=... # development only, permits private provider URLs

# Request ceiling, metrics, dev gates, observability
CITRATE_GATEWAY_MAX_TOKENS=8192           # ceiling; per-request default is 512
CITRATE_GATEWAY_METRICS_TOKEN=...         # bearer token for /metrics; the route is disabled when unset
CITRATE_GATEWAY_DEV_MODE=...              # development only
CITRATE_GATEWAY_OPEN_CHAT=...             # development only, refuses non-loopback binds
LOG_FORMAT=...                            # default pretty
RUST_LOG=...

# Local-proxy mode upstream
CITRATE_GATEWAY_UPSTREAM_URL=...          # resident inference server, default http://127.0.0.1:8181
```

### The x402 settlement path, from the operator's side

Paid routes sit behind the `X402Layer` middleware in `crates/x402-axum/src/layer.rs`. The handshake is
implemented end to end, and settlement is a real on-chain transaction, not a mock. From the operator's view,
a paid request moves through these steps.

1. A request arrives without an `x-payment` header. The gateway mints a single-use nonce and returns HTTP
   `402` with a payment challenge bound to the configured treasury, the wSALT token, chain id 40204, an
   amount in wei, and a limited validity window.
2. The client signs the EIP-712 `transferWithAuthorization` digest and resends with the `x-payment` header.
3. The gateway verifies the signature and the nonce, confirms the recipient binds to your treasury, and
   calls `X402Facilitator.settlePayment` on chain. Settlement is a single transaction, not a retried one.
4. After the receipt confirms, the gateway runs the handler and dispatches to a selected provider, retrying
   up to `MAX_PROVIDER_ATTEMPTS` (3) providers before it gives up and returns a `503`. When
   `CITRATE_GATEWAY_REQUIRE_SIGNED_RESULTS` is set, it also verifies the provider's signed result. It then
   returns the OpenAI-shaped response. The provider-retry count and the signed-result check are separate from
   the single settlement transaction in step 3.

The client codec for this handshake lives in the [Marketplace SDK](/sdks/marketplace#x402); an operator does
not reimplement it.

### Pieces that are designed but not complete at this SHA

The gateway is honest about what is not finished. Treat these as the operator-relevant gaps.

- **Pool dispatch returns `503`.** The scoring logic can select a compute pool, but when a pool wins the
  dispatch the gateway returns a `503`; the per-provider path is the one that runs today. Status: Specified.
- **Usage accounting is in process memory.** `GET /v1/usage` totals are held in memory and do not survive a
  restart. Durable usage storage is a later slice. Status: Specified.
- **Friendly model-name resolution is best effort.** A pinned 32-byte model hash always resolves; a friendly
  name is resolved by enumerating the registry, because `ModelRegistry` exposes no name-to-hash view. A
  dedicated view or an off-chain name registry is the intended fix. Status: Specified.

## Design rationale

The gateway runs on the operator's own hardware and binds to loopback by default, so the network surface is
something you place deliberately behind your own TLS and rate limits rather than something exposed by
accident. Settlement happens per request rather than against a held balance, so the gateway never escrows
more than the single request or batch in flight, and an operator is paid for the work actually performed.
The OpenAI shape is kept intact so the payment difference sits behind one middleware and the rest reads as an
ordinary inference proxy. The cost of per-request settlement is an on-chain transaction in the hot path; the
benefit is that no balance is held on a caller's behalf.

## Failure modes

The paid surface is where the gateway is security relevant, and it fails closed.

- **No payment.** A paid route without a valid `x-payment` header returns `402`, never the work.
- **Replayed or forged payment.** The nonce is single-use and minted by this gateway, the signature is
  verified, the window is checked, and the recipient is bound to your treasury, so a replayed payment is
  rejected before it touches the chain.
- **Settlement revert.** If the on-chain settlement reverts, the gateway returns `402` with the transaction
  hash rather than running the handler.
- **Oversized request.** `max_tokens` is clamped to the ceiling before pricing, a batch over 1000 requests
  is rejected, and a batch spanning more than 32 distinct models (`MAX_DISTINCT_BATCH_MODELS`) is rejected,
  so a caller cannot price small and demand large.
- **Open chat in production.** The unauthenticated chat path is gated behind two development flags and the
  gateway refuses to enable it on a non-loopback bind, so it cannot be left exposed by accident.
- **Pool dispatch.** A request that scores to a pool returns `503` today rather than failing silently; route
  such traffic to the per-provider path until pool dispatch ships.

## Access and canon

Commercial tier. This is operator and deployment depth, the configuration and settlement detail an operator
needs to stand up a gateway. The client-facing REST surface that calls it is public and lives on the
[client page](/sdks/inference-gateway).

The gateway runs on hardware you control. Identity verification through VERI, Citrate's in-house verification, is part of membership; node and consensus code do not check operator identity. No API keys, treasury addresses, or operator account material appear here; that material is loaded
from a keystore or a KMS reference and is never documented. The repository contains no hardcoded credentials
at the audited SHA.

## Source and verification

- Source: `citrate-inference-gateway`. Run modes and configuration in `gateway/src/main.rs` and
  `gateway/src/config.rs`; router assembly in `gateway/src/lib.rs`; route handlers in `gateway/src/`
  (`chat.rs`, `batch.rs`, `models.rs`, `usage.rs`, `health.rs`, `metrics.rs`); chain reads in
  `gateway/src/queries.rs` (the `ChainQueries` trait, not an HTTP route); x402 middleware in
  `crates/x402-axum/src/layer.rs`; operator reference in `gateway/RUNBOOK.md`.
- Audited against SHA: `603fe92`.
- Status: Implemented (pre-audit) for the free routes: the run modes, on-chain reads and per-provider
  dispatch with failover exist and run. The x402 settlement path and the API-key routes are built and tested
  but not mounted by the released binary, so paid calls are not live. This slice has not had an external audit. Specified: pool
  dispatch (returns `503` today), durable usage accounting, and a name-to-hash model view.
