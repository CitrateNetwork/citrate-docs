import "server-only";

/**
 * S3 — server-only access log for Confidential reads. In production this is the `access_log` table
 * (PLANSET/02 §8). For the prototype it's an in-memory append log (resets on restart) — enough to
 * demonstrate that every Confidential read is recorded and surfaced in Settings → Transparency / Admin.
 */
export interface AccessEntry {
  sub: string;
  docSlug: string;
  tier: string;
  orgId: string | null;
  disclosureAck: boolean;
  at: number;
}

const LOG: AccessEntry[] = [];

export function recordAccess(e: AccessEntry): void {
  LOG.push(e);
}
export function listAccess(): AccessEntry[] {
  return [...LOG].reverse();
}
export function listAccessForSub(sub: string): AccessEntry[] {
  return listAccess().filter((e) => e.sub === sub);
}
