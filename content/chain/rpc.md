---
title: JSON-RPC reference
codex_slug: /chain/rpc
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/api/src/{eth_rpc.rs,server.rs,ai_rpc.rs,economics_rpc.rs,methods/}
surfaces: [CHAIN-rpc-eth, CHAIN-rpc-citrate, CHAIN-rpc-ai, CHAIN-rpc-econ]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# JSON-RPC reference

> The Citrate node's JSON-RPC API. Ethereum-compatible `eth_*`/`net_*`/`web3_*` methods plus Citrate-native
> `citrate_*` methods for the BlockDAG, on-chain AI, and economics. For developers building against the chain.

This page is **code-audited** against `citrate-chain` @ `03d7851`. Every method below is registered in the
node's `IoHandler` at that SHA; methods that do not appear in the code are not documented here. The truth lives
in the source repo and Codex transcludes it at the pinned SHA (Rule 9). Where this page differs from the legacy
`/chain/rpc` fixture, **this page wins** — see "Source & verification".

## Overview

A Citrate node exposes a single JSON-RPC endpoint over HTTP (default port `8545`) and WebSocket. All requests
use JSON-RPC 2.0:

```json
{ "jsonrpc": "2.0", "id": 1, "method": "<method>", "params": [ ... ], "result": ... }
```

Citrate is an **AI-native Layer-1 BlockDAG** (GhostDAG consensus, LVM execution). Chain id is **40204** on
the canonical network; native token is **SALT**. Quantities are returned as `0x`-prefixed hex strings, matching
the Ethereum JSON-RPC convention, unless noted otherwise.

Method namespaces and where they are registered:

| Namespace | Surface | Source file | Tier |
|---|---|---|---|
| `eth_*` / `web3_*` | `CHAIN-rpc-eth` | `core/api/src/eth_rpc.rs`, `core/api/src/server.rs` | public |
| `net_*` | `CHAIN-rpc-eth` | `core/api/src/server.rs` | public |
| `chain_*` / `state_*` / `mempool_*` / `tx_*` | `CHAIN-rpc-eth` | `core/api/src/server.rs` | public |
| `citrate_*` (DAG, mempool, emergency, institutional) | `CHAIN-rpc-citrate` | `core/api/src/eth_rpc.rs` | public |
| `citrate_*` (AI/models/inference) + embedding/search/chat | `CHAIN-rpc-ai` | `core/api/src/server.rs`, `core/api/src/ai_rpc.rs` | public |
| `citrate_*` (economics) | `CHAIN-rpc-econ` | `core/api/src/economics_rpc.rs` | commercial |

> **Naming note (registry correction).** There are **no** `citrate_blockDAG`, `citrate_blueScore`,
> `citrate_selectedParent`, `citrate_tipSet`, `ai_*`, or `economics_*` methods in the code at this SHA — those
> names in the registry/fixture are aspirational. The real DAG accessor is `citrate_getDagStats` (plus the
> `chain_*` namespace for tips/height); AI and economics methods both use the `citrate_*` prefix. See the
> registry-correction notes at the end.

---

## Standard methods (`eth_*` / `net_*` / `web3_*`) {#eth}

**Surface `CHAIN-rpc-eth` · tier public.** Registered in
`core/api/src/eth_rpc.rs::register_eth_methods` and `core/api/src/server.rs`.

### Chain & block reads

| Method | Params | Returns |
|---|---|---|
| `eth_blockNumber` | — | latest height, hex string (`eth_rpc.rs:147`) |
| `eth_getBlockByNumber` | `[blockTag\|hex, includeTxs:bool]` | block object or `null` (`eth_rpc.rs:160`) |
| `eth_getBlockByHash` | `[hash, includeTxs:bool]` | block object or `null` (`eth_rpc.rs:246`) |
| `eth_getBlockTransactionCountByNumber` | `[blockTag\|hex]` | hex count (`eth_rpc.rs`) |
| `eth_getBlockTransactionCountByHash` | `[hash]` | hex count (`eth_rpc.rs`) |
| `eth_getTransactionByHash` | `[hash]` | tx object or `null` (`eth_rpc.rs:315`) |
| `eth_getTransactionByBlockNumberAndIndex` | `[blockTag\|hex, idxHex]` | tx object (`eth_rpc.rs`) |
| `eth_getTransactionByBlockHashAndIndex` | `[hash, idxHex]` | tx object (`eth_rpc.rs`) |
| `eth_getTransactionReceipt` | `[hash]` | receipt object or `null` (`eth_rpc.rs:410`) |

### Account & state

