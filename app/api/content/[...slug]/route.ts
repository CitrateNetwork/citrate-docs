import { canRead } from "@/prototype/fixtures";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { CONFIDENTIAL_DISCLOSURES, CONFIDENTIAL_DOCS, authorizeConfidentialRead } from "@/lib/content/confidential-store";
import { recordAccess } from "@/lib/content/access-log";
import { CONTENT_DOCS } from "@/content/_generated/content";
import { CONTENT_BODIES } from "@/content/_generated/content-bodies";

/**
 * S3 — the runtime content gateway. The ONLY path to a gated (Confidential OR commercial/academic) body.
 * Flow (fail-closed at every step): resolve session → tier∧org∧¬expired gate → embargo → disclosure ack
 * → fetch body from the server-only store (prod: the private home repo) → access-log → return.
 * Gated bodies never enter the client bundle; this route serves them per request, post-entitlement-gate.
 */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

export async function GET(req: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params;
  const path = "/" + slug.join("/");
  const doc = CONFIDENTIAL_DOCS[path];
  // Confidential store first. Unknown-here → fall through to the content-pipeline gated bodies below.
  if (doc) {
    const session = await resolveRequestSession(req);
    const now = Date.now();
    // Not-readable → 404. Never reveal that a Confidential doc exists to an unentitled caller.
    // CIT-DOCS-004: per-doc `allowedRoles` scoping on top of the tier/org gate (funding = named
    // principals only), so a confidential grant is NOT a key to every confidential compartment.
    if (!authorizeConfidentialRead(session, doc, now)) {
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

    // Authorized. Record the read FIRST; DOC-B-010: a Confidential read that cannot be logged must
    // not be served, and `accessLogged` reflects the actual write result rather than a literal.
    const logged = recordAccess({
      sub: session.sub ?? "unknown", docSlug: path, tier: doc.tier, orgId: doc.orgId,
      disclosureAck: Boolean(doc.disclosureRequired), at: now,
    });
    if (!logged) return json({ error: "access_log_unavailable" }, 503);
    return json({
      slug: path, title: doc.title, tier: doc.tier, body: doc.body,
      source: doc.source, accessLogged: logged, acknowledgedAt: doc.disclosureRequired ? now : undefined,
    });
  }

  // DOC-B-001 fix: content-pipeline gated bodies (commercial/academic). Their bodies live ONLY in the
  // server-only content-bodies module and are served here through the SAME entitlement chokepoint —
  // never in the client bundle. `public` bodies stay client-side (unrestricted) and are not served here.
  const meta = CONTENT_DOCS[path];
  if (!meta || meta.tier === "public") return json({ error: "not_found" }, 404);

  const session = await resolveRequestSession(req);
  const now = Date.now();
  if (!canRead(session, { tier: meta.tier, orgId: meta.orgId ?? null }, now)) {
    return json({ error: "not_found" }, 404);
  }
  if (meta.embargoUntil && now < meta.embargoUntil) {
    return json({ error: "embargo", until: meta.embargoUntil, title: meta.title }, 423);
  }
  if (meta.disclosureRequired) {
    const acked = req.headers.get("x-codex-ack") === meta.disclosureId;
    if (!acked) {
      return json({ error: "disclosure_required", disclosure: CONFIDENTIAL_DISCLOSURES[meta.disclosureId ?? ""] }, 412);
    }
  }

  const body = CONTENT_BODIES[path];
  if (body == null) return json({ error: "not_found" }, 404);

  const logged = recordAccess({
    sub: session.sub ?? "unknown", docSlug: path, tier: meta.tier, orgId: meta.orgId ?? null,
    disclosureAck: Boolean(meta.disclosureRequired), at: now,
  });
  if (!logged) return json({ error: "access_log_unavailable" }, 503);
  return json({
    slug: path, title: meta.title, tier: meta.tier, body,
    source: meta.source, accessLogged: logged, acknowledgedAt: meta.disclosureRequired ? now : undefined,
  });
}
