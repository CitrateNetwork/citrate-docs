/**
 * /api/content — the commercial/academic (content-pipeline) branch. The confidential branch is
 * covered in confidential-paths.test.ts; this file pins the second branch of the same route, which
 * serves gated bodies from the server-only content-bodies module: the entitlement gate, the org
 * scope, the embargo, the disclosure acknowledgement, and the fail-closed access log.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  session: {} as Record<string, unknown>,
  logOk: true,
  logged: [] as unknown[],
}));

vi.mock("@/lib/auth/request-session", () => ({
  resolveRequestSession: async () => h.session,
}));
vi.mock("@/lib/content/confidential-store", () => ({
  CONFIDENTIAL_DOCS: {},
  CONFIDENTIAL_DISCLOSURES: {},
  authorizeConfidentialRead: () => false,
}));
vi.mock("@/lib/content/access-log", () => ({
  recordAccess: (e: unknown) => {
    if (!h.logOk) return false;
    h.logged.push(e);
    return true;
  },
}));
vi.mock("@/content/_generated/content", () => {
  const base = { sourceKind: "authored", source: "test", toc: [], body: null };
  return {
    CONTENT_NAV: [],
    CONTENT_DOCS: {
      "/g/commercial": { ...base, slug: "/g/commercial", title: "Commercial", tier: "commercial", orgId: null },
      "/g/org": { ...base, slug: "/g/org", title: "Org", tier: "commercial", orgId: "org-a" },
      "/g/embargo": { ...base, slug: "/g/embargo", title: "Embargo", tier: "commercial", orgId: null, embargoUntil: 9_999_999_999_999 },
      "/g/nda": { ...base, slug: "/g/nda", title: "NDA", tier: "commercial", orgId: null, disclosureRequired: true, disclosureId: "nda-x" },
      "/g/public": { ...base, slug: "/g/public", title: "Public", tier: "public", orgId: null, body: "PUBLIC" },
    },
  };
});
vi.mock("@/content/_generated/content-bodies", () => ({
  CONTENT_BODIES: {
    "/g/commercial": "COMMERCIAL-BODY",
    "/g/org": "ORG-BODY",
    "/g/embargo": "EMBARGO-BODY",
    "/g/nda": "NDA-BODY",
  },
}));

const commercial = (orgId: string | null = null) => ({
  required: true,
  authenticated: true,
  sub: "u:reader",
  kycStatus: "verified",
  entitlement: { tier: "commercial", orgId, expiresAt: null },
});

async function get(path: string, headers: Record<string, string> = {}) {
  const { GET } = await import("@/app/api/content/[...slug]/route");
  const res = await GET(new Request(`http://x/api/content${path}`, { headers }), {
    params: Promise.resolve({ slug: path.slice(1).split("/") }),
  });
  const text = await res.text();
  return { status: res.status, text };
}

beforeEach(() => {
  h.session = commercial();
  h.logOk = true;
  h.logged.length = 0;
});

describe("/api/content gated content-pipeline branch", () => {
  it("serves a commercial body to a commercial reader and logs the read", async () => {
    const r = await get("/g/commercial");
    expect(r.status).toBe(200);
    expect(r.text).toContain("COMMERCIAL-BODY");
    expect(h.logged).toHaveLength(1);
  });

  it("an anonymous or public-tier caller gets 404 and no body", async () => {
    h.session = { required: true, authenticated: false, kycStatus: "none" };
    const r = await get("/g/commercial");
    expect(r.status).toBe(404);
    expect(r.text).not.toContain("COMMERCIAL-BODY");
    expect(h.logged).toHaveLength(0);
  });

  it("an expired entitlement collapses to public and is refused", async () => {
    h.session = { ...commercial(), entitlement: { tier: "commercial", orgId: null, expiresAt: 1 } };
    const r = await get("/g/commercial");
    expect(r.status).toBe(404);
    expect(r.text).not.toContain("COMMERCIAL-BODY");
  });

  it("an org-scoped body is refused to another org's reader", async () => {
    h.session = commercial("org-b");
    const other = await get("/g/org");
    expect(other.status).toBe(404);
    expect(other.text).not.toContain("ORG-BODY");
    h.session = commercial("org-a");
    const own = await get("/g/org");
    expect(own.status).toBe(200);
    expect(own.text).toContain("ORG-BODY");
  });

  it("an embargoed body is withheld (423) even from an entitled reader", async () => {
    const r = await get("/g/embargo");
    expect(r.status).toBe(423);
    expect(r.text).not.toContain("EMBARGO-BODY");
  });

  it("a disclosure-gated body needs the matching acknowledgement", async () => {
    const none = await get("/g/nda");
    expect(none.status).toBe(412);
    expect(none.text).not.toContain("NDA-BODY");
    const wrong = await get("/g/nda", { "x-codex-ack": "other" });
    expect(wrong.status).toBe(412);
    const ok = await get("/g/nda", { "x-codex-ack": "nda-x" });
    expect(ok.status).toBe(200);
    expect(ok.text).toContain("NDA-BODY");
  });

  it("a read that cannot be access-logged is not served (503, no body)", async () => {
    h.logOk = false;
    const r = await get("/g/commercial");
    expect(r.status).toBe(503);
    expect(r.text).not.toContain("COMMERCIAL-BODY");
  });

  it("public docs are not served by this route", async () => {
    const r = await get("/g/public");
    expect(r.status).toBe(404);
  });
});