| Method | Params | Returns |
|---|---|---|
| `eth_getBalance` | `[address, blockTag]` | balance, hex (`eth_rpc.rs:502`) |
| `eth_getCode` | `[address, blockTag]` | code bytes, hex |
| `eth_getStorageAt` | `[address, slot, blockTag]` | storage word, hex |
| `eth_getTransactionCount` | `[address, blockTag]` | nonce, hex |
| `eth_accounts` | — | `[]` (node holds no keys) |

### Transactions & gas

| Method | Params | Returns |
|---|---|---|
| `eth_sendRawTransaction` | `[signedTxHex]` | tx hash |
| `eth_sendTransaction` | `[txObject]` | tx hash |
| `eth_call` | `[txObject, blockTag]` | return data, hex |
| `eth_estimateGas` | `[txObject]` | gas estimate, hex |
| `eth_gasPrice` | — | gas price, hex (`0x3b9aca00` = 1 gwei) (`eth_rpc.rs:494`) |
| `eth_maxPriorityFeePerGas` | — | priority fee, hex |
| `eth_feeHistory` | `[blockCount, newestBlock, rewardPercentiles]` | fee-history object |

### Filters & logs

`eth_getLogs`, `eth_newFilter`, `eth_newBlockFilter`, `eth_newPendingTransactionFilter`,
`eth_uninstallFilter`, `eth_getFilterChanges`, `eth_getFilterLogs` — standard Ethereum log/filter semantics,
backed by `core/api/src/filter.rs`.

### Node metadata

| Method | Params | Returns |
|---|---|---|
| `eth_chainId` | — | chain id, hex (`0x{:x}`, e.g. `0x9d0c` for 40204) (`eth_rpc.rs:480`) |
| `eth_syncing` | — | `false` when synced (`eth_rpc.rs:486`) |
| `eth_protocolVersion` / `eth_mining` / `eth_hashrate` / `eth_coinbase` | — | static/compat values |
| `net_version` | — | chain id as decimal string (`server.rs:1158`) |
| `net_peerCount` | — | connected peer count |
| `net_listening` | — | `bool` |
| `net_peers` / `net_peerInfo` | — | peer list / per-peer info |
| `web3_clientVersion` | — | `"citrate/v0.1.0"` (`server.rs:1164`) |
| `web3_sha3` | `[dataHex]` | keccak-256 digest, hex (`eth_rpc.rs`) |

### Native namespace aliases (`server.rs`)

`chain_getHeight`, `chain_getBlock`, `chain_getTips`, `chain_getTransaction`, `state_getBalance`,
`state_getCode`, `state_getNonce`, `mempool_getPending`, `mempool_getStatus`, `tx_sendRawTransaction`,
`tx_estimateGas`, `tx_getGasPrice` — thin wrappers over the same `ChainApi`/`StateApi`/`MempoolApi`/
`TransactionApi` (`core/api/src/methods/`).

---

## Citrate methods — BlockDAG & node ops (`citrate_*`) {#citrate}

**Surface `CHAIN-rpc-citrate` · tier public.** Registered in `core/api/src/eth_rpc.rs`.

### `citrate_getDagStats`

GhostDAG statistics for the current tip set. (`eth_rpc.rs:2402`)

- **Params:** none
- **Returns:**

```json
{
  "totalBlocks": 12345,
  "blueBlocks": 11727,
  "redBlocks": 618,
  "tipsCount": 3,
  "maxBlueScore": 11800,
  "currentTips": ["0x<hash>", "0x<hash>"],
  "height": 12345,
  "ghostdagParams": {
    "k": 18,
    "maxParents": 10,
    "maxBlueScoreDiff": 1000,
    "pruningWindow": 100000,
    "finalityDepth": 100
  }
}
```

> Honest status: `blueBlocks`/`redBlocks` are estimated from height (≈95% blue) at this SHA, not counted from
> the DAG; `ghostdagParams` are the network-wide defaults (`GhostDagParams::default()`). `tipsCount`,
> `currentTips`, `height`, and `maxBlueScore` are read live from storage.

### `citrate_getTransactionStatus`

Status of a transaction by hash (mempool / mined / unknown). Params: `[hash]`. (`eth_rpc.rs`)

### `citrate_getMempoolSnapshot`

**Auth-gated.** Per-transaction mempool detail. Requires operator auth inside the handler
(`eth_rpc.rs:1903`). The unauthenticated, aggregate-only counterpart is `citrate_getMempoolStats` (see
Economics). Do not confuse the two — a prior regression (audit RFI-A1 / H-API-01) collided these names; the
auth-gated snapshot is the only handler for this method name post-fix.

### Emergency controls (operator-only)

`citrate_emergencyPause`, `citrate_emergencyResume`, `citrate_emergencyStatus` — halt/resume block production.
**Authenticated inside the handler** via `require_operator_auth` (env token `CITRATE_OPERATOR_TOKEN`), not by
seat. Only registered when the node is constructed with a `pause_flag` (`eth_rpc.rs:2461`). No secrets are
documented here; the token is operator-supplied at runtime.

