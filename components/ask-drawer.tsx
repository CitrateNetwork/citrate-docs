"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { mockApi } from "@/prototype/fixtures";
import { useViewer } from "./providers";
import { tierLabel, TierChip } from "./tier-chip";
import { cn } from "@/lib/cn";

type Cite = { slug: string; title: string; tier: "public" | "commercial" | "academic" | "confidential" };
type Msg = { role: "user" | "assistant"; content: string; citations?: Cite[]; tools?: { tool: string; backing: string }[] };

/** Ask Codex drawer (DESIGN_BRIEF §10). S1 replays a canned, tier-filtered stream; S4 wires the real harness. */
export function AskDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, viewerId } = useViewer();
  const tier = mockApi.resolveTier(session);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showTrace, setShowTrace] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const animate = (full: string, citations: Cite[], tools: { tool: string; backing: string }[]) => {
    const words = full.split(/(\s+)/);
    let i = 0;
    timer.current = setInterval(() => {
      i++;
      const partial = words.slice(0, i).join("");
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: partial };
        return c;
      });
      if (i >= words.length) {
        if (timer.current) clearInterval(timer.current);
        setStreaming(false);
        setMsgs((m) => {
          const c = [...m];
          c[c.length - 1] = { role: "assistant", content: full, citations, tools };
          return c;
        });
      }
    }, 16);
  };

  const send = async () => {
    if (!input.trim() || streaming) return;
    const q = input.trim();
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: q }]);
    setStreaming(true);
    setMsgs((m) => [...m, { role: "assistant", content: "" }]);
    try {
      // Real tier-aware RAG: the server filters retrieval to the caller's tier BEFORE answering, so the
      // citations returned can never be above tier (AgentRespectsTier). Dev mode passes the viewer header.
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-codex-dev-viewer": viewerId },
        body: JSON.stringify({ query: q }),
      });
      const data = (await res.json()) as {
        answer: string; citations: Cite[]; tools: { tool: string; backing: string }[];
      };
      animate(data.answer ?? "", data.citations ?? [], data.tools ?? []);
    } catch {
      if (timer.current) clearInterval(timer.current);
      setStreaming(false);
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "assistant", content: "The agent is unavailable right now." };
        return c;
      });
    }
  };

  if (!open) return null;

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l bg-[var(--color-canvas)]">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <span className="text-[var(--color-citrate)]">✦</span> Ask Codex
        </span>
        <button onClick={onClose} aria-label="Close" className="text-[var(--color-muted)]">✕</button>
      </div>

      <div className="border-b px-4 py-2 text-xs text-[var(--color-muted)]">
        Answering from your <strong>{tierLabel(tier)}</strong>-tier corpus · cites only docs you can access.
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
        {msgs.length === 0 && (
          <p className="text-[var(--color-muted)]">Ask anything in these docs. Try “What is SALT and how many decimals?”</p>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn(m.role === "user" ? "text-[var(--color-fg)]" : "text-[var(--color-fg)]")}>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-[var(--color-muted)]">{m.role}</div>
            <div className={cn(m.role === "assistant" && streaming && i === msgs.length - 1 && "codex-cursor")}>{m.content}</div>
            {m.tools && (
              <button onClick={() => setShowTrace((s) => !s)} className="mt-2 text-[10px] text-[var(--color-muted)] underline">
                {showTrace ? "hide" : "show"} tool trace ({m.tools.length})
              </button>
            )}
            {m.tools && showTrace && (
              <ul className="mt-1 space-y-0.5 text-[10px] text-[var(--color-muted)]">
                {m.tools.map((t, j) => (
                  <li key={j}>• {t.tool} <span className="opacity-60">[{t.backing}]</span></li>
                ))}
              </ul>
            )}
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.citations.map((c) => (
                  <Link key={c.slug} href={c.slug} className="flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] hover:bg-[var(--color-panel)]">
                    {c.title}
                    <TierChip tier={c.tier} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={2}
            placeholder="Ask…"
            className="flex-1 resize-none rounded-lg border bg-[var(--color-panel)] px-2 py-1.5 text-sm"
          />
          <button onClick={send} disabled={streaming} className="rounded-lg bg-[var(--color-citrate)] px-3 py-2 text-sm font-medium text-[var(--color-citrate-fg)] disabled:opacity-40">
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </div>
    </aside>
  );
}
