---
title: "Tutorial: Explore a transaction"
codex_slug: /apps/tutorials/explore-a-transaction
tier: public
org_scope: ~
source_kind: authored
source: citrate-explorer/src/app/api/tx/[hash]/route.ts
surfaces: [APP-explorer]
audited_against_sha: cf7fa78
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Tutorial: Explore a transaction

> Look up a Citrate transaction, read its plain-English summary, and confirm finality the DAG-native way, in the UI and from the API.

**Time:** ~5 minutes · **Prerequisites:** a transaction hash on Citrate (chain `40204`).
Some steps use an API key; get one from the explorer's Developer hub. The `curl`
commands below assume `EXPLORER` points at your CitrateScan deployment.

```bash
export EXPLORER="https://scan.citrate.ai"   # your CitrateScan base URL
export TXHASH="0x<your-64-hex-tx-hash>"
```

## Step 1, Find the transaction in the UI

1. Open CitrateScan.
2. Paste the transaction hash into the **omni-search** bar (or press `⌘K` to open the
   command palette and paste it there).
3. CitrateScan classifies the input as a tx hash and opens the **Transaction** screen.

You land on a page that leads with a **plain-English summary** of what the transaction
did, followed by status, value, and decoded detail.
(Screen: `citrate-explorer/src/scan/screens/tx.tsx`.)

## Step 2, Read the consensus context (DAG-native finality)

On the transaction page, note the **block** the tx landed in and its **`blue_score`**.
Citrate is a GHOSTDAG BlockDAG, so finality is **by depth**, not by a confirmation
countdown: a block is final once

```
current_blue_score − block.blue_score ≥ 100
```

CitrateScan shows whether the transaction is **finalized** based on this rule, there
is no "12 confirmations" counter to wait on.

## Step 3, Fetch the same facts from the API

The transaction detail endpoint returns the tx and receipt enriched with its block's
`timestamp`, `blueScore`, and a `finalized` flag in one call:

```bash
curl -s "$EXPLORER/api/tx/$TXHASH" | jq
```

You'll get the core facts the UI renders, including `finalized`, so you can confirm
finality programmatically.
(Source: `citrate-explorer/src/app/api/tx/[hash]/route.ts`.)

## Step 4, Use the Etherscan-compatible API (optional)

If you have tooling built for Etherscan, the same lookups work through `/api/v1` with
the familiar `{ status, message, result }` envelope. The `proxy` module is a JSON-RPC
passthrough over allowlisted read methods:

```bash
# Raw transaction via the JSON-RPC proxy
curl -s "$EXPLORER/api/v1?module=proxy&action=eth_getTransactionByHash&txhash=$TXHASH&apikey=$CITRATE_API_KEY" | jq

# Receipt status (1 = success, 0 = reverted)
curl -s "$EXPLORER/api/v1?module=transaction&action=gettxreceiptstatus&txhash=$TXHASH&apikey=$CITRATE_API_KEY" | jq
```

> Note: `getblockcountdown` deliberately returns an error, finality on Citrate is
> depth-based, not a countdown. Use the DAG stats instead of waiting for a countdown.
> (Source: `citrate-explorer/src/app/api/v1/route.ts`.)

## Step 5, Ask the agent (optional)

Open **Ask CitrateScan** and ask, in plain English:

> "Explain transaction `$TXHASH` and tell me whether it's final."

The agent answers using read-only on-chain tool calls and links the reads behind its
answer. The exact same tools are available to external agents over the read-only MCP
endpoint at `/api/mcp`, so you can do this from Claude, ChatGPT, or Cursor too.
(Source: `citrate-explorer/src/scan/screens/agent.tsx`, `src/app/api/mcp/route.ts`.)

## What you learned

- How to resolve a transaction in CitrateScan via omni-search / `⌘K`.
- How to read **DAG-native finality** (`blue_score` + depth ≥ 100) instead of confirmations.
- Three ways to get the same facts: the `/api/tx/[hash]` endpoint, the Etherscan-compatible
  `/api/v1` surface, and the AI agent (in-app or over MCP).

## Source & verification

- **Repo:** `citrate-explorer` (CitrateScan), audited against `cf7fa78`.
- **Endpoints used:** `/api/tx/[hash]`, `/api/v1` (`proxy`, `transaction`), `/api/mcp`.
- These are **read-only** public surfaces; API keys are issued in-app and must never be
  pasted into shared docs (Rule 2, no secrets).