### Institutional / school-node (operator-only)

`citrate_registerSchoolNode`, `citrate_getInstitutionalConfig`, `citrate_estimateInstitutionalRewards` —
registration and reward-estimation for institutional nodes (`eth_rpc.rs`).

---

## AI methods (`citrate_*` AI + embedding/search/chat) {#ai}

**Surface `CHAIN-rpc-ai` · tier public.** Model/inference methods registered in `core/api/src/server.rs`;
embedding/search/chat registered in `core/api/src/ai_rpc.rs::register_ai_methods`.

### Inference

#### `citrate_requestInference`

Run a preview inference against a registered on-chain model. (`server.rs:2070`)

- **Params** (object, also accepted as a single-element array):

| Field | Type | Required | Notes |
|---|---|---|---|
| `model_id` | hex, 32 bytes | yes | model identity |
| `input` | any JSON | yes | serialized to bytes for the model |
| `from` | hex, 20 bytes | no | identity **claim** — anonymous unless signed |
| `signature` | hex | no | secp256k1 over `{chain_id, model_id, input, timestamp}` |
| `timestamp` | number | no | unix seconds; required with `signature` |
| `max_gas` | number | no | default `1_000_000` |

> Security: `from` is a claim, not an identity. Unsigned requests are anonymous and can only reach **Public**
> models; gated models require the signature binding (`core/api/src/inference_auth.rs`, SECREM-01 INFER-1).

- **Returns:**

```json
{
  "status": "success",
  "output": <json or base64 string>,
  "encoding": "json",
  "execution_time_ms": 42,
  "gas_used": 31000,
  "provider": "0x<address>",
  "provider_fee": "0",
  "proof": "0x<bytes>"
}
```

`encoding` is `"json"` when the model output decodes as JSON, else `"base64"`. `proof` is `null` when the
provider returns no proof.

#### `citrate_runInference` / `citrate_getInferenceResult`

`citrate_runInference` executes inference; `citrate_getInferenceResult` (`server.rs:2365`) fetches a result by
id. Both registered in `server.rs`.

### Models & artifacts

| Method | Purpose |
|---|---|
| `citrate_getModels` / `citrate_listModels` | enumerate registered models (`server.rs:2027`) |
| `citrate_getModel` | model detail by id |
| `citrate_deployModel` / `citrate_updateModel` | register/update a model (operator-auth, `server.rs:570`) |
| `citrate_createTrainingJob` / `citrate_getTrainingJob` | training-job lifecycle |
| `citrate_listModelArtifacts` / `citrate_listProofArtifacts` / `citrate_pinArtifact` | artifact management |
| `citrate_getArtifactStatus` | artifact status |
| `citrate_getAIStatus` | model count, GGUF/`llama-cli` availability, inference readiness (`server.rs:2196`) |

### Verification

`citrate_verifyContract` (runtime-bytecode match, `server.rs:1181`), `citrate_getVerification`,
`citrate_getVerificationById`, `citrate_listVerifications`, `citrate_listVerificationsByStatus`,
`citrate_listVerificationsByAddressPrefix`, `citrate_pruneVerifications`.

### Embeddings / search / chat (`ai_rpc.rs`)

| Method | Params | Returns |
|---|---|---|
| `citrate_getTextEmbedding` | `[text \| string[]]` (≤256 inputs) | one `float[]`, or `float[][]` for arrays (`ai_rpc.rs:29`) |
| `citrate_semanticSearch` | `[query, documents[], top_k?]` (≤256 docs) | `[{index, score, text}, ...]` sorted by cosine similarity (`ai_rpc.rs:100`) |
| `citrate_chatCompletion` | `[{...ChatCompletionRequest}]` or `[prompt, max_tokens?, temperature?]` | chat-completion response (`ai_rpc.rs:201`) |

> Embedding model is `bge-m3`; default chat model is `mistral-7b-instruct-v0.3`. Batch size is clamped at
> `MAX_EMBEDDING_INPUTS = 256` (SECREM-01 Phase-8, NET-1 variant) — larger batches return `invalid_params`.

---

## Economics methods (`citrate_*` economics) {#economics}

**Surface `CHAIN-rpc-econ` · tier commercial.** Registered in
`core/api/src/economics_rpc.rs::register_economics_methods`. Methods return `method_not_found` when the node
runs without an economics manager (so values below assume one is configured).

