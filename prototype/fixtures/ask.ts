/**
 * Ask Codex fixtures — threads, streamed-style messages, citations (with tier chips), and tool-call
 * traces. Citations are always at-or-below the asking viewer's tier (AgentRespectsTier): the mockApi in
 * index.ts re-filters them by canRead so a downgraded viewer never sees an above-tier citation.
 */

import { Thread } from "./types";
import { FIXED_NOW } from "./viewers";

const MIN = 60_000;

export const THREADS: Thread[] = [
  {
    id: "thr_public_dag",
    title: "How does finality work?",
    createdAt: FIXED_NOW - 40 * MIN,
    updatedAt: FIXED_NOW - 38 * MIN,
    messages: [
      { id: "m1", role: "user", content: "How does finality work on Citrate?", createdAt: FIXED_NOW - 40 * MIN },
      {
        id: "m2", role: "assistant", createdAt: FIXED_NOW - 38 * MIN,
        content:
          "Citrate uses **GhostDAG**: blocks form a DAG ordered by `blue_score`, and finality is " +
          "**depth-based** — a block is final once it is buried beyond the finality depth (≥100), not by a " +
          "fixed confirmation count. See [Consensus](/chain/consensus).",
        toolCalls: [
          { tool: "searchDocs", args: { query: "finality depth GhostDAG", tier: "public" }, backing: "DOCS" },
          { tool: "getSurface", args: { id: "chain-consensus" }, backing: "DOCS" },
        ],
        citations: [
          { slug: "/chain/consensus", title: "Consensus (GhostDAG)", tier: "public" },
          { slug: "/start/primer", title: "GhostDAG / LVM / SALT primer", tier: "public" },
        ],
      },
    ],
  },
  {
    id: "thr_commercial_x402",
    title: "Wiring x402 into my buyer app",
    createdAt: FIXED_NOW - 3 * 60 * MIN,
    updatedAt: FIXED_NOW - 3 * 60 * MIN + 2 * MIN,
    messages: [
      { id: "m1", role: "user", content: "How do I settle an x402 challenge with the marketplace SDK?", createdAt: FIXED_NOW - 3 * 60 * MIN },
      {
        id: "m2", role: "assistant", createdAt: FIXED_NOW - 3 * 60 * MIN + 2 * MIN,
        content:
          "Use `X402Client`: read the 402 challenge, sign it, then retry with the payment header. " +
          "Full flow in [marketplace-sdk](/sdks/marketplace). Try it live in the [x402 sandbox](/sandboxes/x402).",
        toolCalls: [{ tool: "searchDocs", args: { query: "X402Client settle challenge", tier: "commercial" }, backing: "DOCS" }],
        citations: [
          { slug: "/sdks/marketplace", title: "marketplace-sdk", tier: "commercial" },
          { slug: "/chain/rpc", title: "JSON-RPC reference", tier: "public" },
        ],
      },
    ],
  },
];

/** A canned streaming answer the prototype can replay token-by-token for the demo composer. */
export const SAMPLE_STREAM = {
  question: "What is SALT and how many decimals?",
  chunks: [
    "**SALT** ", "is Citrate's ", "native token ", "(1B supply, ", "**18 decimals**), ",
    "on chain ", "**40204**. ", "Gas is ", "typically ", "sponsored ", "via the ", "EIP-2771 relayer.",
  ],
  citations: [{ slug: "/start/what-is-citrate", title: "What Citrate is", tier: "public" as const }],
  toolCalls: [{ tool: "getChainStatus", args: {}, backing: "RPC" as const }],
};
