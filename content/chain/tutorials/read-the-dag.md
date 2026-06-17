---
title: Read the DAG
codex_slug: /chain/tutorials/read-the-dag
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/api/ (server.rs, eth_rpc.rs)
surfaces: [CHAIN-consensus-ghostdag, CHAIN-seq-mempool, CHAIN-net-p2p]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Read the DAG

> Query a running Citrate node over JSON-RPC to see the live BlockDAG: its
> current **tips**, its **height**, the **blue score** of the head, and a single
> block. No keys, no SDK — just `curl` and a node URL. For any developer who
> wants to *see* GhostDAG rather than read about it.

## What you'll do

1. Confirm the node is reachable and which chain it is.
2. Read DAG stats (tips, height, blue score, GhostDAG params) in one call.
3. Read the current tips and fetch one tip block.
4. (Bonus) Check sync + peer health and mempool depth.

**Prerequisites**

- A running Citrate node exposing JSON-RPC (default local: `http://127.0.0.1:8545`).
- `curl` and, optionally, `jq` for pretty output.
- Citrate chainId is **40204**.

> All methods below are registered in `core/api/src/server.rs` and
> `core/api/src/eth_rpc.rs` at SHA `03d7851`. Set your endpoint once:
>
> ```bash
> export RPC=http://127.0.0.1:8545
> ```

## Step 1 — Confirm the node and chain

```bash
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}' | jq
```

Expect a hex chainId of `0x9d0c` (= **40204**). A quick liveness check:

```bash
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' | jq
```

Methods: `eth_chainId`, `eth_blockNumber`
(`core/api/src/eth_rpc_simple.rs`, `core/api/src/eth_rpc.rs`).

## Step 2 — Read the DAG in one call

`citrate_getDagStats` returns tips, height, the head's blue score and the
network's GhostDAG parameters in a single response:

```bash
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"citrate_getDagStats","params":[]}' | jq
```

Response shape (`core/api/src/eth_rpc.rs:2402` — `citrate_getDagStats`):

```json
{
  "totalBlocks": 12345,
  "blueBlocks": 11727,
  "redBlocks": 618,
  "tipsCount": 2,
  "maxBlueScore": 12344,
  "currentTips": ["0x…", "0x…"],
  "height": 12345,
  "ghostdagParams": { "k": 18, "maxParents": 10, "maxBlueScoreDiff": 1000 }
}
```

What you're looking at:

- **`currentTips` / `tipsCount`** — the DAG's current leaf blocks. More than one
  tip is normal for a BlockDAG; consensus orders them deterministically.
- **`maxBlueScore`** — the blue score of the highest tip (the head the network
  builds on; higher blue score wins tip selection).
- **`ghostdagParams`** — the live consensus constants (`k = 18`,
  `maxParents = 10`); these come from `GhostDagParams::default()` in
  `core/consensus/src/types.rs`.

> Note: in the current implementation `blueBlocks`/`redBlocks` are an estimate
> derived from height (the handler comments this explicitly), while `currentTips`,
> `maxBlueScore`, `height` and `ghostdagParams` are read directly from chain
> state. Treat the blue/red split as indicative, not exact.

## Step 3 — Read tips, then fetch one block

Get just the tips:

```bash
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"chain_getTips","params":[]}' | jq
```

`chain_getTips` returns an array of tip hashes (`server.rs:746`). Take one and
fetch the block by hash with `chain_getBlock` (`server.rs:757`, parameter is a
`BlockId`):

```bash
TIP=$(curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"chain_getTips","params":[]}' \
  | jq -r '.result[0]')

curl -s $RPC -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"chain_getBlock\",\"params\":[{\"Hash\":\"$TIP\"}]}" | jq
```

The block's header carries its `blue_score` — the same value GhostDAG uses for
tip selection. You can also get the height alone:

```bash
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"chain_getHeight","params":[]}' | jq
```

Methods: `chain_getTips`, `chain_getBlock`, `chain_getHeight`
(`core/api/src/server.rs`).

## Step 4 (bonus) — Sync, peers and mempool

```bash
# Is the node still catching up?
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_syncing","params":[]}' | jq

# How many peers?
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"net_peerCount","params":[]}' | jq

# How deep is the mempool right now?
curl -s $RPC -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"citrate_getMempoolStats","params":[]}' | jq
```

Methods: `eth_syncing`, `net_peerCount`, `citrate_getMempoolStats`
(`core/api/src/`).

## What you learned

- A Citrate ledger is a **DAG with multiple tips**, not a single chain.
- **Blue score** orders those tips; the highest is the head.
- One call (`citrate_getDagStats`) gives the whole DAG snapshot; `chain_getTips`
  + `chain_getBlock` let you drill into individual blocks.

Read the protocol behind these numbers in [Consensus — GhostDAG](/chain/consensus)
(see `#finality` for how deep blocks become irreversible).

## Security & access

- **Tier: public.** Everything here is read-only public RPC a developer needs to
  inspect the chain. No keys, no write methods, no private endpoints.
- The endpoint `http://127.0.0.1:8545` is the conventional **local** default,
  not a live network address.

## Source & verification

- **Methods audited in:** `core/api/src/server.rs`
  (`chain_getHeight`, `chain_getTips`, `chain_getBlock`),
  `core/api/src/eth_rpc.rs` (`citrate_getDagStats`),
  `core/api/src/eth_rpc_simple.rs` (`eth_chainId`, `eth_blockNumber`).
- **Audited against SHA:** `03d7851`.
- **Honest status:** RPC surface is implemented and tested; the
  `blueBlocks`/`redBlocks` fields of `citrate_getDagStats` are estimates per the
  handler's own comment — flagged above. Node is **pre external audit**.
