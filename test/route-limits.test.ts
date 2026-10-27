/**
 * Every unauthenticated route that fans out to a paid or shared backend applies the limiter at the
 * route itself. rate-limit.test.ts pins sandbox/infer; this file pins the chat and sandbox/relay
 * routes. Memory and the model provider are mocked so no test request leaves the process.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetRateLimits } from "@/lib/security/rate-limit";

vi.mock("@/lib/ai/memory", () => ({ searchMemory: async () => [] }));
vi.mock("@/lib/ai/provider", () => ({ answer: async () => ({ text: "ok", sources: [] }) }));

beforeEach(() => {
  resetRateLimits();
  delete process.env.CITRATE_RELAY_URL; // relay route fails closed (503) before any fetch
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

function req(path: string, ip: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "POST",
    headers: { "x-forwarded-for": ip, "content-type": "application/json" },
    body: JSON.stringify({ query: "what is citrate" }),
  });
}

async function statuses(post: (r: Request) => Promise<Response>, path: string, ip: string, n: number) {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push((await post(req(path, ip))).status);
  return out;
}

describe("route-level limiter", () => {
  it("/api/chat returns 429 after 20 requests from one IP", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const s = await statuses(POST, "/api/chat", "7.7.7.7", 21);
    expect(s.slice(0, 20).every((x) => x !== 429)).toBe(true);
    expect(s[20]).toBe(429);
  });

  it("/api/sandbox/relay returns 429 after 10 requests from one IP", async () => {
    const { POST } = await import("@/app/api/sandbox/relay/route");
    const s = await statuses(POST, "/api/sandbox/relay", "8.8.4.4", 11);
    expect(s.slice(0, 10).every((x) => x === 503)).toBe(true); // fail-closed: no relay configured
    expect(s[10]).toBe(429);
  });

  it("the relay limit is per IP: another caller is not throttled by the first", async () => {
    const { POST } = await import("@/app/api/sandbox/relay/route");
    await statuses(POST, "/api/sandbox/relay", "8.8.4.4", 11);
    const other = await POST(req("/api/sandbox/relay", "1.0.0.1"));
    expect(other.status).toBe(503);
  });
});
