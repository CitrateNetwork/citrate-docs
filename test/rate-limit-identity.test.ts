/**
 * PBA-L3c-028: the MCP limiter keyed on the PRESENTED (unverified) API key, so
 * rotating bogus keys minted a fresh bucket per request.
 * PBA-L3c-030: the limiter keyed on the LEFT-most X-Forwarded-For hop (client
 * controlled) and was process-local only.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHash } from "node:crypto";
import { clientIp, enforceRateLimit, resetRateLimits } from "@/lib/security/rate-limit";

beforeEach(() => resetRateLimits());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function mcpReq(headers: Record<string, string>) {
  return new Request("http://x/api/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
  });
}

describe("MCP limiter identity (PBA-L3c-028)", () => {
  it("the audit PoC: 200 requests with rotating bogus keys from one IP are throttled", async () => {
    const { POST } = await import("@/app/api/mcp/route");
    let limited = 0;
    for (let i = 0; i < 200; i++) {
      const r = await POST(mcpReq({ "x-codex-api-key": `bogus-${i}`, "x-forwarded-for": "1.2.3.4" }));
      if (r.status === 429) limited++;
    }
    expect(limited).toBe(170); // 30/min per IP, bogus keys earn nothing
  });

  it("a VALID key is limited per verified subject, independent of IP", async () => {
    const KEY = "valid-partner-key";
    vi.stubEnv("MCP_API_KEYS", JSON.stringify({ [createHash("sha256").update(KEY).digest("hex")]: { tier: "commercial", sub: "org:acme" } }));
    const { POST } = await import("@/app/api/mcp/route");
    let limited = 0;
    for (let i = 0; i < 31; i++) {
      const r = await POST(mcpReq({ authorization: `Bearer ${KEY}`, "x-forwarded-for": `5.5.5.${i}` }));
      if (r.status === 429) limited++;
    }
    expect(limited).toBe(1);
  });
});

describe("client IP (PBA-L3c-030)", () => {
  const r = (h: Record<string, string>) => new Request("http://x", { headers: h });
  it("ignores client-prepended left hops: uses the right-most (proxy-appended) hop", () => {
    expect(clientIp(r({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" }))).toBe("9.9.9.9");
  });
  it("prefers x-vercel-forwarded-for (set by the platform)", () => {
    expect(clientIp(r({ "x-vercel-forwarded-for": "8.8.8.8", "x-forwarded-for": "6.6.6.6, 9.9.9.9" }))).toBe("8.8.8.8");
  });
  it("does not trust x-real-ip by default", () => {
    expect(clientIp(r({ "x-real-ip": "7.7.7.7" }))).toBe("unknown");
  });
  it("rotating the spoofable left hop does not mint new buckets", () => {
    let blocked = 0;
    for (let i = 0; i < 25; i++) {
      if (enforceRateLimit(r({ "x-forwarded-for": `10.0.0.${i}, 9.9.9.9` }), "t030", { limit: 20 })) blocked++;
    }
    expect(blocked).toBe(5);
  });
});

describe("shared store (PBA-L3c-030)", () => {
  it("with Upstash configured, the window counter lives in the store (cross-instance)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    const counts = new Map<string, number>();
    const fetchMock = vi.fn(async (_u: string, init: RequestInit) => {
      const cmds = JSON.parse(String(init.body)) as unknown[][];
      const k = String(cmds[0][1]);
      const n = (counts.get(k) ?? 0) + 1;
      counts.set(k, n);
      return new Response(JSON.stringify([{ result: n }, { result: 1 }]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const { enforceRateLimitShared } = await import("@/lib/security/rate-limit");
    const req = r2("4.4.4.4");
    // Another instance already spent this IP's window.
    for (let i = 0; i < 20; i++) await enforceRateLimitShared(req, "shared", { limit: 20 });
    resetRateLimits(); // this instance's memory is empty: only the store remembers
    const blocked = await enforceRateLimitShared(req, "shared", { limit: 20 });
    expect(blocked?.status).toBe(429);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("a store error falls back to the in-process window (fail open for these read paths)", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://upstash.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "t");
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("down"); }));
    const { enforceRateLimitShared } = await import("@/lib/security/rate-limit");
    expect(await enforceRateLimitShared(r2("3.3.3.3"), "fb", { limit: 1 })).toBeNull();
    expect((await enforceRateLimitShared(r2("3.3.3.3"), "fb", { limit: 1 }))?.status).toBe(429);
  });
});

function r2(ip: string) {
  return new Request("http://x", { headers: { "x-forwarded-for": ip } });
}
