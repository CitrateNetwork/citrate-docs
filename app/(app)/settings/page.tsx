"use client";

import React, { useState } from "react";
import { mockApi } from "@/prototype/fixtures";
import { useViewer } from "@/components/providers";
import { TierChip, tierLabel } from "@/components/tier-chip";

type Tab = "access" | "profile" | "appearance" | "keys" | "transparency";

/** Settings & account (DESIGN_BRIEF §11) — S1 renders the shell from fixtures; tabs grow in S2/S4/S6. */
export default function SettingsPage() {
  const { session } = useViewer();
  const [tab, setTab] = useState<Tab>("access");
  const tier = mockApi.resolveTier(session);
  const ent = session.entitlement;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-bold">Settings</h1>
      <div className="mb-6 flex flex-wrap gap-2 border-b pb-2 text-sm">
        {(["access", "profile", "appearance", "keys", "transparency"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-3 py-1.5 ${tab === t ? "bg-[var(--color-panel)] font-medium" : "text-[var(--color-muted)]"}`}
          >
            {t === "keys" ? "API keys" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "access" && (
        <Section title="Access & entitlements">
          {!session.authenticated ? (
            <p className="text-sm text-[var(--color-muted)]">You are browsing as a guest (Public tier). Sign in to unlock more.</p>
          ) : (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <Field k="Resolved tier" v={<TierChip tier={tier} />} />
              <Field k="Organization / sector" v={ent?.orgId ?? "—"} />
              <Field k="Role" v={ent?.citrateRole ?? "—"} />
              <Field k="Milestone" v={ent?.milestone ?? "—"} />
              <Field k="KYC status" v={session.kycStatus} />
              <Field k="Grant expires" v={ent?.expiresAt ? new Date(ent.expiresAt).toISOString().slice(0, 10) : "never"} />
            </dl>
          )}
          <div className="mt-4 rounded-xl border bg-[var(--color-panel)] p-3 text-xs text-[var(--color-muted)]">
            <strong>What each tier unlocks:</strong> Public (open) · Commercial (per-seat/enterprise + KYC) ·
            Academic (research partners + admins) · Confidential (admins + issued auditors).
          </div>
        </Section>
      )}

      {tab === "profile" && (
        <Section title="Profile & identity">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Field k="Email" v={session.email ?? "—"} />
            <Field k="Wallet" v={session.walletAddress ?? "—"} />
            <Field k="KYC" v={session.kycStatus} />
          </dl>
          <p className="mt-3 text-xs text-[var(--color-muted)]">Identity methods are managed by citrate-identity (Codex stores no PII; KYC status only).</p>
        </Section>
      )}

      {tab === "appearance" && (
        <Section title="Appearance">
          <p className="text-sm text-[var(--color-muted)]">
            Theme & density (use the ◐ toggle in the top bar). Accent is locked to Citrate green. Full
            controls land in S6. Current prefs:
          </p>
          <pre className="mt-2 overflow-x-auto rounded-xl border bg-[var(--color-panel)] p-3 text-xs">
            {JSON.stringify(mockApi.getPrefs(session), null, 2)}
          </pre>
        </Section>
      )}

      {tab === "keys" && (
        <Section title="API keys & MCP">
          <ul className="space-y-2 text-sm">
            {mockApi.getApiKeys(session).map((k) => (
              <li key={k.id} className="flex items-center justify-between rounded-xl border bg-[var(--color-panel)] p-3">
                <div>
                  <div className="font-medium">{k.label}</div>
                  <div className="font-mono text-xs text-[var(--color-muted)]">{k.masked}</div>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--color-muted)]">
                  <span>cap:</span> <TierChip tier={k.tierCap} />
                  <span>{k.quotaUsed}/{k.quotaLimit}</span>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--color-muted)]">Keys are hashed at rest, shown copy-once, and capped at your tier.</p>
        </Section>
      )}

      {tab === "transparency" && (
        <Section title="Transparency — your access log">
          <ul className="space-y-1 text-sm">
            {mockApi.getMyAccessLog(session).map((e) => (
              <li key={e.id} className="flex items-center gap-2 rounded-lg border bg-[var(--color-panel)] px-3 py-2 text-xs">
                <TierChip tier={e.tier} />
                <span className="font-mono">{e.docSlug}</span>
                {e.disclosureAck && <span className="text-[var(--color-amber)]">disclosure ✓</span>}
                <span className="ml-auto text-[var(--color-muted)]">{new Date(e.at).toISOString().slice(0, 16).replace("T", " ")}</span>
              </li>
            ))}
            {mockApi.getMyAccessLog(session).length === 0 && (
              <li className="text-sm text-[var(--color-muted)]">No gated reads recorded for this viewer.</li>
            )}
          </ul>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Field({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-[var(--color-panel)] p-3">
      <dt className="text-xs text-[var(--color-muted)]">{k}</dt>
      <dd className="mt-1">{v}</dd>
    </div>
  );
}
