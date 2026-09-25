import type { NextConfig } from "next";

/**
 * Static security headers (PBA-L8-017 / PBA-L3c-029), mirroring citrate-explorer.
 *
 * docs.citrate.ai is an authenticated app (gated tiers, chat, MCP, sandbox APIs); it shipped only a
 * bare HSTS and `x-powered-by`. The CSP is NOT here: a static header cannot carry a per-request nonce,
 * so it is built per request in proxy.ts from lib/security/csp.ts (nonce + strict-dynamic, no
 * 'unsafe-inline' script, frame-ancestors 'none').
 */
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
