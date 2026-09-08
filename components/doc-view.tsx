"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Doc, filterNav, mockApi } from "@/prototype/fixtures";
import { CONTENT_DOCS } from "@/content/_generated/content";
import { MERGED_NAV } from "@/lib/codex-nav";
import { useViewer } from "./providers";
import { Markdown } from "@/lib/md";
import { TierChip } from "./tier-chip";
import { GateCard } from "./gate-card";
import { DisclosureModal } from "./disclosure-modal";
import { Icon } from "./icons";
import { findNavBySlug } from "@/lib/nav-util";
import { cn } from "@/lib/cn";
import { FreshnessBadge } from "./freshness-badge";

/** The tier-aware document reader — renders every DocResponse state (DESIGN_BRIEF §7, §15). */
export function DocView({ slug }: { slug: string }) {
  const { session, viewerId } = useViewer();
  const [ackTick, setAckTick] = useState(0);

  const nav = useMemo(() => filterNav(MERGED_NAV, session, Date.now()), [session]); // DOC-B-005: real clock
  // Content-pipeline docs (content/**) take precedence; fixtures cover the demo-only states.
  const contentDoc = CONTENT_DOCS[slug];
  const res = useMemo(
    // DOC-B-005: evaluate the gate against the real clock so expired grants collapse to their base tier.
    () =>
      contentDoc
        ? mockApi.evaluateDoc(session, contentDoc, Date.now())
        : mockApi.getDoc(session, slug, Date.now()),
    [session, slug, ackTick, contentDoc]
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _bust = viewerId; // re-resolve when the viewer switches

  if (res.kind === "gate") return <Shell><GateCard gate={res.gate} /></Shell>;

  if (res.kind === "embargo") {
    return (
      <Shell>
        <Card>
          <div className="mb-2 text-[var(--color-muted)]"><Icon name="clock" size={24} /></div>
          <h1 className="font-display mb-1 text-xl font-semibold">{res.title}</h1>
          <p className="text-sm text-[var(--color-muted)]">
            Held until <strong>{fmt(res.until)}</strong>. Embargoed content is withheld until its release date.
          </p>
        </Card>
      </Shell>
    );
  }

  if (res.kind === "disclosure_required") {
    const disclosure = mockApi.getDisclosure(res.disclosureId);
    return (
      <Shell>
        <Card>
          <div className="mb-2 text-[var(--color-amber)]"><Icon name="lock" size={24} /></div>
          <h1 className="font-display mb-1 text-xl font-semibold">{res.doc.title}</h1>
          <p className="text-sm text-[var(--color-muted)]">A disclosure must be acknowledged before this document renders.</p>
        </Card>
        {disclosure && (
          <DisclosureModal
            disclosure={disclosure}
            onCancel={() => history.back()}
            onAck={() => {
              mockApi.ackDisclosure(session, res.disclosureId);
              setAckTick((t) => t + 1);
            }}
          />
        )}
      </Shell>
    );
  }

  if (res.kind === "not_found") {
    const node = findNavBySlug(nav, slug);
    if (node) {
      // Visible in the nav but not yet authored — honest prototype stub (real content lands in S6).
      return (
        <Shell>
          <header className="mb-6 flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">{node.title}</h1>
            <TierChip tier={node.tier} />
          </header>
          <div className="rounded-2xl border border-dashed bg-[var(--color-panel)] p-6 text-sm text-[var(--color-muted)]">
            <p className="mb-2">
              <strong>Section overview & tutorial — authored in S6.</strong>
            </p>
            <p>
              This node is wired into the IA and resolves through the access chokepoint; its{" "}
              <code>authored</code>/<code>transcluded</code> body is filled during DOCS-CODEX-S6
              (see <code>PLANSET/05_SPRINTS_AND_WPS.md</code>). The prototype renders it as a labeled stub
              rather than a fake page (Rule 1).
            </p>
          </div>
        </Shell>
      );
    }
    return (
      <Shell>
        <Card>
          <div className="mb-2 text-2xl">404</div>
          <h1 className="font-display mb-1 text-xl font-semibold">Not found</h1>
          <p className="text-sm text-[var(--color-muted)]">
            No document at <code>{slug}</code> for your access. (Confidential content returns 404 to the
            unentitled — existence is never revealed.)
          </p>
        </Card>
      </Shell>
    );
  }

  // kind === "doc"
  const doc = res.doc;
  const confidential = doc.tier === "confidential";
  return (
    <Shell>
      {confidential && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-[color-mix(in_oklab,var(--color-amber)_45%,transparent)] bg-[color-mix(in_oklab,var(--color-amber)_8%,transparent)] px-3 py-2 text-xs text-[var(--color-amber)]">
          <Icon name="lock" size={13} /> Confidential · access-logged · acknowledged · served at request time (never in the build).
        </div>
      )}
      <header className="mb-6">
        <nav className="mb-2 text-xs text-[var(--color-muted)]">{slug}</nav>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-2xl font-bold tracking-tight">{doc.title}</h1>
          <TierChip tier={doc.tier} />
          <FreshnessBadge slug={slug} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--color-muted)]">
          {doc.readingTimeMin && <span>{doc.readingTimeMin} min read</span>}
          {doc.sourceKind === "transcluded" && doc.syncedSha && (
            <span title={doc.source}>↻ transcluded · last synced @ {doc.syncedSha}</span>
          )}
          {doc.sourceKind === "linked" && <span>🔗 linked · {doc.source}</span>}
          <span className="opacity-70">source: {doc.source}</span>
          {doc.versions && doc.currentVersion && (
            <label className="flex items-center gap-1">
              version:
              <select defaultValue={doc.currentVersion} className="rounded-md border bg-[var(--color-panel)] px-1 py-0.5">
                {doc.versions.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>
      {doc.body != null
        ? <Markdown source={doc.body} />
        : doc.sourceKind === "gated" || doc.tier !== "public"
          // Body absent client-side by design (DOC-B-001): every gated body is served at request time
          // from the /api/content gateway after the server re-verifies the session — never bundled.
          ? <GatedBody doc={doc} viewerId={viewerId} />
          : <p className="text-sm text-[var(--color-muted)]">No body.</p>}
    </Shell>
  );
}

/**
 * Confidential body fetched at request time from the /api/content gateway (S3). The body is NEVER in the
 * client bundle — it arrives here only after the gateway re-verifies the session, the disclosure ack, and
 * logs the read. (In dev mode we pass the dev-viewer header; oidc mode uses the session cookie.)
 */
function GatedBody({ doc, viewerId }: { doc: Doc; viewerId: string }) {
  const [state, setState] = useState<{ status: "loading" | "ok" | "denied"; body?: string }>({ status: "loading" });
  useEffect(() => {
    let live = true;
    const headers: Record<string, string> = { "x-codex-dev-viewer": viewerId };
    if (doc.disclosureRequired && doc.disclosureId) headers["x-codex-ack"] = doc.disclosureId;
    fetch(`/api/content${doc.slug}`, { headers })
      .then(async (r) => (r.ok ? ((await r.json()) as { body: string }) : null))
      .then((d) => { if (live) setState(d ? { status: "ok", body: d.body } : { status: "denied" }); })
      .catch(() => { if (live) setState({ status: "denied" }); });
    return () => { live = false; };
  }, [doc.slug, doc.disclosureRequired, doc.disclosureId, viewerId]);

  if (state.status === "loading") return <p className="text-sm text-[var(--color-muted)]">Fetching confidential document…</p>;
  if (state.status === "denied") return <p className="text-sm text-[var(--color-danger)]">Access denied by the gateway.</p>;
  return <Markdown source={state.body ?? ""} />;
}

function Shell({ children, className }: { children: React.ReactNode; className?: string }) {
  return <article className={cn("mx-auto w-full max-w-3xl px-6 py-10", className)}>{children}</article>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border bg-[var(--color-panel)] p-8 text-center">{children}</div>;
}
function fmt(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}
