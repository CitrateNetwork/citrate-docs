---
title: Keys, safety, and safe operation
codex_slug: /core/safety
tier: public
org_scope: ~
source_kind: authored
source: citrate-core/src-tauri/src/ceremony.rs, src-tauri/src/wallet.rs, CLAUDE.md, src-tauri/src/node.rs
surfaces: [CORE-settings, CORE-node]
audited_against_sha: 2d88191
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 5
---

Citrate Core is built so that the sensitive parts, your keys and your signatures, have exactly one path
through the app and never leave it. This page explains where your keys live, how signing works, and how to
keep an install safe at home or in a business.

## Where your keys live

Your account keys are sealed in the operating system keyring and the node's on-disk state is encrypted at
rest with a key held there too. The `Node` surface shows this as `encryption at rest: ON, keyring`. Keys
are never written to the interface, never handed to a background service, and never sent over the network.
No part of the app can read a key or a recovery phrase across the boundary between the Rust backend and the
interface; the code is structured so that is not possible.

## How signing works

Every signature in Citrate Core goes through one approval path, the SignatureCeremony. This is true whether
the request comes from you, from the on-device agent, or from a background service. The rules are strict on
purpose:

- **One human approval per signature.** There is no auto-approve and no approve-the-last-one. Each approval
  is bound to a specific request and yields exactly one signature.
- **You see what you are signing.** The approval shows the decoded intent of the action. If the app cannot
  decode the request, it blocks it until you explicitly acknowledge that you are approving raw data.
- **A locked account fails closed.** If the account is locked, a signing request fails rather than falling
  back to anything less safe.
- **No sidecar ever signs.** No background service, daemon, or remote holds a key or signs on its own.

This is why the on-device agent is described as keyless: it can prepare an action, but it cannot complete
one without your approval.

## Back up your recovery phrase

During setup the app provisions your account and you take responsibility for its recovery phrase. Back it up
before you rely on the account for anything that matters, especially before you place a stake. The phrase is
the only way to restore the account on another machine; Citrate cannot recover it for you. Keep it offline.

## Updates

Citrate Core updates itself through a signed updater. Take updates when the app offers them. The node binary
is delivered with the app and matched to it: do not replace the node binary by hand, because a mismatched
one can sync cleanly while computing a different view of the ledger and quietly fork you off the network.
Letting the app manage the binary is what keeps your node on the canonical chain.

## What to expose

The node's read and write interface is bound to loopback (`127.0.0.1:8545` and `:8546`) so it is reachable
only from your own machine. Treat that as the default and keep it. If you have a genuine reason to reach the
node from another host, put it behind a reverse proxy you control, with its own authentication; do not open
the port to the network directly.

## A safe-operation checklist

- Membership and identity are set up, and your recovery phrase is backed up offline.
- The app is the only thing that manages the node binary and the node configuration.
- The node's ports stay on loopback unless you have deliberately fronted them.
- You approve each signing request after reading its decoded intent, and you never blind-approve raw data
  you do not understand.
- You take app updates promptly.

For running the node itself, see [run a node](/core/run-a-node). For driving the app from an agent under the
same signing rules, see [for agents](/core/for-agents).
