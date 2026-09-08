---
title: Troubleshooting Citrate Core
codex_slug: /core/troubleshooting
tier: public
org_scope: ~
source_kind: authored
source: citrate-core/src-tauri/src/node.rs, README.md, docs/RELEASE_LINUX.md
surfaces: [CORE-node, CORE-settings]
audited_against_sha: 2d88191
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 7
---

Common issues and what to do about them. If something here does not cover your case, the `Node` surface log
tail and the app's settings are the first places to look.

## The node will not come online, or shows zero peers

Give it a minute or two after a start or an update: the log tail should begin to advance and the peer count
should rise above zero. If it stays at zero peers, the node is not reaching the network. Check that your
machine has outbound network access on port `30303` and that any firewall is not blocking it. Citrate Core
ships a node configuration whose peer list already includes the sequencer, so a fresh install should find
the network on its own; if you have edited the node configuration by hand, restore the shipped one.

## The node syncs but the height looks wrong, or you suspect a fork

Do not run a node binary you copied from somewhere else. A mismatched binary can sync cleanly while
computing a different view of the ledger, which forks you off the network without any obvious error. Take
the binary that ships with the app and let the app update it. Reinstalling the current release restores the
matched binary.

## The node uses a lot of memory while catching up

Syncing is memory-heavy while the node is catching up to the current height. Budget several gigabytes of
headroom during the initial sync; usage settles once the node is caught up. If your machine is tight on
memory, keep other heavy applications closed during the first sync.

## The window opens blank on Linux

On some Linux graphics stacks the window renders blank because the interface cannot get a GPU surface. Start
the app with `WEBKIT_DISABLE_DMABUF_RENDERER=1` set in the environment. This is a known interaction with
certain drivers and does not indicate a problem with your account or the node.

## An update prompt fails or an update banner appears repeatedly

If an update check cannot reach a published release it may surface a one-off message. It is harmless: your
account and node are unaffected. Take the update when the app offers a working one; if a prompt is stuck,
restart the app.

## A signing prompt will not let me approve

If the account is locked, signing requests fail closed by design. Unlock the account and try the action
again. If the prompt shows raw, undecoded data, the app is telling you it could not decode the action; only
acknowledge raw mode if you are certain of what you are approving. See [keys and safety](/core/safety).

## On-device AI does not respond

The local inference model is offered as a download during setup. If you skipped it, the on-device agent and
some model features will not have a model to run. Download the model from the `Models` surface, then retry.

## Where to get more detail

- The `Node` surface log tail and crash records for anything node-related.
- [Run a node](/core/run-a-node) for what a healthy node looks like.
- [Keys and safety](/core/safety) for anything about signing, the account, or updates.
