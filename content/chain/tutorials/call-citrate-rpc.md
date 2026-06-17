---
title: Call the Citrate RPC
codex_slug: /chain/tutorials/call-citrate-rpc
tier: public
org_scope: ~
source_kind: authored
source: codex
surfaces: [CHAIN-rpc-eth, CHAIN-rpc-citrate, CHAIN-rpc-ai, CHAIN-rpc-econ]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Call the Citrate RPC

> A runnable, copy-paste walkthrough: confirm you're on Citrate (chain id **40204**), read the BlockDAG, run a
> built-in embedding, and read the token. Everything here uses only methods that exist in `citrate-chain` @
> `03d7851`. For the full method list see the [JSON-RPC reference](/chain/rpc).

## Prerequisites

- A reachable Citrate JSON-RPC endpoint. Locally a node serves on `http://127.0.0.1:8545`.
- `curl` and (optionally) `jq` for pretty output.

```bash
export RPC=http://127.0.0.1:8545
```

A tiny helper so the steps stay short:

```bash
rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

## Step 1, Confirm the chain (`eth_chainId`)

```bash
rpc eth_chainId
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}
```

`0x9d0c` is **40204** in decimal, the canonical Citrate chain id. Convert to be sure:

```bash
printf '%d\n' 0x9d0c   # 40204
```

If you get a different value, you're pointed at a different network. `net_version` returns the same id as a
decimal string:

```bash
rpc net_version
# {"jsonrpc":"2.0","id":1,"result":"40204"}
```

## Step 2, Check the node and head (`web3_clientVersion`, `eth_blockNumber`)

```bash
rpc web3_clientVersion        # "citrate/v0.1.0"
rpc eth_blockNumber           # latest height as hex, e.g. "0x3039"
```

## Step 3, Read the BlockDAG (`citrate_getDagStats`)

This is the Citrate-native view of GhostDAG state, current tips, height, blue score, and the GhostDAG
parameters:

```bash
rpc citrate_getDagStats | jq
```

```json
{
  "totalBlocks": 12345,
  "blueBlocks": 11727,
  "redBlocks": 618,
  "tipsCount": 3,
  "maxBlueScore": 11800,
  "currentTips": ["0x...", "0x...", "0x..."],
  "height": 12345,
  "ghostdagParams": { "k": 18, "maxParents": 10, "maxBlueScoreDiff": 1000, "pruningWindow": 100000, "finalityDepth": 100 }
}
```

> Note: `currentTips`, `height`, and `maxBlueScore` are read live; `blueBlocks`/`redBlocks` are estimated and
> `ghostdagParams` are the network defaults at this SHA. See the reference for the honest-status caveat.

## Step 4, Read an account (`eth_getBalance`)

Citrate is EVM-address compatible, so standard `eth_*` reads work. Pass an address and a block tag:

```bash
rpc eth_getBalance '["0x0000000000000000000000000000000000000001","latest"]'
# {"jsonrpc":"2.0","id":1,"result":"0x0"}
```

## Step 5, Run a built-in embedding (`citrate_getTextEmbedding`)

Citrate ships on-chain AI. Generate an embedding (the genesis `bge-m3` model) for a string:

```bash
rpc citrate_getTextEmbedding '["the quick brown fox"]' | jq '.result | length'
# 1024   (one vector; vector length depends on the model)
```

Pass an array of strings (up to 256) to get one vector per string:

```bash
rpc citrate_getTextEmbedding '[["alpha","beta","gamma"]]' | jq '.result | length'
# 3
```

> Sending more than 256 inputs returns an `invalid_params` error (a DoS guard, SECREM-01 Phase-8).

## Step 6, Semantic search over documents (`citrate_semanticSearch`)

```bash
rpc citrate_semanticSearch \
  '["best chain for AI", ["a payments chain","an AI-native BlockDAG","a meme coin"], 2]' | jq
```

```json
{ "result": [
  { "index": 1, "score": 0.82, "text": "an AI-native BlockDAG" },
  { "index": 0, "score": 0.31, "text": "a payments chain" }
] }
```

Results are sorted by cosine similarity and truncated to `top_k` (here `2`).

## Step 7, Read the token (`citrate_getToken`)

```bash
rpc citrate_getToken | jq
# { "name": "Citrate", "symbol": "SALT", "decimals": 18, "totalSupply": "0x...", "totalMinted": "0x..." }
```

## Step 8 (optional), Request inference

If you know a registered `model_id` (32-byte hex), you can run a preview inference. Anonymous (unsigned)
requests reach **Public** models only; gated models require a signed `from` (see the reference's security note):

```bash
rpc citrate_requestInference \
  '[{"model_id":"0x<32-byte-hex>","input":{"prompt":"hello"}}]' | jq
```

```json
{ "result": {
  "status": "success",
  "output": ...,
  "encoding": "json",
  "execution_time_ms": 42,
  "gas_used": 31000,
  "provider": "0x...",
  "provider_fee": "0",
  "proof": null
} }
```

## Troubleshooting

- **`Connection refused`**, the node isn't running on `$RPC`, or the RPC server is bound elsewhere. Default is
  `127.0.0.1:8545`.
- **`-32601 Method not found`**, either a typo, or (for economics methods) the node is running without an
  economics manager. The chain/DAG/AI methods above don't require one.
- **`-32602 Invalid params`**, check param shapes against the [reference](/chain/rpc); embeddings/search cap
  at 256 inputs.
- **Wrong chain id**, anything other than `0x9d0c` / `40204` means you're not on canonical Citrate.

## Next steps

- Full method list, params, and return shapes: [JSON-RPC reference](/chain/rpc).
- Live RPC explorer sandbox: `/sandboxes/rpc`.

---

_Authored tutorial. Methods verified against `citrate-chain` @ `03d7851`. Example outputs are illustrative;
exact values depend on the node's state and configured models._
