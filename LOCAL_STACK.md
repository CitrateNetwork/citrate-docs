# Running the Citrate stack locally

Bring the network up on one machine and wire the programs together. Everything hangs
off a local **devnet node** (chain id **40204**) exposing JSON-RPC at
`http://127.0.0.1:8545`. Start there; add only the pieces you need.

> Each repo's README has its own **Build from source** and **Connect it locally**
> sections; this is the cross-repo map. All commands assume you've built each repo per
> its README.

## Port map (deconflicted for simultaneous local run)

| Service | Repo | Bind | Notes |
|---|---|---|---|
| **Chain JSON-RPC** | `citrate-chain` | `127.0.0.1:8545` | the anchor; WS `:8546`, P2P `:30303` |
| Identity (OIDC) | `citrate-identity` | `:3000` | `/.well-known/openid-configuration`, `/jwks` |
| Explorer | `citrate-explorer` | `:3001` | Next.js |
| Docs site | `citrate-docs` | `:3002` | move off :3000 |
| Memrizz web | `citrate-memories` | `:3003` | + gateway `:8799`, `mem-mcp` over a Unix socket |
| Bundler (ERC-4337) | `citrate-bundler` | `:3010` /rpc, `:3011` gate | needs EntryPoint v0.7 deployed |
| Inference gateway | `citrate-inference-gateway` | `127.0.0.1:9800` | `local-proxy` or `marketplace` mode |
| Comms relay | `citrate-comms` | ws `:8787`, admin `:8788` | needs `CITRATE_COMMS_OWNER` |
| Node agent | `citrate-node-agent` | `127.0.0.1:19600` | supervision API |
| Compute pool | `citrate-compute-pool` | metrics `:9100`, training `:8088` | |
| Agent runtime | `citrate-agent-runtime` | `127.0.0.1:19700` | `CITRATE_HERMES_ADDR` (required) |
| Core (Tauri) | `citrate-core` | dev `:1420` | bundled node sidecar → :8545 |
| Quorum (Tauri) | `citrate-quorum` | dev `:1421` | move off :1420 |
| Studio / gui-native | `citrate-studio` / `citrate-native` | native window, no HTTP | embedded RPC → :8545 |
| Cluster | `citrate-cluster` | Unix socket (no TCP) | optional libp2p `:4201` |

## 1. The foundation — chain + contracts (required)

```bash
# in citrate-chain
cargo build --release -p citrate-node
./target/release/citrate devnet          # JSON-RPC 127.0.0.1:8545, chain 40204

# deploy the contract book locally (devnet pre-funds Foundry account #0 — no faucet)
cd contracts
forge script script/Deploy.s.sol --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bceb4f... --broadcast
# note the deployed addresses — downstream services need them
```
Verify: `curl -s http://localhost:8545 -d '{"jsonrpc":"2.0","method":"eth_chainId","id":1}' -H 'content-type:application/json'` → `0x9d0c` (40204).

## 2. Talk to it — the SDKs (no services needed)

```bash
# JS:     CITRATE_RPC_URL=http://localhost:8545 CITRATE_CHAIN_ID=40204 node your-script.mjs
# Python: CITRATE_RPC_URL=http://localhost:8545 citrate <cmd>
# Marketplace: pass a viem PublicClient on http://localhost:8545 + local addresses
```

## 3. Add services as needed (each points at :8545)

- **Identity** (`:3000`) — `cp .env.example .env` (set chain RPC), `npm run dev`.
- **Bundler** (`:3010/3011`) — needs EntryPoint deployed in step 1; `docker compose up -d`.
- **Inference gateway** (`:9800`) — `marketplace` mode points at `CITRATE_GATEWAY_RPC_URL=http://localhost:8545`; `local-proxy` mode points at a model backend.
- **Explorer** (`:3001`) — point at the local RPC/indexer.
- **Comms** (`:8787`) — `CITRATE_COMMS_OWNER=0x… cargo run -p comms-relay --release`.

## 4. Desktop clients

`citrate-core` / `citrate-native` bundle or embed a node (RPC :8545) and can point at a
local identity (:3000) and gateway (:9800). See their READMEs — `citrate-core` needs a
sibling `citrate-chain` checkout to build the node sidecar.

## Minimal end-to-end

chain devnet (`:8545`) + `forge script` deploy → SDK reads chain state → optionally add
identity + gateway. That's a working local Citrate.

---
Docs: https://docs.citrate.ai · License note: components are Apache-2.0 (SDKs, types,
docs, explorer) or source-available BUSL-1.1 (the rest) — see each repo's LICENSE.
