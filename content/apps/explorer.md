---
title: CitrateScan Explorer
codex_slug: /apps/explorer
tier: public
org_scope: ~
source_kind: authored
source: citrate-explorer/README.md, src/scan/screens, src/app/api
surfaces: [APP-explorer]
audited_against_sha: 6faab8a
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

CitrateScan is the public explorer for the Citrate Network. It reads the BlockDAG, transactions,
accounts, contracts, and the model contracts that run on chain, and it is built so you can read it with
your eyes, ask it in plain English, or drive it from an agent.

## What it is

CitrateScan is a DAG-native, agentic block explorer for [Citrate Network](/chain/rpc), live on chain id
40204. Most explorers assume a single line of blocks and count confirmations. Citrate is a BlockDAG under
GhostDAG, so a block carries a blue score rather than a plain height, has one selected parent and up to ten
merge parents, and reaches finality by depth: a block is final once the current blue score minus the
block's blue score is at least 100. CitrateScan reads the DAG in those terms, with no confirmation counter
to wait on. The consensus model behind this is covered under [Citrate Network consensus](/chain/consensus).

It is agentic in two senses. Every entity page leads with a plain-English summary of what you are looking
at, and a built-in "Ask CitrateScan" capability answers questions using read-only on-chain tool calls,
linking the reads behind each answer. The same tools are exposed to outside agents over a Model Context
Protocol server, so a tool like Claude, ChatGPT, or Cursor can treat CitrateScan as its read surface for
the network.

The product is a client single-page app served from one route, with a hash router and a command palette,
backed by a read API. An always-on indexer worker streams new heads into a Postgres database; the app reads
that index and falls through to live RPC when the index is not provisioned, so it degrades honestly rather
than failing. (Source: `citrate-explorer/README.md`; `src/app/page.tsx`, which loads `@/scan/app`.)

## How to use it

1. Open CitrateScan and type into the search bar: an account address, a transaction hash, a block id, a
   contract, or a plain-English question. Press Enter, or press `⌘K` for the command palette, which
   classifies your input and either routes to the right screen or asks the agent.
2. On an entity page, read the plain-English summary first, then drill into the detail below it.
3. To ask a follow-up, open Ask CitrateScan and type your question. The answer cites the on-chain reads it
   rests on.
4. To verify a contract, open the contract's page and submit its source for recompile-and-diff.
5. To use it from a script or an agent, get an API key from the developer hub, then call `/api/v1` for
   tooling that already speaks the Etherscan request shape, or point your agent at `/api/mcp`.

For a guided run, see [explore a transaction](/apps/tutorials/explore-a-transaction).

## Reference

### Screens

The app is a single page whose hash router swaps between these screens. Code lives in
`citrate-explorer/src/scan/screens/`.

| Screen | What you see | Source |
|---|---|---|
| Home and search | Search bar that accepts an address, transaction hash, block, contract, or a question; live chain status; recent activity. `⌘K` opens a command palette. | `screens/home.tsx`, `src/scan/app.tsx` |
| Transaction | One transaction with a plain-English explanation, status, value in dual units (SALT and raw grains), and decoded detail. | `screens/tx.tsx` |
| Block | A DAG block: blue score, selected parent and merge parents, finality by depth, included transactions. | `screens/entity.tsx` |
| Address | Balance, transaction history, and activity for an account. | `screens/entity.tsx` |
| Token | Credit overview and transfers. | `screens/entity.tsx` |
| Contract | Contract code, ABI, and a read surface; an address is treated as a contract only after `eth_getCode` confirms it carries code. | `screens/contract.tsx` |
| Verify | Submit source for multi-version `solc` recompile-and-diff verification, run in a sandboxed microVM. | `screens/verify.tsx` |
| Live DAG | A real-time view of the DAG: multiple tips, selected and merge parents, blue ordering. | `screens/dag.tsx` |
| Ask CitrateScan | An agent drawer that answers questions with read-only chain tool calls and links its evidence. | `screens/agent.tsx` |
| Settings and developer hub | Theme and verbosity settings, plus API keys and an endpoint reference. | `screens/settings.tsx` |

### Read API, Etherscan request shape

`GET /api/v1?module=&action=&...&apikey=` returns the `{ status, message, result }` envelope that existing
Etherscan-shaped tooling expects, so those scripts work against CitrateScan with the base URL changed. The
`proxy` module is a JSON-RPC passthrough restricted to an allowlist of read methods; `account`,
`transaction`, `block`, `logs`, `stats`, and `gastracker` modules wrap indexed or RPC reads. Requests are
API-key-gated and rate-limited. Index-dependent actions return an honest "no data" or "pending" message when
the indexer and database are not provisioned, rather than inventing a result.
(Source: `citrate-explorer/src/app/api/v1/route.ts`; `EXPLORER_SPEC.md` section 3.)

