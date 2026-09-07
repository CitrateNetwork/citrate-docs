"use client";

import React from "react";
import Link from "next/link";
import { useTheme, useViewer } from "./providers";
import { ViewerSwitcher } from "./viewer-switcher";
import { LanguagePicker } from "./language-picker";
import { TierChip } from "./tier-chip";
import { Icon, CitrateMark } from "./icons";
import { mockApi } from "@/prototype/fixtures";

/** Global top bar (DESIGN_BRIEF §4). */
export function TopBar({ onToggleAsk }: { onToggleAsk: () => void }) {
  const { session, authMode, login, logout } = useViewer();
  const { theme, toggle } = useTheme();
  const tier = mockApi.resolveTier(session, Date.now()); // DOC-B-005: real clock, not FIXED_NOW

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b bg-[var(--color-canvas)] px-4">
      <Link href="/" className="flex items-center gap-2 font-semibold" translate="no">
        <CitrateMark size={18} color="var(--accent-text)" />
        Atlas
      </Link>

      <Link
        href="/search"
        className="ml-2 hidden flex-1 items-center justify-between rounded-lg border bg-[var(--color-panel)] px-3 py-1.5 text-sm text-[var(--color-muted)] hover:bg-[var(--color-elevated)] sm:flex"
      >
        <span>Search the docs…</span>
        <kbd className="rounded border px-1.5 text-xs">⌘K</kbd>
      </Link>

      <div className="ml-auto flex items-center gap-2">
        {/* Tier badge → "your access" (settings) */}
        <Link
          href="/settings"
          className="flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs"
          title="Your access"
        >
          <span className="text-[var(--color-muted)]">{session.authenticated ? session.email ?? "signed in" : "guest"}</span>
          {tier !== "public" ? <TierChip tier={tier} /> : <span className="text-[var(--color-muted)]">Public</span>}
        </Link>

        {authMode === "oidc" ? (
          session.authenticated ? (
            <button onClick={logout} className="rounded-lg border px-2 py-1.5 text-xs">Sign out</button>
          ) : (
            <button onClick={login} className="rounded-lg border px-2 py-1.5 text-xs">Sign in</button>
          )
        ) : (
          <ViewerSwitcher />
        )}

        <LanguagePicker />

        <button onClick={toggle} className="rounded-lg border px-2 py-1.5 text-sm" title="Toggle theme" aria-label="Toggle theme">
          <Icon name={theme === "dark" ? "moon" : "sun"} size={16} />
        </button>

        <button
          onClick={onToggleAsk}
          className="rounded-lg bg-[var(--color-citrate)] px-3 py-1.5 text-sm font-medium text-[var(--color-citrate-fg)]"
          title="Ask Atlas"
        >
          <span className="inline-flex items-center gap-1.5"><CitrateMark size={13} color="var(--accent-fg)" /> Ask</span>
        </button>
      </div>
    </header>
  );
}
