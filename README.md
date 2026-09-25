# citrate-docs

*Part of the **[Citrate Network](https://citrate.ai)** — own the means of computation. · [Docs](https://docs.citrate.ai) · [Run a node](https://citrate.ai/download) · [Contribute → free membership](https://github.com/CitrateNetwork/.github/blob/main/CONTRIBUTING.md)*
> Citrate Atlas — the documentation webapp for the Citrate Network (the site published at **docs.citrate.ai**): guides, API references, live contract-address pages, and an in-page "Ask Atlas" assistant.

## What it is
`citrate-atlas` is a Next.js app that renders the Citrate docs — tutorials, concept guides,
generated API references, a live contract-address table for chain 40204, and a changelog. It
ships an agentic "Ask Atlas" assistant backed by the Citrate inference gateway (OpenAI-
compatible), an MCP toolbox, and optional grounding in the live knowledge graph. Auth is
OIDC (via citrate-identity) and **fails closed**; a mock auth mode is provided for local
development. It is the human-facing companion to the SDKs and the rest of the stack.

Live site: <https://docs.citrate.ai>.
Depends (at runtime, optionally) on the inference gateway
([citrate-inference-gateway](https://github.com/CitrateNetwork/citrate-inference-gateway)),
identity ([citrate-identity](https://github.com/CitrateNetwork/citrate-identity)), and a
chain RPC ([citrate-chain](https://github.com/CitrateNetwork/citrate-chain)) for the live
sandboxes.

## Prerequisites
```bash
node --version   # Node 20 LTS+ (Next 16 / React 19)
npm --version
```

## Build from source
```bash
git clone https://github.com/CitrateNetwork/citrate-docs.git
cd citrate-docs
npm install
npm run build        # generates content + changelog, then next build; runs bundle/auth gates
npm run typecheck    # tsc --noEmit
npm test             # vitest
```
`prebuild`/`predev` regenerate the changelog and compile the Markdown content set. The
`postbuild` step runs confidentiality + auth-mode + access-clock + MCP-key gates and will
**fail the build** if a confidential doc or an unsafe auth default leaked into the bundle.

## Run locally
```bash
cp .env.example .env.local     # then edit (see Configuration)
npm run dev                    # http://localhost:3000
```
The `dev` script sets `NEXT_PUBLIC_AUTH_MODE=mock ALLOW_MOCK_AUTH=1`, so it boots with the
fixture tier-switcher and needs **no external IdP** — you can browse the docs immediately.

Verify it's up:
```bash
curl -sSf http://localhost:3000 >/dev/null && echo "atlas up on :3000"
```

Production-style run (after `npm run build`):
```bash
npm start                      # next start on :3000 (expects real OIDC env)
```

## Connect it locally  ← the differentiator
Wire Atlas to a local Citrate stack instead of the public services.

1. **Auth** — for pure docs browsing, keep the default local `npm run dev` (mock auth, no
   IdP). To exercise real login, run
   [citrate-identity](https://github.com/CitrateNetwork/citrate-identity) locally and set the
   `OIDC_*` vars to point at it (e.g. `OIDC_ISSUER=http://localhost:4000`), with
   `NEXT_PUBLIC_AUTH_MODE=oidc`.
2. **Ask Atlas → local inference gateway** — run
   [citrate-inference-gateway](https://github.com/CitrateNetwork/citrate-inference-gateway)
   and point Atlas at it:
   ```bash
   CITRATE_INFERENCE_MODE=gateway
   CITRATE_GATEWAY_URL=http://localhost:8080/v1     # note the /v1
   CITRATE_GATEWAY_API_KEY=cgk_...                  # server-only; never NEXT_PUBLIC_
   CITRATE_MODEL_NAME=gemma-4-E4B-it-Q4_K_M
   ```
   Or point at any local OpenAI-compatible server with
   `CITRATE_INFERENCE_MODE=local` + `CITRATE_INFERENCE_URL=http://127.0.0.1:8080/v1`. If the
   backend is unreachable, Ask falls back to a deterministic extractive answer, so the docs
   still respond.
3. **Live sandboxes → local chain** — point the read-only sandboxes at your local devnet
   (chain 40204):
   ```bash
   CITRATE_RPC_URL=http://localhost:8545
   ```
4. **End-to-end check** — `npm run dev`, open `http://localhost:3000`, and ask Ask Atlas a
   question; a grounded answer confirms the gateway wiring.

For the full multi-repo bring-up, see the LOCAL_STACK guide at <https://docs.citrate.ai>.

## Configuration
Copy `.env.example` → `.env.local`. Key variables (full annotated list in `.env.example`):

| Env var | Default | Purpose |
|---------|---------|---------|
| `NEXT_PUBLIC_AUTH_MODE` | `oidc` (prod) / `mock` (via `npm run dev`) | auth mode; `mock` needs `ALLOW_MOCK_AUTH=1` and a non-prod build |
| `OIDC_ISSUER` / `OIDC_JWKS_URL` / `OIDC_CLIENT_ID` | `https://auth.citrate.ai` … | citrate-identity OIDC (required when `oidc`; fails closed if unset) |
| `CITRATE_INFERENCE_MODE` | `gateway` | `gateway` \| `local` \| `onchain` |
| `CITRATE_GATEWAY_URL` | `https://infer.citrate.ai/v1` | Ask Atlas inference backend (append `/v1`) |
| `CITRATE_GATEWAY_API_KEY` | — | `cgk_` bearer key (server-only) |
| `CITRATE_RPC_URL` | `https://rpc.citrate.ai` | chain 40204 RPC for the read-only sandboxes |
| `MCP_API_KEYS` | `{}` (fail-closed → `public`) | SHA-256-hashed key→tier map for the MCP toolbox; keys must be random, ≥ 32 chars (`openssl rand -base64 32`) |

`.env.example` documents the fail-closed defaults for auth, the MCP key hashing, and the
optional live knowledge-graph (`MEM_*`) wiring.

## Links
- Docs: <https://docs.citrate.ai>
- Depends on: [citrate-identity](https://github.com/CitrateNetwork/citrate-identity) · [citrate-inference-gateway](https://github.com/CitrateNetwork/citrate-inference-gateway) · [citrate-chain](https://github.com/CitrateNetwork/citrate-chain)
- Documents: [citrate-sdk-js](https://github.com/CitrateNetwork/citrate-sdk-js) · [citrate-sdk-python](https://github.com/CitrateNetwork/citrate-sdk-python) · [citrate-sdk-marketplace](https://github.com/CitrateNetwork/citrate-sdk-marketplace)
- Contributing (DCO): `CONTRIBUTING.md` · Security: `SECURITY.md` · License: [`LICENSE`](LICENSE)

## License

Licensed under the Apache License, Version 2.0 (see [`LICENSE`](LICENSE)). This is the open-source infrastructure tier of Citrate's open-core model. The commercial application layer is source-available under BUSL-1.1. Licensor: Citrate Inc.
