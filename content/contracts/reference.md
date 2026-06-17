---
title: Contracts Reference — Addresses, ABIs & Verification
codex_slug: /contracts/reference
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/contracts (DEPLOYED_ADDRESSES.md, README.md, @CitrateNetwork/contracts-abi)
surfaces: [SC-abi]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Contracts Reference — Addresses, ABIs & Verification

> Everything you need to call Citrate's on-chain contracts: where to get the
> ABIs, the deployed-address table on chain **40204**, how to build/test the
> contracts with Foundry, and how to verify deployed bytecode. For dApp and
> integration developers.

> **Rule 9 / transclusion:** the canonical truth for these addresses and the
> build/test commands lives in `citrate-chain/contracts` (`DEPLOYED_ADDRESSES.md`,
> `README.md`) and in the published ABI bundle. This page summarises and links;
> the final Codex wiring pulls it from the source repo at the pinned SHA.

## Overview

Contracts are written in Solidity (`pragma ^0.8.26`), built and tested with
[Foundry](https://book.getfoundry.sh/). The source of truth for what is deployed
is the Forge broadcast under
`contracts/broadcast/<Script>.s.sol/40204/run-latest.json`, aggregated into
`contracts/broadcast/_address_table/30_address_table.json`. **39 contracts** are
deployed on testnet-beta.

## Getting the ABIs

Use the published ABI bundle — do not hand-copy ABIs out of Codex (they drift):

```bash
npm install @CitrateNetwork/contracts-abi
# or
pnpm add @CitrateNetwork/contracts-abi
```

You can also regenerate ABIs straight from source with Foundry — after
`forge build`, each contract's ABI is in
`contracts/out/<Contract>.sol/<Contract>.json` under the `.abi` key:

```bash
cd citrate-chain/contracts
forge build
jq '.abi' out/NematocystSlashing.sol/NematocystSlashing.json
```

## Deployed addresses (chain 40204)

> Public on-chain data — safe to list. Cross-check any entry with `eth_getCode`
> against the canonical RPC. **Testnet-beta; pre-audit.** Source:
> `citrate-chain/contracts/DEPLOYED_ADDRESSES.md`.

### Chain metadata

| Field | Value |
|---|---|
| Chain ID | `40204` |
| Native symbol | `SALT` (testnet outward branding `tCTR`) |
| Consensus | GhostDAG (k=18) |
| Canonical RPC (HTTP) | `https://rpc.citrate.ai` |
| WebSocket | `wss://rpc.citrate.ai` |
| Contract count | 39 |
| Status | live — pilot testnet-beta |

### Contracts

| Contract | Address |
|---|---|
| AIInferenceRouterPortable | `0x933e6f4d28e3ebed462227522d839a77c85b4c06` |
| AILearningCycleCorePortable | `0x3130b9494dc9c9253078176917cf4cddcef48337` |
| AIModelRegistryPortable | `0x3ff095445b382075971fd5d3e05fd8bb3ff8006c` |
| AgentDecisionRegistry | `0xac6bfb1709bcba5a005fe2823b4d8bc55db2b7d9` |
| BudgetAllocation | `0x26bad758eac1bac02457f8e4544269b8b52bc5d7` |
| BulkComputeGateway | `0x3bc867e60d13a825a57a5fbc3a53c4f710ac8f76` |
| CashoutRequest | `0xf3c58459e723d7eabe2a61c6a97776bc2f5e28ed` |
| ClassroomClusterV1 | `0xde991179021a208cf7e6caebf3a07c229aed3d0f` |
| ClassroomRegistry | `0x541923570df41b307ca037fdd0fb508502885455` |
| ComputeMarketplace | `0xc12dbcdb80ef2ae675315f455210f39a736a373c` |
| ComputePool | `0xf1eae5dd4a1639922ea610142f7ce51330065b57` |
| ComputePoolTraining | `0x25051e90a110fbe4569f124274ce387eb033bc9c` |
| ComputePricingOracle | `0x4ee0bef59a87a9ea3f91b80fd68ebfe69e72075a` |
| ComputeVerifier | `0xf7c3180dda79fb046173d96d172bf43b70174031` |
| ContributionAccounting | `0x86d918808b48ad543c9c816b5303b7dbcb0e321f` |
| DisputeResolution | `0xbf62ee8ee209321bbddf5dd15afd77ac327367cd` |
| Forwarder | `0x575d0d85e272eca8784a4d11f4713c698082c807` |
| HeartbeatMonitor | `0xbaa2505d0446043be3540c0b9150c6df42d33180` |
| IPFSIncentives | `0x20a0b74c766e84b20558abd76a7a0fd6434a4c4c` |
| InferenceRouter | `0x6884ef1907468a13265a0bbb67da20ef4b52199b` |
| InstitutionalVault | `0xf0dca50f418acfb8917d71d8bb65393308629381` |
| LearningCycleManager | `0x7efc1eb17beff413e1af7fb3bb541e895c307300` |
| LearningPool | `0x828c6b831c4ce08170bc3efc6f6026dc44b20dfa` |
| LiquidStakingPool | `0x8951ae72e5479cae28ef7bb3caa4207d5719e24b` |
| LoRAFactory | `0xa1eed6ae021504e2a1e310e6c0f7c1a0c5bf4647` |
| MarketMakerAllocation | `0x8b36c15552394ce44173a29d054dc5ca482e65d3` |
| MentorMatcher | `0x516380b0acef9a9541641c85dbe0bf89b3e56977` |
| ModelAccessControl | `0x05825775315f3d074db9f948713d05059e12a8fd` |
| ModelMarketplace | `0x46773aeca885be65cd313b7d9bce9625767d40b5` |
| ModelRegistry | `0x11a5e6f57751d8fa1c5b58ad2bf13528160985f0` |
| NematocystSlashing | `0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6` |
| SpecRegistry | `0x9a58e44f8dd6fd6a75637a32e6e51c16440996f8` |
| StablecoinTreasury | `0x1f17fc3525e540cfd14ed0270a87c159c56aadee` |
| TEEAttestationRegistry | `0x4a86659bdab24dc444c72fbbad4cd83491820e40` |
| TestnetFarmingAccounting | `0xd85e83cab6c5947e2cc5e77244edfce110309724` |
| TreasuryGovernor | `0x6b3c47d2807ec9bc7d2aee030845b4225dd693ab` |
| WrappedSALT | `0xad7c3135c1b9b3189208fd617b6b058c1c0469f3` |
| X402Facilitator | `0x7e7a3db3be6fe4bea06acdbb772786432e1293e3` |
| X402Paywall | `0xd29d4d059808adc43b761f41c675f1eb546e1a19` |

> **Note:** `KYCRegistry` is deployed but its address is not enumerated in the
> public address table snapshot; its internals are gated (see
> [Security](/contracts/security)). The ERC-4337 embedded-wallet stack
> (Factory, Paymaster, validators) is documented separately and was *pending
> broadcast* at this SHA.

## Build & test (Foundry)

Source: `citrate-chain/contracts/README.md`.

```bash
cd citrate-chain/contracts
forge build                 # compile all contracts
forge test -vv              # run all tests (verbose)
forge test --gas-report     # run with gas reporting
forge fmt                   # format Solidity
```

## Verifying a deployed contract

There is no block-explorer "verify" required to *trust* an address — verify the
bytecode yourself against the canonical RPC:

```bash
# 1. Confirm code exists at the address (non-empty result = deployed)
cast code 0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6 \
  --rpc-url https://rpc.citrate.ai

# 2. Or via raw JSON-RPC eth_getCode
curl -s https://rpc.citrate.ai \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0xf3f9f72ea2bb3f763b07390b7257da643b8ee9b6","latest"],"id":1}'

# 3. Confirm you're on chain 40204
cast chain-id --rpc-url https://rpc.citrate.ai
```

Compare the returned runtime bytecode against your local
`forge build` output (`out/<Contract>.sol/<Contract>.json` → `.deployedBytecode`)
to confirm the deployed contract matches the source at this SHA.

## Security & access

- **Tier: public.** Addresses are public on-chain data; ABIs and build commands
  are open developer reference.
- **No secrets here.** No private keys, mnemonics, or credentials. The deployer
  EOA and pre-funded genesis accounts are public on-chain addresses, not secrets;
  their *keys* are never in any tier.

## Source & verification

- Source: `citrate-chain/contracts/DEPLOYED_ADDRESSES.md`,
  `citrate-chain/contracts/README.md`, and the `@CitrateNetwork/contracts-abi`
  bundle.
- Audited against `citrate-chain` SHA **`03d7851`**.
- Status: **pre-audit, testnet-beta.** Addresses are the 2026-06-08 post-reroll
  snapshot; re-verify via `eth_getCode` if the chain has been re-rolled.
