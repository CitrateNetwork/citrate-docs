/**
 * PBA-L8-017 / PBA-L3c-029: docs.citrate.ai (an authenticated app with chat, MCP
 * and sandbox APIs, rendering model-generated mermaid SVG via innerHTML) sent
 * only HSTS (no includeSubDomains) and `x-powered-by: Next.js`: no CSP, no
 * frame-ancestors / X-Frame-Options (clickjacking of the gated tiers), no
 * nosniff. The explorer's posture is the bar: static headers in next.config and
 * a per-request nonce CSP from the proxy.
 */
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..");

describe("static security headers (next.config.ts)", () => {
  it("drops x-powered-by and sets HSTS(includeSubDomains), nosniff, XFO DENY, referrer + permissions policy", async () => {
    const cfg = (await import("@/next.config")).default;
    expect(cfg.poweredByHeader).toBe(false);
    expect(typeof cfg.headers).toBe("function");
    const rules = await cfg.headers!();
    const all = rules.find((r) => r.source === "/:path*");
    expect(all).toBeDefined();
    const h = Object.fromEntries(all!.headers.map((x) => [x.key.toLowerCase(), x.value]));
    expect(h["strict-transport-security"]).toMatch(/max-age=\d{8,}/);
    expect(h["strict-transport-security"]).toMatch(/includeSubDomains/);
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["permissions-policy"]).toMatch(/camera=\(\)/);
  });

  it("the CSP is not static (a static header cannot carry a per-request nonce)", () => {
    expect(readFileSync(join(ROOT, "next.config.ts"), "utf8")).not.toMatch(/Content-Security-Policy/i);
  });
});

describe("per-request nonce CSP (proxy.ts + lib/security/csp.ts)", () => {
  it("a proxy exists and sets the CSP on the request and the response", () => {
    expect(existsSync(join(ROOT, "proxy.ts"))).toBe(true);
    const src = readFileSync(join(ROOT, "proxy.ts"), "utf8");
    expect(src).toMatch(/requestHeaders\.set\("content-security-policy"/);
    expect(src).toMatch(/response\.headers\.set\("content-security-policy"/);
  });

  it("the policy: nonce + strict-dynamic, no unsafe-inline script, frame-ancestors none, object-src none", async () => {
    const { buildCsp } = await import("@/lib/security/csp");
    const csp = buildCsp("n0nce");
    const d = Object.fromEntries(
      csp.split(";").map((x) => x.trim()).filter(Boolean).map((x) => {
        const [k, ...v] = x.split(/\s+/);
        return [k, v.join(" ")];
      }),
    );
    expect(d["script-src"]).toContain("'nonce-n0nce'");
    expect(d["script-src"]).toContain("'strict-dynamic'");
    expect(d["script-src"]).not.toContain("unsafe-inline");
    expect(d["frame-ancestors"]).toBe("'none'");
    expect(d["object-src"]).toBe("'none'");
    expect(d["base-uri"]).toBe("'self'");
    expect(d["form-action"]).toBe("'self'");
    expect(d["default-src"]).toBe("'self'");
    expect(d["connect-src"]).toBe("'self'");
  });

  it("the proxy mints a fresh nonce per request and mirrors the CSP onto the response", async () => {
    const { default: proxy } = await import("@/proxy");
    const { NextRequest } = await import("next/server");
    const a = proxy(new NextRequest("https://docs.citrate.ai/chain/rpc"));
    const b = proxy(new NextRequest("https://docs.citrate.ai/chain/rpc"));
    const ca = a.headers.get("content-security-policy") ?? "";
    const cb = b.headers.get("content-security-policy") ?? "";
    expect(ca).toMatch(/'nonce-[A-Za-z0-9+/=]{16,}'/);
    expect(ca).not.toBe(cb);
  });

  it("the root layout reads the nonce (forces dynamic rendering so every page gets one)", () => {
    expect(readFileSync(join(ROOT, "app", "layout.tsx"), "utf8")).toMatch(/\(await headers\(\)\)\.get\("x-nonce"\)/);
  });
});
