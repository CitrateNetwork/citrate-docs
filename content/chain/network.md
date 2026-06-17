---
title: Citrate Network, P2P, Bootstrap & Gossip
codex_slug: /chain/network
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain/core/network/
surfaces: [CHAIN-net-p2p]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Network, P2P, Bootstrap & Gossip

> How Citrate nodes find each other, talk securely, and propagate blocks and
> transactions. Encrypted transport, peer discovery, gossip and chain sync are
> public. The peer **reputation/scoring** policy is marked commercial, its exact
> thresholds are anti-abuse detail a competitor or attacker would want.

## Overview

`core/network/` is the P2P stack. The transport is **Noise-encrypted**, `Noise_XX_25519_ChaChaPoly_SHA256` over TCP with length-delimited framing, so
every peer connection is authenticated and confidential. On top of transport:

- **Discovery** finds peers starting from configured **bootstrap nodes** and
  tracks connected peers.
- **Gossip** propagates blocks and transactions, de-duplicating with
  `DashMap`-backed seen-message caches.
- **Sync** brings a node up to the network head with a multi-phase
  (headers → blocks → verify → apply) protocol.
- **NAT traversal** and a **relay service** keep peers reachable behind NAT.

Concurrency safety is explicit: a four-level **lock ordering** is documented at
the crate root (`src/lib.rs`), and all shared state uses either lock-free
`DashMap` or `RwLock`/`Mutex` following that hierarchy, this is how the crate
avoids deadlocks.

> **Pre-audit status.** The networking crate is internally tested (128 tests) but
> **not** externally audited. Treat NAT/relay and sync DoS surfaces as
> production-track but pre-certification.

## Reference

### Transport & encryption, `src/noise.rs`, `src/transport.rs`

- `NoiseKeypair`, X25519 static keypair = the node's Noise identity.
- `NoiseSession`, Noise_XX handshake + encrypted transport over TCP.
- `NetworkTransport`, TCP listener/connector with optional Noise encryption,
  handshake, and a peer **allow-list**.

### Discovery & bootstrap, `src/discovery.rs`, `src/bootnode.rs`

- `Discovery`, bootstrap-node-seeded peer discovery; tracks connected peers.
- `DiscoveryConfig`, bootstrap node set and discovery tuning.

> **No bootstrap addresses are listed here.** Bootstrap endpoints are deployment
> configuration, not documentation; publishing live addresses would be an
> operational/secret leak. Operators supply them via `DiscoveryConfig`.

### Gossip & propagation, `src/gossip.rs`, `src/block_propagation.rs`, `src/transaction_gossip.rs`

- `GossipProtocol`, block/transaction gossip with dedup and peer scoring;
  `GossipConfig`.
- `BlockPropagation`, header-first block download with source tracking and
  recent-broadcast dedup.
- `TransactionGossip`, transaction relay with seen-tx cache, peer inventory
  tracking, and a pending AI-transaction queue.

### Sync, `src/sync.rs`

- `SyncManager`, multi-phase sync with header/block queues and progress
  tracking.
- `SyncState`, `Idle`, `DownloadingHeaders`, `DownloadingBlocks`, `Verifying`,
  `Applying`, `Complete`.
- `SyncConfig`, sync tuning.

### NAT & relay, `src/nat.rs`, `src/relay.rs`

- `NatInfo` / `NatType`, NAT classification for traversal.
- `RelayService`, session-based relay for NAT-traversed peers; `RelayError`.

### Peer management, `src/peer.rs`

- `PeerManager`, peer lifecycle: connect, disconnect, score, ban.
- `Peer`, `PeerId`, `PeerInfo`, `PeerManagerConfig`.

### {#reputation} Peer reputation & banning (commercial)

> **Tier: commercial.** Citrate scores peers on behavior and bans misbehaving
> ones; the precise scoring deltas, thresholds and ban-window policy are anti-abuse
> detail. We confirm the *mechanism* publicly; the exact tuned values are gated to
> contracted/seat principals so attackers can't calibrate against them.

What is public about the mechanism (from `src/peer.rs` and `src/gossip.rs`):

- Each `Peer` carries an `i32` `score`; valid blocks/transactions earn small
  positive scores, invalid messages and spam incur penalties.
- A peer whose cumulative score drops below `PeerManagerConfig::score_threshold`
  is banned for `ban_duration`.
- Bans are enforced at **three levels**, by `SocketAddr`, by **IP**, and by
  **peer ID**, because a `SocketAddr`-only ban is trivially evaded by
  reconnecting from a new source port (SECREM-01 NET-4(b),
  `src/peer.rs:154-162`).

The specific numeric deltas and thresholds are documented in the
commercial-tier operator material, not here.

## Examples

The crate's public structs compose as: build a `NetworkTransport` (optionally
with a `NoiseKeypair`), drive `Discovery` from `DiscoveryConfig` bootstrap nodes,
attach `GossipProtocol` for propagation, and run `SyncManager` to reach the head.
See `core/network/README.md` and `core/network/examples/` for runnable wiring.

```rust
use citrate_network::*;

// node identity + encrypted transport
let keypair = NoiseKeypair::generate();
// discovery is seeded from operator-supplied bootstrap nodes via DiscoveryConfig
let discovery = Discovery::new(DiscoveryConfig::default());
// gossip + sync run on top of the transport
let sync = SyncManager::new(SyncConfig::default());
```

To inspect peers on a live node over JSON-RPC, use `net_peers`, `net_peerCount`
and `net_peerInfo` (see the [Read the DAG](/chain/tutorials/read-the-dag)
tutorial and the RPC reference).

## Tutorials

- [Read the DAG](/chain/tutorials/read-the-dag), includes a peer/sync health
  check via `net_peerCount` / `eth_syncing`. **Tier: public.**

## Security & access

- **Tier: public** for transport, discovery, gossip, sync, NAT/relay, this is
  what a node operator needs to join and stay synced.
- **`#reputation` is commercial**, exact scoring/ban thresholds are anti-abuse
  tuning; the mechanism is public, the calibrated values are gated.
- **No secrets here.** No bootstrap endpoints, no node keys, no relay
  credentials. `NoiseKeypair` is generated per node; nothing is hardcoded in
  these docs.

## Source & verification

- **Source repo / path:** `citrate-chain/core/network/`
- **Truth document (Rule 9):** `core/network/README.md`, summarized and linked.
- **Audited against SHA:** `03d7851`.
- **Honest status:** internally tested (128 tests); **pre external audit**.
