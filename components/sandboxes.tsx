"use client";

import React, { useEffect, useState } from "react";
import { Icon } from "./icons";

/**
 * S5 — live testnet sandboxes (chain 40204). Each widget calls a read-only server route
 * (`/api/sandbox/*`) which proxies to testnet — read-mostly, allowlisted, fail-closed. No keys in the
 * browser. DAG + RPC do real live calls; inference/relay/x402 fail-closed without configured endpoints.
 */

function Frame({ title, blurb, source, children }: { title: string; blurb: string; source: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-sm text-[var(--color-muted)]">{blurb}</p>
      {children}
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        Read-only · chain 40204 · fail-closed · source: <span className="font-mono">{source}</span>
      </p>
    </div>
  );
}

function Result({ state }: { state: { status: "idle" | "loading" | "ok" | "error"; data?: unknown; error?: string } }) {
  if (state.status === "idle") return null;
  if (state.status === "loading") return <Panel tone="muted">calling testnet…</Panel>;
  if (state.status === "error") return <Panel tone="error"><span className="inline-flex items-center gap-1.5"><Icon name="warning" size={14} /> {state.error || "fail-closed"}</span></Panel>;
  return (
    <Panel tone="ok">
      <pre className="overflow-x-auto text-xs">{JSON.stringify(state.data, null, 2)}</pre>
    </Panel>
  );
}
function Panel({ tone, children }: { tone: "ok" | "error" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "error" ? "border-[color-mix(in_oklab,var(--color-danger)_45%,transparent)] text-[var(--color-danger)]"
    : tone === "muted" ? "text-[var(--color-muted)]" : "";
  return <div className={`mt-3 rounded-lg border bg-[var(--color-panel)] p-3 text-sm ${cls}`}>{children}</div>;
}
function RunButton({ onClick, busy, label = "Run" }: { onClick: () => void; busy: boolean; label?: string }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="rounded-lg bg-[var(--color-citrate)] px-3 py-1.5 text-sm font-medium text-[var(--color-citrate-fg)] disabled:opacity-40">
      {busy ? "…" : label}
    </button>
  );
}

type S = { status: "idle" | "loading" | "ok" | "error"; data?: unknown; error?: string };

/* S-1 — GhostDAG blue-score visualizer (live) */
function DagSandbox() {
  const [s, setS] = useState<S>({ status: "idle" });
  const load = async () => {
    setS({ status: "loading" });
    try {
      const r = await fetch("/api/sandbox/dag");
      const j = await r.json();
      setS(j.ok ? { status: "ok", data: j.stats } : { status: "error", error: j.error });
    } catch { setS({ status: "error", error: "endpoint unavailable (fail-closed)" }); }
  };
  useEffect(() => { load(); }, []);
  const d = s.status === "ok" ? (s.data as Record<string, unknown>) : null;
  return (
    <Frame title="GhostDAG blue-score visualizer" blurb="Live DAG state from chain 40204: tips, blue/red blocks, GhostDAG params." source="citrate-explorer (harness)">
      <RunButton onClick={load} busy={s.status === "loading"} label="Refresh" />
      {d && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[["height", d.height], ["total blocks", d.totalBlocks], ["blue", d.blueBlocks], ["red", d.redBlocks],
            ["tips", d.tipsCount], ["k", (d.ghostdagParams as Record<string, unknown>)?.k], ["finality depth", (d.ghostdagParams as Record<string, unknown>)?.finalityDepth], ["max parents", (d.ghostdagParams as Record<string, unknown>)?.maxParents]].map(([k, v]) => (
            <div key={String(k)} className="rounded-lg border bg-[var(--color-panel)] p-3">
              <div className="text-xs text-[var(--color-muted)]">{String(k)}</div>
              <div className="font-mono text-lg tabular-nums">{String(v ?? "—")}</div>
            </div>
          ))}
        </div>
      )}
      {d?.currentTips ? (
        <div className="mt-3 text-xs">
          <div className="text-[var(--color-muted)]">current tips</div>
          {(d.currentTips as string[]).map((t) => <div key={t} className="font-mono break-all text-[var(--color-citrate-deep)]">{t}</div>)}
        </div>
      ) : null}
      {s.status === "error" && <Panel tone="error"><span className="inline-flex items-center gap-1.5"><Icon name="warning" size={14} /> {s.error}</span></Panel>}
    </Frame>
  );
}

/* S-5 — RPC method explorer (live) */
const RPC_METHODS = ["eth_chainId", "eth_blockNumber", "eth_gasPrice", "net_version", "web3_clientVersion",
  "citrate_getDagStats", "citrate_gasPrice", "chain_getTips", "chain_getHeight"];
