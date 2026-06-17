---
title: "Tutorial: Read a Verified Contract"
codex_slug: /contracts/tutorials/read-a-contract
tier: public
org_scope: ~
source_kind: authored
source: citrate-docs/content/contracts/tutorials/read-a-contract.md
surfaces: [SC-econ-wrappedSALT, SC-econ-staking, SC-edu-classroomRegistry]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Tutorial: Read a Verified Contract

> Query a live Citrate contract's state **without sending a transaction**, using
> `eth_call` over raw JSON-RPC, then the same call via an SDK. Read-only, gasless,
> safe to run against the public testnet. ~10 minutes.

## What you'll do

1. Confirm a contract exists on-chain with `eth_getCode`.
2. Read a simple value (`symbol()` on **WrappedSALT**) with raw `eth_call`.
3. Read a value that takes an argument (`getSharePrice()` / `balanceOf(address)`
   on **LiquidStakingPool**).
4. Do the same with an SDK (viem) so you don't hand-encode calldata.

Everything here is a **view/pure** call, no key, no gas, no signature. You are
just reading the chain.

## Prerequisites

| Thing | Value |
|---|---|
| Chain ID | `40204` |
| RPC (HTTP) | `https://rpc.citrate.ai` (raw: `http://142.93.58.145:8545`) |
| Tools | `curl` + [`cast`](https://book.getfoundry.sh/cast/) (Foundry), or Node ≥ 18 with `viem` |

Contract addresses used below (from `contracts/DEPLOYED_ADDRESSES.md`, chain
40204 testnet-beta, always re-verify with step 1):

| Contract | Address |
|---|---|
| WrappedSALT (wSALT) | `0xad7c3135c1b9b3189208fd617b6b058c1c0469f3` |
| LiquidStakingPool (stSALT) | `0x8951ae72e5479cae28ef7bb3caa4207d5719e24b` |

> The functions called here are audited against `citrate-chain` at SHA `03d7851`:
> `WrappedSALT.symbol()` / `decimals()`, `LiquidStakingPool.getSharePrice()` /
> `balanceOf(address)`. See [Economics Contracts](/contracts/economics).

---

## Step 1, Confirm the contract is real (`eth_getCode`)

A "verified contract" starts with: there *is* deployed bytecode at the address.
If `eth_getCode` returns `0x` (empty), the address is an EOA or nothing, **stop**, you have the wrong address.

```bash
curl -s https://rpc.citrate.ai \
  -H 'content-type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"eth_getCode",
    "params":["0xad7c3135c1b9b3189208fd617b6b058c1c0469f3","latest"]
  }' | python3 -c 'import sys,json; print("bytecode len:", len(json.load(sys.stdin)["result"]))'
```

Expected: a length well above `2` (i.e. more than just `0x`). Non-empty bytecode
means a contract lives there.

---

## Step 2, Read `symbol()` with raw `eth_call`

`eth_call` runs a function against the latest state and returns the result
without mining a transaction. The `data` field is the 4-byte function selector
(`keccak256("symbol()")[:4]`) plus ABI-encoded args (none here).

```bash
# Selector for symbol(): 0x95d89b41
curl -s https://rpc.citrate.ai \
  -H 'content-type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"eth_call",
    "params":[{
      "to":"0xad7c3135c1b9b3189208fd617b6b058c1c0469f3",
      "data":"0x95d89b41"
    },"latest"]
  }'
```

The `result` is ABI-encoded `string`. Decoding the hex gives `wSALT`.

`cast` does the encode + decode for you (much easier than hand-rolling selectors):

```bash
cast call 0xad7c3135c1b9b3189208fd617b6b058c1c0469f3 \
  "symbol()(string)" \
  --rpc-url https://rpc.citrate.ai
# -> wSALT

cast call 0xad7c3135c1b9b3189208fd617b6b058c1c0469f3 \
  "decimals()(uint8)" \
  --rpc-url https://rpc.citrate.ai
# -> 18
```

---

## Step 3, Read values, including one with an argument

`LiquidStakingPool.getSharePrice()` returns SALT-per-stSALT scaled by 1e18
(returns `1e18` when the pool is empty). `balanceOf(address)` returns the SALT
value of a staker's shares.

```bash
# No-arg view: current share price (uint256, 1e18-scaled)
cast call 0x8951ae72e5479cae28ef7bb3caa4207d5719e24b \
  "getSharePrice()(uint256)" \
  --rpc-url https://rpc.citrate.ai

# View with an address argument: a staker's SALT value
cast call 0x8951ae72e5479cae28ef7bb3caa4207d5719e24b \
  "balanceOf(address)(uint256)" \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://rpc.citrate.ai
# -> 0   (the zero address holds no shares)
```

The address argument is ABI-encoded into the calldata for you. Note this
`balanceOf` returns the **SALT value of shares** (Lido-style), not a raw token
balance, read the contract's NatSpec before assuming a signature's meaning.

---

## Step 4, The same, from an SDK (viem)

Hand-encoding selectors is error-prone. An SDK takes a human-readable ABI
fragment and does the encoding/decoding. This is read-only, no private key, no
`walletClient`.

```bash
mkdir read-contract && cd read-contract
npm init -y >/dev/null
npm install viem
```

```ts
// read.ts, run with: npx tsx read.ts   (or compile + node)
import { createPublicClient, http, formatUnits } from "viem";

const citrate = {
  id: 40204,
  name: "Citrate",
  nativeCurrency: { name: "SALT", symbol: "SALT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.citrate.ai"] } },
} as const;

const client = createPublicClient({ chain: citrate, transport: http() });

const wSALT = "0xad7c3135c1b9b3189208fd617b6b058c1c0469f3" as const;
const pool  = "0x8951ae72e5479cae28ef7bb3caa4207d5719e24b" as const;

// Minimal ABI: only the view functions we call (Rule 9, summarize, don't dump).
const wsaltAbi = [
  { type: "function", name: "symbol",   stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
] as const;

const poolAbi = [
  { type: "function", name: "getSharePrice", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

async function main() {
  const symbol = await client.readContract({ address: wSALT, abi: wsaltAbi, functionName: "symbol" });
  const decimals = await client.readContract({ address: wSALT, abi: wsaltAbi, functionName: "decimals" });
  const sharePrice = await client.readContract({ address: pool, abi: poolAbi, functionName: "getSharePrice" });

  console.log(`token: ${symbol} (${decimals} decimals)`);
  console.log(`stSALT share price: ${formatUnits(sharePrice, 18)} SALT`);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

```bash
npx tsx read.ts
# token: wSALT (18 decimals)
# stSALT share price: 1 SALT      (1.0 on an empty/new pool)
```

`readContract` issues an `eth_call` under the hood, exactly what you did by hand
in steps 2–3, but type-safe and decoded.

---

## What you learned

- **`eth_getCode`** proves a contract is actually deployed at an address.
- **`eth_call`** runs view/pure functions for free, against live state, the
  selector + ABI-encoded args go in `data`.
- **`cast` / viem** encode and decode for you so you work in human-readable
  signatures instead of raw hex.
- The signature alone doesn't tell you the semantics, read the contract's
  NatSpec (e.g. `LiquidStakingPool.balanceOf` returns SALT value, not shares).

## Next steps

- Browse the full read surface: [edu contracts](/contracts/edu),
  [economics contracts](/contracts/economics).
- To **write** (send transactions), you need a wallet and gas, see the chain CLI
  and SDK pages. Writing is out of scope for this read-only tutorial.

## Security & access

Public. Everything here is read-only against the public testnet; no keys,
secrets, or credentials are used or shown. The testnet RPC and contract addresses
are public values. Re-verify addresses with `eth_getCode` (step 1) before
trusting any address copied from documentation.

## Source & verification

- Functions audited against `citrate-chain` at SHA `03d7851`:
  `contracts/src/WrappedSALT.sol` (`symbol`, `decimals`),
  `contracts/src/LiquidStakingPool.sol` (`getSharePrice`, `balanceOf`).
- Addresses: `contracts/DEPLOYED_ADDRESSES.md` (chain 40204, testnet-beta).
