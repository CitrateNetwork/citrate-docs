---
title: Contracts reference
codex_slug: /contracts/reference
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/contracts (addresses/40204.json, src/)
surfaces: [SC-abi]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The contracts that run on the Citrate Network, where to find their addresses, where to get their ABIs, and how to confirm an address is real before you call it. This page is for anyone integrating against the on-chain surface.

## What it is

The Citrate Network is EVM-compatible, so the on-chain surface is a set of Solidity contracts you call with ordinary tooling. The address book lists 76 application and account-abstraction contracts for testnet beta, chain id 40204. At the last check 57 of them have code on chain; the other 19, the governance and cooperative set, are not deployed. The [chain addresses page](/chain/addresses) marks each one. They group into families: education, compute, models, network economics, governance, security, x402 payments, and account abstraction. The families are described on their own pages, linked below.

Two facts shape how you should treat this page. First, addresses drift: the chain can be re-rolled, and a contract you read about yesterday may sit at a new address today. The canonical record of what is deployed lives in the source repo, not here. Second, the ABIs are published as a package, so you never have to hand-copy them. This page tells you where both live and how to verify an address yourself.

## How to use it

You need three things to call a Citrate contract: its address, its ABI, and the confidence that the address is what you think it is.

1. Get the addresses. The canonical record of what is deployed is `contracts/addresses/40204.json` in the chain repo, the single table every consumer reads. The same set is published on the [chain addresses page](/chain/addresses) with a deployed or not-deployed status on each row. A `@citratelabs/chain-config` package is built in the chain repo (`packages/chain-config`) but is not published to npm yet, so read the JSON directly. Read from one of these rather than copying addresses into your code by hand; they update when the chain is re-rolled, and prose documentation may lag. (`contracts/DEPLOYED_ADDRESSES.md` is superseded and is no longer the source of truth.)

```bash
# The book is plain JSON; fetch it from the chain repo and read what you need.
curl -fsSL https://raw.githubusercontent.com/CitrateNetwork/citrate-chain/main/contracts/addresses/40204.json -o 40204.json
jq -r '.contracts.WrappedSALT' 40204.json
cast code "$(jq -r '.contracts.WrappedSALT' 40204.json)" --rpc-url https://rpc.citrate.ai   # "0x" means not deployed
```

2. Get the ABIs. Regenerate them from source with Foundry. After `forge build`, each contract's ABI is the `.abi` key of `out/<Contract>.sol/<Contract>.json`.

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

The contract families and where each is documented. Addresses for every contract are in `contracts/addresses/40204.json` and on the [chain addresses page](/chain/addresses), not transcribed here.

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
| Canonical address table | `contracts/addresses/40204.json` (also on [/chain/addresses](/chain/addresses)) |
| Chain config package | `@citratelabs/chain-config`, source in `citrate-chain/packages/chain-config`, not yet published to npm |
| ABIs | regenerate with `forge build`, read the `.abi` key of `out/<Contract>.sol/<Contract>.json` |

Chain facts you will need when configuring a client:

| Field | Value |
|---|---|
| Chain id | `40204` (`eth_chainId` returns `0x9d0c`) |
| Block time | about 2 s measured on the testnet (the configured target is 1 s) |
| Consensus | GhostDAG, k = 18 |
| Public RPC (HTTP) | `https://rpc.citrate.ai` |
| Public RPC (WebSocket) | `wss://rpc.citrate.ai` |

## Access and canon

Public. Contract addresses are public on-chain data, and the ABIs and build commands are open developer reference. No private keys, no credentials, and no operational endpoints appear here. The public RPC hostname is the only network address you need; raw node addresses are not published, and you do not need them.

One pilot caveat carries from the source repo. The deploys are unsigned at this stage, so verification rests on `eth_getCode` cross-checks rather than cosign certificates. The account-abstraction stack (EntryPoint and the rest) is included in the canonical `contracts/addresses/40204.json` under `aaStack`.

## Source and verification

Source: `contracts/addresses/40204.json` (regenerated by `scripts/ops/emit-address-table.sh`), `contracts/README.md`, and the `packages/chain-config` source. Contracts compile under `pragma solidity ^0.8.26` (the 2026-09-07 re-roll built with solc 0.8.36). Chain id 40204 is confirmed in `node/config/testnet.toml` and `contracts/addresses/40204.json`; the testnet config sets a 1 s block target, and the measured interval is about 2 s. Audited against `citrate-chain` SHA `9d5959e`. Status: Implemented, testnet beta, pre-audit. Re-verify any address with `eth_getCode` if the chain has been re-rolled.

See also [chain RPC](/chain/rpc) and the [chain CLI](/chain/cli).
