import Link from "next/link";
import { CitrateMark } from "./icons";

/**
 * Corporate footer, shown at the foot of the marketing splash and the docs chrome. Connects Atlas to the
 * rest of the Citrate Network (citrate.ai, Chat, CitrateScan) and the company channels (GitHub, LinkedIn,
 * X), plus the legal links. External links open in a new tab with rel="noopener noreferrer".
 */

const NETWORK = [
  { label: "Citrate Network", href: "https://citrate.ai" },
  { label: "Citrate Chat", href: "https://chat.citrate.ai" },
  { label: "CitrateScan explorer", href: "https://explorer.citrate.ai" },
];

const EXPLORE = [
  { label: "What Citrate is", href: "/start/what-is-citrate" },
  { label: "Roadmap", href: "/start/roadmap" },
  { label: "JSON-RPC reference", href: "/chain/rpc" },
  { label: "Sandboxes", href: "/sandboxes" },
];

const SOCIAL = [
  {
    label: "GitHub", href: "https://github.com/citratenetwork",
    path: "M12 .5C5.73.5.5 5.73.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.34-1.3-1.7-1.3-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.79 2.74 1.27 3.41.97.1-.76.41-1.27.74-1.56-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.42.37.8 1.09.8 2.2v3.26c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z",
  },
  {
    label: "LinkedIn", href: "https://linkedin.com/company/citrate-network",
    path: "M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .77 0 1.73v20.54C0 23.23.8 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z",
  },
  {
    label: "X", href: "https://x.com/citratenetwork",
    path: "M18.9 1.5h3.68l-8.04 9.19L24 22.5h-7.4l-5.8-7.58-6.64 7.58H.48l8.6-9.83L0 1.5h7.59l5.24 6.93L18.9 1.5Zm-1.3 18.8h2.04L6.49 3.6H4.3l13.3 16.7Z",
  },
];

function Col({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow mb-3">{title}</div>
      <ul className="flex flex-col gap-2 text-sm">{children}</ul>
    </div>
  );
}

function Ext({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]">
        {label}
      </a>
    </li>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-[var(--color-canvas)]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-8 px-6 py-12 md:grid-cols-5">
        <div className="col-span-2 md:col-span-2">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-semibold">
            <CitrateMark size={22} color="var(--accent-text)" />
            Citrate Atlas
          </Link>
          <p className="mt-3 max-w-xs text-sm text-[var(--color-muted)]">
            Documentation for the Citrate Network. A substrate for AI compute, mapped, searchable, and live.
          </p>
          <div className="mt-4 flex items-center gap-2 text-xs text-[var(--color-muted)]">
            <span className="inline-flex h-2 w-2 rounded-full bg-[var(--color-citrate)]" />
            Citrate testnet · chain 40204
          </div>
        </div>

        <Col title="Network">
          {NETWORK.map((l) => <Ext key={l.href} {...l} />)}
        </Col>

        <Col title="Explore">
          {EXPLORE.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]">{l.label}</Link>
            </li>
          ))}
        </Col>

        <Col title="Connect">
          {SOCIAL.map((l) => <Ext key={l.href} {...l} />)}
        </Col>
      </div>

      <div className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-5 text-xs text-[var(--color-muted)] sm:flex-row">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>© 2026 Citrate Network</span>
            <span className="opacity-40">·</span>
            <Link href="/cookies" className="hover:text-[var(--color-fg)]">Cookies policy</Link>
            <span className="opacity-40">·</span>
            <span>Licensed under BUSL-1.1</span>
          </div>
          <div className="flex items-center gap-4">
            {SOCIAL.map((s) => (
              <a key={s.href} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                 className="text-[var(--color-muted)] transition-colors hover:text-[var(--color-fg)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
