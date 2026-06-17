/**
 * Sandbox fixtures (chain 40204, testnet) + chain status. Each export includes an "ok" payload and a
 * fail-closed / rate-limited variant so the prototype can demonstrate all SandboxState branches
 * (DESIGN_BRIEF §9, §15).
 */

import {
  ChainStatus, DagSnapshot, InferenceUsage, RelayResult, RpcCallResult, SandboxState, X402Result,
} from "./types";

export const CHAIN_STATUS: ChainStatus = {
  chainId: 40204,
  height: 1_284_771,
  blueScore: 1_284_690,
  gasPrice: "0",
  up: true,
};

export const CHAIN_STATUS_DOWN: ChainStatus = { ...CHAIN_STATUS, up: false };

/* S-1 — GhostDAG blue-score visualizer */
export const SANDBOX_DAG: SandboxState<DagSnapshot> = {
  status: "ok",
  data: {
    tips: ["0x9c71", "0x4250"],
    nodes: [
      { id: "0x6680", blueScore: 1_284_686, blue: true, finalized: true },
      { id: "0xace0", blueScore: 1_284_687, blue: true, finalized: true },
      { id: "0xb1d4", blueScore: 1_284_688, blue: false, finalized: false }, // a red block
      { id: "0x9c71", blueScore: 1_284_689, blue: true, finalized: false },
      { id: "0x4250", blueScore: 1_284_690, blue: true, finalized: false },
    ],
    edges: [
      { from: "0xace0", to: "0x6680", kind: "selected" },
      { from: "0x9c71", to: "0xace0", kind: "selected" },
      { from: "0x9c71", to: "0xb1d4", kind: "merge" },
      { from: "0x4250", to: "0x9c71", kind: "selected" },
    ],
  },
};

/* S-2 — Gasless relay (EIP-2771) */
export const SANDBOX_RELAY: SandboxState<RelayResult> = {
  status: "ok",
  data: {
    txHash: "0x7c3a9f0b6e1d4a2f88c5b0e9a1d7f4c2e6b8a0d3f5c7e9b1a3d5f7c9e1b3d5f70",
    sponsoredBy: "Citrate relayer (no gas, on us)",
    receipt: { status: "success", blockHeight: 1_284_772, gasUsed: "52114" },
  },
};

/* S-3 — x402 payment */
export const SANDBOX_X402: SandboxState<X402Result> = {
  status: "ok",
  data: {
    challenge: { resource: "/v1/premium-dataset", amount: "0.05", asset: "SALT", nonce: "0xa91f3c" },
    settlement: { txHash: "0x2e6b8a0d3f5c7e9b1a3d5f7c9e1b3d5f70a7c3a9f0b6e1d4a2f88c5b0e9a1d7f4", paid: "0.05 SALT" },
    unlocked: { status: 200, body: "{ \"dataset\": \"unlocked\", \"rows\": 10000 }" },
  },
};

/* S-4 — Inference gateway (OpenAI-compatible) */
export const SANDBOX_INFERENCE: {
  state: SandboxState<{ chunks: string[]; usage: InferenceUsage }>;
} = {
  state: {
    status: "ok",
    data: {
      chunks: ["Citrate ", "settles ", "verifiable ", "inference ", "on-chain ", "via ", "Halo2-KZG ", "proofs."],
      usage: { promptTokens: 18, completionTokens: 12, costSalt: "0.0003" },
    },
  },
};

/* S-5 — RPC method explorer */
export const SANDBOX_RPC: SandboxState<RpcCallResult> = {
  status: "ok",
  data: {
    method: "citrate_getDagStats",
    request: { method: "citrate_getDagStats", params: [] },
    decoded: { currentTips: ["0x9c71", "0x4250"], maxBlueScore: 1_284_690, height: 1_284_771 },
    curl:
      "curl -s https://rpc.citrate.ai -H 'content-type: application/json' " +
      "-d '{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"citrate_getDagStats\",\"params\":[]}'",
  },
};

/** Reusable non-happy states for any sandbox. */
export const SANDBOX_RATE_LIMITED: SandboxState<never> = {
  status: "rate_limited", retryAfter: 12, message: "Slow down — 1 req/s. Try again in 12s.",
};
export const SANDBOX_FAIL_CLOSED: SandboxState<never> = {
  status: "fail_closed", message: "Testnet endpoint unavailable. Sandboxes fail closed — no partial state.",
};
