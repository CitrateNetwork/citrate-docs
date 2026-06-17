---
title: JSON-RPC reference
codex_slug: /chain/rpc
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/api/src/{eth_rpc.rs,eth_rpc_simple.rs,server.rs,ai_rpc.rs,economics_rpc.rs,methods/}
surfaces: [CHAIN-rpc-eth, CHAIN-rpc-citrate, CHAIN-rpc-ai, CHAIN-rpc-econ]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The JSON-RPC interface a Citrate Node serves over HTTP and WebSocket. It speaks the Ethereum-compatible
`eth_*` methods you already know, plus a `chain_*` and `citrate_*` set for reading the BlockDAG, calling
on-chain models, and reading network economics. This page is for developers building against the Citrate
Network. If you have never made a call, start with [your first 10 minutes](/start/tutorials/your-first-10-minutes).

## What it is

A Citrate Node exposes one JSON-RPC endpoint. A local node serves it at `http://127.0.0.1:8545`. Every
request follows JSON-RPC 2.0, and quantities come back as `0x`-prefixed hex strings, the same convention
Ethereum uses:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "eth_chainId", "params": [] }
```

There are roughly eighty-five methods, registered across three namespaces:

- `eth_*` is the Ethereum-compatible surface, so existing Solidity tooling and signing libraries work
  unchanged.
- `chain_*` reads the BlockDAG directly: tips, height, a block, a transaction.
- `citrate_*` is the Citrate-native surface for DAG statistics, network economics, on-chain inference, and
  operator controls.

The one fact worth confirming before anything else is that you are pointed at Citrate. Ask the node for its
chain id; `0x9d0c` is 40204, and 40204 is the testnet:

```bash
curl -s http://127.0.0.1:8545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}   # 0x9d0c is 40204
```

## How to use it

Each call is a single HTTP POST. A small shell helper keeps the examples short:

```bash
export RPC=http://127.0.0.1:8545

rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

Read the latest height, then read the DAG:

```bash
rpc eth_blockNumber
# {"jsonrpc":"2.0","id":1,"result":"0x3039"}

rpc citrate_getDagStats
# { "tipsCount": 3, "maxBlueScore": 11800, "height": 12345,
#   "ghostdagParams": { "k": 18, "maxParents": 10, "finalityDepth": 100 } }
```

Run a model call on the chain. Inference is a chain operation here, not an outside service:

```bash
rpc citrate_getTextEmbedding '["the quick brown fox"]'
# result: [[0.0123, -0.045, ...]]   (a bge-m3 embedding vector)
```

A single embedding or search call accepts at most 256 inputs (`MAX_EMBEDDING_INPUTS`); a larger batch
returns invalid params. The consensus that orders all of these reads is GhostDAG, covered under
[Citrate Network consensus](/chain/consensus), and the fee and supply numbers are in
[economics](/chain/economics).

## Reference

Methods are grouped by what they touch. Each row cites the source file in `citrate-chain` it is registered
in. Methods that do not appear in the source at this SHA are not listed here.

### Ethereum-compatible (`eth_*`)

Registered in `core/api/src/eth_rpc.rs` and `core/api/src/server.rs`.

| Method | Params | Returns |
|---|---|---|
| `eth_chainId` | none | chain id, hex (`0x9d0c` is 40204) |
| `eth_blockNumber` | none | latest height, hex |
| `eth_getBlockByNumber` | `[blockTag\|hex, includeTxs]` | block object or `null` |
| `eth_getTransactionByHash` | `[hash]` | transaction object or `null` |
| `eth_getTransactionReceipt` | `[hash]` | receipt object or `null` |
| `eth_getBalance` | `[address, blockTag]` | balance, hex |
| `eth_getCode` | `[address, blockTag]` | contract code, hex |
| `eth_getStorageAt` | `[address, slot, blockTag]` | storage word, hex |
| `eth_getTransactionCount` | `[address, blockTag]` | nonce, hex |
| `eth_accounts` | none | `[]`, the node holds no keys |
| `eth_call` | `[txObject, blockTag]` | return data, hex |
| `eth_estimateGas` | `[txObject]` | gas estimate, hex |
| `eth_gasPrice` | none | gas price, hex |
| `eth_feeHistory` | `[blockCount, newestBlock, percentiles]` | fee-history object |
| `eth_getLogs` | `[filterObject]` | matching log entries |

The standard filter, send, and node-metadata methods are also present (`eth_sendRawTransaction`,
`eth_newFilter`, `eth_syncing`, `net_version`, `web3_clientVersion`, and so on).

### Chain and DAG (`chain_*`, `citrate_*`)

