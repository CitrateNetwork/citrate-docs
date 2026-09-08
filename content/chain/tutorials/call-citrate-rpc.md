---
title: Call the Citrate RPC
codex_slug: /chain/tutorials/call-citrate-rpc
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain core/api
surfaces: [CHAIN-rpc-eth, CHAIN-rpc-citrate, CHAIN-rpc-econ]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A short, copy-paste walkthrough of the JSON-RPC surface. You will confirm you are on Citrate, read the
BlockDAG, and read the network economics, learning the request and response shape, the id field, and the two
error codes you will see most often. Every method here exists in `citrate-chain`, and every step is
read-only, so it needs no account and no SALT.

## What it is

A tour of four real methods over plain HTTP. You learn the JSON-RPC envelope once, then reuse it for the
rest of the [JSON-RPC reference](/chain/rpc). Nothing here writes state, so you can run it against any
Citrate endpoint you can reach without risk.

## How to use it

You will need a reachable Citrate JSON-RPC endpoint. A local node serves `http://127.0.0.1:8545`. If you do
not have one, use the [RPC sandbox](/sandboxes/rpc) instead: the same methods, in the browser. You will also
want `curl`, and `jq` for readable output.

Set up a small helper so the steps stay short:

```bash
export RPC=http://127.0.0.1:8545

rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

Every request carries four fields: `jsonrpc` (always `"2.0"`), an `id` you choose to match the reply to the
request, the `method` name, and a `params` array. The helper sets `id` to `1` and defaults `params` to an
empty array. The reply echoes your `id` and returns either a `result` or an `error`.

### Step 1, confirm you are on Citrate

```bash
rpc eth_chainId
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}
printf '%d\n' 0x9d0c   # 40204
```

`0x9d0c` is 40204, and 40204 is Citrate testnet. The reply echoes the `id` you sent and puts the chain id in
`result` as a hex string. Anything other than `0x9d0c` means you are pointed at a different network.

### Step 2, read the chain height

```bash
rpc chain_getHeight
# {"jsonrpc":"2.0","id":1,"result":12345}
```

`chain_getHeight` returns a plain number, the current height of the selected chain. It takes no parameters,
so the helper's empty array is correct. Height is one of two clocks on a BlockDAG; the other, blue score,
comes next.

### Step 3, read the BlockDAG

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

Two things to notice. `maxBlueScore` is the DAG's ordering clock, not `height`. And `tipsCount` above one is
normal: several tips can exist at once on a BlockDAG, and GhostDAG merges them into a single order. To go
deeper on tips and blocks, read [read the DAG](/chain/tutorials/read-the-dag); for the words themselves, the
[primer](/start/primer). One honesty note: `currentTips`, `maxBlueScore`, `height`, and `ghostdagParams` are
read from chain state, while `blueBlocks` and `redBlocks` are estimated from height, so treat the
blue-and-red split as indicative.

### Step 4, read the network economics

```bash
rpc citrate_getToken | jq
# { "name": "Citrate", "symbol": "SALT", "decimals": 18, "totalSupply": "0x...", "totalMinted": "0x..." }
```

SALT has 18 decimals and a one-trillion cap. It is the unit fees and rewards are counted in, not a product. For
the live economic snapshot, blocks height, gas price, staked amount, and treasury, call
`citrate_getEconomicState`:

```bash
rpc citrate_getEconomicState | jq
# { "blockHeight": 12345, "totalSupply": "0x...", "circulatingSupply": "0x...", "gasPrice": "0x...",
#   "stakedAmount": "0x...", "treasuryBalance": "0x...", ... }
```

`citrate_getEconomicState` needs an economics manager configured on the node. Without one it returns
`-32601 Method not found`, the same code you would see for a typo. Detail: [economics](/chain/economics).

### Step 5, read an error on purpose

Send a method that does not exist, then send a real method with the wrong parameter shape:

```bash
rpc citrate_thisIsNotAMethod
# {"jsonrpc":"2.0","id":1,"error":{"code":-32601,"message":"Method not found"}}

rpc eth_getCode '["not-an-address"]'
# {"jsonrpc":"2.0","id":1,"error":{"code":-32602,"message":"Invalid params"}}
```

`-32601` and `-32602` are the two errors you will meet most. The first says the node does not serve that
method, the second says the method exists but your `params` were wrong. Both are standard JSON-RPC codes.

### Step 6, pick your next page

| If you want to | Go to |
|---|---|
| See every RPC method, with params and shapes | [JSON-RPC reference](/chain/rpc) |
| Walk the tips and fetch a block | [read the DAG](/chain/tutorials/read-the-dag) |
| Deploy a contract from the command line | [deploy with the CLI](/chain/tutorials/deploy-a-contract-with-the-cli) |
| Understand the words you just saw | [the primer](/start/primer) |

## Reference

The methods used above, with their source files in `citrate-chain`:

| Method | What it returns | Source |
|---|---|---|
| `eth_chainId` | the chain id, `0x9d0c` | `core/api/src/eth_rpc.rs` |
| `chain_getHeight` | the current height as a number | `core/api/src/server.rs` |
| `citrate_getDagStats` | tips, blue score, GhostDAG params | `core/api/src/eth_rpc.rs` |
| `citrate_getToken` | SALT name, decimals, supply | `core/api/src/economics_rpc.rs` |
| `citrate_getEconomicState` | live economic snapshot | `core/api/src/economics_rpc.rs` |
| `eth_getCode` | the code at an address | `core/api/src/eth_rpc.rs` |

## Failure modes

- **`Connection refused`** means no node is listening on `$RPC` (the default is `127.0.0.1:8545`). Use the
  [RPC sandbox](/sandboxes/rpc) instead.
- **`-32601 Method not found`** is a typo, or a method the node does not serve. The economics methods,
  `citrate_getToken` and `citrate_getEconomicState`, need an economics manager configured; the chain and DAG
  methods do not.
- **`-32602 Invalid params`** means the method exists but your `params` shape was wrong. Check it against the
  [reference](/chain/rpc).
- **A chain id other than `0x9d0c`** means you are not on Citrate.

## Access and canon

Public and read-only. No keys or credentials are needed, and nothing here writes state. Chain id 40204 is
testnet. The example outputs are illustrative; exact values depend on the node's current state.

## Source and verification

Methods verified against `citrate-chain` at `9d5959e`: `eth_chainId` and `eth_getCode` in
`core/api/src/eth_rpc.rs`, `chain_getHeight` in `core/api/src/server.rs`, `citrate_getDagStats` in
`core/api/src/eth_rpc.rs`, and `citrate_getToken` and `citrate_getEconomicState` in
`core/api/src/economics_rpc.rs`. The full surface is on the [JSON-RPC reference](/chain/rpc). Status:
Implemented (testnet 40204), pre external audit.
