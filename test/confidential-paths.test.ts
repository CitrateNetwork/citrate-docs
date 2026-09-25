/**
 * PBA-L3c-004 (KNOWN-OPEN, incomplete fix of CIT-DOCS-004): every exported path
 * that returns a document BODY must go through the same confidential-read
 * chokepoint as /api/content: authorizeConfidentialRead (tier/org/role),
 * embargo, disclosure acknowledgement, and a fail-closed access log.
 *
 * The public repo ships an empty confidential store, so the private overlay is
 * simulated here with an overlay-faithful gate (role must be in allowedRoles).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

const store = vi.hoisted(() => {
  const base = { tier: "confidential", orgId: null } as const;
  const docs: Record<string, Record<string, unknown>> = {
    "/confidential/funding": { ...base, slug: "/confidential/funding", title: "Cap table funding", body: "SECRET-CAP-TABLE-BODY funding", allowedRoles: ["admin", "exec"] },
    "/confidential/embargoed": { ...base, slug: "/confidential/embargoed", title: "Embargoed funding", body: "EMBARGOED-BODY funding", embargoUntil: 9_999_999_999_999 },
    "/confidential/nda": { ...base, slug: "/confidential/nda", title: "NDA funding", body: "NDA-BODY funding", disclosureRequired: true, disclosureId: "nda-1" },
    "/confidential/open": { ...base, slug: "/confidential/open", title: "Open funding memo", body: "OPEN-CONFIDENTIAL-BODY funding" },
  };
  return { docs, logged: [] as unknown[], logOk: true };
});

vi.mock("@/lib/content/confidential-store", () => ({
  CONFIDENTIAL_DOCS: store.docs,
  CONFIDENTIAL_DISCLOSURES: {},
  authorizeConfidentialRead: (s: { entitlement?: { tier?: string; citrateRole?: string } }, d: { allowedRoles?: string[] }) =>
    s?.entitlement?.tier === "confidential" && (!d.allowedRoles || d.allowedRoles.includes(s.entitlement?.citrateRole ?? "")),
}));
vi.mock("@/lib/content/access-log", () => ({
  recordAccess: (e: unknown) => {
    if (!store.logOk) return false;
    store.logged.push(e);
    return true;
  },
}));

const KEY = "partner-key-confidential-no-role";
process.env.MCP_API_KEYS = JSON.stringify({
  [createHash("sha256").update(KEY).digest("hex")]: { tier: "confidential", sub: "org:partner" },
});

const NOW = Date.now();
const confNoRole = { required: true, authenticated: true, sub: "u:partner", kycStatus: "verified", entitlement: { tier: "confidential", orgId: null, expiresAt: null } } as never;
const confAdmin = { required: true, authenticated: true, sub: "u:admin", kycStatus: "verified", entitlement: { tier: "confidential", orgId: null, expiresAt: null, citrateRole: "admin" } } as never;

async function mcpCall(name: string, args: Record<string, unknown>) {
  const { POST } = await import("@/app/api/mcp/route");
  const res = await POST(
    new Request("http://x/api/mcp", {
      method: "POST",
      headers: { authorization: `Bearer ${KEY}`, "content-type": "application/json", "x-forwarded-for": `10.4.0.${Math.floor(Math.random() * 250)}` },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name, arguments: args } }),
    }),
  );
  return (await res.json()).result;
}

beforeEach(() => {
  store.logged.length = 0;
  store.logOk = true;
});

describe("MCP getSurface (PBA-L3c-004 D01)", () => {
  it("the audit PoC: a confidential key without the role gets no body", async () => {
    const r = await mcpCall("getSurface", { slug: "/confidential/funding" });
    expect(JSON.stringify(r)).not.toContain("SECRET-CAP-TABLE-BODY");
    expect(r.error).toBe("not_found_or_above_tier");
  });

  it("an embargoed doc is withheld", async () => {
    const r = await mcpCall("getSurface", { slug: "/confidential/embargoed" });
    expect(JSON.stringify(r)).not.toContain("EMBARGOED-BODY");
    expect(r.error).toBe("embargo");
  });

  it("a disclosure-gated doc needs the matching ack", async () => {
    const no = await mcpCall("getSurface", { slug: "/confidential/nda" });
    expect(JSON.stringify(no)).not.toContain("NDA-BODY");
    expect(no.error).toBe("disclosure_required");
    const wrong = await mcpCall("getSurface", { slug: "/confidential/nda", ack: "other" });
    expect(wrong.error).toBe("disclosure_required");
    const yes = await mcpCall("getSurface", { slug: "/confidential/nda", ack: "nda-1" });
    expect(yes.body).toBe("NDA-BODY funding");
  });

  it("an authorized confidential read is access-logged", async () => {
    const r = await mcpCall("getSurface", { slug: "/confidential/open" });
    expect(r.body).toBe("OPEN-CONFIDENTIAL-BODY funding");
    expect(store.logged).toEqual([expect.objectContaining({ sub: "org:partner", docSlug: "/confidential/open", tier: "confidential" })]);
  });

  it("a confidential read that cannot be logged is not served", async () => {
    store.logOk = false;
    const r = await mcpCall("getSurface", { slug: "/confidential/open" });
    expect(JSON.stringify(r)).not.toContain("OPEN-CONFIDENTIAL-BODY");
    expect(r.error).toBe("access_log_unavailable");
  });
});

describe("retrieve() — chat + MCP searchDocs (PBA-L3c-004)", () => {
  it("a confidential session without the role never retrieves the role-scoped doc", async () => {
    const { retrieve } = await import("@/lib/ai/corpus");
    const hits = retrieve(confNoRole, "funding", 20, NOW).map((c) => c.slug);
    expect(hits).not.toContain("/confidential/funding");
    expect(hits).toContain("/confidential/open");
  });

  it("the named principal does retrieve it", async () => {
    const { retrieve } = await import("@/lib/ai/corpus");
    expect(retrieve(confAdmin, "funding", 20, NOW).map((c) => c.slug)).toContain("/confidential/funding");
  });

  it("embargoed and disclosure-gated docs never enter RAG, even for the admin", async () => {
    const { retrieve } = await import("@/lib/ai/corpus");
    const hits = retrieve(confAdmin, "funding", 20, NOW).map((c) => c.slug);
    expect(hits).not.toContain("/confidential/embargoed");
    expect(hits).not.toContain("/confidential/nda");
  });

  it("each confidential chunk served is access-logged; unloggable chunks are dropped", async () => {
    const { retrieve } = await import("@/lib/ai/corpus");
    retrieve(confAdmin, "funding", 20, NOW);
    expect(store.logged.map((e) => (e as { docSlug: string }).docSlug).sort()).toEqual(["/confidential/funding", "/confidential/open"]);
    store.logOk = false;
    expect(retrieve(confAdmin, "funding", 20, NOW).filter((c) => c.tier === "confidential")).toEqual([]);
  });

  it("MCP searchDocs with a no-role confidential key does not list the role-scoped doc", async () => {
    const r = await mcpCall("searchDocs", { query: "funding" });
    const slugs = r.results.map((x: { slug: string }) => x.slug);
    expect(slugs).not.toContain("/confidential/funding");
  });
});

describe("source tripwire (PBA-L3c-004)", () => {
  it("every module that reads CONFIDENTIAL_DOCS bodies also applies authorizeConfidentialRead", async () => {
    const { readFileSync, readdirSync, statSync } = await import("node:fs");
    const { join, relative } = await import("node:path");
    const root = join(__dirname, "..");
    const walk = (d: string, out: string[] = []): string[] => {
      for (const n of readdirSync(d)) {
        if (n === "node_modules" || n.startsWith(".")) continue;
        const p = join(d, n);
        if (statSync(p).isDirectory()) walk(p, out);
        else if (/\.(ts|tsx)$/.test(n) && !/\.test\.ts$/.test(n)) out.push(p);
      }
      return out;
    };
    const offenders = ["app", "lib", "components"]
      .flatMap((d) => walk(join(root, d)))
      .filter((f) => !f.endsWith(join("lib", "content", "confidential-store.ts")))
      .filter((f) => {
        const src = readFileSync(f, "utf8");
        return /\bCONFIDENTIAL_DOCS\b/.test(src) && !/authorizeConfidentialRead\(/.test(src);
      })
      .map((f) => relative(root, f));
    expect(offenders).toEqual([]);
  });

  it("corpus exports no un-gated body accessor", async () => {
    const corpus = await import("@/lib/ai/corpus");
    expect("getSurface" in corpus).toBe(false);
  });
});
