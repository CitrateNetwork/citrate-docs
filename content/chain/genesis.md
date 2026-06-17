---
title: Citrate Chain Parameters & Genesis
codex_slug: /chain/genesis
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/config/, citrate-chain/node/config/, citrate-chain/node/src/genesis.rs
surfaces: [CHAIN-genesis]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Chain Parameters & Genesis

> The chain identity and genesis parameters you need to connect a wallet, point
> a node, or reason about finality. Network config lives in
> `node/config/*.toml`; genesis construction lives in `node/src/genesis.rs` and
> the shared `core/economics/src/genesis.rs`.

## Overview

Citrate is a BlockDAG (GhostDAG ordering, ECVRF proposer election, committee BFT
checkpoints, see [Consensus](/chain/consensus)). It ships several networks that
share the same chain ID and consensus constants but differ in block cadence and
committee sizing. Genesis is **deterministic**: the same config produces the
same state root and the same genesis block hash on every node
(`initialize_shared_genesis_state()`), which is what lets independently started
nodes agree on block 0.

> **Mainnet is not launched.** The testnet beta (chain ID **40204**) is the
> active public network. A mainnet config exists but is **pre-launch**: its
> bootstrap-node list is an empty placeholder and `production_mode` is fail-closed
> (the node refuses to start without validators configured). Use 40204.

## Reference

### Chain ID

| Network | Chain ID | Status |
|---|---|---|
| **Testnet beta** (`node/config/testnet.toml`) | **40204** | active public network |
| Team testnet (`node/config/team-testnet.toml`) | 40204 | internal |
| Devnet (`node/config/devnet.toml`) | 40204 | local development |
| Mainnet (`node/config/mainnet.toml`) | 1 | **pending launch** |

Chain ID 40204 is also the default in `node/src/genesis.rs` and the
`testnet_beta()` / `team_testnet_genesis()` profiles in
`core/economics/src/genesis.rs`. The README states `Chain ID: 40204 (testnet
beta)`.

### Consensus & finality parameters

Consensus constants are shared across networks; cadence and committee sizing
differ. From `node/config/*.toml`:

| Param | Devnet | Testnet beta | Team testnet | Mainnet (pending) |
|---|---|---|---|---|
| `block_time` | 2 s | 1 s | 2 s | 5 s |
| GhostDAG `k` | 18 | 18 | 18 | 18 |
| `min_gas_price` | 1 Gwei | 1 Gwei | 1 Gwei | 1 Gwei |
| Checkpoint `interval` | 50 blocks | 50 blocks | 50 blocks | TBD |
| Committee `committee_size` | 100 | 100 | 10 | TBD |
| `quorum_threshold` | 67 | 67 | 7 | TBD |
| `strict_vrf` | false | true | true |, |

The committee BFT checkpoint layer finalizes every 50 blocks once a quorum of
the committee votes (2/3 + 1, i.e. 67/100 on testnet, 7/10 on team testnet);
see [Consensus → finality](/chain/consensus#finality). GhostDAG `k = 18` and a
max of 10 parents per block are the global consensus constants. The network
targets ≤ 12 s finality.

### Genesis block

Built deterministically from the shared genesis path
(`core/economics/src/genesis.rs`, called by `node/src/genesis.rs`):

| Field | Value |
|---|---|
| Height | 0 |
| Block version | 1 |
| Canonical genesis timestamp | 2026-01-01T00:00:00Z |
| Base fee per gas | 1 Gwei (1e9 wei) |
| Gas limit | 30,000,000 |
| Selected parent / merge parents | zero hash / none |
| Blue score / pruning point | 0 / zero hash |

`initialize_shared_genesis_state()` is the single source of truth used by both
the standalone node and the GUI-embedded node, enforcing the
`DeterministicGenesis` invariant (same config → same state root → same block
hash), which is also TLA+-checked
(`specs/tla/network/GenesisSafetyAcrossNodes.tla`).

### Genesis allocations

The genesis allocation categories (treasury, faucet, deployer, team/dev,
validator, plus the remaining mining-reward pool) sum to the 1B SALT supply cap.
The Arachnid deterministic CREATE2 deployer (`0x4e59…`) is pre-deployed at
genesis so ERC-4337 tooling works from block 0. For the allocation *structure*
and tokenomics, see [Economics → genesis allocations](/chain/economics). The
specific genesis account addresses are not enumerated in public docs (see
Security & access).

### Bootstrap & connectivity

Each network config lists its `bootstrap_nodes` / listen addresses in its
`node/config/*.toml`, with `config/bootstrap-nodes.json` as a seed list. Testnet
beta exposes JSON-RPC and WebSocket; mainnet's bootstrap list is an empty
placeholder pending launch. For current connection endpoints use the public
testnet docs / faucet rather than copying values from config, addresses change
and some are operational.

## Examples

Add Citrate testnet beta to a wallet:

```text
Network name:  Citrate Testnet Beta
Chain ID:      40204
Currency:      SALT (18 decimals)
RPC / Explorer: see the public testnet docs (endpoints are operational)
```

Point a node at a network by selecting its config:

```bash
# Uses node/config/testnet.toml (chain ID 40204, strict VRF, 1s blocks)
citrate-node --config node/config/testnet.toml
```

## Tutorials

- [Run a node](/operators/run-a-node), pick a network config and join. **Tier:
  public.**

## Security & access

- **Tier: public.** Chain ID, consensus constants, block cadence, finality
  committee sizing, and genesis block parameters are exactly what a developer or
  operator needs to connect and reason about the network.
- **No secrets here.** **No genesis private keys or mnemonics**, none exist in
  the repository; the code carries only public addresses, and key material is
  held out-of-band. We **do not enumerate genesis account addresses** in public
  docs (allocation *structure* is on [Economics](/chain/economics)), and we do
  not paste live bootstrap multiaddrs/IPs here, fetch operational endpoints from
  the public testnet docs/faucet.

## Source & verification

- **Source repo / paths:** `citrate-chain/config/`,
  `citrate-chain/node/config/*.toml`, `citrate-chain/node/src/genesis.rs`,
  `citrate-chain/core/economics/src/genesis.rs`.
- **Truth documents (Rule 9):** the per-network `node/config/*.toml` and the
  shared genesis module, this page summarizes and links.
- **Audited against SHA:** `03d7851`
  (`git -C citrate-chain rev-parse --short HEAD`).
- **Honest status:** testnet beta is the active public network; **mainnet is
  pre-launch** (placeholder bootstrap list, fail-closed `production_mode`).