Dedicated read endpoints sit under `/api/`:

| Endpoint | Returns | Source |
|---|---|---|
| `/api/tx/[hash]` | A transaction and receipt, enriched with the block timestamp, blue score, and a `finalized` flag, in one fetch. | `src/app/api/tx/[hash]/route.ts` |
| `/api/blocks`, `/api/blocks/[id]` | Recent blocks and a single block. | `src/app/api/blocks/` |
| `/api/address/[addr]` | Account balance and activity. | `src/app/api/address/[addr]/route.ts` |
| `/api/contract/[addr]` | Contract code, ABI, and read surface. | `src/app/api/contract/[addr]/route.ts` |
| `/api/dag`, `/api/dag/stream` | DAG stats, and a live stream of new heads. | `src/app/api/dag/` |
| `/api/search` | Classifies a query and resolves it to an entity. | `src/app/api/search/route.ts` |
| `/api/latest`, `/api/health` | Latest activity and a health check. | `src/app/api/latest/`, `src/app/api/health/` |
| `/api/verify`, `/api/verify/[guid]` | Submit and poll a contract verification. | `src/app/api/verify/` |

### MCP server

`/api/mcp` is a read-only Model Context Protocol server. It speaks JSON-RPC 2.0 over HTTP POST
(`initialize`, `tools/list`, `tools/call`, `ping`, and `notifications/initialized`); a `GET` returns a
discovery manifest. The tools are generated from the same `citrateTools()` the in-app agent uses, so the
two surfaces cannot drift, and they include `getBlock`, `getTransaction`, `getAddress`,
`searchTransactions`, `getContractCode`, `getToken`, `findTransfers`, and `ledger`. Server info advertises
`readOnly: true` and dual-unit amounts (SALT and raw grains). Calls are rate-limited per IP, or per API key
when one is presented, and audited under the caller's key identity.
(Source: `citrate-explorer/src/app/api/mcp/route.ts`, `src/lib/ai/tools.ts`.)

## Design rationale

A linear-chain explorer would read Citrate wrongly: it would show a height where the network orders by blue
score, and it would offer a confirmation countdown that does not exist here. CitrateScan reads the DAG in
the network's own terms so that what you see matches what the network actually decided. The agent and the
MCP server share one tool set rather than two, which is the reason the in-app answers and the external
answers stay consistent: there is no second list to fall out of date. The indexer is kept off the request
path and falls through to live RPC, so the app still answers when the database is absent, at the cost of
some history that only the index can serve.

## Failure modes

- The read API and the MCP server expose read-only surfaces. The MCP server advertises `readOnly: true`,
  and the `proxy` module is held to an allowlist of read methods, so a write method routed through it is
  refused rather than passed along.
- Write and relay paths, including the gasless relayer, are out of scope for the read surfaces documented
  here.
- `getblockcountdown` on the Etherscan-shaped surface returns an error on purpose, because finality on
  Citrate is depth-based. Read the DAG stats and the depth rule instead of waiting for a countdown.
- Index-dependent reads return an explicit "pending" or "no data" message when the indexer is not
  provisioned. They do not fabricate a result, so a degraded deployment is visible rather than silent.

## Access and canon

Public. CitrateScan is foundation infrastructure: open, self-hostable, and read-only across the surfaces
documented here. A developer needs it to build, and it exposes no write path, so it stays public. No
secrets appear on this page. Endpoints are public routes, and API keys are issued to you inside the app and
must never be pasted into shared docs.

## Source and verification

- Source repo: `citrate-explorer` (brand: CitrateScan), Apache-2.0, Citrate Foundation.
- Audited against: `6faab8a`.
- Key paths: `src/app/page.tsx`, `src/scan/screens/`, `src/app/api/v1/route.ts`,
  `src/app/api/mcp/route.ts`, `src/app/api/tx/[hash]/route.ts`, `src/lib/ai/tools.ts`. Reference specs:
  `README.md`, `EXPLORER_SPEC.md`.
- Status: Implemented (pre-audit). Per the repo, bootstrap is complete and the indexer and agent
  foundation are in progress; treat indexed and agent features as pre-GA, since they read through to live
  RPC and skip persistence until a database is provisioned. This page describes code at the pinned SHA and
  links to it rather than copying it.

See also [Citrate-native operations](/apps/native) for the chain operations the explorer reads.
