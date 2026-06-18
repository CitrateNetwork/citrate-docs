---
title: DGX devops handoff, give Citrate Atlas access to the inference gateway
created: 2026-06-17
branch: main
author: Citrate team
status: open
audience: DGX devops (droplet owners, citrate-inference-gateway)
---

# DGX devops handoff, wire Ask Atlas to the inference gateway

Ask Atlas (the docs assistant in `citrate-docs`, live at `https://citrate-atlas.vercel.app`) now uses the
**exact same inference seam as CitrateScan/explorer**: `@ai-sdk/openai-compatible` pointed at the
citrate-inference-gateway, selected by `CITRATE_INFERENCE_MODE`. The app code is done. What is left is on
your side: confirm the gateway URL, issue Atlas an API key, and confirm the served model id. Once those are
set on the Atlas Vercel project, Ask answers come from the real model on the network (today it falls back to
a local extractive answer because no gateway is reachable).

If the explorer's Ask already works against `infer.citrate.ai`, this is almost a no-op: Atlas needs the same
base URL, the same model id, and its own key.

## TL;DR (what we need from you)

1. **Base URL**: confirm the OpenAI-compatible endpoint is `https://infer.citrate.ai/v1` (so
   `POST https://infer.citrate.ai/v1/chat/completions` works) and `GET /v1/models` lists the model.
2. **API key**: issue a bearer key for Atlas (server-to-server). We set it as `CITRATE_GATEWAY_API_KEY` on
   Vercel; it is never exposed to the browser.
3. **Model id**: the exact string the gateway serves (e.g. `gemma-4-E4B-it-Q4_K_M`). We set it as
   `CITRATE_MODEL_NAME`.
4. **Timeouts**: allow long first-token latency (keep Caddy + gateway request timeout >= 300s, or keep the
   model warm). Atlas's route is `maxDuration = 300`.

Hand those three values back (URL, key, model id) and we finish the Vercel side in minutes.

## How Atlas calls the gateway (so you know what to expose)

- Server-to-server only. The call originates from the Atlas Vercel serverless function, not the browser, so
  there is no CORS requirement. Requests arrive over public HTTPS from Vercel egress IPs (dynamic), so
  **authenticate with the bearer key, not an IP allowlist**.
- The request is a standard OpenAI chat completion:

```http
POST https://infer.citrate.ai/v1/chat/completions
Authorization: Bearer <CITRATE_GATEWAY_API_KEY>
Content-Type: application/json

{ "model": "gemma-4-E4B-it-Q4_K_M",
  "messages": [ { "role": "system", "content": "..." }, { "role": "user", "content": "..." } ],
  "max_tokens": 896, "temperature": 0.3 }
```

- Expected response: standard `choices[0].message.content`. Atlas reads that text and renders it as Markdown.
- Atlas grounds every answer in tier-filtered doc excerpts (RAG), so the prompt is system + a single user
  message carrying the question and the excerpts. Roughly: system prompt + up to 5 excerpts of ~1200 chars
  + question. Budget the served **context window at >= 4k tokens** so there is room to answer; output is
  capped at `max_tokens` 896.

## Droplet / gateway setup (what should be running)

This mirrors the explorer's working setup (DGX model behind the gateway, fronted by DO Caddy):

1. **Model server**: the actual model served by an OpenAI-compatible server (llama-server / vLLM / TGI) on
   the DGX/droplet, e.g. listening on `127.0.0.1:8080` exposing `/v1/chat/completions` and `/v1/models`.
2. **citrate-inference-gateway**: the OpenAI-compatible proxy in front of the model server. It is the layer
   that enforces the API key (and/or x402 per-request payment), applies rate limits, and exposes
   `/v1/*`. Run it as the public-facing service.
3. **Caddy (DigitalOcean)**: terminates TLS for `infer.citrate.ai` and reverse-proxies to the gateway.
   Ensure the proxy read/write timeout is generous (>= 300s) so a cold CPU model's first token is not cut.
4. **DNS**: `infer.citrate.ai` resolves to the Caddy host (already the case if the explorer uses it).

Auth options the gateway supports (pick what you already run): a static bearer **API key** (simplest for a
trusted server consumer like Atlas), or x402 per-request payment. Atlas uses the **bearer key** path. Please
issue a dedicated key for Atlas (so it can be rotated/revoked independently of the explorer's).

## Verify the gateway is ready (your side)

```bash
# 1) the model is served
curl -s https://infer.citrate.ai/v1/models -H "Authorization: Bearer $KEY" | jq '.data[].id'
# 2) a chat completion returns content
curl -s https://infer.citrate.ai/v1/chat/completions \
  -H "Authorization: Bearer $KEY" -H 'content-type: application/json' \
  -d '{"model":"gemma-4-E4B-it-Q4_K_M","messages":[{"role":"user","content":"Say hello in one sentence."}],"max_tokens":64}' \
  | jq -r '.choices[0].message.content'
```

## Atlas-side env (we set this once you hand back the three values)

On the Atlas Vercel project (`citrate-atlas`, prj_THzHQQrzLyQeo0zllzUYZUukyeuQ):

```bash
vercel env add CITRATE_INFERENCE_MODE production   # gateway
vercel env add CITRATE_GATEWAY_URL production       # https://infer.citrate.ai/v1
vercel env add CITRATE_GATEWAY_API_KEY production   # the key you issue
vercel env add CITRATE_MODEL_NAME production         # the exact served model id
# optional: CITRATE_MAX_OUTPUT_TOKENS (default 896)
```

Then redeploy. After that, Ask Atlas answers from the gateway; the response's `backend` field reads
`"gateway"` instead of `"extractive"`. The same variable names work for a local-droplet test
(`CITRATE_INFERENCE_MODE=local` + `CITRATE_INFERENCE_URL=http://127.0.0.1:8080/v1`).

## End-to-end check (after env + redeploy)

```bash
# the chat endpoint should report backend "gateway"
curl -s https://citrate-atlas.vercel.app/api/chat \
  -H 'content-type: application/json' -H 'x-codex-dev-viewer: public' \
  -d '{"query":"What is SALT and how many decimals?"}' | jq '{backend, answer}'
```

`backend: "gateway"` means the model on the network answered; `"extractive"` means the gateway was still
unreachable (check the key, URL, model id, and the Caddy timeout). In the browser, open Ask Atlas and the
answer should render as formatted Markdown (headings, lists, code), grounded in the cited docs.

## Notes

- Atlas only ever sends the user's question plus public/tier-permitted doc excerpts to the gateway; no
  confidential bodies are sent unless the caller is entitled to them (the RAG retrieval is tier-filtered
  before the prompt is built).
- Keep the Atlas key distinct from the explorer's so either can be rotated without affecting the other.
- Companion handoff: `DGX_AUTHSPINE_HANDOFF_2026-06-17.md` (OIDC / identity), same Vercel project.
