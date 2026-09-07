import "server-only";

/**
 * S3 — server-only access log for Confidential reads.
 *
 * In production this is the durable `access_log` table (PLANSET/02 §8). For the prototype it is an
 * in-memory append log (a per-instance ring buffer that resets on restart) — enough to demonstrate
 * that every Confidential read is recorded and surfaced in Settings → Transparency / Admin.
 *
 * DOC-B-010: `recordAccess` now REPORTS whether the write succeeded (returns boolean) so the caller
 * can fail closed — a Confidential read that cannot be logged must not be served (the Rule-13
 * "every Confidential read is logged" condition). The store is pluggable via {@link setAccessSink}
 * so production can swap the durable table in without touching the route, and the buffer is bounded
 * so a long-lived instance cannot grow without limit.
 */
export interface AccessEntry {
  sub: string;
  docSlug: string;
  tier: string;
  orgId: string | null;
  disclosureAck: boolean;
  at: number;
}

/** A sink persists one entry and returns true iff it was durably recorded. */
export type AccessSink = (e: AccessEntry) => boolean;

const MAX_ENTRIES = 5000;
const LOG: AccessEntry[] = [];

const memorySink: AccessSink = (e) => {
  LOG.push(e);
  if (LOG.length > MAX_ENTRIES) LOG.splice(0, LOG.length - MAX_ENTRIES); // bounded ring buffer
  return true;
};

let sink: AccessSink = memorySink;

/** Swap the persistence sink (production: the durable `access_log` table). */
export function setAccessSink(s: AccessSink): void {
  sink = s;
}

/** Record a Confidential read. Returns true iff the write was accepted by the sink (fail-closed on false). */
export function recordAccess(e: AccessEntry): boolean {
  try {
    return sink(e) === true;
  } catch {
    return false; // a throwing sink is a failed write — the caller must not serve the body.
  }
}

export function listAccess(): AccessEntry[] {
  return [...LOG].reverse();
}
export function listAccessForSub(sub: string): AccessEntry[] {
  return listAccess().filter((e) => e.sub === sub);
}
