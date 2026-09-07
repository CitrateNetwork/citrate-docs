"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { mockApi } from "@/prototype/fixtures";
import { useViewer } from "@/components/providers";
import { TierChip } from "@/components/tier-chip";

/** Search (DESIGN_BRIEF §14). Tier-filtered: no above-tier hits. */
export default function SearchPage() {
  const { session } = useViewer();
  const [q, setQ] = useState("");
  const results = useMemo(() => mockApi.search(session, q, Date.now()), [session, q]); // DOC-B-005: real clock

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="font-display mb-4 text-2xl font-bold">Search</h1>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search the docs at your tier…"
        className="mb-6 w-full rounded-xl border bg-[var(--color-panel)] px-4 py-3 text-sm"
      />
      <ul className="space-y-2">
        {results.map((r) => (
          <li key={r.slug}>
            <Link href={r.slug} className="block rounded-xl border bg-[var(--color-panel)] p-4 hover:bg-[var(--color-elevated)]">
              <div className="flex items-center gap-2">
                <span className="font-medium">{r.title}</span>
                <TierChip tier={r.tier} />
                <span className="ml-auto text-xs text-[var(--color-muted)]">{r.section}</span>
              </div>
              <p className="mt-1 text-sm text-[var(--color-muted)]">{r.snippet}</p>
            </Link>
          </li>
        ))}
        {results.length === 0 && (
          <li className="text-sm text-[var(--color-muted)]">No results at your tier.</li>
        )}
      </ul>
      <p className="mt-6 text-xs text-[var(--color-muted)]">
        Results are filtered by your access, and above-tier documents never appear here.
      </p>
    </div>
  );
}
