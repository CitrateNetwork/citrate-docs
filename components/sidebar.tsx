"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { filterNav, mockApi, NavNode } from "@/prototype/fixtures";
import { MERGED_NAV } from "@/lib/codex-nav";
import { useViewer } from "./providers";
import { TierChip } from "./tier-chip";
import { cn } from "@/lib/cn";

/** Tier-aware sidebar (DESIGN_BRIEF §3/§5.3). Renders the filtered IA; locked leaves show as locked. */
export function Sidebar() {
  const { session } = useViewer();
  const pathname = usePathname();
  const nav = useMemo(() => filterNav(MERGED_NAV, session), [session]);
  const [closed, setClosed] = useState<Set<string>>(new Set());

  const toggle = (id: string) =>
    setClosed((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto px-3 py-4 text-sm">
      {nav.map((group) =>
        group.children?.length ? (
          <div key={group.id} className="mb-2">
            <button
              onClick={() => toggle(group.id)}
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--color-muted)] hover:bg-[var(--color-panel)]"
            >
              <span className="flex items-center gap-2">
                {group.title}
                {group.tier !== "public" && <TierChip tier={group.tier} />}
              </span>
              <span aria-hidden className="text-[10px]">{closed.has(group.id) ? "▸" : "▾"}</span>
            </button>
            {!closed.has(group.id) && (
              <ul className="mt-1 space-y-0.5">
                {group.children.map((node) => (
                  <li key={node.id}>
                    <Leaf node={node} active={pathname === node.slug} session={session} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <Leaf key={group.id} node={group} active={pathname === group.slug} session={session} />
        )
      )}
    </nav>
  );
}

function Leaf({
  node,
  active,
  session,
}: {
  node: NavNode;
  active: boolean;
  session: ReturnType<typeof useViewer>["session"];
}) {
  const vis = mockApi.visibility(session, node);
  const locked = vis === "locked";
  const isTut = node.kind === "tutorials";
  const isSandbox = node.kind === "sandbox";

  return (
    <Link
      href={node.slug ?? "#"}
      className={cn(
        "group flex items-center justify-between gap-2 rounded-md px-2 py-1.5",
        active ? "bg-[color-mix(in_oklab,var(--color-citrate)_14%,transparent)] text-[var(--color-fg)]" : "hover:bg-[var(--color-panel)]",
        locked && "opacity-60"
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {isTut && <span aria-hidden className="text-[var(--color-citrate)]">›</span>}
        {isSandbox && <span aria-hidden>▷</span>}
        <span className={cn("truncate", isTut && "text-[var(--color-muted)]")}>{node.title}</span>
      </span>
      <span className="flex items-center gap-1">
        {node.tier !== "public" && <TierChip tier={node.tier} />}
        {locked && <span aria-hidden title="locked">🔒</span>}
      </span>
    </Link>
  );
}