function RpcSandbox() {
  const [method, setMethod] = useState("eth_chainId");
  const [params, setParams] = useState("[]");
  const [s, setS] = useState<S>({ status: "idle" });
  const run = async () => {
    setS({ status: "loading" });
    let parsed: unknown[] = [];
    try { parsed = JSON.parse(params || "[]"); } catch { setS({ status: "error", error: "params must be a JSON array" }); return; }
    try {
      const r = await fetch("/api/sandbox/rpc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ method, params: parsed }) });
      const j = await r.json();
      setS(j.ok ? { status: "ok", data: { result: j.result, curl: j.curl } } : { status: "error", error: j.error });
    } catch { setS({ status: "error", error: "endpoint unavailable (fail-closed)" }); }
  };
  return (
    <Frame title="RPC method explorer" blurb="Run an allowlisted read-only JSON-RPC call against chain 40204." source="citrate-chain core/api">
      <div className="flex flex-wrap items-center gap-2">
        <select value={method} onChange={(e) => setMethod(e.target.value)} className="rounded-lg border bg-[var(--color-panel)] px-2 py-1.5 text-sm">
          {RPC_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <input value={params} onChange={(e) => setParams(e.target.value)} className="w-40 rounded-lg border bg-[var(--color-panel)] px-2 py-1.5 font-mono text-xs" placeholder="[] params" />
        <RunButton onClick={run} busy={s.status === "loading"} />
      </div>
      <Result state={s} />
    </Frame>
  );
}

/* S-4 — inference gateway (fail-closed without key) */
function InferSandbox() {
  const [prompt, setPrompt] = useState("In one sentence, what is GhostDAG?");
  const [s, setS] = useState<S>({ status: "idle" });
  const run = async () => {
    setS({ status: "loading" });
    try {
      const r = await fetch("/api/sandbox/infer", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ prompt }) });
      const j = await r.json();
      setS(j.ok ? { status: "ok", data: { text: j.text, usage: j.usage } } : { status: "error", error: j.error });
    } catch { setS({ status: "error", error: "gateway unavailable (fail-closed)" }); }
  };
  return (
    <Frame title="Inference gateway call" blurb="OpenAI-compatible call to the Citrate inference gateway." source="citrate-inference-gateway">
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={2} className="mb-2 w-full rounded-lg border bg-[var(--color-panel)] px-2 py-1.5 text-sm" />
      <RunButton onClick={run} busy={s.status === "loading"} />
      <Result state={s} />
    </Frame>
  );
}

/* S-2 — gasless relay (fail-closed without relay) */
function RelaySandbox() {
  const [s, setS] = useState<S>({ status: "idle" });
  const run = async () => {
    setS({ status: "loading" });
    try {
      const r = await fetch("/api/sandbox/relay", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
      const j = await r.json();
      setS(j.ok ? { status: "ok", data: j.receipt } : { status: "error", error: j.error });
    } catch { setS({ status: "error", error: "relay unavailable (fail-closed)" }); }
  };
  return (
    <Frame title="Gasless relay (EIP-2771)" blurb="Confirm the Citrate relayer is live and ready to sponsor a user-signed meta-transaction. Read-only: the docs app holds no keys, so it checks readiness rather than submitting." source="citrate-chatbot /api/relay">
      <RunButton onClick={run} busy={s.status === "loading"} label="Check relayer" />
      <Result state={s} />
    </Frame>
  );
}

/* S-3 — x402 (captures the 402 challenge; fail-closed otherwise) */
function X402Sandbox() {
  const [s, setS] = useState<S>({ status: "idle" });
  const run = async () => {
    setS({ status: "loading" });
    try {
      const r = await fetch("/api/sandbox/x402", { method: "POST" });
      const j = await r.json();
      setS(j.ok ? { status: "ok", data: j } : { status: "error", error: j.error || j.note });
    } catch { setS({ status: "error", error: "x402 endpoint unavailable (fail-closed)" }); }
  };
  return (
    <Frame title="x402 payment" blurb="Request a metered resource and capture the HTTP 402 payment challenge." source="citrate-buyer-webapp + marketplace-sdk">
      <RunButton onClick={run} busy={s.status === "loading"} label="Request metered resource" />
      <Result state={s} />
    </Frame>
  );
}

export const SANDBOX_WIDGETS: Record<string, { title: string; Comp: React.ComponentType }> = {
  dag: { title: "GhostDAG blue-score visualizer", Comp: DagSandbox },
  rpc: { title: "RPC method explorer", Comp: RpcSandbox },
  inference: { title: "Inference gateway call", Comp: InferSandbox },
  relay: { title: "Gasless relay (EIP-2771)", Comp: RelaySandbox },
  x402: { title: "x402 payment", Comp: X402Sandbox },
};
