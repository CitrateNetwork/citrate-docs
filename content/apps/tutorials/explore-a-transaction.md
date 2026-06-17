---
title: "Tutorial: Explore a transaction"
codex_slug: /apps/tutorials/explore-a-transaction
tier: public
org_scope: ~
source_kind: authored
source: citrate-explorer/src/app/api/tx/[hash]/route.ts, src/app/api/v1/route.ts, src/app/api/mcp/route.ts
surfaces: [APP-explorer]
audited_against_sha: cf7fa78
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A short walk-through of looking up one transaction in CitrateScan, reading what it did, and confirming its
finality the way the BlockDAG actually decides it. You can do this with your eyes in the explorer, from the
read API, or by asking the built-in agent.

## What it is

A guided lookup of a single transaction on the Citrate Network, chain id 40204. You will find the
transaction, read its plain-English summary, and confirm finality by depth rather than by a confirmation
count. The reads here are public and write nothing.

## How to use it

You need a transaction hash on Citrate, a 64-hex value prefixed with `0x`. The API steps use an API key,
which you can get from the explorer's developer hub. Set two variables so the commands stay short; point
`EXPLORER` at your CitrateScan deployment.

```bash
export EXPLORER="https://scan.citrate.ai"   # your CitrateScan base URL
export TXHASH="0x<your-64-hex-tx-hash>"
```

### Step 1, find the transaction in the explorer

1. Open CitrateScan.
2. Paste the transaction hash into the search bar, or press `⌘K` to open the command palette and paste it
   there.
3. CitrateScan classifies the input as a transaction hash and opens the transaction screen.

You land on a page that leads with a plain-English summary of what the transaction did, followed by its
status, value in dual units, and decoded detail. (Screen: `citrate-explorer/src/scan/screens/tx.tsx`.)

### Step 2, read the consensus context

On the transaction page, note the block the transaction landed in and that block's blue score. Citrate is a
BlockDAG under GhostDAG, so finality is by depth, not a confirmation countdown. A block is final once:

```text
current_blue_score − block.blue_score ≥ 100
```

CitrateScan shows whether the transaction is finalized using exactly this rule. There is no "12
confirmations" counter to wait on. For the underlying concepts, see [read the DAG](/chain/tutorials/read-the-dag).

### Step 3, fetch the same facts from the API

The transaction detail endpoint returns the transaction and receipt enriched with the block's `timestamp`,
`blueScore`, and a `finalized` flag, in one call:

```bash
curl -s "$EXPLORER/api/tx/$TXHASH" | jq
```

The response carries the core facts the explorer renders, including `methodId`, `isCreate`, and
`finalized`, so you can confirm finality from a script. If the block lookup fails, the endpoint still
returns the transaction core without the consensus fields rather than erroring.
(Source: `citrate-explorer/src/app/api/tx/[hash]/route.ts`.)

### Step 4, use the Etherscan-shaped API, optional

If you already have tooling built for the Etherscan request shape, the same lookups work through `/api/v1`
with the `{ status, message, result }` envelope. The `proxy` module is a JSON-RPC passthrough over
allowlisted read methods:

```bash
# Raw transaction through the JSON-RPC proxy
curl -s "$EXPLORER/api/v1?module=proxy&action=eth_getTransactionByHash&txhash=$TXHASH&apikey=$CITRATE_API_KEY" | jq

# Receipt status (1 = success, 0 = reverted)
curl -s "$EXPLORER/api/v1?module=transaction&action=gettxreceiptstatus&txhash=$TXHASH&apikey=$CITRATE_API_KEY" | jq
```

The `getblockcountdown` action returns an error on purpose, since finality on Citrate is depth-based, not a
countdown. Read the DAG stats and the depth rule from step 2 instead.
(Source: `citrate-explorer/src/app/api/v1/route.ts`.)

### Step 5, ask the agent, optional

Open Ask CitrateScan and ask, in plain English:

> Explain transaction `$TXHASH` and tell me whether it is final.

The agent answers using read-only on-chain tool calls and links the reads behind its answer. The same tools
are available to outside agents over the read-only MCP server at `/api/mcp`, so you can do this from Claude,
ChatGPT, or Cursor as well. (Source: `citrate-explorer/src/scan/screens/agent.tsx`, `src/app/api/mcp/route.ts`.)

## Reference

The surfaces this tutorial touches:

| Surface | What it does | Source |
|---|---|---|
| `/api/tx/[hash]` | Transaction and receipt with block timestamp, blue score, and `finalized`. | `src/app/api/tx/[hash]/route.ts` |
| `/api/v1` (`proxy`, `transaction`) | Etherscan-shaped reads over allowlisted JSON-RPC and receipt status. | `src/app/api/v1/route.ts` |
| `/api/mcp` | Read-only MCP server exposing the same tools as the in-app agent. | `src/app/api/mcp/route.ts` |

## What you learned

- How to resolve a transaction in CitrateScan through the search bar or `⌘K`.
- How to read finality the DAG-native way, blue score plus depth at least 100, instead of confirmations.
- Three ways to get the same facts: the `/api/tx/[hash]` endpoint, the Etherscan-shaped `/api/v1` surface,
  and the agent, in the explorer or over MCP.

## Failure modes

- An invalid hash, anything other than a `0x`-prefixed 64-hex value, is rejected with a 400 before any
  lookup runs.
- A transaction the node cannot find returns a 404.
- `getblockcountdown` on `/api/v1` returns an error by design. Use the depth rule, not a countdown.

## Access and canon

Public and read-only. Nothing here writes state. API keys are issued to you inside the app and must never
be pasted into shared docs.

## Source and verification

- Repo: `citrate-explorer` (CitrateScan), audited against `cf7fa78`.
- Endpoints used: `/api/tx/[hash]`, `/api/v1` (`proxy`, `transaction`), `/api/mcp`.
- Status: Implemented (pre-audit). These are read-only public surfaces.

See also [read the DAG](/chain/tutorials/read-the-dag) and the [JSON-RPC reference](/chain/rpc).
