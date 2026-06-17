---
title: Your first 10 minutes
codex_slug: /start/tutorials/your-first-10-minutes
tier: public
org_scope: ~
source_kind: authored
source: codex
surfaces: [START-what-is-citrate, CHAIN-rpc-eth, CHAIN-rpc-citrate]
audited_against_sha: cd729ed
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Your first 10 minutes

> A copy-paste tour: confirm you're on Citrate (chain id **40204**), read the
> **BlockDAG**, peek at the **SALT** token, and run an **on-chain AI** call — then
> point yourself at the right next page. Everything here uses methods that exist
> in `citrate-chain` at federation SHA `cd729ed`. No wallet, no SALT, no signup
> needed for the read-only steps.

## Prerequisites

- A reachable Citrate JSON-RPC endpoint. A local node serves
  `http://127.0.0.1:8545`. (No node yet? Use the live
  [RPC explorer sandbox](/sandboxes/rpc) instead — same methods, in the browser.)
- `curl`, and optionally `jq` for pretty output.

```bash
export RPC=http://127.0.0.1:8545

rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

## Step 1 — Confirm you're on Citrate (~1 min)

```bash
rpc eth_chainId
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}
printf '%d\n' 0x9d0c   # 40204
```

`0x9d0c` == **40204** is canonical Citrate. Anything else means you're pointed at
a different network. (Why a number, and why 40204? See
[What Citrate is](/start/what-is-citrate).)

## Step 2 — Read the BlockDAG (~2 min)

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

Notice **`maxBlueScore`** — that's the DAG's ordering clock, not `height`. Notice
**`tipsCount` > 1** — multiple tips at once is normal on a BlockDAG; GhostDAG
merges them into one order. New to those words? Read the
[mental-models primer](/start/primer) (blue score, merge parents, finality by
depth).

## Step 3 — Read the SALT token (~1 min)

```bash
rpc citrate_getToken | jq
# { "name": "Citrate", "symbol": "SALT", "decimals": 18, "totalSupply": "0x...", "totalMinted": "0x..." }
```

**SALT**, 18 decimals, hard-capped at 1B. This is the unit fees and rewards are
counted in. Detail: [Economics](/chain/economics).

## Step 4 — Run on-chain AI (~2 min)

Citrate ships AI as RPC, not as a service you trust. Generate an embedding with
the genesis model:

```bash
rpc citrate_getTextEmbedding '["the quick brown fox"]' | jq '.result | length'
# 1024
```

Or semantic-search a short corpus:

```bash
rpc citrate_semanticSearch \
  '["best chain for AI", ["a payments chain","an AI-native BlockDAG","a meme coin"], 1]' | jq
# [{ "index": 1, "score": 0.82, "text": "an AI-native BlockDAG" }]
```

(Inputs cap at 256 per call — a DoS guard.)

## Step 5 — Pick your next 5 minutes

| If you want to… | Go to |
|---|---|
| Understand the words you just saw | [Mental-models primer](/start/primer) |
| See every RPC method | [JSON-RPC reference](/chain/rpc) |
| Go deeper on the same calls | [Call the Citrate RPC](/chain/tutorials/call-citrate-rpc) |
| Deploy a contract | [Deploy with the CLI](/chain/tutorials/deploy-a-contract-with-the-cli) |
| Get a smart wallet with no seed phrase | [Sign in with a passkey](/aa/tutorials/sign-in-with-a-passkey) |
| Learn how the project is run | [Agentile primer](/start/agentile) |

## Troubleshooting

- **`Connection refused`** — no node on `$RPC` (default `127.0.0.1:8545`). Use the
  [RPC sandbox](/sandboxes/rpc) instead.
- **`-32601 Method not found`** — a typo, or an unsupported method on that node.
  The chain/DAG/AI methods above don't need an economics manager.
- **Wrong chain id** — anything other than `0x9d0c` / `40204` is not Citrate.

## Security & access

Public, read-only. No keys or credentials needed; nothing here writes state.
Example outputs are illustrative — exact values depend on the node's state.

## Source & verification

Authored tutorial. Methods verified against `citrate-chain` via the
[JSON-RPC reference](/chain/rpc) and [Call the Citrate RPC](/chain/tutorials/call-citrate-rpc)
tutorial. Federation SHA `cd729ed`.
