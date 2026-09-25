/**
 * Per-request CSP nonce (PBA-L8-017 / PBA-L3c-029), the same shape as citrate-explorer's proxy:
 *
 *  1. mint a fresh random nonce for every request,
 *  2. set the nonce'd CSP on the FORWARDED REQUEST headers (Next reads `content-security-policy`
 *     during SSR and stamps the nonce onto its framework <script> tags),
 *  3. expose the nonce as `x-nonce` (app/layout.tsx reads it, which keeps every route dynamic),
 *  4. mirror the CSP onto the RESPONSE so the browser enforces it.
 *
 * The static, request-independent headers (HSTS, nosniff, X-Frame-Options, ...) live in next.config.ts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { buildCsp } from "@/lib/security/csp";

export default function proxy(request: NextRequest) {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = btoa(String.fromCharCode(...bytes));
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Everything except build-time static assets (no nonce, not documents).
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
