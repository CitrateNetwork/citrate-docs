import Link from "next/link";
import { CHAIN_STATUS } from "@/prototype/fixtures";
import { Footer } from "@/components/footer";

/** Splash / front door (DESIGN_BRIEF §6.1). */
export default function Splash() {
  return (
    <div className="flex min-h-screen flex-col">
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-citrate)]" />
        Citrate testnet · chain {CHAIN_STATUS.chainId} · height {CHAIN_STATUS.height.toLocaleString()}
      </div>

      <div className="eyebrow mb-5">Documentation</div>
      {/* Brand marquee (reads "Citrate") with the product name set beneath it. */}
      <img
        src="/brand/citrate_marquee_green.svg"
        alt="Citrate"
        width={460}
        height={145}
        className="h-auto w-full max-w-md"
      />
      <h1 className="font-display mt-1 text-7xl font-normal leading-none tracking-tight">Atlas</h1>
      <p className="t-lede mt-6 max-w-2xl font-display text-xl leading-relaxed text-[var(--color-muted)]">
        A handbook you can run, gated like a vault, calm like a reading room. Every surface in the
        federation, contracts, RPC, SDKs, CLIs, apps, mapped, searchable, and live.
      </p>

      <div className="mt-10 grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-4">
        {[
          ["Public", "Open to all, no login", "var(--color-muted)"],
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

    </main>
    <Footer />
    </div>
  );
}
