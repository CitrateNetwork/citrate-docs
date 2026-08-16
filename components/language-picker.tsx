"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FEATURED_LANGUAGES, LANGUAGES, findLanguage, type Language } from "@/lib/i18n/languages";
import {
  currentLanguage,
  engineSupported,
  getSavedLanguage,
  initFromSaved,
  restoreEnglish,
  saveLanguage,
  translateTo,
  type TranslateStatus,
} from "@/lib/i18n/engine";

// Atlas header language switcher. Browser-first: docs are authored in English so
// the browser auto-offers native translation; this lets a reader force any language,
// translated on-device where supported (CSP-clean). Code blocks (translate="no")
// are never touched.
export function LanguagePicker() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("en");
  const [status, setStatus] = useState<TranslateStatus>("idle");
  const [query, setQuery] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(getSavedLanguage() || "en");
    void initFromSaved((s) => setStatus(s)).then(() => setActive(currentLanguage()));
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const activeLang: Language = findLanguage(active) ?? LANGUAGES[0] ?? { code: "en", name: "English", native: "English" };
  const busy = status === "checking" || status === "downloading" || status === "translating";

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return LANGUAGES.filter(
      (l) => l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q) || l.code.toLowerCase().includes(q),
    );
  }, [query]);

  async function choose(code: string) {
    setHint(null);
    saveLanguage(code);
    setActive(code);
    setOpen(false);
    setQuery("");
    if (code === "en") {
      restoreEnglish();
      setStatus("idle");
      return;
    }
    const ok = await translateTo(code, (s) => setStatus(s));
    if (!ok) {
      const lang = findLanguage(code);
      setHint(
        `Your browser can't translate on-device here. Use its built-in “Translate to ${lang?.native ?? code}” — the translate icon in the address bar, or right-click → Translate.`,
      );
    }
  }

  const rowClass = (isActive: boolean) =>
    `flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--color-elevated)] ${
      isActive ? "bg-[var(--color-elevated)]" : ""
    }`;

  const row = (l: Language) => (
    <button
      key={l.code}
      type="button"
      role="menuitemradio"
      aria-checked={l.code === active}
      onClick={() => void choose(l.code)}
      lang={l.code}
      className={rowClass(l.code === active)}
    >
      <span className="font-medium" translate="no">{l.native}</span>
      <span className="text-xs text-[var(--color-muted)]" translate="no">{l.name === l.native ? l.code : l.name}</span>
    </button>
  );

  return (
    <div ref={rootRef} className="relative" translate="no">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Language: ${activeLang.native}. Change language`}
        title={`Language: ${activeLang.native}`}
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs ${busy ? "border-[var(--color-citrate)]" : ""}`}
      >
        <GlobeIcon />
        <span className="font-medium">{activeLang.code.toUpperCase()}</span>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Choose language"
          className="absolute right-0 top-[calc(100%+8px)] z-50 flex max-h-[26rem] w-[19rem] flex-col overflow-hidden rounded-xl border bg-[var(--color-panel)] shadow-xl"
        >
          <div className="border-b p-2.5">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 40+ languages…"
              aria-label="Search languages"
              translate="no"
              className="w-full rounded-md border bg-[var(--color-canvas)] px-2.5 py-2 text-sm outline-none"
            />
          </div>

          <div className="overflow-y-auto p-2">
            <button
              type="button"
              role="menuitemradio"
              aria-checked={active === "en"}
              onClick={() => void choose("en")}
              className={rowClass(active === "en")}
            >
              <span className="font-medium">English</span>
              <span className="text-xs text-[var(--color-muted)]">original</span>
            </button>

            {results ? (
              results.length ? (
                results.map(row)
              ) : (
                <div className="px-3 py-4 text-sm text-[var(--color-muted)]">No match.</div>
              )
            ) : (
              <>
                <div className="px-3 pb-1 pt-2.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">Popular</div>
                {FEATURED_LANGUAGES.filter((l) => l.code !== "en").map(row)}
                <div className="px-3 pb-1 pt-2.5 text-[10px] uppercase tracking-wider text-[var(--color-muted)]">All languages</div>
                {LANGUAGES.filter((l) => l.code !== "en" && !l.featured).map(row)}
              </>
            )}
          </div>

          <div className="border-t px-3 py-2 text-[11px] leading-snug text-[var(--color-muted)]">
            {hint
              ? hint
              : engineSupported()
                ? "Translated in your browser, on-device. Code stays as-is. Pick English to restore."
                : "Your browser will offer to translate automatically. Pick a language to set your preference."}
          </div>
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}
