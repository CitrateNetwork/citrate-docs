"use client";

import React, { use } from "react";
import Link from "next/link";
import { mockApi } from "@/prototype/fixtures";
import { useViewer } from "@/components/providers";
import { TierChip } from "@/components/tier-chip";

const PANELS = [
  ["", "Overview"],
  ["entitlements", "Entitlements & people"],
  ["orgs", "Organizations"],
  ["sync", "Content sync"],
  ["embargoes", "Embargoes"],
  ["access-log", "Access log"],
] as const;

/** Admin console (DESIGN_BRIEF §12) — role-gated; non-admins get a 404-style screen (existence not revealed). */
export default function AdminPage({ params }: { params: Promise<{ section?: string[] }> }) {
  const { section } = use(params);
  const { session } = useViewer();
  const sec = section?.[0] ?? "";

  if (!mockApi.isAdmin(session)) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <div className="text-2xl">404</div>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Not found.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-display mb-1 text-2xl font-bold">Admin Console</h1>
      <p className="mb-6 text-sm text-[var(--color-muted)]">Confidential · administrators only · every change is itself audit-logged.</p>

      <nav className="mb-6 flex flex-wrap gap-2 text-sm">
        {PANELS.map(([k, label]) => (
          <Link
            key={k}
            href={`/admin${k ? "/" + k : ""}`}
            className={`rounded-lg px-3 py-1.5 ${sec === k ? "bg-[var(--color-panel)] font-medium" : "text-[var(--color-muted)]"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {sec === "" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PANELS.slice(1).map(([k, label]) => (
            <Link key={k} href={`/admin/${k}`} className="rounded-2xl border bg-[var(--color-panel)] p-4 hover:bg-[var(--color-elevated)]">
              <div className="font-medium">{label}</div>
            </Link>
          ))}
        </div>
      )}

      {sec === "entitlements" && (
        <Table head={["Principal", "Tier", "Org", "Role", "Expires"]}>
          {mockApi.adminEntitlements(session)!.map((p) => (
            <tr key={p.sub} className="border-t">
              <Td>{p.email}</Td>
              <Td><TierChip tier={p.entitlement.tier} /></Td>
              <Td>{p.entitlement.orgId ?? "—"}</Td>
              <Td>{p.entitlement.citrateRole ?? "—"}</Td>
              <Td>{p.entitlement.expiresAt ? new Date(p.entitlement.expiresAt).toISOString().slice(0, 10) : "never"}</Td>
            </tr>
          ))}
        </Table>
      )}

      {sec === "orgs" && (
        <Table head={["Org", "Sector", "Tier band", "KYC", "Seats"]}>
          {mockApi.adminOrgs(session)!.map((o) => (
            <tr key={o.id} className="border-t">
              <Td>{o.name}</Td>
              <Td>{o.sector}</Td>
              <Td><TierChip tier={o.tierBand} /></Td>
              <Td>{o.kycRequired ? "required" : "—"}</Td>
              <Td>{o.seatsUsed}/{o.seats}</Td>
            </tr>
          ))}
        </Table>
      )}

      {sec === "sync" && (
        <Table head={["Node", "Kind", "Source", "Pinned", "Drift"]}>
          {mockApi.adminSync(session)!.map((r) => (
            <tr key={r.nodeId} className="border-t">
              <Td>{r.title}</Td>
              <Td>{r.sourceKind}</Td>
              <Td className="font-mono text-xs">{r.source}</Td>
              <Td className="font-mono text-xs">{r.pinnedSha ?? "—"}</Td>
              <Td>{r.drift ? <span className="text-[var(--color-danger)]">drift</span> : "ok"}</Td>
            </tr>
          ))}
        </Table>
      )}

      {sec === "embargoes" && (
        <Table head={["Doc", "Until", "Approver (Rule-13)", "Released"]}>
          {mockApi.adminEmbargoes(session)!.map((e) => (
            <tr key={e.docSlug} className="border-t">
              <Td>{e.title}</Td>
              <Td>{new Date(e.embargoUntil).toISOString().slice(0, 10)}</Td>
              <Td className="text-xs">{e.approver ?? "—"}</Td>
              <Td>{e.released ? "yes" : "held"}</Td>
            </tr>
          ))}
        </Table>
      )}

      {sec === "access-log" && (
        <Table head={["Principal", "Doc", "Tier", "Disclosure", "When"]}>
          {mockApi.adminAccessLog(session)!.map((e) => (
            <tr key={e.id} className="border-t">
              <Td className="text-xs">{e.sub}</Td>
              <Td className="font-mono text-xs">{e.docSlug}</Td>
              <Td><TierChip tier={e.tier} /></Td>
              <Td>{e.disclosureAck ? "yes" : "no"}</Td>
              <Td className="text-xs">{new Date(e.at).toISOString().slice(0, 16).replace("T", " ")}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full text-left text-sm">
        <thead className="bg-[var(--color-panel)] text-xs uppercase tracking-wide text-[var(--color-muted)]">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2 ${className ?? ""}`}>{children}</td>;
}
