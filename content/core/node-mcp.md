---
title: Use your node from another agent (node MCP server)
codex_slug: /core/node-mcp
tier: public
source_kind: authored
source: citrate-core/src-tauri/src/node_mcp_*.rs, docs/NODE_MCP_SERVER.md
surfaces: [CORE-settings, CORE-agent]
audited_against_sha: 81ef7a0
status: Implemented (pre-audit), off by default, arrives with Citrate Core 0.5.0
created: 2026-10-04T00:00:00Z
branch: hup/n7-docs-almanac-retro
author: Larry Klosowski + Claude Opus 5.5
nav_order: 9
---

Citrate Core can act as an MCP server, so an agent you already use (Claude Code, Cursor, or Hermes
itself) can read your node and ask you to approve an action. This page is for members who want to
connect one. The full technical reference is
[NODE_MCP_SERVER.md](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/NODE_MCP_SERVER.md)
in the core repo.

## What it is

MCP (the Model Context Protocol) is a common way for an agent to discover and call tools. With the
node MCP server on, Citrate Core listens on this computer only and offers a set of read tools (node
status, the chain head, balances, contract reads, the shared knowledge graphs, your clusters) and a
small set of write tools. A write tool never acts by itself: it creates a request, the request shows
up in the app, and anything that signs goes through the signing ceremony you already know.

## How to use it

1. In Citrate Core, open **Settings**, then **API endpoints & keys**, then **Node MCP server**.
2. Turn it on. It listens at `http://127.0.0.1:47204/mcp`, on this computer only.
3. Create a connect token and give it the name of the client it is for. The token is shown once,
   with ready-made commands for that client. Copy it then; Core keeps only a hash of it.
4. Add the server to your client. For Claude Code, paste the command the panel shows. The panel also
   offers a stdio form that runs the app binary as a small relay.
5. Ask your agent something simple, such as "use citrate-node to show the chain head".
6. Revoke a token from the same list at any time. Its next request is refused and its pending
   requests close.

To let Hermes use the same tools, turn on **Your node** in the Agent surface under **Connected tools
(MCP)**. Hermes gets the read tools only.

## Reference

| Kind | Examples | What happens |
|---|---|---|
| Read tools | `node_status`, `chain_head`, `get_balance`, `chain_call`, `get_logs`, `memory_search`, `cluster_status` | Answer at once. Each answer says whether it came from your node or the public 40204 endpoint. |
| Write tools | `tx_propose`, `deploy_propose`, `pin_add`, `invite_create`, `cluster_join` | Create a request you approve in the app. A transaction is signed only through the signing ceremony. |
| Budgeted tool | `faucet_request` | Runs inside a faucet budget you granted in Settings, Budgets. Off by default. |
| Status | `request_status` | A client sees only its own requests: pending, approved, rejected, failed or expired. |

The complete list, the limits and the protocol notes are in
[NODE_MCP_SERVER.md](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/NODE_MCP_SERVER.md).

## Design rationale

A connect token is a password for one client, so it is shown once, stored only as a hash, and
revocable. The server binds to loopback so nothing on your network can reach it. Before the stdio
relay sends a token at all, it checks that the program on the port really is Citrate Core, so
another program that grabs the port while Core is closed never sees a token. Write tools only queue
requests, because an agent outside the app should have no more power than Hermes has inside it.

## Failure modes

- **The port is taken.** The panel shows the error. The port is a default pending owner sign-off.
- **A token leaks.** Revoke it. Its sessions end and its pending requests close.
- **A deploy is not ready.** `deploy_propose` is refused at once, naming the failing checks, unless
  the deploy gate marked exactly that code READY.
- **Your node is still syncing.** Reads fall back to the public 40204 endpoint and say so.

## Access and canon

The server is off until you turn it on and listens on this computer only. Personal memory is never
offered to a token. Hermes's own token is read-only and lives in memory until the app quits.

## Source and verification

Source: `citrate-core/src-tauri/src/node_mcp_*.rs` and `hermes_mcp.rs`. Audited against core
`81ef7a0`. Status: **Implemented**, pre-audit, off by default. External client runs with Claude Code
and with Hermes are recorded in the core reference. The port, the task lifetime and whether Hermes
may use write tools are defaults pending owner sign-off.
