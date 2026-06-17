import React from "react";
import { GateCard as GateCardData } from "@/prototype/fixtures";
import { TierChip } from "./tier-chip";

/** Visible-locked state for Commercial/Academic content (DESIGN_BRIEF §5.3). Never shows the body. */
export function GateCard({ gate }: { gate: GateCardData }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border bg-[var(--color-panel)] p-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border bg-[var(--color-canvas)] text-xl">
        🔒
      </div>
      <div className="mb-2 flex items-center justify-center gap-2">
        <h1 className="text-xl font-semibold">{gate.title}</h1>
        <TierChip tier={gate.requiredTier} />
      </div>
      <p className="mx-auto mb-6 max-w-md text-sm text-[var(--color-muted)]">{gate.summary}</p>
      <button className="rounded-xl bg-[var(--color-citrate)] px-4 py-2 text-sm font-medium text-[var(--color-citrate-fg)] hover:opacity-90">
        {gate.cta.label}
      </button>
      <p className="mt-4 text-xs text-[var(--color-muted)]">
        Requires the <strong>{gate.requiredTier}</strong> tier · this body is never sent to your browser.
      </p>
    </div>
  );
}
