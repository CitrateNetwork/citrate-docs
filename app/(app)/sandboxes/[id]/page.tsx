"use client";

import React, { use } from "react";
import Link from "next/link";
import { SANDBOX_WIDGETS } from "@/components/sandboxes";

/** S5 — sandbox host: renders the live testnet widget for the given id (chain 40204, read-mostly, fail-closed). */
export default function SandboxPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const sb = SANDBOX_WIDGETS[id];
  if (!sb) return <div className="p-10">Unknown sandbox.</div>;
  const { Comp, title } = sb;
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/sandboxes" className="text-xs text-[var(--color-muted)]">← all sandboxes</Link>
      <h1 className="mb-4 mt-2 font-display text-2xl font-normal">▷ {title}</h1>
      <Comp />
    </div>
  );
}
