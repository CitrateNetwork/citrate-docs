---
title: What Citrate is
codex_slug: /start/what-is-citrate
tier: public
org_scope: ~
source_kind: authored
source: codex
surfaces: [START-what-is-citrate]
audited_against_sha: cd729ed
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# What Citrate is

> Citrate is an **AI-native Layer-1 BlockDAG**. This page is the one-paragraph
> answer plus the four words you'll keep hearing, **GhostDAG**, **LVM**,
> **SALT**, **40204**, and where to go next. For builders, operators, and the
> merely curious.

## Overview

**Citrate is a Layer-1 blockchain built for AI workloads.** Three things make it
different from a typical EVM chain:

1. **It's a BlockDAG, not a single chain.** Blocks may reference *multiple*
   parents, so the ledger is a directed acyclic graph. The **GhostDAG** protocol
   turns that DAG into one deterministic total order, higher throughput without
   giving up a canonical history. See [Consensus](/chain/consensus).
2. **Execution is EVM-compatible (the LVM).** Your Solidity, your Foundry, your
   wallet libraries all work. The **LVM** is an EVM/REVM adapter with parallel
   (MVCC) execution and AI-specific precompiles/opcodes, tensor ops, embeddings,
   inference, ZK verification. See [Execution (LVM)](/chain/lvm).
3. **AI is on-chain, not bolted on.** Embeddings, semantic search, and verifiable
   inference are RPC methods and opcodes, not an off-chain service you trust.

The native token is **SALT** (18 decimals, 1B supply cap). The chain id is
**40204**, permanent. If `eth_chainId` returns `0x9d0c`, you're on Citrate.

## The four words

| Word | What it means | Go deeper |
|---|---|---|
| **GhostDAG** | The consensus protocol. Orders a multi-parent BlockDAG by *blue score*; finality is depth-based. | [Consensus](/chain/consensus) |
| **LVM** | The execution layer. EVM-compatible + parallel + AI precompiles. | [Execution (LVM)](/chain/lvm) |
| **SALT** | The native token. Fees, rewards, staking. 18 dp, 1B cap. | [Economics](/chain/economics) |
| **40204** | The chain id (`0x9d0c`). Canonical and permanent. | [Genesis & config](/chain/genesis) |

## Who runs and stewards it

Citrate is the network of the **Mozi Cooperative**, built across a federation of
~40 repos under [`CitrateNetwork`](https://github.com/CitrateNetwork) using the
**Agentile** methodology (see the [Agentile primer](/start/agentile)). Code,
docs, audits, and sprints are kept coherent across repos so the whole thing
stays auditable.

## Try it in one command

If you can reach a Citrate node (a local node serves `http://127.0.0.1:8545`):

```bash
curl -s http://127.0.0.1:8545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}   # 0x9d0c == 40204
```

## Where to go next

- **New here?** [Mental models primer](/start/primer), blue score vs height,
  finality-by-depth, merge parents, gasless accounts, SALT.
- **Want to build?** [Your first 10 minutes](/start/tutorials/your-first-10-minutes).
- **The DAG itself:** [Consensus](/chain/consensus) and [JSON-RPC reference](/chain/rpc).
- **Smart wallets, no seed phrase:** [Account Abstraction](/aa/passkeys).
- **How the project is run:** [Agentile methodology](/methodology/rules).

## Security & access

Public. This is the front door, concepts a developer needs to decide whether to
build on Citrate. No secrets, keys, or private endpoints. Implementation depth
(consensus proofs, KYC internals, operator playbooks) is tiered on the deeper
pages it links to.

## Source & verification

Authored page (no single source file is the truth). Facts cross-checked against
the federation `README.md`, `AGENTILE.md`, and the authored chain pages
([consensus](/chain/consensus), [economics](/chain/economics)) at federation SHA
`cd729ed`. Chain id, SALT decimals/supply, and GhostDAG params are verified on
those pages against `citrate-chain`.
