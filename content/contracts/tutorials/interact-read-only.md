---
title: Interact read-only
codex_slug: /contracts/tutorials/interact-read-only
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain-laneB/contracts/src/NematocystSlashing.sol
surfaces: [SC-abi, SC-sec-slashing]
audited_against_sha: 54d1f2c
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Everything you can learn from a Citrate contract without sending a transaction: calling view functions, decoding what they return, and reading the events a contract has emitted. No account, no gas, no signature. About ten minutes.

## What it is

Two read-only patterns cover most of what you need from a deployed contract. The first is `eth_call`, which runs a view or pure function against current state and returns its value; the [read a contract](/contracts/tutorials/read-a-contract) tutorial covers it in detail. The second is `eth_getLogs`, which returns the events a contract has emitted over a range of blocks, so you can read its history rather than just its present state. Neither writes anything, so neither needs a key.

The examples read the slashing contract in the security family, which records how the network penalizes node operators that misbehave. Its parameters and live state are fully public; what they mean is described under [security contracts](/contracts/security).

## How to use it

You need a reachable Citrate JSON-RPC endpoint. The public one is `https://rpc.citrate.ai`. You will want `curl`, and the `cast` command from [Foundry](https://book.getfoundry.sh/) for the encode-free path. Read the slashing contract's address from `contracts/DEPLOYED_ADDRESSES.md`, the canonical record described on the [contracts reference](/contracts/reference), and confirm it with step 1 before trusting it.

Set up the helper from [your first 10 minutes](/start/tutorials/your-first-10-minutes):

```bash
export RPC=https://rpc.citrate.ai
export ADDR=<NematocystSlashing-address>

rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

### Step 1, confirm the chain and the contract

Check you are on chain 40204, then confirm code lives at the address.

```bash
rpc eth_chainId
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}   # 0x9d0c is 40204
rpc eth_getCode "[\"$ADDR\", \"latest\"]"
# a long hex string means a contract is deployed there
```

### Step 2, read view functions

These are all `public` or `view` on the slashing contract. The fixed penalties are constants, expressed in basis points; the rest are read from live state.

```bash
# Number of registered providers (a public state variable)
cast call $ADDR "totalProviders()(uint256)" --rpc-url $RPC

# Correlation multiplier, scaled by 1e18; 1e18 is 1x
cast call $ADDR "getCorrelationMultiplier()(uint256)" --rpc-url $RPC

# Slash events recorded in the current correlation window
cast call $ADDR "slashesInWindow()(uint256)" --rpc-url $RPC

# Per-address views; substitute any address you want to inspect
cast call $ADDR "stakes(address)(uint256)"   0x0000000000000000000000000000000000000000 --rpc-url $RPC
cast call $ADDR "banned(address)(bool)"       0x0000000000000000000000000000000000000000 --rpc-url $RPC
cast call $ADDR "isSlashable(address)(bool)"  0x0000000000000000000000000000000000000000 --rpc-url $RPC

# Fixed tier penalties, in basis points
cast call $ADDR "LATENCY_PENALTY_BPS()(uint256)"       --rpc-url $RPC   # 500    (5%)
cast call $ADDR "INCONSISTENCY_PENALTY_BPS()(uint256)" --rpc-url $RPC   # 2000   (20%)
cast call $ADDR "BYZANTINE_PENALTY_BPS()(uint256)"     --rpc-url $RPC   # 10000  (100%)
```

### Step 3, decode return data by hand

When you call without `cast`, the result is raw ABI-encoded hex and you decode it yourself. A `uint256` comes back as one 32-byte word.

```bash
SEL=$(cast sig "getCorrelationMultiplier()")   # 0x...
rpc eth_call "[{\"to\":\"$ADDR\",\"data\":\"$SEL\"},\"latest\"]"
# {"jsonrpc":"2.0","id":1,"result":"0x0000...0de0b6b3a7640000"}
# decode the 32-byte word to a number:
cast --to-dec 0x0000000000000000000000000000000000000000000000000de0b6b3a7640000
# 1000000000000000000   (1e18, a 1x multiplier)
```

### Step 4, read events with eth_getLogs

A contract's history is in its events. `eth_getLogs` returns the logs matching a filter: the contract address, a block range, and optional topics. The first topic is the keccak256 hash of the event signature, so you can ask for one kind of event. The slashing contract emits `Staked(address,uint256)`, `Unstaked(address,uint256)`, `Slashed(...)`, and `Banned(address)`.

```bash
# Topic for the Staked event
cast keccak "Staked(address,uint256)"
# 0x...  (use this as topics[0])

