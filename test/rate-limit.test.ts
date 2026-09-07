import { describe, it, expect, beforeEach } from "vitest";
import { checkRateLimit, enforceRateLimit, resetRateLimits } from "@/lib/security/rate-limit";

beforeEach(() => resetRateLimits());

function reqFromIp(ip: string): Request {
  return new Request("http://localhost/api/sandbox/infer", {
    method: "POST",
    headers: { "x-forwarded-for": ip },
  });
}

describe("rate limiter (DOC-B-007)", () => {
  it("allows up to the limit then blocks with a positive Retry-After", () => {
    const opts = { limit: 5, windowMs: 60_000 };
    let last;
    for (let i = 0; i < 5; i++) last = checkRateLimit("k", opts, 1000);
    expect(last!.allowed).toBe(true);
    const over = checkRateLimit("k", opts, 1000);
    expect(over.allowed).toBe(false);
    expect(over.retryAfter).toBeGreaterThan(0);
  });

  it("resets after the window elapses", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(checkRateLimit("w", opts, 0).allowed).toBe(true);
    expect(checkRateLimit("w", opts, 0).allowed).toBe(false);
    expect(checkRateLimit("w", opts, 2000).allowed).toBe(true); // new window
  });

  it("separates callers by IP", () => {
    const opts = { limit: 1 };
    expect(enforceRateLimit(reqFromIp("1.1.1.1"), "s", opts)).toBeNull();
    expect(enforceRateLimit(reqFromIp("2.2.2.2"), "s", opts)).toBeNull(); // different IP, own bucket
    const blocked = enforceRateLimit(reqFromIp("1.1.1.1"), "s", opts); // same IP again → over limit
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("retry-after")).toBeTruthy();
  });
});

describe("sandbox/infer route enforces the limiter (DOC-B-007 integration)", () => {
  it("returns 429 once the per-IP window is exhausted", async () => {
    const { POST } = await import("@/app/api/sandbox/infer/route");
    const ip = "9.9.9.9";
    let status = 0;
    for (let i = 0; i < 21; i++) {
      const res = await POST(reqFromIp(ip));
      status = res.status;
    }
    // 20 allowed (each 503 fail-closed since no gateway key in test env), 21st is 429.
    expect(status).toBe(429);
  });
});
