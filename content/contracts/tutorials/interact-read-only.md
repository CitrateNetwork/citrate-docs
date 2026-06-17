---
title: "Tutorial: Read a Contract with eth_call"
codex_slug: /contracts/tutorials/interact-read-only
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src/NematocystSlashing.sol
surfaces: [SC-abi, SC-sec-slashing]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Tutorial: Read a Contract with `eth_call`

> Runnable, no wallet, no gas. Query a live, deployed Citrate contract on chain
> **40204** using nothing but a read-only RPC call. ~5 minutes.

## What you'll do

Call view functions on the deployed **NematocystSlashing** contract
(`0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6`) three ways, Foundry `cast`, raw
JSON-RPC, and viem, to read its on-chain state. All of these are `eth_call`s:
they execute against current state without sending a transaction, so they cost
nothing and need no private key.

### Prerequisites

- Network reachability to `https://rpc.citrate.ai` (no account needed).
- One of: [Foundry](https://book.getfoundry.sh/) (`cast`), `curl`, or Node.js +
  [viem](https://viem.sh/).

---

## Step 1, Confirm the chain and that the contract exists

```bash
# Should print 40204
cast chain-id --rpc-url https://rpc.citrate.ai

# Non-empty bytecode confirms the contract is deployed
cast code 0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6 \
  --rpc-url https://rpc.citrate.ai | head -c 20
```

If `cast` isn't installed, the same check via raw JSON-RPC:

```bash
curl -s https://rpc.citrate.ai \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'
# → {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}   (0x9d0c == 40204)
```

## Step 2, Read state with `cast call`

These functions are all `public`/`view` on `NematocystSlashing.sol`, verified
against the source at SHA `03d7851`:

```bash
RPC=https://rpc.citrate.ai
ADDR=0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6

# Total registered (non-banned) providers, public state var
cast call $ADDR "totalProviders()(uint256)" --rpc-url $RPC

# Current correlation multiplier (scaled by 1e18; 1e18 == 1x, capped at 3e18)
cast call $ADDR "getCorrelationMultiplier()(uint256)" --rpc-url $RPC

# Slash events in the current 50-block correlation window
cast call $ADDR "slashesInWindow()(uint256)" --rpc-url $RPC

# Per-address views, substitute any address you want to inspect
cast call $ADDR "stakes(address)(uint256)"  0x0000000000000000000000000000000000000000 --rpc-url $RPC
cast call $ADDR "banned(address)(bool)"     0x0000000000000000000000000000000000000000 --rpc-url $RPC
cast call $ADDR "isSlashable(address)(bool)" 0x0000000000000000000000000000000000000000 --rpc-url $RPC

# Read the fixed tier penalties (basis points)
cast call $ADDR "LATENCY_PENALTY_BPS()(uint256)"      --rpc-url $RPC   # 500   (5%)
cast call $ADDR "INCONSISTENCY_PENALTY_BPS()(uint256)" --rpc-url $RPC   # 2000  (20%)
cast call $ADDR "BYZANTINE_PENALTY_BPS()(uint256)"    --rpc-url $RPC   # 10000 (100%)
```

## Step 3, The same call as raw `eth_call`

`getCorrelationMultiplier()` has selector `0x` + `keccak256("getCorrelationMultiplier()")[:4]`.
You can compute it with `cast sig "getCorrelationMultiplier()"`, then:

```bash
SEL=$(cast sig "getCorrelationMultiplier()")
curl -s https://rpc.citrate.ai \
  -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_call\",\"params\":[{\"to\":\"0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6\",\"data\":\"$SEL\"},\"latest\"],\"id\":1}"
# result is a 32-byte hex word; decode with: cast --to-dec <result>
```

## Step 4, From JavaScript with viem

```bash
npm install viem @CitrateNetwork/contracts-abi
```

```ts
import { createPublicClient, http, defineChain } from "viem";
import NematocystSlashing from "@CitrateNetwork/contracts-abi/NematocystSlashing.json";

const citrate = defineChain({
  id: 40204,
  name: "Citrate Testnet Beta",
  nativeCurrency: { name: "SALT", symbol: "SALT", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.citrate.ai"] } },
});

const client = createPublicClient({ chain: citrate, transport: http() });
const address = "0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6" as const;

const providers = await client.readContract({
  address, abi: NematocystSlashing.abi, functionName: "totalProviders",
});
const multiplier = await client.readContract({
  address, abi: NematocystSlashing.abi, functionName: "getCorrelationMultiplier",
});

console.log({ providers, multiplier }); // multiplier is 1e18-scaled
```

## What you learned

- An `eth_call` reads contract state with no transaction, no gas, no key.
- Citrate is just an EVM chain (`40204`); standard tooling (`cast`, viem, raw
  JSON-RPC) works unchanged.
- The slashing parameters and live provider state are fully public and readable, see [Security & Slashing](/contracts/security) for what they mean.

## Security & access

- **Tier: public.** Read-only `eth_call`s against public on-chain data.
- **No secrets here.** No private keys are used or required; everything is a read.

## Source & verification

- Functions verified against `citrate-chain/contracts/src/NematocystSlashing.sol`.
- Audited against `citrate-chain` SHA **`03d7851`**.
- Status: **pre-audit, testnet-beta.** Re-verify the address via `eth_getCode` if
  the chain has been re-rolled.
