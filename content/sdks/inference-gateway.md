---
title: Citrate Inference Gateway
codex_slug: /sdks/inference-gateway
tier: public
org_scope: ~
source_kind: authored
source: citrate-inference-gateway/gateway/src/, citrate-inference-gateway/crates/x402-axum/src/
surfaces: [API-GW-rest, API-GW-x402]
audited_against_sha: 603fe92
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The Citrate Inference Gateway is an OpenAI-compatible HTTP service in front of Citrate Market on the
Citrate Network, chain id 40204. You point an existing OpenAI client at it, call the standard `/v1/*`
routes, and the gateway selects a provider, meters the work, and settles payment per request. This page is
for application developers and integrators who want to run inference against the marketplace without
writing new client code.

## What it is

The gateway speaks the OpenAI REST shape, so an existing client works by changing one setting, its base
URL. Behind that familiar surface it resolves the requested model against on-chain registries, picks a
provider, dispatches the call, counts tokens, and settles the cost. Settlement uses x402, an HTTP `402`
payment handshake described below and shared with the [Marketplace SDK](/sdks/marketplace#x402).

The service runs in one of two modes, selected at boot by `CITRATE_GATEWAY_MODE`.

- **Marketplace mode**, the default. The gateway reads the on-chain `ModelRegistry`,
  `ComputePricingOracle`, and `InferenceRouter`, selects a provider for the requested model, and gates paid
  routes behind x402. This is the mode this page documents.
- **Local-proxy mode.** A leaner build that fronts a resident inference server, for example a llama-server
  on a single machine, gated by a `cgk_` API key rather than x402, with no chain calls. It exists so a
  single-node deployment can serve the same OpenAI surface; it is named here for completeness and is not
  the marketplace surface.

The two read paths fit Citrate Market as follows. A model's price comes from the
[x402 pricing contract](/contracts/x402) and the pricing oracle; the provider that runs the work is one of
the operators selling [compute](/compute/pool). The gateway is the thin layer that turns an OpenAI request into
a metered, paid marketplace job and an OpenAI response.

There are two documented surfaces:

- **`API-GW-rest`**, tier public, the OpenAI-compatible routes and their request and response shapes, what
  a developer needs to call it.
- **`API-GW-x402`**, tier commercial, the x402 payment handshake that gates the paid routes, shared with
  the [Marketplace SDK](/sdks/marketplace#x402).

## How to use it

1. Set your OpenAI client's base URL to the gateway, `https://<gateway-host>/v1`. The API key field is not
   used for payment on the paid routes; x402 settles those.
2. List the available models with `GET /v1/models`. This route is free and needs no payment. The `id` it
   returns is what you pass back as the `model` field.
3. For a chat completion, send `POST /v1/chat/completions` with the standard OpenAI body. The first attempt
   without a payment header returns an HTTP `402` with a payment challenge.
4. Sign the challenge and resend. The plain OpenAI client does not produce a payment header, so use the
   [Marketplace SDK `X402Client`](/sdks/marketplace#x402), which catches the `402`, signs, and retries for
   you.
5. To see what you have spent, call `GET /v1/usage` with your API key as a bearer token.

### OpenAI-compatible client pattern

Because the routes match the OpenAI shape, the official SDKs work by overriding the base URL. The free
routes work straight away; the paid routes need the x402 client.

```python
from openai import OpenAI

client = OpenAI(base_url="https://<gateway-host>/v1", api_key="not-used-for-x402")
print(client.models.list())   # GET /v1/models, free, no payment
```

```typescript
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://<gateway-host>/v1", apiKey: "unused" });
await client.models.list();   // GET /v1/models, free
```

## Reference

### REST routes (`API-GW-rest`)

Handlers live under `gateway/src/`. The gateway listens on `127.0.0.1:9800` by default
(`CITRATE_GATEWAY_LISTEN_ADDR`), and production runs behind a TLS reverse proxy.

| Route | Method | Handler | Auth |
|---|---|---|---|
| `/v1/chat/completions` | POST | `gateway/src/chat.rs` | x402, paid |
| `/v1/batch` | POST | `gateway/src/batch.rs` | x402, paid |
| `/v1/batch/{id}` | GET | `gateway/src/batch.rs` | submitter-bound read |
| `/v1/batch/{id}/output` | GET | `gateway/src/batch.rs` | submitter-bound read |
| `/v1/models` | GET | `gateway/src/models.rs` | free |
| `/v1/usage` | GET | `gateway/src/usage.rs` | API-key bearer |
| `/health` | GET | `gateway/src/health.rs` | free liveness |
| `/metrics` | GET | `gateway/src/metrics.rs` | Prometheus exposition |

`POST /v1/chat/completions` (`gateway/src/chat.rs`) takes the OpenAI `ChatCompletionRequest`,
`{ model, messages, max_tokens?, stream? }`, and returns a `ChatCompletionResponse` with `choices` and a
`usage` block. It streams over server-sent events when `stream` is true. The handler resolves the model,
quotes the cost on chain, dispatches to a selected provider with up to three failover attempts, and
verifies the provider's signed result before returning it. `max_tokens` is clamped to a ceiling,
`CITRATE_GATEWAY_MAX_TOKENS`, default 8192; an unset value falls back to a per-request default of 512.

`POST /v1/batch` (`gateway/src/batch.rs`) takes `{ requests: [ChatCompletionRequest, ...] }` up to a
maximum of 1000 and returns a batch record with a `batch_id` and a `status` in the set
`submitted | running | completed | partial_failure | failed`. A detached processor walks the batch through
its states, dispatches each request, and settles the escrow at the end, releasing the cost of completed
slots and refunding the cost of failed ones. The status and output reads are bound to the submitter.

`GET /v1/models` (`gateway/src/models.rs`) reads the on-chain `ModelRegistry` and the compute pools and
returns `{ object: "list", data: [...] }`. It includes individual active models and pools, with pool ids
prefixed `pool-`. Inactive models are filtered out.

`GET /v1/usage` (`gateway/src/usage.rs`) requires an API-key bearer token and returns totals and a daily
breakdown of requests, tokens, and SALT spent. The accounting is held in process memory at this SHA;
durable storage of usage is planned for a later slice. Status for durable usage: Specified.

### Model name resolution, a current limit

The gateway resolves a model identifier to an on-chain hash in `gateway/src/queries.rs`. A caller may pass
a pinned 32-byte hash directly, which always works. A caller may also pass a friendly name, which the
gateway resolves by enumerating the registry, since the on-chain `ModelRegistry` does not expose a
name-to-hash view, the hash being derived from creator, name, timestamp, and a nonce. A dedicated
`getModelByName` view, or an off-chain name registry, is the intended way to close this gap. Status for the
name view: Specified.

### x402 payment (`API-GW-x402`)

Paid routes sit behind the `X402Layer` middleware (`crates/x402-axum/src/layer.rs`). The handshake is
implemented end to end; settlement is a real on-chain transaction, not a mock.

1. The client `POST`s without an `x-payment` header.
2. The gateway returns HTTP `402` with a payment challenge, `{ version, facilitator, token (the wSALT
   address), chain_id (40204), amount (wei as a decimal string), nonce, valid_after, valid_before,
   recipient, digest }`. The challenge has a limited lifetime, and the nonce is single-use, minted and
   tracked by this gateway.
3. The client signs the EIP-712 `transferWithAuthorization` digest, builds a payment payload, encodes it as
   URL-safe base64 without padding, and resends with the `x-payment` header.
4. The gateway verifies the signature and the nonce, checks the recipient binds to the configured treasury,
   settles `X402Facilitator.settlePayment` on chain, waits for the receipt, and runs the handler, returning
   the OpenAI-shaped response.

This is the server side of the [Marketplace SDK x402 codec](/sdks/marketplace#x402). Use that client rather
than re-implementing the codec.

### Configuration, environment variable names only

The gateway reads its configuration from environment variables. Names and purposes follow; no values are
shown. `CITRATE_GATEWAY_MODE` (`marketplace` or `local-proxy`), `CITRATE_GATEWAY_CHAIN_ID` (default 40204),
`CITRATE_GATEWAY_RPC_URL`, `CITRATE_GATEWAY_LISTEN_ADDR` (default `127.0.0.1:9800`),
`CITRATE_GATEWAY_MODEL_REGISTRY`, `CITRATE_GATEWAY_PRICING_ORACLE`, `CITRATE_GATEWAY_INFERENCE_ROUTER`
(contract addresses), `CITRATE_GATEWAY_KEYSTORE_PATH` (the durable store, required in production),
`CITRATE_GATEWAY_DEV_MODE`, `CITRATE_GATEWAY_OPEN_CHAT`, `CITRATE_GATEWAY_MAX_TOKENS`, and the operator
signer family (`CITRATE_GATEWAY_OPERATOR_KEYSTORE*`, `CITRATE_GATEWAY_KMS_KEY_ID`, and the spend-cap
variables). For local-proxy mode, `CITRATE_GATEWAY_UPSTREAM_URL` lists one or more upstreams, tried in
order. Observability uses `LOG_FORMAT` and `RUST_LOG`. The repository `gateway/RUNBOOK.md` is the full
operator reference.

### Examples

```bash
# Free: list models, no payment.
curl -s https://<gateway-host>/v1/models
```

```bash
# Paid route without payment returns a 402 challenge.
# Then sign and retry; use the SDK X402Client.
curl -s -X POST https://<gateway-host>/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<model-id>","messages":[{"role":"user","content":"hi"}]}'
# HTTP 402 with a payment challenge body
```

## Design rationale

The gateway speaks the OpenAI shape on purpose. A developer who already has working code should be able to
move to Citrate Market by changing a base URL, not by learning a new client, and the OpenAI compatibility
is a deliberate public good. The payment surface is the part that differs, and it is kept behind one
middleware so the rest of the service reads as an ordinary inference proxy. Settlement happens per request
rather than against a held balance, so a caller pays for the work it asks for and nothing is escrowed
beyond a single request or batch.

## Failure modes

The paid surface is where the gateway is security relevant, and it fails closed.

- **No payment.** A paid route without a valid `x-payment` header returns `402`, never the work.
- **Bad or replayed payment.** The gateway verifies the signature, checks the nonce is one it minted and
  has not seen, checks the payment window, and binds the recipient to the configured treasury. A nonce is
  single-use, so a replayed payment is rejected before it touches the chain.
- **Settlement revert.** If the on-chain settlement transaction reverts, the gateway returns `402` with the
  transaction hash rather than running the handler.
- **Oversized request.** `max_tokens` is clamped to the ceiling before pricing or dispatch, and a batch
  larger than 1000 requests is rejected, so a caller cannot price a request small and then demand a large
  response.
- **Open chat in production.** The unauthenticated chat path is gated behind two development flags,
  `CITRATE_GATEWAY_OPEN_CHAT` and `CITRATE_GATEWAY_DEV_MODE`, and the gateway refuses to enable it on a
  non-loopback bind, so the open path cannot be left exposed by accident.
- **Provider result.** A provider result is accepted only if it is non-empty and carries a valid binding
  signature; a failed verification moves to the next provider in the failover loop.

### Known limits at this SHA

Some pieces are designed and partly built but not yet complete. Pool dispatch is selected by the scoring
logic but returns a `503` when a pool wins, the per-provider path being the one that runs today; pool
dispatch is a later slice. Durable storage of usage accounting is in process memory at this SHA. On-chain
job posting per request, rather than direct dispatch to the provider, and streaming directly from a
provider, are not yet wired. Status for these pieces: Specified for pool dispatch and durable usage,
Theoretical for on-chain per-request posting and provider streaming.

## Access and canon

The REST surface, `API-GW-rest`, is public; it is the open API a developer needs to integrate, and the
OpenAI compatibility is a deliberate public good. The x402 handshake, `API-GW-x402`, is commercial,
payment-integration depth shared with contracted builders and gated from anonymous scraping.

No API keys or secrets appear here. Examples use a placeholder host and an unused key value, since x402
settles payment rather than a bearer key. Operator account material is loaded from a keystore or KMS and is
never documented; the repository source contains no hardcoded credentials at the audited SHA.

## Source and verification

- Source: `citrate-inference-gateway`. Routes and handlers in `gateway/src/` (`chat.rs`, `batch.rs`,
  `models.rs`, `usage.rs`, `queries.rs`, `health.rs`, `metrics.rs`, `config.rs`, `main.rs`, `lib.rs`); the
  payment middleware in `crates/x402-axum/src/` (`layer.rs`, `challenge.rs`, `client.rs`). Operator detail
  in `gateway/RUNBOOK.md`.
- Audited against SHA: `603fe92`.
- Status: Implemented (pre-audit). The REST routes, on-chain read queries, provider dispatch with failover,
  and the full x402 settlement path exist and run; this slice has not had an external audit. Specified:
  pool dispatch and durable usage accounting. Theoretical: on-chain per-request job posting and streaming
  from a provider.
