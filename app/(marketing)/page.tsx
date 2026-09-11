import Link from "next/link";
import { Footer } from "@/components/footer";
import { LanguagePicker } from "@/components/language-picker";
import { getChainStatus } from "@/lib/chain-status";

// Re-read live chain height at most every 30s (ISR), not on every request.
export const revalidate = 30;

/** Splash / front door (DESIGN_BRIEF §6.1). */
export default async function Splash() {
  const status = await getChainStatus();
  return (
    <div className="relative flex min-h-screen flex-col">
    <div className="absolute right-4 top-4 z-40">
      <LanguagePicker />
    </div>
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--color-muted)]">
        <span className="inline-flex h-2 w-2 rounded-full" style={{ background: status.up ? "var(--color-citrate)" : "var(--color-muted)" }} />
        Citrate testnet · chain {status.chainId} · height {status.height.toLocaleString()}
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
      <h1 className="font-display mt-1 text-7xl font-normal leading-none tracking-tight">Almanac</h1>
      <p className="t-lede mt-6 max-w-2xl font-display text-xl leading-relaxed text-[var(--color-muted)]">
        The handbook for the Citrate federation. Documentation you can run: the contracts, the RPC, the
        SDKs, the desktop app, and how to operate a node, mapped, searchable, and live. Pick where to start.
      </p>

      {/* Three audience paths: new users, developers, operators. */}
      <div className="mt-10 grid w-full max-w-4xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
        {[
          {
            eyebrow: "New to Citrate",
            title: "Start with Citrate Core",
            body: "Install the desktop app, take one membership, and get an account and a running node in a few minutes.",
            href: "/core/getting-started",
            cta: "Get started",
          },
          {
            eyebrow: "Developers",
            title: "Build on Citrate",
            body: "The SDKs, the JSON-RPC and gateway APIs, the canonical contract addresses, and live read-only sandboxes.",
            href: "/sdks/overview",
            cta: "Read the SDK docs",
          },
          {
            eyebrow: "Operators and IT",
            title: "Run a node",
            body: "Bring up a node at home or in a business, keep it healthy, and understand keys and safe operation.",
            href: "/core/run-a-node",
            cta: "Run a node",
          },
        ].map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="group flex flex-col rounded-2xl border bg-[var(--color-panel)] p-5 transition-colors hover:border-[var(--color-citrate)]"
          >
            <div className="eyebrow">{c.eyebrow}</div>
            <div className="mt-1 text-lg font-semibold">{c.title}</div>
            <p className="mt-2 flex-1 text-sm text-[var(--color-muted)]">{c.body}</p>
            <span className="mt-3 text-sm font-medium text-[var(--color-citrate)]">{c.cta} &rarr;</span>
          </Link>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link href="/start/what-is-citrate" className="rounded-xl border px-5 py-2.5 text-sm font-medium">
          Browse all docs
        </Link>
        <Link href="/sandboxes" className="rounded-xl border px-5 py-2.5 text-sm font-medium">
          Try a sandbox
        </Link>
        <Link href="/settings" className="rounded-xl border px-5 py-2.5 text-sm font-medium">
          Sign in
        </Link>
      </div>

      {/* Access tiers: the entitlement model that gates deeper content. */}
      <div className="mt-14 w-full max-w-3xl">
        <div className="eyebrow mb-3 text-center">Access tiers</div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Public", "Open to all, no login", "var(--color-muted)"],
            ["Commercial", "Per-seat and per-enterprise", "var(--color-citrate)"],
            ["Academic", "Research partners and admins", "var(--color-violet)"],
            ["Confidential", "Admins and issued auditors", "var(--color-amber)"],
          ].map(([t, d, c]) => (
            <div key={t} className="rounded-xl border bg-[var(--color-panel)] p-3 text-left">
              <div className="text-sm font-semibold" style={{ color: c as string }}>{t}</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">{d}</div>
            </div>
          ))}
        </div>
      </div>

    </main>
    <Footer />
    </div>
  );
}
