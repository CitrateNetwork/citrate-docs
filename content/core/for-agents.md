---
title: For agents and headless operators
codex_slug: /core/for-agents
tier: public
org_scope: ~
source_kind: authored
source: citrate-core/src/surfaces/Agent.tsx, src-tauri/src/ceremony.rs, src-tauri/src/lib.rs
surfaces: [CORE-agent]
audited_against_sha: 2d88191
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 6
---

Citrate Core is designed to be operated by an agent as well as a person. This page is for anyone pointing an
agent at their node and account, whether that is the on-device agent in the `Agent` surface or an external
one you connect.

![The Agent surface: a keyless workbench whose actions route to you for approval.](/core/app-agent.png)

## The one rule that makes this safe

An agent can do a great deal in Citrate Core, but it cannot sign. Every action that would produce a
signature, sending value, staking, registering the node, any on-chain write, is routed to the
SignatureCeremony and waits for a human approval. The agent holds no key and cannot approve on your behalf.
This is what lets you give an agent broad reach without handing it your account.

Because of this, the useful division of labor is: let the agent read, plan, monitor, and prepare; keep the
approval with a person. An agent can watch the node, summarize activity, draft an action, and queue it for
you; you approve the moment that matters.

## What an agent can drive

Through the app's command surface, an agent can:

- Start, stop, and monitor the node, and read its status, peers, and logs.
- Read the account: balances, staking position, and activity.
- Read and write the memory graph and files.
- Prepare an on-chain action and submit it to the ceremony for approval.
- Use on-device inference and the model surface.

Anything that signs stops at the approval step. A locked account fails those requests closed rather than
degrading to something less safe.

## Connecting an external agent

The app exposes its capabilities to agents over a local command surface rather than by handing out keys.
The same ceremony gate applies to an external agent as to the built-in one: it can request an action, and a
person approves it. Keep the node's ports on loopback while doing this; the agent talks to the app, not to
an exposed node.

## A note on running unattended

If you want the node to run while you are away, that is fine: the supervisor keeps the process healthy on
its own and an agent can monitor it. What you should not do is arrange for signatures to happen without a
person. The design deliberately has no unattended-signing path, and working around it would defeat the
protection the ceremony exists to give you. Queue actions for approval instead, and approve them when you
are back.

For the signing model in full, see [keys and safety](/core/safety). For the node lifecycle, see
[run a node](/core/run-a-node).
