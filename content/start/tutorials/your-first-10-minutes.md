---
title: Your first 10 minutes
codex_slug: /start/tutorials/your-first-10-minutes
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain core/api
surfaces: [START-what-is-citrate, CHAIN-rpc-eth, CHAIN-rpc-citrate]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A short, copy-paste tour. You will confirm you are on Citrate, read the BlockDAG, look at the SALT token,
and run a model call on the chain, then point yourself at the right next page. Every method here exists in
`citrate-chain`. The read-only steps need no account, no SALT, and no signup.

## What it is

A ten-minute orientation against a live node. Nothing here writes state, so you can run it against any
Citrate endpoint you can reach without risk.

## How to use it

You will need a reachable Citrate JSON-RPC endpoint. A local node serves `http://127.0.0.1:8545`. If you do
not have one, use the [RPC sandbox](/sandboxes/rpc) instead: same methods, in the browser. You will also
want `curl`, and `jq` for readable output.

Set up a small helper so the steps stay short:

```bash
export RPC=http://127.0.0.1:8545

rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

### Step 1, confirm you are on Citrate

```bash
rpc eth_chainId
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}
printf '%d\n' 0x9d0c   # 40204
```

`0x9d0c` is 40204, and 40204 is Citrate. Anything else means you are pointed at a different network.

### Step 2, read the BlockDAG

```bash
rpc citrate_getDagStats | jq
```

```json
{
  "tipsCount": 3,
  "maxBlueScore": 11800,
  "currentTips": ["0x...", "0x...", "0x..."],
  "height": 12345,
  "ghostdagParams": { "k": 18, "maxParents": 10, "finalityDepth": 100 }
}
```

Two things to notice. `maxBlueScore` is the DAG's ordering clock, not `height`. And `tipsCount` above one
is normal: several tips can exist at once on a BlockDAG, and GhostDAG merges them into a single order. If
those words are new, read the [primer](/start/primer).

### Step 3, read the SALT token

```bash
rpc citrate_getToken | jq
# { "name": "Citrate", "symbol": "SALT", "decimals": 18, "totalSupply": "0x...", "totalMinted": "0x..." }
```

SALT has 18 decimals and a one-billion cap. It is the unit fees and rewards are counted in. Detail:
[economics](/chain/economics).

### Step 4, run a model call on the chain

Citrate runs inference as a chain operation, not as an outside service you trust. Generate an embedding with
the genesis model:

```bash
rpc citrate_getTextEmbedding '["the quick brown fox"]' | jq '.result | length'
# 1024
```

Or rank a short corpus by meaning:

```bash
rpc citrate_semanticSearch \
  '["best network for AI compute", ["a payments network","a substrate for AI compute","a meme coin"], 1]' | jq
# [{ "index": 1, "score": 0.82, "text": "a substrate for AI compute" }]
```

A single call accepts at most 256 inputs, which is a denial-of-service guard (`MAX_EMBEDDING_INPUTS`).

### Step 5, pick your next five minutes

| If you want to | Go to |
|---|---|
| Understand the words you just saw | [the primer](/start/primer) |
| See every RPC method | [JSON-RPC reference](/chain/rpc) |
| Go deeper on these same calls | [call the Citrate RPC](/chain/tutorials/call-citrate-rpc) |
| Deploy a contract | [deploy with the CLI](/chain/tutorials/deploy-a-contract-with-the-cli) |
| Get an account with no seed phrase | [sign in with a passkey](/aa/tutorials/sign-in-with-a-passkey) |
| Learn how the project is run | [the Agentile primer](/start/agentile) |

## Reference

The methods used above, with their source files in `citrate-chain`:

| Method | What it returns | Source |
|---|---|---|
| `eth_chainId` | the chain id, `0x9d0c` | `core/api/src/eth_rpc_simple.rs` |
| `citrate_getDagStats` | tips, blue score, GhostDAG params | `core/api/src/` |
| `citrate_getToken` | SALT name, decimals, supply | `core/api/src/economics_rpc.rs` |
| `citrate_getTextEmbedding` | an embedding vector | `core/api/src/ai_rpc.rs` |
| `citrate_semanticSearch` | corpus entries ranked by meaning | `core/api/src/ai_rpc.rs` |

## Failure modes

- **`Connection refused`** means no node is listening on `$RPC` (the default is `127.0.0.1:8545`). Use the
  [RPC sandbox](/sandboxes/rpc) instead.
- **`-32601 Method not found`** is a typo or a method the node does not serve. The chain, DAG, and model
  methods above do not require an economics manager to be configured.
- **A chain id other than `0x9d0c`** means you are not on Citrate.

## Access and canon

Public and read-only. No keys or credentials are needed, and nothing here writes state. The example outputs
are illustrative; exact values depend on the node's current state.

## Source and verification

Methods verified against `citrate-chain` at `03d7851` (`core/api/src/ai_rpc.rs`, `economics_rpc.rs`,
`eth_rpc_simple.rs`), and surfaced in full on the [JSON-RPC reference](/chain/rpc). Status: Implemented
(testnet).
