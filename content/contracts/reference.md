---
title: Contracts reference
codex_slug: /contracts/reference
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain-laneB/contracts (DEPLOYED_ADDRESSES.md, src/, broadcast/)
surfaces: [SC-abi]
audited_against_sha: 54d1f2c
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The contracts that run on the Citrate Network, where to find their addresses, where to get their ABIs, and how to confirm an address is real before you call it. This page is for anyone integrating against the on-chain surface.

## What it is

The Citrate Network is EVM-compatible, so the on-chain surface is a set of Solidity contracts you call with ordinary tooling. About 39 contracts are deployed on testnet beta, chain id 40204, across six deploy scripts. They group into families: education, compute, models, network economics, governance, security, x402 payments, and account abstraction. The families are described on their own pages, linked below.

Two facts shape how you should treat this page. First, addresses drift: the chain can be re-rolled, and a contract you read about yesterday may sit at a new address today. The canonical record of what is deployed lives in the source repo, not here. Second, the ABIs are published as a package, so you never have to hand-copy them. This page tells you where both live and how to verify an address yourself.

## How to use it

You need three things to call a Citrate contract: its address, its ABI, and the confidence that the address is what you think it is.

1. Get the addresses. The deployed set is recorded in `contracts/DEPLOYED_ADDRESSES.md` in the chain repo, and the source of truth behind that file is the Forge broadcast JSON under `contracts/broadcast/<Script>.s.sol/40204/run-latest.json`, aggregated into `contracts/broadcast/_address_table/30_address_table.json`. Read the addresses from there rather than copying them into your code by hand. The broadcast files update when the chain is re-rolled; the documentation may lag.

2. Get the ABIs. They ship in the `@CitrateNetwork/contracts-abi` package. Install it rather than copying ABI fragments, which drift out of sync with the source.

```bash
npm install @CitrateNetwork/contracts-abi
# or
pnpm add @CitrateNetwork/contracts-abi
```

You can also regenerate an ABI from source with Foundry. After `forge build`, each contract's ABI is the `.abi` key of `out/<Contract>.sol/<Contract>.json`.

```bash
cd contracts
forge build
jq '.abi' out/NematocystSlashing.sol/NematocystSlashing.json
```

3. Verify the address before you trust it. Ask the network for the code at the address with `eth_getCode`. A non-empty result means a contract is deployed there; `0x` means the address is empty or an account, and you should stop.

```bash
curl -s https://rpc.citrate.ai \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getCode","params":["<address>","latest"]}'
```

To go further, compare the runtime bytecode the network returns against your local `forge build` output, the `.deployedBytecode` key of `out/<Contract>.sol/<Contract>.json`, to confirm the deployed contract matches the source at this SHA. The [read a contract](/contracts/tutorials/read-a-contract) tutorial walks through this step by step.

## Reference

The contract families and where each is documented. Addresses for every contract are in `DEPLOYED_ADDRESSES.md` and the broadcast files, not transcribed here.

| Family | What it covers | Page |
|---|---|---|
| Education | classrooms, mentorship, learning pools | [/contracts/edu](/contracts/edu) |
| Compute | the compute marketplace, pools, pricing, verification | [/contracts/compute](/contracts/compute) |
| Models | model registry, marketplace, access control, LoRA | [/contracts/models](/contracts/models) |
| Network economics | wrapped SALT, liquid staking, treasury, cashout | [/contracts/economics](/contracts/economics) |
| Governance | treasury governor, budget allocation, dispute resolution | [/contracts/governance](/contracts/governance) |
| Security | slashing, heartbeat monitoring, TEE attestation, KYC | [/contracts/security](/contracts/security) |
| x402 payments | the facilitator and paywall for HTTP 402 settlement | [/contracts/x402](/contracts/x402) |
| Account abstraction | the ERC-4337 stack, validators, paymaster, factory | [/contracts/aa](/aa/contracts) |

The address source of truth and the ABI package, named once:

| Resource | Where it lives |
|---|---|
| Deployed addresses | `contracts/DEPLOYED_ADDRESSES.md`, backed by `contracts/broadcast/.../run-latest.json` |
| Aggregated address table | `contracts/broadcast/_address_table/30_address_table.json` |
| ABI package | `@CitrateNetwork/contracts-abi` |

Chain facts you will need when configuring a client:

| Field | Value |
|---|---|
| Chain id | `40204` (`eth_chainId` returns `0x9d0c`) |
| Block time | 2s target |
| Consensus | GhostDAG, k = 18 |
| Public RPC (HTTP) | `https://rpc.citrate.ai` |
| Public RPC (WebSocket) | `wss://rpc.citrate.ai` |

## Access and canon

Public. Contract addresses are public on-chain data, and the ABIs and build commands are open developer reference. No private keys, no credentials, and no operational endpoints appear here. The public RPC hostname is the only network address you need; raw node addresses are not published, and you do not need them.

Two pilot caveats carry from the source repo. The deploys are unsigned at this stage, so verification rests on `eth_getCode` cross-checks rather than cosign certificates. The account-abstraction stack was pending broadcast at this SHA; its addresses populate in the broadcast files once the deploy lands.

## Source and verification

Source: `contracts/DEPLOYED_ADDRESSES.md`, `contracts/README.md`, the broadcast files under `contracts/broadcast/`, and the `@CitrateNetwork/contracts-abi` package. Contracts compile under `pragma solidity ^0.8.26` and are built and tested with Foundry. Chain id 40204 and the 2s block time are read from `DEPLOYED_ADDRESSES.md`. Audited against `citrate-chain-laneB` SHA `54d1f2c`. Status: Implemented, testnet beta, pre-audit. Re-verify any address with `eth_getCode` if the chain has been re-rolled.

See also [chain RPC](/chain/rpc) and the [chain CLI](/chain/cli).
