---
title: Run the inference gateway
codex_slug: /compute/gateway
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-inference-gateway
surfaces: [OPS-gateway, API-GW-rest, API-GW-x402]
audited_against_sha: a2ad401
status: draft
created: 2026-06-16T00:00:00Z
author: Codex S6
---

# Run the inference gateway

> Operator-side guide for running `citrate-inference-gateway`, the OpenAI-compatible front door that
> meters inference and settles it on chain 40204. Pairs with the developer-facing
> [SDKs & APIs → inference gateway](/sdks/inference-gateway) page.

## Overview

The gateway exposes OpenAI-compatible REST (`/v1/chat/completions`, `/v1/batch`, `/v1/usage`,
`/v1/models`) and runs in one of two modes:

- **marketplace** (default), routes requests to the on-chain `InferenceRouter` / compute marketplace and
  meters via **x402**.
- **local-proxy**, passes through to a local `llama-server` upstream (e.g. a DGX node behind Caddy), for
  self-hosted or air-gapped operation.

## Setup

Configuration is env-driven (see the repo for the authoritative list):

- `CITRATE_GATEWAY_MODE`, `marketplace` | `local-proxy`
- `CITRATE_GATEWAY_RPC_URL`, chain JSON-RPC endpoint (40204)
- `CITRATE_GATEWAY_LISTEN_ADDR`, bind address (default `0.0.0.0:9800`)
- `CITRATE_GATEWAY_UPSTREAM_URL`, upstream llama-server (local-proxy mode)
- `CITRATE_GATEWAY_KEYSTORE_PATH`, durable money-store (RocksDB); dev-mode is volatile

> **No secrets in this doc.** API keys and keystore secrets come from the operator's own secret store, > never commit them.

## Reference

- The OpenAI-compatible request/response shapes are documented developer-side at
  [/sdks/inference-gateway](/sdks/inference-gateway).
- x402 metering: see [Compute & Inference → x402](/sdks/marketplace#x402) and the chain
  [x402 contracts](/contracts/x402).

## Security & access

Commercial tier: this is operator/enterprise implementation detail. The gateway is read-mostly to the
chain for routing; settlement is on-chain via x402. Run it behind your own TLS terminator (Caddy) and
rate-limit at the edge.

## Source & verification

Transcluded from `citrate-inference-gateway` @ `a2ad401`. Live-chain queries in `gateway/src/queries.rs`
are stubbed pending WP-03.2, treat marketplace-mode routing as pre-GA.
