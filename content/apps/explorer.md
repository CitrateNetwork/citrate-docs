---
title: CitrateScan Explorer
codex_slug: /apps/explorer
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-explorer/README.md
surfaces: [APP-explorer]
audited_against_sha: cf7fa78
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# CitrateScan Explorer

> The AI-native BlockDAG explorer for the Citrate Network — a better, agentic Etherscan that you can read with your eyes, ask in plain English, or drive from an agent.

## Overview

CitrateScan (`citrate-explorer`) is the public block explorer for Citrate (chain
`40204`, native **SALT**). Unlike a linear-chain explorer, it is built **DAG-native**:
Citrate is a GHOSTDAG BlockDAG, so blocks carry a `blue_score` (not just a height),
have one selected parent plus up to ten merge parents, and reach finality **by depth**
(`current_blue_score − block.blue_score ≥ 100`) rather than by "confirmations."

CitrateScan is also **AI-native**. Every entity page leads with a plain-English
summary, a built-in "Ask CitrateScan" agent answers natural-language questions using
read-only on-chain tool calls, and the same tools are exposed to external agents over
an Etherscan-compatible REST API and an MCP server.

The product is a client single-page app (one route, `/`, with a hash router and
command palette) backed by a read API. An always-on indexer worker streams new heads
into a Postgres database; the app reads that index and falls through to live RPC when
the index is unavailable, so it degrades honestly rather than breaking.
(Source: `citrate-explorer/README.md`; `src/app/page.tsx` → `@/scan/app`.)

## Who it's for

- **Anyone** checking a transaction, address, block, or token on Citrate — no login required.
- **Developers** who want an Etherscan-compatible REST API for scripts and dashboards.
- **Agents** (Claude, ChatGPT, Cursor) that should treat CitrateScan as their on-chain read tool via MCP.

## Key features & screens

The app is a single SPA whose hash router swaps between these screens (code in
`citrate-explorer/src/scan/screens/`):

| Screen | What you see | Code |
|---|---|---|
| **Home / search** | Omni-search bar (address, tx hash, block, token, or a question), live chain status, recent activity. `⌘K` opens a command palette that classifies your input and routes or asks. | `screens/home.tsx`, `src/scan/app.tsx` |
| **Transaction** | A single tx with a plain-English explanation, status, value (dual-unit SALT + raw grains), and decoded detail. | `screens/tx.tsx` |
| **Block** | A DAG block: `blue_score`, selected parent + merge parents, finality-by-depth, included transactions. | `screens/entity.tsx` (`BlockScreen`) |
| **Address** | Balance, transaction history, and activity for an account. | `screens/entity.tsx` (`AddressScreen`) |
| **Token** | Token overview and transfers. | `screens/entity.tsx` (`TokenScreen`) |
| **Contract** | Contract code, ABI, and read surface (an address is treated as a contract only after `eth_getCode` confirms code). | `screens/contract.tsx` |
| **Verify** | Submit source for multi-version `solc` recompile-and-diff verification (runs in a Vercel Sandbox microVM). | `screens/verify.tsx` |
| **Live DAG** | A real-time visualization of the BlockDAG — multiple tips, selected/merge parents, blue ordering. | `screens/dag.tsx` |
| **Ask CitrateScan** | A persistent agent drawer that answers questions with read-only chain tool calls and links its evidence. | `screens/agent.tsx` |
| **Settings / Developer hub** | Theme/verbosity settings, plus a developer hub for API keys and endpoint reference. | `screens/settings.tsx` |

### The read API (Etherscan-compatible)

`GET /api/v1?module=&action=&...&apikey=` returns the familiar
`{ status, message, result }` envelope so existing Etherscan tooling works against
CitrateScan. The `proxy` module is a JSON-RPC passthrough restricted to an allowlist
of read methods; `account` and other modules wrap indexed/RPC reads. Requests are
API-key-gated and rate-limited; index-dependent actions degrade honestly when the
indexer/DB isn't provisioned.
(Source: `citrate-explorer/src/app/api/v1/route.ts`; see `EXPLORER_SPEC.md` §3.)

There are also dedicated read endpoints under `/api/` (e.g. `blocks`, `tx/[hash]`,
`address/[addr]`, `contract/[addr]`, `dag` + `dag/stream`, `search`, `latest`,
`health`, `verify`).

### The MCP endpoint

`/api/mcp` is a read-only **Model Context Protocol** server (JSON-RPC 2.0 over HTTP
POST; `GET` returns a discovery manifest). It exposes the *same* tools the in-app
agent uses — generated from one source so they can't drift — including `getBlock`,
`getAddress`, `searchTransactions`, `getContractCode`, `findTransfers`, and `ledger`.
Server info advertises `readOnly: true` and dual-unit amounts (SALT + raw grains).
Calls are rate-limited per IP (or per API key) and audited under the caller's key
identity. (Source: `citrate-explorer/src/app/api/mcp/route.ts`,
`src/lib/ai/tools.ts`.)

## How to use

1. Open the explorer and type into the omni-search: an address, tx hash, block id,
   token, or a plain-English question. Press Enter (or `⌘K` for the palette).
2. For an entity, read the plain-English summary first, then drill into the detail.
3. To ask a follow-up, open **Ask CitrateScan** and type your question — answers cite
   the on-chain reads behind them.
4. To verify a contract, open the contract's page and use **Verify** to submit source.
5. To use it programmatically, get an API key from the Developer hub and call
   `/api/v1` (Etherscan-compatible) or point your agent at `/api/mcp`.

## Tutorials

- [Explore a transaction](/apps/tutorials/explore-a-transaction) — find a tx, read its
  summary, and confirm finality the DAG-native way.

## Security & access

**Tier: public.** CitrateScan is foundation infrastructure — open, self-hostable, and
public-good. It is the canonical example of a doc/app that stays public: a developer
needs it to build, and it exposes only **read-only** surfaces.

- The API and MCP server are read-only; the MCP server advertises `readOnly: true`
  and the REST `proxy` module is restricted to an allowlisted set of read methods.
- All write/relay paths (the EIP-2771 gasless relayer) are out of scope for the read
  surfaces documented here.
- **No secrets in this page.** Endpoints are public routes; API keys are issued to you
  in the app and are never embedded in docs. Do not paste keys into shared docs.

## Source & verification

- **Source repo:** `citrate-explorer` (brand: CitrateScan), Apache-2.0, © Citrate Foundation.
- **Audited against:** `cf7fa78` (`git -C citrate-explorer rev-parse --short HEAD`).
- **Key paths:** `src/app/page.tsx`, `src/scan/screens/*`, `src/app/api/v1/route.ts`,
  `src/app/api/mcp/route.ts`, `src/lib/ai/tools.ts`. Reference specs:
  `README.md`, `EXPLORER_SPEC.md`.
- **Status:** Per the repo, S-0 (bootstrap) complete and S-1 (indexer + AI foundation)
  in progress. Treat indexed/AI features as **pre-GA**: they read through to live RPC
  and skip persistence until a database is provisioned. This page mirrors code at the
  pinned SHA (Rule 9 — link, don't copy).
