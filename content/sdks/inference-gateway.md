---
title: Citrate Inference Gateway (OpenAI-compatible API)
codex_slug: /sdks/inference-gateway
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-inference-gateway/gateway/src/
surfaces: [API-GW-rest, API-GW-x402]
audited_against_sha: a2ad401
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Inference Gateway

> An OpenAI-compatible HTTP gateway in front of the Citrate compute marketplace (chainId `40204`). Point
> any OpenAI client at it for `/v1/chat/completions`, `/v1/batch`, `/v1/models`, and `/v1/usage`. Paid
> routes are settled per-request over x402 (HTTP `402`). For app developers and integrators.

## Overview

The gateway speaks the OpenAI REST shape so existing clients work as a drop-in: set the client's
`base_url` to the gateway and call the standard `/v1/*` routes. Under the hood it selects an on-chain
provider for the requested model (via `ModelRegistry` / `ComputePricingOracle` / `InferenceRouter`),
meters tokens, and settles payment.

Two documented surfaces:

- **`API-GW-rest`** (tier `public`) — the OpenAI-compatible REST routes and their request/response
  shapes. What a developer needs to call it.
- **`API-GW-x402`** (tier `commercial`) — the x402 payment handshake that gates the paid routes
  (`crates/x402-axum`). Integration depth shared with the [Marketplace SDK](/sdks/marketplace#x402).

> **Status — pre-1.0 / pre-audit.** Live chain queries (`gateway/src/queries.rs`) are stubbed in this
> slice (`HttpChainQueries` returns `ChainUnavailable`); wiring to the real registry/oracle/router is
> tracked as WP-03.2. Batch/usage durability (RocksDB) and on-chain `postJob` per request are slice-2.
> Numerous inline audit guards (SECREM-01/02, FUA-GATEWAY-01/02/04) are present — treat as evolving.

## Reference — REST routes (`API-GW-rest`)

Handlers live under `gateway/src/`. The gateway listens on `127.0.0.1:9800` by default
(`CITRATE_GATEWAY_LISTEN_ADDR`); production runs behind a TLS reverse proxy.

| Route | Method | Handler | Auth |
|---|---|---|---|
| `/v1/chat/completions` | POST | `gateway/src/chat.rs` → `chat_completions_handler` | x402 (paid) |
| `/v1/batch` | POST | `gateway/src/batch.rs` → `submit_batch_handler` | x402 (paid) |
| `/v1/batch/{id}` | GET | `gateway/src/batch.rs` → `get_batch_handler` | free read |
| `/v1/batch/{id}/output` | GET | `gateway/src/batch.rs` → `get_batch_output_handler` | free read |
| `/v1/models` | GET | `gateway/src/models.rs` → `models_handler` | free |
| `/v1/usage` | GET | `gateway/src/usage.rs` → `usage_handler` | API-key Bearer |
| `/health` | GET | `gateway/src/health.rs` | free (liveness) |
| `/metrics` | GET | `gateway/src/metrics.rs` | Prometheus exposition |

**`POST /v1/chat/completions`** — OpenAI-compatible (`gateway/src/openai.rs`).
Request `ChatCompletionRequest`: `{ model, messages: [{ role, content }], max_tokens?, stream? }`.
Response `ChatCompletionResponse`: `{ id, object: "chat.completion", created, model, choices: [{ index,
message: { role, content }, finish_reason }], usage: { prompt_tokens, completion_tokens, total_tokens } }`.
SSE streaming when `stream: true`. `max_tokens` is clamped to `CITRATE_GATEWAY_MAX_TOKENS`
(default `8192`, FUA-GATEWAY-04).

**`POST /v1/batch`** — request `{ requests: [ChatCompletionRequest, ...] }` (max `MAX_BATCH_SIZE = 1000`).
Response `{ object: "batch", batch_id, status, request_count, completed_count, errored_count, created_at }`
where `status ∈ submitted|running|completed|partial_failure|failed`.

**`GET /v1/models`** — `{ object: "list", data: [{ id, object: "model", owned_by, created }] }`. Includes
individual registered models and pools (ids prefixed `pool-`). The `id` is what callers pass as `model`.

**`GET /v1/usage`** — `{ total_requests, total_input_tokens, total_output_tokens, salt_spent_grains
(string), salt_spent_display, daily: [...] }`.

### OpenAI-compatible client pattern

Because the routes match OpenAI's shape, the official SDKs work by overriding the base URL. For paid
routes you still need an x402 payment (below); `/v1/models` is unauthenticated.

```python
from openai import OpenAI

client = OpenAI(base_url="https://<gateway-host>/v1", api_key="not-used-for-x402")
print(client.models.list())   # GET /v1/models — free, no payment
```

```ts
import OpenAI from "openai";
const client = new OpenAI({ baseURL: "https://<gateway-host>/v1", apiKey: "unused" });
await client.models.list();   // GET /v1/models
```

> Paid routes (`/v1/chat/completions`, `/v1/batch`) require an x402 payment header. The plain OpenAI
> client does not produce one — use the [Marketplace SDK `X402Client`](/sdks/marketplace#x402), which
> sends the request, catches the `402`, signs, and retries automatically.

## Reference — x402 payment (`API-GW-x402`)

Paid routes sit behind the `X402Layer` middleware (`crates/x402-axum/src/layer.rs`). The handshake:

1. Client `POST`s without an `x-payment` header.
2. Gateway returns **HTTP `402`** with a `PaymentChallenge`: `{ version, facilitator, token (wSALT
   address), chain_id (40204), amount (wei as decimal string), nonce, valid_after, valid_before,
   recipient, digest }`. Challenge lifetime 300s.
3. Client signs the EIP-712 `transferWithAuthorization` digest, builds a `PaymentPayload`, encodes it as
   URL-safe base64 (no padding), and resends with the `x-payment` header.
4. Gateway verifies the signature, settles `X402Facilitator.settlePayment` on-chain, and runs the
   handler, returning the OpenAI-shaped response.

This is the server side of the [Marketplace SDK x402 codec](/sdks/marketplace#x402); use that client
rather than re-implementing the codec.

### Configuration (env var names only)

The gateway reads its config from environment variables. Names and purposes (no values shown):
`CITRATE_GATEWAY_CHAIN_ID` (default `40204`), `CITRATE_GATEWAY_RPC_URL`, `CITRATE_GATEWAY_LISTEN_ADDR`
(default `127.0.0.1:9800`), `CITRATE_GATEWAY_MODEL_REGISTRY` / `CITRATE_GATEWAY_PRICING_ORACLE` /
`CITRATE_GATEWAY_INFERENCE_ROUTER` (contract addresses), `CITRATE_GATEWAY_KEYSTORE_PATH` (durable store;
required in production), `CITRATE_GATEWAY_DEV_MODE`, `CITRATE_GATEWAY_OPEN_CHAT`,
`CITRATE_GATEWAY_MAX_TOKENS`, `CITRATE_GATEWAY_REQUIRE_SIGNED_RESULTS`, and the operator-signer family
(`CITRATE_GATEWAY_OPERATOR_KEYSTORE*`, `CITRATE_GATEWAY_KMS_KEY_ID`, spend-cap vars). Observability:
`LOG_FORMAT`, `RUST_LOG`. See the repo `gateway/RUNBOOK.md` for the full operator reference.

> **Operator secrets are not env-injected as plaintext.** The operator signing key is loaded from a
> keystore/KMS, never documented here. Do not place a private key, password, or mnemonic in any
> environment example.

## Examples

```bash
# Free: list models (no payment)
curl -s https://<gateway-host>/v1/models

# Paid route without payment → 402 challenge (then sign + retry; use the SDK X402Client):
curl -s -X POST https://<gateway-host>/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"<model-id>","messages":[{"role":"user","content":"hi"}]}'
# → HTTP 402 with a PaymentChallenge body
```

## Tutorials

- [Post a marketplace job](/sdks/tutorials/post-a-marketplace-job) — includes calling a paid gateway
  route end-to-end with x402.

## Security & access

The REST surface (`API-GW-rest`) is **public** — it is the open API a developer needs to integrate, and
the OpenAI compatibility is a deliberate public good. The x402 handshake surface (`API-GW-x402`) is
**commercial**: payment-integration depth shared with contracted builders, gated from anonymous scraping
per `00_SCHEMA_AND_AUTHORING.md` §3.5.

**No API keys or secrets here.** Examples use placeholder hosts and `apiKey: "unused"` (x402 settles
payment, not a bearer key). Operator wallet material lives in a keystore/KMS and is never documented. The
repo source contains no hardcoded credentials at the audited SHA.

## Source & verification

- Source: `citrate-inference-gateway` — `gateway/src/` (routes + handlers), `crates/x402-axum/`
  (payment middleware). Operator detail: `gateway/RUNBOOK.md`.
- Audited against SHA: `a2ad401`.
- Reference is `transcluded`: the truth lives in the repo at the pinned SHA.