# All Staked events from this contract, over a block range
rpc eth_getLogs "[{\"address\":\"$ADDR\",\"fromBlock\":\"0x0\",\"toBlock\":\"latest\",\"topics\":[\"<Staked-topic>\"]}]" 
```

Each log carries `topics` and `data`. Indexed event parameters land in `topics` after the signature hash; non-indexed parameters are ABI-encoded in `data`. For `Staked(address indexed provider, uint256 amount)`, the provider address is `topics[1]` and the amount is in `data`. Keep block ranges narrow on a busy contract, since a wide range returns a large response.

### Step 5, the same from JavaScript

The same reads in viem, using the published ABI so you work in function names rather than selectors. This is read-only: a public client only, no key and no signer.

```ts
import { createPublicClient, http, defineChain } from "viem";
import NematocystSlashing from "@CitrateNetwork/contracts-abi/NematocystSlashing.json";

const citrate = defineChain({
  id: 40204,
  name: "Citrate Network",
  nativeCurrency: { name: "SALT", symbol: "SALT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.citrate.ai"] } },
});

const client = createPublicClient({ chain: citrate, transport: http() });
const address = "<NematocystSlashing-address>" as const;

const providers = await client.readContract({
  address, abi: NematocystSlashing.abi, functionName: "totalProviders",
});
const multiplier = await client.readContract({
  address, abi: NematocystSlashing.abi, functionName: "getCorrelationMultiplier",
});

console.log({ providers, multiplier }); // multiplier is 1e18-scaled
```

`readContract` issues an `eth_call` under the hood, exactly what you did by hand in step 3, but decoded for you.

## Reference

The read surface used above, with sources.

| Kind | Item | Source |
|---|---|---|
| View | `totalProviders()`, `slashesInWindow()`, `getCorrelationMultiplier()` | `contracts/src/NematocystSlashing.sol` |
| View | `stakes(address)`, `banned(address)`, `isSlashable(address)` | `contracts/src/NematocystSlashing.sol` |
| Constant | `LATENCY_PENALTY_BPS`, `INCONSISTENCY_PENALTY_BPS`, `BYZANTINE_PENALTY_BPS` | `contracts/src/NematocystSlashing.sol` |
| Event | `Staked`, `Unstaked`, `Slashed`, `Banned` | `contracts/src/NematocystSlashing.sol` |

For encoding a single call step by step, see [read a contract](/contracts/tutorials/read-a-contract). For addresses and the ABI package, see the [contracts reference](/contracts/reference).

## Failure modes

- A `0x` result from `eth_getCode` means no contract is at the address. Re-read it from `DEPLOYED_ADDRESSES.md`; the chain may have been re-rolled.
- `-32601 Method not found` means the RPC method is misspelled or not served by the node.
- An empty `eth_getLogs` response can mean the block range is wrong, the topic hash is wrong, or no such event has been emitted. Widen the range to test, then narrow it back.
- A very wide `eth_getLogs` range can be refused or return a large payload. Page through narrow ranges instead.
- A decoded value that looks wrong is usually a return-type mismatch. Confirm the type against the source.

## Access and canon

Public and read-only. Every step here is a read against public on-chain data; no keys, no credentials, no gas. The public RPC hostname and the contract addresses are public values. Re-verify any address with step 1 before trusting it.

## Source and verification

Functions and events verified against `citrate-chain-laneB` at SHA `54d1f2c`: `contracts/src/NematocystSlashing.sol`. The ABI ships in `@CitrateNetwork/contracts-abi`. Addresses live in `contracts/DEPLOYED_ADDRESSES.md`, chain 40204, testnet beta. Status: Implemented, testnet beta, pre-audit.

See also [chain RPC](/chain/rpc) and the [chain CLI](/chain/cli).
