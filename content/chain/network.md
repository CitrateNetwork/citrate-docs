---
title: Peer-to-peer networking
codex_slug: /chain/network
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/core/network/
surfaces: [CHAIN-net-p2p]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is how Citrate nodes find each other, talk securely, and spread blocks and transactions across the
network. It is for operators bringing up a node and anyone who needs to understand how a new node reaches
the network head.

## What it is

The networking layer is a peer-to-peer mesh: there is no central server that nodes phone home to, only other
nodes. A node joins by reaching out to a small set of configured bootstrap nodes, learning about more peers
from them, and then maintaining its own set of connections from there. Every connection is encrypted and
authenticated using the Noise protocol over TCP, so a peer both proves who it is and keeps the conversation
private.

Three flows do the real work, and they layer cleanly on top of one another:

- **Discovery and bootstrap.** A fresh node starts from its configured bootstrap nodes
  (`bootnode.rs`), connects to them, and uses peer discovery (`discovery.rs`) to widen its set of known and
  connected peers. Bootstrap nodes are an entry point, not a dependency; once a node has peers, it keeps
  going without them.
- **Gossip propagation.** New blocks and transactions spread by gossip (`gossip.rs`,
  `block_propagation.rs`): each node forwards what it has not seen before to its peers, and a seen-message
  cache stops the same item from circulating endlessly. A block reaches the whole network in a handful of
  hops without any node needing a global view.
- **Reaching peers behind NAT.** Many nodes sit behind home or institutional routers, so the layer includes
  NAT traversal (`nat.rs`) to keep those peers reachable rather than stranded.

The layer also carries message types for the network's AI and learning traffic (`ai_handler.rs`,
`learning_messages.rs`), so model and training-related messages travel the same authenticated mesh as
ordinary blocks and transactions.

## How to use it

You configure the networking layer, you do not call it directly; the node drives it for you.

1. **Supply bootstrap nodes.** Point your node at a known set of bootstrap nodes for the network you are
   joining. The node connects to them first, then discovers the rest of the mesh on its own.
2. **Let the node sync.** Once connected, the node downloads from the network head and applies blocks until
   it is caught up. From then on it stays current through gossip.
3. **Check peer health.** Confirm your node has peers and is keeping up using the node's status over
   JSON-RPC. See [run a node](/operators/run-a-node) for the operator walkthrough and the
   [consensus reference](/chain/consensus) for how the blocks it receives are ordered.

## Reference

The components of `core/network/`, each citing its file:

| Component | File | What it does |
|---|---|---|
| Encrypted transport | `noise.rs` | Noise handshake and encrypted, authenticated transport over TCP |
| Peer discovery | `discovery.rs` | finds peers and tracks connected ones |
| Bootstrap nodes | `bootnode.rs` | the configured entry points a new node starts from |
| Block gossip | `gossip.rs`, `block_propagation.rs` | spreads blocks with seen-message de-duplication |
| Transaction gossip | `transaction_gossip.rs` | relays transactions with a seen-transaction cache |
| Chain sync | `sync.rs` | brings a node up to the network head |
| NAT traversal | `nat.rs` | keeps peers behind routers reachable |
| AI and learning messages | `ai_handler.rs`, `learning_messages.rs` | message types for model and training traffic |

We do not list live bootstrap addresses here. They are deployment configuration, not documentation, and a
node operator supplies them for the network being joined; fetch current values from the testnet operator
docs.

## Design rationale

A gossip mesh seeded by a few bootstrap nodes is the design that keeps the network from depending on any one
machine. There is no coordinator to take down, no single node whose failure stops propagation, and a new
operator needs only a couple of known entry points to join. Encrypting every link with Noise means a peer is
authenticated before it can influence a node's view, which matters on a network where participation is
identity-checked rather than anonymous. The trade is that propagation is probabilistic rather than directed;
gossip accepts a little redundant traffic in exchange for not needing a global map of the network.

## Failure modes

Bootstrap nodes are an entry point, not a single point of failure: once a node has discovered peers it no
longer needs them, so a bootstrap node going offline does not cut a synced node off. The seen-message caches
in gossip stop a block or transaction from looping forever, which bounds the traffic a single item can
generate. Because every connection is authenticated through the Noise handshake, an unauthenticated peer
cannot inject blocks or transactions into a node's view. NAT and sync surfaces are internally tested but not
yet externally audited; treat them as production-track, pre-certification.

## Access and canon

Public. Transport, discovery, gossip, and sync are what a node operator needs to join the network and stay
current. No bootstrap addresses, node keys, or relay credentials appear here; each node generates its own
Noise identity, and nothing is hardcoded in these docs.

## Source and verification

- Source: `citrate-chain/core/network/` (`noise.rs`, `discovery.rs`, `bootnode.rs`, `gossip.rs`,
  `block_propagation.rs`, `sync.rs`, `nat.rs`, `ai_handler.rs`, `learning_messages.rs`).
- Operator path: [run a node](/operators/run-a-node); block ordering: [consensus](/chain/consensus).
- Audited against SHA: `03d7851`.
- Status: Implemented (testnet), internally tested, pre external audit.
