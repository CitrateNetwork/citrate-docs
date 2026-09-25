---
title: Chain parameters and genesis
codex_slug: /chain/genesis
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/node/config/, citrate-chain/node/src/genesis.rs
surfaces: [CHAIN-genesis]
audited_against_sha: e68af83
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

These are the chain identity and genesis parameters you need to point an account or a node at the Citrate
Network and to reason about how the network agrees on its first block. It is for builders connecting to the
network and operators bringing up a node.

## What it is

The Citrate Network ships several configurations that share one chain id and one set of consensus constants
but differ in block cadence and committee sizing. The active public network is the testnet, on chain id
40204. A mainnet configuration exists in the tree on chain id 1, but it is pre-launch and not yet live; its
bootstrap-node list is still a placeholder to be filled before launch. Use 40204 today.

The chain id is permanent. It is the number an account and a node check to confirm they are talking to
Citrate and not some other network, and we do not plan to change it. Over JSON-RPC, `eth_chainId` returns
`0x9d0c` on testnet, which is 40204 in hex.

Genesis is deterministic. The same configuration produces the same state root and the same first-block hash
on every node, which is what lets independently started nodes agree on block 0 without coordinating. That
property is built from a single shared path (`core/economics/src/genesis.rs`, called by
`node/src/genesis.rs`) rather than reconstructed separately in each binary.

## How to use it

1. **Connect an account.** Point it at the testnet using chain id 40204 and the currency SALT at 18
   decimals. Fetch the current public endpoint from the testnet docs rather than copying an address out of a
   config file, since operational endpoints change.
2. **Confirm you reached Citrate.** Ask the node for its chain id; a correct testnet node answers `0x9d0c`.

   ```bash
   curl -s http://127.0.0.1:8545 -H 'content-type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
   # {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}   # 0x9d0c is 40204
   ```

3. **Bring up a node on a network.** Select the matching configuration. The testnet config carries chain id
   40204, one-second blocks, and strict VRF.

   ```bash
   citrate-node --config node/config/testnet.toml
   ```

## Reference

Chain id by configuration, verified in `node/config/*.toml`:

| Network | Chain id | Status |
|---|---|---|
| Testnet (`node/config/testnet.toml`) | 40204 | active public network |
| Team testnet (`node/config/team-testnet.toml`) | 40204 | internal |
| Devnet (`node/config/devnet.toml`) | 40204 | local development |
| Mainnet (`node/config/mainnet.toml`) | 1 | pre-launch, not yet live |

Block cadence by configuration, verified in the same files. Consensus constants such as GhostDAG `k = 18`
are shared across networks; see [Citrate Network consensus](/chain/consensus).

| Network | `block_time` |
|---|---|
| Testnet | 1 s configured (about 2 s measured) |
| Team testnet | 2 s |
| Devnet | 2 s |
| Mainnet (pre-launch) | 5 s |

Genesis block, built deterministically from the shared genesis path
(`core/economics/src/genesis.rs`):

| Field | Value | Source |
|---|---|---|
| Canonical timestamp | 2026-01-01T00:00:00Z | `node/src/genesis.rs` (`CANONICAL_GENESIS_TIMESTAMP`) |
| Base fee per gas | 1 Gwei (1e9 wei) | `core/economics/src/genesis.rs` (`base_fee_per_gas`) |
| Gas limit | 30,000,000 | `core/economics/src/genesis.rs` (`gas_limit`) |

The genesis allocation categories sum to the one trillion SALT supply cap; the allocation structure is
covered under [network economics](/chain/economics). No private keys or mnemonics appear in any
configuration in the repository, and we do not enumerate specific genesis account addresses in public docs.

## Design rationale

A permanent chain id and a single shared genesis path exist for the same reason: agreement should not depend
on operators coordinating by hand. If every node derives block 0 from the same code and the same config, two
nodes started a continent apart still land on the same first-block hash, and a misconfigured node fails
visibly rather than quietly forking. The cost is that genesis is rigid; changing it is a deliberate,
network-wide event, not a per-node setting. For a network meant to outlast any single operator, that
rigidity is the point.

## Failure modes

The deterministic-genesis property is the load-bearing invariant: a node that computes a different state
root from a different config will not agree on block 0, which surfaces the misconfiguration immediately
rather than letting it linger as a silent fork. The mainnet configuration is pre-launch; its bootstrap list
is an empty placeholder, so a node pointed at mainnet today has nothing to connect to. Stay on 40204 until
mainnet is announced on the [roadmap](/start/roadmap).

## Access and canon

Public. Chain id, block cadence, consensus constants, and genesis block parameters are exactly what a
builder or operator needs to connect and reason about the network. No genesis private keys or mnemonics
exist in the repository; the code carries only public addresses, and we do not enumerate genesis account
addresses or paste live bootstrap addresses here, fetch operational endpoints from the testnet docs.

## Source and verification

- Source: `citrate-chain/node/config/*.toml`, `citrate-chain/node/src/genesis.rs`,
  `citrate-chain/core/economics/src/genesis.rs`.
- Chain id 40204 confirmed in `node/config/testnet.toml`; mainnet chain id 1 in `node/config/mainnet.toml`;
  `eth_chainId` returns `0x9d0c` (`core/api/src/eth_rpc.rs`, `cli/src/commands/advanced.rs`).
- Audited against SHA: `9d5959e`.
- Status: Implemented, testnet 40204 is the active public network; mainnet is Specified but pre-launch (the
  config exists, the network is not yet live). The path to mainnet is on the [roadmap](/start/roadmap).
