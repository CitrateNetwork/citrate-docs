"use client";

import React from "react";
import { useViewer } from "./providers";
import { tierLabel } from "./tier-chip";
import { mockApi } from "@/prototype/fixtures";

/**
 * Dev-mode tier switcher (DESIGN_BRIEF §6.2). Lets a reviewer preview every access state without a real
 * IdP. S2 replaces this with the citrate-identity OIDC session; the rest of the app is unchanged.
 */
export function ViewerSwitcher() {
  const { viewerId, setViewerId, viewers, session } = useViewer();
  const tier = mockApi.resolveTier(session, Date.now()); // DOC-B-005: real clock, not FIXED_NOW
  return (
    <label className="flex items-center gap-2 text-xs">
      <span className="hidden text-[var(--color-muted)] sm:inline">view as</span>
      <select
        value={viewerId}
        onChange={(e) => setViewerId(e.target.value)}
        className="rounded-lg border bg-[var(--color-panel)] px-2 py-1.5 text-xs"
        title={`Resolved tier: ${tierLabel(tier)}`}
      >
        {viewers.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
    </label>
  );
}
