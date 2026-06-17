import React from "react";
import { Tier } from "@/prototype/fixtures";
import { cn } from "@/lib/cn";

/**
 * TierChip — the consistent tier signal used on sidebar nodes, page headers, search results, and agent
 * citations (DESIGN_BRIEF §5.1). Color is paired with a label/icon (never color alone — a11y §17).
 */

const TIER_META: Record<Tier, { label: string; cls: string; icon: string }> = {
  public: { label: "Public", cls: "text-[var(--color-muted)] border-[var(--color-border)]", icon: "" },
  commercial: { label: "Commercial", cls: "text-[var(--color-citrate-deep)] border-[color-mix(in_oklab,var(--color-citrate-deep)_40%,transparent)]", icon: "●" },
  academic: { label: "Academic", cls: "text-[var(--color-violet)] border-[color-mix(in_oklab,var(--color-violet)_40%,transparent)]", icon: "◆" },
  confidential: { label: "Confidential", cls: "text-[var(--color-amber)] border-[color-mix(in_oklab,var(--color-amber)_45%,transparent)]", icon: "🔒" },
};

export function TierChip({ tier, className }: { tier: Tier; className?: string }) {
  const m = TIER_META[tier];
  if (tier === "public") return null; // Public needs no chip (DESIGN_BRIEF §5.1)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        m.cls,
        className
      )}
      title={`${m.label} tier`}
    >
      <span aria-hidden>{m.icon}</span>
      {m.label}
    </span>
  );
}

export function tierLabel(tier: Tier): string {
  return TIER_META[tier].label;
}
