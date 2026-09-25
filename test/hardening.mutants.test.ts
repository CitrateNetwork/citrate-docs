/**
 * Mutation-kill tests for the docs R2 fixes (PBA-L3c-004/-028/-030/-036/-037, PBA-L8-017):
 * one assertion per decision a Stryker survivor showed was otherwise unobserved.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { checkSandboxGetLogs, MAX_SANDBOX_LOG_BLOCKS } from "@/lib/sandbox/log-bounds";
import { buildCsp } from "@/lib/security/csp";
import { clientIp, enforceRateLimitShared, resetRateLimits } from "@/lib/security/rate-limit";
// @ts-expect-error -- plain ESM helper
import { changelogRepos } from "@/scripts/lib/changelog-repos.mjs";

const ADDR = "0x1111111111111111111111111111111111111111";
const W = `0x${"ab".repeat(32)}`;
const base = { address: ADDR, fromBlock: "0x0", toBlock: "0x1" };
const err = (p: unknown[]) => {
  const r = checkSandboxGetLogs(p);
  if (r.ok) throw new Error("expected rejection");
  return r.error;
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("sandbox log bounds (PBA-L3c-036)", () => {
  it("accepts the full span and returns a rebuilt filter with only validated keys", () => {
    const last = `0x${(MAX_SANDBOX_LOG_BLOCKS - 1n).toString(16)}`;
    const input = { ...base, toBlock: last, topics: [W, null, [W, W, W, W]] };
    const r = checkSandboxGetLogs([input]);
    expect(r).toEqual({ ok: true, params: [{ address: ADDR, fromBlock: "0x0", toBlock: last, topics: [W, null, [W, W, W, W]] }] });
    if (r.ok) expect(r.params[0]).not.toBe(input);
    expect(checkSandboxGetLogs([base])).toStrictEqual({ ok: true, params: [{ ...base }] });
    expect(checkSandboxGetLogs([{ address: ADDR, blockHash: W }])).toEqual({ ok: true, params: [{ address: ADDR, blockHash: W }] });
    expect(checkSandboxGetLogs([{ ...base, fromBlock: "0x5", toBlock: "0x5" }]).ok).toBe(true);
  });
  it("names each refusal", () => {
    expect(err([])).toBe("eth_getLogs takes exactly one filter object");
    expect(err([base, base])).toBe("eth_getLogs takes exactly one filter object");
    expect(err([null])).toBe("eth_getLogs takes exactly one filter object");
    expect(err(["x"])).toBe("eth_getLogs takes exactly one filter object");
    expect(err([[base]])).toBe("eth_getLogs takes exactly one filter object");
    expect(err([{ ...base, limit: 1 }])).toBe('eth_getLogs does not accept "limit"');
    expect(err([{ ...base, address: `${ADDR}00` }])).toBe("eth_getLogs requires a single contract address");
    expect(err([{ ...base, address: `zz${ADDR}` }])).toBe("eth_getLogs requires a single contract address");
    expect(err([{ ...base, topics: [null, null, null, null, null] }])).toBe("eth_getLogs allows at most 4 topic positions of at most 4 32-byte words");
    expect(err([{ address: ADDR, blockHash: W, fromBlock: "0x0" }])).toBe("eth_getLogs cannot combine blockHash with a range");
    expect(err([{ address: ADDR, blockHash: W, toBlock: "0x0" }])).toBe("eth_getLogs cannot combine blockHash with a range");
    expect(err([{ address: ADDR, blockHash: `${W}00` }])).toBe("eth_getLogs blockHash must be a 32-byte hash");
    expect(err([{ address: ADDR, blockHash: `00${W}` }])).toBe("eth_getLogs blockHash must be a 32-byte hash");
    expect(err([{ ...base, fromBlock: "latest" }])).toBe("eth_getLogs requires explicit hex fromBlock and toBlock (no block tags)");
    expect(err([{ ...base, toBlock: undefined }])).toBe("eth_getLogs requires explicit hex fromBlock and toBlock (no block tags)");
    expect(err([{ ...base, toBlock: "0x1zz" }])).toBe("eth_getLogs requires explicit hex fromBlock and toBlock (no block tags)");
    expect(err([{ ...base, fromBlock: "x0x1" }])).toBe("eth_getLogs requires explicit hex fromBlock and toBlock (no block tags)");
    expect(err([{ ...base, fromBlock: "0x2", toBlock: "0x1" }])).toBe("eth_getLogs range must be 1 to 1000 blocks");
    expect(err([{ ...base, toBlock: `0x${MAX_SANDBOX_LOG_BLOCKS.toString(16)}` }])).toBe("eth_getLogs range must be 1 to 1000 blocks");
    // span, not sum
    expect(checkSandboxGetLogs([{ ...base, fromBlock: "0x3e8", toBlock: "0x3e8" }]).ok).toBe(true);
  });
  it("topic rules: 4 positions max; null/word/1-4 alternatives; every alternative a word", () => {
    const t = (topics: unknown) => checkSandboxGetLogs([{ ...base, topics }]).ok;
    expect(t([null, null, null, null])).toBe(true);
    expect(t([W])).toBe(true);
    expect(t([[W]])).toBe(true);
    expect(t(W)).toBe(false);
    expect(t(["0x12"])).toBe(false);
    expect(t([`${W}00`])).toBe(false);
    expect(t([`00${W}`])).toBe(false);
    expect(t([[]])).toBe(false);
    expect(t([[W, W, W, W, W]])).toBe(false);
    expect(t([[W, "0x12"]])).toBe(false);
    expect(t([["0x12", W]])).toBe(false);
    expect(t([[W, 5]])).toBe(false);
    expect(t([5])).toBe(false);
    expect(t([W, 5])).toBe(false);
  });
});

describe("CSP directives (PBA-L8-017)", () => {
  const parse = (csp: string) =>
    Object.fromEntries(csp.split(";").map((x) => x.trim()).filter(Boolean).map((x) => {
      const [k, ...v] = x.split(/\s+/);
      return [k, v.join(" ")];
    }));
  it("the full production policy", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(parse(buildCsp("n"))).toEqual({
      "default-src": "'self'",
      "script-src": "'self' 'nonce-n' 'strict-dynamic'",
      "style-src": "'self' 'unsafe-inline'",
      "img-src": "'self' data: blob: https:",
      "font-src": "'self' data:",
      "connect-src": "'self'",
      "frame-src": "'self'",
      "worker-src": "'self' blob:",
      "manifest-src": "'self'",
      "object-src": "'none'",
      "base-uri": "'self'",
      "form-action": "'self'",
      "frame-ancestors": "'none'",
      "upgrade-insecure-requests": "",
    });
    expect(buildCsp("n").endsWith("; upgrade-insecure-requests")).toBe(true);
  });
  it("adds 'unsafe-eval' in development only", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(parse(buildCsp("n"))["script-src"]).toBe("'self' 'nonce-n' 'strict-dynamic' 'unsafe-eval'");
    vi.stubEnv("NODE_ENV", "test");
    expect(parse(buildCsp("n"))["script-src"]).toBe("'self' 'nonce-n' 'strict-dynamic'");
  });
  it("the proxy matcher skips static assets and prefetches", async () => {
    const { config } = await import("@/proxy");
    expect(config.matcher).toEqual([
      {
        source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
        missing: [
          { type: "header", key: "next-router-prefetch" },
          { type: "header", key: "purpose", value: "prefetch" },
        ],
      },
    ]);
  });
  it("the proxy forwards the nonce and CSP on the request", async () => {
    const { default: proxy } = await import("@/proxy");
    const { NextRequest } = await import("next/server");
    const res = proxy(new NextRequest("https://docs.citrate.ai/x"));
    const fwd = res.headers.get("x-middleware-override-headers") ?? "";
    expect(fwd).toMatch(/x-nonce/);
    expect(fwd).toMatch(/content-security-policy/);
    const csp = res.headers.get("content-security-policy") ?? "";
    const nonce = /'nonce-([^']+)'/.exec(csp)?.[1];
    expect(res.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(res.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
  });
});

describe("clientIp / shared limiter (PBA-L3c-030)", () => {
  const r = (h: Record<string, string>) => new Request("http://x", { headers: h });
  beforeEach(() => resetRateLimits());
  it("x-vercel-forwarded-for (when trusted): first entry, trimmed", () => {
    vi.stubEnv("DOCS_TRUST_VERCEL_FORWARDED", "1");
    expect(clientIp(r({ "x-vercel-forwarded-for": " 8.8.8.8 , 1.1.1.1" }))).toBe("8.8.8.8");
  });
  it("x-forwarded-for: trims hops and honours DOCS_TRUSTED_PROXY_HOPS", () => {
    expect(clientIp(r({ "x-forwarded-for": "6.6.6.6 ,  9.9.9.9 " }))).toBe("9.9.9.9");
    vi.stubEnv("DOCS_TRUSTED_PROXY_HOPS", "2");
    expect(clientIp(r({ "x-forwarded-for": "6.6.6.6, 5.5.5.5, 9.9.9.9" }))).toBe("5.5.5.5");
    expect(clientIp(r({ "x-forwarded-for": "9.9.9.9" }))).toBe("unknown");
    vi.stubEnv("DOCS_TRUSTED_PROXY_HOPS", "0");
    expect(clientIp(r({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" }))).toBe("9.9.9.9");
    vi.stubEnv("DOCS_TRUSTED_PROXY_HOPS", "1.5");
    expect(clientIp(r({ "x-forwarded-for": "6.6.6.6, 9.9.9.9" }))).toBe("9.9.9.9");
  });
  it("empty hops are ignored; no usable hop is the shared unknown bucket", () => {
    expect(clientIp(r({ "x-forwarded-for": "1.1.1.1, " }))).toBe("1.1.1.1");
    expect(clientIp(r({}))).toBe("unknown");
    expect(clientIp(r({ "x-forwarded-for": " , " }))).toBe("unknown");
  });

  it("x-real-ip only with DOCS_TRUST_X_REAL_IP=1, trimmed", () => {
    vi.stubEnv("DOCS_TRUST_X_REAL_IP", "1");
    expect(clientIp(r({ "x-real-ip": " 7.7.7.7 " }))).toBe("7.7.7.7");
    expect(clientIp(r({}))).toBe("unknown");
  });
  it("the 429 body and headers", async () => {
    await enforceRateLimitShared(r({ "x-forwarded-for": "4.3.2.1" }), "b429", { limit: 1 });
    const res = await enforceRateLimitShared(r({ "x-forwarded-for": "4.3.2.1" }), "b429", { limit: 1 });
    expect(res!.status).toBe(429);
    expect(await res!.json()).toEqual({ ok: false, error: "rate_limited", retryAfter: 60, limit: 1 });
    expect(res!.headers.get("content-type")).toBe("application/json");
    expect(res!.headers.get("cache-control")).toBe("no-store");
    expect(res!.headers.get("retry-after")).toBe("60");
  });
  it("the store call: POST pipeline, bearer token, window-aligned key and TTL, reported retry", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(120_000 * 1000 + 15_000)); // 15 s into a 60 s window
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://u.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    const f = vi.fn(async (_u: string, _i: RequestInit) => new Response(JSON.stringify([{ result: 2 }, { result: 1 }]), { status: 200 }));
    vi.stubGlobal("fetch", f);
    const res = await enforceRateLimitShared(r({ "x-forwarded-for": "4.4.4.4" }), "st", { limit: 1 });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://u.invalid/pipeline");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual([
      ["INCR", "docs-rl:st:ip:4.4.4.4:2000"],
      ["EXPIRE", "docs-rl:st:ip:4.4.4.4:2000", 60, "NX"],
    ]);
    expect(res!.status).toBe(429);
    expect(res!.headers.get("retry-after")).toBe("45");
  });
  it("a sub-second window rounds up to 1 s; a subject key is used when given", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://u.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    const f = vi.fn(async () => new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 }));
    vi.stubGlobal("fetch", f);
    expect(await enforceRateLimitShared(r({}), "w", { limit: 5, windowMs: 200 }, "org:acme")).toBeNull();
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body[0][1]).toMatch(/^docs-rl:w:sub:org:acme:\d+$/);
    expect(body[1][2]).toBe(1);
  });
  it("count == limit is still allowed; the limit is the caller's, not 1", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://u.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ result: 5 }, { result: 1 }]), { status: 200 })));
    expect(await enforceRateLimitShared(r({ "x-forwarded-for": "4.6.6.6" }), "eq", { limit: 5 })).toBeNull();
    expect((await enforceRateLimitShared(r({ "x-forwarded-for": "4.6.6.6" }), "eq", { limit: 4 }))?.status).toBe(429);
  });

  it("the store is used only when BOTH the URL and the token are set", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://u.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const f = vi.fn();
    vi.stubGlobal("fetch", f);
    await enforceRateLimitShared(r({ "x-forwarded-for": "4.7.7.7" }), "both", { limit: 5 });
    expect(f).not.toHaveBeenCalled();
  });

  it("a non-2xx or malformed store answer falls back to the in-process window", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://u.invalid");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "tok");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ result: 99 }, { result: 1 }]), { status: 500 })));
    expect(await enforceRateLimitShared(r({ "x-forwarded-for": "4.5.6.7" }), "nf", { limit: 5 })).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{}]), { status: 200 })));
    expect(await enforceRateLimitShared(r({ "x-forwarded-for": "4.5.6.8" }), "nf", { limit: 5 })).toBeNull();
  });
});

describe("changelog repo policy (PBA-L3c-037)", () => {
  it("MEM_DEFAULT_TIER=public opens unlisted candidates (as it does for chat)", () => {
    expect(changelogRepos({ MEM_DEFAULT_TIER: "public", CHANGELOG_REPOS: " citrate-docs , citrate-chain " })).toEqual(["citrate-docs", "citrate-chain"]);
  });
  it("a blank or malformed override falls back to the declared defaults", () => {
    expect(changelogRepos({ MEMORY_REPO_TIERS: "   ", MEM_DEFAULT_TIER: "public", CHANGELOG_REPOS: "citrate-docs" })).toEqual(["citrate-docs"]);
    expect(changelogRepos({ MEMORY_REPO_TIERS: "{not json", CHANGELOG_REPOS: "citrate-docs" })).toEqual([]);
  });
  it("empty entries in CHANGELOG_REPOS are dropped", () => {
    expect(changelogRepos({ MEM_DEFAULT_TIER: "public", CHANGELOG_REPOS: "citrate-docs,, ," })).toEqual(["citrate-docs"]);
  });

  it("the default candidate list is used when CHANGELOG_REPOS is unset", () => {
    expect(changelogRepos({ MEM_DEFAULT_TIER: "public" })).toEqual([
      "citrate-chain", "citrate-core", "citrate-inference-gateway", "citrate-identity", "citrate-docs", "citrate-sdk-js",
    ]);
  });
  it("an override cannot mark a repo public past a non-public default when it names another tier", () => {
    expect(changelogRepos({ MEMORY_REPO_TIERS: JSON.stringify({ "citrate-docs": "commercial" }), MEM_DEFAULT_TIER: "public", CHANGELOG_REPOS: "citrate-docs" })).toEqual([]);
  });
});

describe("verifier killers (KD4 + topic copy)", () => {
  it("KD4: array-wrapped fromBlock/toBlock refused by the sandbox guard", () => {
    expect(checkSandboxGetLogs([{ address: ADDR, fromBlock: ["0x0"], toBlock: ["0x1"] }]).ok).toBe(false);
  });
  it("topics are rebuilt, not forwarded by reference", () => {
    const alt = [W];
    const topics = [W, alt];
    const r = checkSandboxGetLogs([{ ...base, topics }]);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.params[0].topics).toEqual(topics);
      expect(r.params[0].topics).not.toBe(topics);
      expect((r.params[0].topics as unknown[])[1]).not.toBe(alt);
    }
  });
});
