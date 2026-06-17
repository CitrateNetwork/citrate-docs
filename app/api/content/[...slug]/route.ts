import { canRead } from "@/prototype/fixtures";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { CONFIDENTIAL_DISCLOSURES, CONFIDENTIAL_DOCS } from "@/lib/content/confidential-store";
import { recordAccess } from "@/lib/content/access-log";

/**
 * S3 — the Confidential runtime content gateway. The ONLY path to a Confidential body.
 * Flow (fail-closed at every step): resolve session → tier∧org∧¬expired gate → embargo → disclosure ack
 * → fetch body from the server-only store (prod: the private home repo) → access-log → return.
 * Confidential bodies never enter the client bundle; this route serves them per request, post-auth.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const doc = CONFIDENTIAL_DOCS[path];
  // Unknown OR not-readable → 404. Never reveal that a Confidential doc exists to an unentitled caller.
  if (!doc) return json({ error: "not_found" }, 404);

  const session = await resolveRequestSession(req);
  const now = Date.now();
  if (!canRead(session, { tier: doc.tier, orgId: doc.orgId }, now)) {
    return json({ error: "not_found" }, 404);
  }
  if (doc.embargoUntil && now < doc.embargoUntil) {
    return json({ error: "embargo", until: doc.embargoUntil, title: doc.title }, 423);
  }
  if (doc.disclosureRequired) {
    const acked = req.headers.get("x-codex-ack") === doc.disclosureId;
    if (!acked) {
      return json({ error: "disclosure_required", disclosure: CONFIDENTIAL_DISCLOSURES[doc.disclosureId ?? ""] }, 412);
    }
  }

  // Authorized. Record the read, then serve the body (prod: fetched from doc.source at request time).
  recordAccess({
    sub: session.sub ?? "unknown", docSlug: path, tier: doc.tier, orgId: doc.orgId,
    disclosureAck: Boolean(doc.disclosureRequired), at: now,
  });
  return json({
    slug: path, title: doc.title, tier: doc.tier, body: doc.body,
    source: doc.source, accessLogged: true, acknowledgedAt: doc.disclosureRequired ? now : undefined,
  });
}
