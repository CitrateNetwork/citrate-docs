import { FRESHNESS } from "@/content/_generated/freshness";

/**
 * Freshness badge: how far a page's source repo has moved since the page was
 * last audited (`audited_against_sha` vs the repo's canonical HEAD, computed at
 * build time by scripts/gen-freshness.mjs). Green = current, amber = the source
 * has changed since, neutral = the audited commit is no longer resolvable
 * (rebased or squashed). Renders nothing for pages with no resolvable source.
 */
export function FreshnessBadge({ slug }: { slug: string }) {
  const f = FRESHNESS[slug];
  if (!f) return null;

  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: "1px 8px",
    borderRadius: 999,
    fontSize: 11,
    lineHeight: 1.6,
    border: "1px solid var(--border-1)",
  };

  if (f.behind === 0) {
    return (
      <span
        style={{ ...base, color: "var(--color-citrate)", borderColor: "color-mix(in oklab, var(--color-citrate) 40%, transparent)" }}
        title={`Audited against ${f.repo}@${f.sha}, which is the current tip.`}
      >
        current
      </span>
    );
  }

  if (typeof f.behind === "number" && f.behind > 0) {
    const label = f.behind === 1 ? "1 source change since audit" : `${f.behind} source changes since audit`;
    return (
      <span
        style={{ ...base, color: "var(--color-amber)", borderColor: "color-mix(in oklab, var(--color-amber) 40%, transparent)" }}
        title={`Audited against ${f.repo}@${f.sha}. ${f.repo} is now at ${f.head}${f.headDate ? ` (${f.headDate})` : ""}.`}
      >
        {label}
      </span>
    );
  }

  // behind === null: the audited commit is not in the repo any more (rebased/squashed).
  return (
    <span style={{ ...base, opacity: 0.75 }} title={`Audited against ${f.repo}@${f.sha}.`}>
      audited @ {f.sha}
    </span>
  );
}
