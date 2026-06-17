"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/**
 * GDPR cookie consent. Shown on every entry until the visitor records a choice (stored in localStorage,
 * key CONSENT_KEY). Essential cookies (sign-in session) are always on and need no consent; this banner
 * gates any future non-essential cookies (analytics): nothing non-essential loads until "accept" is chosen.
 * The choice is also written to a cookie so a server can read it. Rendered globally from the root layout.
 */

const CONSENT_KEY = "citrate-atlas-consent";
export type Consent = "all" | "essential";

function record(value: Consent) {
  try {
    localStorage.setItem(CONSENT_KEY, value);
    // 12-month cookie so the server side can see the choice too.
    document.cookie = `${CONSENT_KEY}=${value}; path=/; max-age=31536000; samesite=lax`;
    window.dispatchEvent(new CustomEvent("citrate-consent", { detail: value }));
  } catch {
    /* storage unavailable, banner simply reappears next visit */
  }
}

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(CONSENT_KEY); } catch { /* ignore */ }
    if (!stored) setShow(true);
  }, []);

  if (!show) return null;

  const choose = (v: Consent) => { record(v); setShow(false); };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[100] px-4 pb-4"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border bg-[var(--color-panel)] p-5 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-[var(--color-muted)]">
          We use essential cookies to run Citrate Atlas (they keep you signed in). With your consent we may
          also use cookies to understand usage. Read the{" "}
          <Link href="/cookies" className="text-[var(--color-fg)] underline underline-offset-2">cookies policy</Link>.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={() => choose("essential")}
            className="rounded-xl border px-4 py-2 text-sm font-medium text-[var(--color-fg)] transition-colors hover:bg-[var(--color-elevated)]"
          >
            Essential only
          </button>
          <button
            onClick={() => choose("all")}
            className="rounded-xl bg-[var(--color-citrate)] px-4 py-2 text-sm font-medium text-[var(--color-citrate-fg)]"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}
