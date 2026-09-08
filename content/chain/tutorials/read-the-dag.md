---
title: Read the DAG
codex_slug: /chain/tutorials/read-the-dag
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain core/api
surfaces: [CHAIN-consensus-ghostdag, CHAIN-rpc-citrate, CHAIN-rpc-chain]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A copy-paste walkthrough that lets you see the BlockDAG instead of reading about it. You will read the whole
DAG in one call, list the current tips, fetch a single tip block, and learn why blue score, not height, is
the clock that orders the ledger. Every method here is read-only, so it needs no account and no SALT.

## What it is

A Citrate ledger is a DAG with more than one leaf, not a single chain. GhostDAG (k = 18, finality depth 100)
takes those leaves and merges them into one agreed order, and the number it counts by is the blue score. This
tutorial reads that state live. If the words are new, read the [primer](/start/primer) first; for the
protocol behind the numbers, read [consensus, GhostDAG](/chain/consensus).

## How to use it

You will need a reachable Citrate JSON-RPC endpoint. A local node serves `http://127.0.0.1:8545`. If you do
not have one, use the [RPC sandbox](/sandboxes/rpc) instead. You will also want `curl`, and `jq` for readable
output.

Set up the same helper used in [call the Citrate RPC](/chain/tutorials/call-citrate-rpc):

```bash
export RPC=http://127.0.0.1:8545

rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

### Step 1, read the whole DAG in one call

`citrate_getDagStats` returns tips, height, the head's blue score, and the network's GhostDAG parameters in a
single response:

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

What you are looking at:

- `currentTips` and `tipsCount`, the DAG's current leaf blocks. More than one tip at once is normal on a
  BlockDAG; GhostDAG orders them deterministically.
- `maxBlueScore`, the blue score of the highest tip, the head the network builds on. This is the ordering
  clock, not `height`.
- `ghostdagParams`, the live consensus constants: `k` is 18, `maxParents` is 10, `finalityDepth` is 100. These
  come from `GhostDagParams::default()` in `core/consensus/src/types.rs`.

One honesty note: `currentTips`, `maxBlueScore`, `height`, and `ghostdagParams` are read from chain state,
while `blueBlocks` and `redBlocks` are estimated from height (the handler says so in a comment). Treat the
blue-and-red split as indicative, not exact.

### Step 2, blue score versus height

Height counts how deep a block sits along the selected chain. Blue score counts how many blue (well-connected,
honest-looking) blocks precede a block across the whole DAG. Tip selection follows the highest blue score, so
when you ask which tip the network is building on, `maxBlueScore` is the answer, and the block with the
highest blue score is the head. Two tips can sit at the same height yet have different blue scores; the one
with the larger blue score wins. That is why we call blue score the ordering clock.

### Step 3, list the tips, then fetch one

Get the tips on their own:

```bash
rpc chain_getTips | jq
# ["0x...", "0x...", "0x..."]
```

`chain_getTips` returns an array of tip hashes. Take the first and fetch its block by hash with
`chain_getBlock`, whose parameter is a `BlockId` (here the `Hash` form):

```bash
TIP=$(rpc chain_getTips | jq -r '.result[0]')

rpc chain_getBlock "[{\"Hash\":\"$TIP\"}]" | jq
```

The block's header carries `blue_score`, the same value GhostDAG uses for tip selection, alongside
`selected_parent_hash` and `merge_parent_hashes`. Those merge parents are the other tips this block absorbed,
the act of merging that makes a DAG a DAG rather than a chain. You can also read the height alone:

```bash
rpc chain_getHeight
# {"jsonrpc":"2.0","id":1,"result":12345}
```

### Step 4, pick your next page

| If you want to | Go to |
|---|---|
| The protocol behind these numbers | [consensus, GhostDAG](/chain/consensus) |
| Every RPC method, with params and shapes | [JSON-RPC reference](/chain/rpc) |
| The request envelope and error codes | [call the Citrate RPC](/chain/tutorials/call-citrate-rpc) |
| The words: tips, blue score, merge | [the primer](/start/primer) |

## Reference

The methods used above, with their source files in `citrate-chain`:

| Method | What it returns | Source |
|---|---|---|
| `citrate_getDagStats` | tips, blue score, GhostDAG params | `core/api/src/eth_rpc.rs` |
| `chain_getTips` | an array of tip hashes | `core/api/src/server.rs` |
| `chain_getBlock` | one block, by `BlockId` (`{"Hash":"0x..."}`) | `core/api/src/server.rs` |
| `chain_getHeight` | the current height as a number | `core/api/src/server.rs` |

GhostDAG constants (`k = 18`, `maxParents = 10`, `finalityDepth = 100`) come from `GhostDagParams::default()`
in `core/consensus/src/types.rs`.

## Failure modes

- **`Connection refused`** means no node is listening on `$RPC` (the default is `127.0.0.1:8545`). Use the
  [RPC sandbox](/sandboxes/rpc) instead.
- **`chain_getBlock` returns `null`** when no block matches the `BlockId`. Check the hash, and that the
  `params` shape is `[{"Hash":"0x..."}]` and not a bare string.
- **`-32602 Invalid params`** means the `BlockId` shape was wrong. The form above is the one the handler
  parses.
- **A blue-and-red split that looks off** is expected: those two fields are estimated from height, per the
  note in Step 1.

## Access and canon

Public and read-only. No keys, no write methods, no private endpoints, and nothing here writes state. Chain id
40204 is testnet, and `http://127.0.0.1:8545` is the conventional local address, not a live network endpoint.

## Source and verification

Methods verified against `citrate-chain` at `9d5959e`: `citrate_getDagStats` in `core/api/src/eth_rpc.rs`,
and `chain_getTips`, `chain_getBlock`, and `chain_getHeight` in `core/api/src/server.rs`. The GhostDAG
constants are `GhostDagParams::default()` in `core/consensus/src/types.rs`. Status: Implemented (testnet
40204), pre external audit. The `blueBlocks` and `redBlocks` fields of `citrate_getDagStats` are estimates,
as flagged above.