The `chain_*` namespace reads the BlockDAG directly; `citrate_getDagStats` summarizes the current tip set.
Registered in `core/api/src/server.rs` and `core/api/src/eth_rpc.rs`.

| Method | Params | Returns |
|---|---|---|
| `chain_getHeight` | none | current height |
| `chain_getTips` | none | the current tip hashes |
| `chain_getBlock` | `[hashOrHeight]` | a block |
| `chain_getTransaction` | `[hash]` | a transaction |
| `citrate_getDagStats` | none | tips, blue score, height, GhostDAG params |

### Economics (`citrate_*`)

Registered in `core/api/src/economics_rpc.rs`. These return method-not-found when the node runs without an
economics manager configured.

| Method | Params | Returns |
|---|---|---|
| `citrate_getToken` | none | `{name, symbol, decimals, totalSupply, totalMinted}` |
| `citrate_getEconomicState` | none | supply, gas price, staked amount, treasury, and related fields |
| `citrate_gasPrice` | none | base gas price, hex |
| `citrate_getStakedBalance` | `[address]` | staked balance, hex |
| `citrate_getReputationScore` | `[address]` | reputation score, number |

### AI (`citrate_*`)

Embedding, search, and chat are registered in `core/api/src/ai_rpc.rs`; model and inference lifecycle
methods in `core/api/src/server.rs`.

| Method | Params | Returns |
|---|---|---|
| `citrate_getTextEmbedding` | `[text \| string[]]`, at most 256 inputs | one embedding, or one per input |
| `citrate_semanticSearch` | `[query, documents[], topK?]`, at most 256 documents | entries ranked by cosine similarity |
| `citrate_chatCompletion` | `[{request}]` or `[prompt, maxTokens?, temperature?]` | a chat-completion response |
| `citrate_getModels` | none | registered models |
| `citrate_getModel` | `[modelId]` | model detail |
| `citrate_getInferenceResult` | `[id]` | an inference result by id |
| `citrate_createTrainingJob` | `[{job}]` | a training-job handle |
| `citrate_getTrainingJob` | `[id]` | training-job status |
| `citrate_deployModel` | operator-authenticated | registers a model |

The embedding model is `bge-m3`; the default chat model is `mistral-7b-instruct-v0.3`.

### Network and operations (`citrate_*`)

Aggregate reads are open; the snapshot and emergency controls authenticate inside the handler against an
operator-supplied token, never by seat.

| Method | Params | Returns |
|---|---|---|
| `citrate_getMempoolStats` | none | aggregate mempool statistics |
| `citrate_getMempoolSnapshot` | operator-authenticated | per-transaction mempool detail |
| `citrate_emergencyStatus` | operator-authenticated | block-production pause state |
| `citrate_emergencyPause` | operator-authenticated | halts block production |
| `citrate_emergencyResume` | operator-authenticated | resumes block production |

## Failure modes

The interface fails closed, and the errors are standard JSON-RPC:

- `-32601`, method not found. A typo, or a method the node does not serve. The economics methods return this
  when no economics manager is configured; the chain, DAG, and core AI methods do not require one.
- `-32602`, invalid params. The shape or count is wrong. An embedding or search batch over 256 inputs lands
  here.
- `-32600`, invalid request. The envelope is not valid JSON-RPC 2.0.

A chain id other than `0x9d0c` is not an error code; it means you are pointed at a different network. The
operator-authenticated methods (`citrate_getMempoolSnapshot`, the `citrate_emergency*` controls,
`citrate_deployModel`) reject a missing or wrong token rather than acting, so an unprivileged caller cannot
pause production or read per-transaction mempool detail.

## Access and canon

Public. The `eth_*`, `chain_*`, DAG, and AI methods are the open surface a developer needs to build. No
keys, mnemonics, or operator tokens appear here; the operator token is supplied at runtime and is never
documented. The economics reads are open on a configured node, though the deeper reward model narrative
sits at the commercial tier. Identity on inference is a claim unless signed: anonymous callers reach public
models only, and gated models require the signature binding.

## Source and verification

Methods verified against `citrate-chain` at `03d7851` by enumerating every `add_sync_method("...")`
registration in `core/api/src/eth_rpc.rs`, `eth_rpc_simple.rs`, `server.rs`, `ai_rpc.rs`, and
`economics_rpc.rs`. Chain id `0x9d0c` confirmed in `eth_rpc.rs`; the 256-input cap (`MAX_EMBEDDING_INPUTS`)
in `ai_rpc.rs`. The network is live on testnet 40204. Status: Implemented (testnet, pre-audit).