| Method | Params | Returns |
|---|---|---|
| `citrate_gasPrice` | — | base gas price, hex (`economics_rpc.rs:19`) |
| `citrate_getEconomicState` | — | economic-state object (below) (`economics_rpc.rs:33`) |
| `citrate_getVotingPower` | `[address]` | `{tokenPower, gasUsagePower, stakingPower, reputationPower, totalPower, quadraticPower}` all hex (`economics_rpc.rs:60`) |
| `citrate_getStakeholderInfo` | `[address]` | `{stakeholderType, contributionScore, totalContribution, blocksActive, qualityScore}` (`economics_rpc.rs:110`) |
| `citrate_getRevenueHistory` | — | `[{blockHeight, totalRevenue, poolType, distributionCount, timestamp}, ...]` (`economics_rpc.rs:161`) |
| `citrate_getMempoolStats` | — | aggregate, unauthenticated mempool stats (`economics_rpc.rs:193`) |
| `citrate_getToken` | — | `{name, symbol, decimals, totalSupply, totalMinted}` (`economics_rpc.rs:245`) |
| `citrate_getStakedBalance` | `[address]` | staked balance, hex (`economics_rpc.rs:268`) |
| `citrate_getReputationScore` | `[address]` | reputation score, number (`economics_rpc.rs:308`) |

`citrate_getEconomicState` returns:

```json
{
  "blockHeight": 12345,
  "totalSupply": "0x...",
  "circulatingSupply": "0x...",
  "gasPrice": "0x...",
  "stakedAmount": "0x...",
  "burnAmount": "0x...",
  "treasuryBalance": "0x...",
  "governanceParticipation": 0.42,
  "networkSecurityBudget": "0x...",
  "aiEconomyValue": "0x..."
}
```

> Why commercial: economics surfaces (reward profiles, stakeholder/revenue accounting, voting-power
> derivation) are operator/enterprise-facing depth. The methods are unauthenticated reads where a manager is
> configured, but the **documentation** of the reward model sits at the commercial tier.

---

## Examples

### `eth_chainId` (cURL)

```bash
curl -s http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}   # 0x9d0c = 40204
```

### `eth_getBalance`

```bash
curl -s http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getBalance",
       "params":["0x0000000000000000000000000000000000000001","latest"]}'
# {"jsonrpc":"2.0","id":1,"result":"0x0"}
```

### `citrate_getDagStats`

```bash
curl -s http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"citrate_getDagStats","params":[]}'
```

### `citrate_getTextEmbedding`

```bash
curl -s http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"citrate_getTextEmbedding",
       "params":["hello citrate"]}'
# result: [0.0123, -0.045, ...]   (bge-m3 embedding vector)
```

### `citrate_requestInference` (anonymous → Public models only)

```bash
curl -s http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"citrate_requestInference",
       "params":[{"model_id":"0x<32-byte-hex>","input":{"prompt":"hi"}}]}'
```

### `citrate_getToken`

```bash
curl -s http://127.0.0.1:8545 \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"citrate_getToken","params":[]}'
# {"name":"Citrate","symbol":"SALT","decimals":18, ...}
```

## Tutorials

- [Call the Citrate RPC](/chain/tutorials/call-citrate-rpc) — a runnable, copy-paste walkthrough.

## Security & access

- **No secrets here.** No keys, mnemonics, internal hostnames, or operator tokens. Operator-gated methods
  (`citrate_emergency*`, `citrate_getMempoolSnapshot`, `citrate_deployModel`/`citrate_updateModel`,
  `citrate_registerSchoolNode`) authenticate via an operator-supplied token at runtime; the token is never
  documented.
- **Tiering.** `eth_*`/`net_*`/`web3_*`/`citrate_*` chain, DAG, and AI methods are **public** — a developer
  needs them to build. The **economics** documentation is **commercial**: the reward/stakeholder/voting-power
  model is operator/enterprise depth whose narrative sits behind a seat, even though the read methods are open
  on a configured node.
- **Identity is a claim.** `from` on inference is not authenticated unless signed (INFER-1). Gated models
  require the signature binding; anonymous callers reach Public models only.

## Source & verification

- **Source repo:** `citrate-chain`
- **Files:** `core/api/src/eth_rpc.rs`, `core/api/src/server.rs`, `core/api/src/ai_rpc.rs`,
  `core/api/src/economics_rpc.rs`, `core/api/src/methods/`
- **Audited against SHA:** `03d7851` (`git -C citrate-chain rev-parse --short HEAD`)
- **Method of audit:** enumerated every `add_sync_method("...")` registration across the four files; only
  registered methods are documented. Param/return shapes read from the handler bodies cited per method.
- **Supersedes:** the legacy `/chain/rpc` fixture (which transcluded a placeholder README and listed
  non-existent `citrate_blockDAG`/`citrate_blueScore`/`citrate_selectedParent`/`citrate_tipSet`). This page is
  the real, code-audited reference.
