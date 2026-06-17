import Link from "next/link";
import { CHAIN_STATUS } from "@/prototype/fixtures";

/** Splash / front door (DESIGN_BRIEF §6.1). */
export default function Splash() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-citrate)]" />
        Citrate testnet · chain {CHAIN_STATUS.chainId} · height {CHAIN_STATUS.height.toLocaleString()}
      </div>

      <div className="eyebrow mb-3">Citrate Network · Documentation</div>
      <h1 className="font-display text-6xl font-normal tracking-tight">Citrate Atlas</h1>
      <p className="t-lede mt-4 max-w-2xl font-display text-xl leading-relaxed text-[var(--color-muted)]">
        A handbook you can run, gated like a vault, calm like a reading room. Every surface in the
        federation — contracts, RPC, SDKs, CLIs, apps — mapped, searchable, and live.
      </p>

      <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          ["Public", "Open to all — no login", "var(--color-muted)"],
          ["Commercial", "Per-seat & per-enterprise", "var(--color-citrate)"],
          ["Academic", "Research partners & admins", "var(--color-violet)"],
          ["Confidential", "Admins & issued auditors", "var(--color-amber)"],
        ].map(([t, d, c]) => (
          <div key={t} className="rounded-2xl border bg-[var(--color-panel)] p-4 text-left">
            <div className="text-sm font-semibold" style={{ color: c as string }}>{t}</div>
            <div className="mt-1 text-xs text-[var(--color-muted)]">{d}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Link href="/start/what-is-citrate" className="rounded-xl bg-[var(--color-citrate)] px-5 py-2.5 text-sm font-medium text-[var(--color-citrate-fg)]">
          Browse the docs
        </Link>
        <Link href="/sandboxes" className="rounded-xl border px-5 py-2.5 text-sm font-medium">
          Try a sandbox
        </Link>
        <Link href="/settings" className="rounded-xl border px-5 py-2.5 text-sm font-medium">
          Sign in
        </Link>
      </div>

      <p className="mt-12 text-xs text-[var(--color-muted)]">
        © 2026 Citrate Inc. · BUSL-1.1 · prototype shell (DOCS-CODEX-S1), wired to fixtures.
      </p>
    </main>
  );
}
