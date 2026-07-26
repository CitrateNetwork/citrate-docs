import React from "react";
import { Tier, normalizeTier } from "@/prototype/fixtures";
import { Icon } from "./icons";
import { cn } from "@/lib/cn";

/**
 * TierChip — the consistent tier signal used on sidebar nodes, page headers, search results, and agent
 * citations (DESIGN_BRIEF §5.1). Color is paired with a label/icon (never color alone — a11y §17).
 */

const TIER_META: Record<Tier, { label: string; cls: string; icon: string }> = {
  public: { label: "Public", cls: "text-[var(--color-muted)] border-[var(--color-border)]", icon: "" },
  commercial: { label: "Commercial", cls: "text-[var(--color-citrate-deep)] border-[color-mix(in_oklab,var(--color-citrate-deep)_40%,transparent)]", icon: "dot" },
  academic: { label: "Academic", cls: "text-[var(--color-violet)] border-[color-mix(in_oklab,var(--color-violet)_40%,transparent)]", icon: "node" },
  confidential: { label: "Confidential", cls: "text-[var(--color-amber)] border-[color-mix(in_oklab,var(--color-amber)_45%,transparent)]", icon: "lock" },
};

export function TierChip({ tier, className }: { tier: Tier; className?: string }) {
  // `tier` reaches here from the session/nav JSON, so it is Tier only by convention. Normalize before
  // the TIER_META lookup — an unmapped value used to yield `undefined` and throw on `m.cls`, taking the
  // whole app shell (TopBar → AppLayout) down with it. A chip must never be able to do that.
  const t = normalizeTier(tier);
  const m = TIER_META[t];
  if (t === "public") return null; // Public needs no chip (DESIGN_BRIEF §5.1)
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-medium leading-none",
        m.cls,
        className
      )}
      title={`${m.label} tier`}
    >
      {m.icon ? <Icon name={m.icon} size={10} /> : null}
      {m.label}
    </span>
  );
}

export function tierLabel(tier: Tier): string {
  return TIER_META[normalizeTier(tier)].label;
}
