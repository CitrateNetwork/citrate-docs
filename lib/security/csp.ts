/**
 * Content-Security-Policy for docs.citrate.ai (PBA-L8-017 / PBA-L3c-029), mirroring the
 * citrate-explorer policy (src/lib/security/csp.ts there).
 *
 * Built per request in `proxy.ts` with a fresh nonce, so script-src needs no 'unsafe-inline':
 *  - `'nonce-<random>'`: Next reads the CSP request header during SSR and stamps the nonce on its own
 *    framework scripts; the root layout reads `x-nonce`, which also makes every route dynamic (a
 *    prerendered page would carry no nonce).
 *  - `'strict-dynamic'`: scripts loaded by nonce'd scripts (the Next runtime, the lazily imported
 *    mermaid chunk) are trusted transitively.
 *
 * This is the second layer behind mermaid's `securityLevel: "strict"` for the model-generated diagram
 * SVG that lib/md.tsx sets via innerHTML: an injected inline handler or <script> cannot run.
 *
 * Documented relaxation (same as the explorer): `style-src 'unsafe-inline'`. Mermaid emits a <style>
 * element inside each SVG and the design uses inline style attributes; style injection is not script
 * execution. The browser only talks to this origin (every API is same-origin), so connect-src is 'self'.
 * `'unsafe-eval'` is added in development only (React Refresh).
 */
export function buildCsp(nonce: string): string {
  const dev = process.env.NODE_ENV === "development";
  const directives: Record<string, string> = {
    "default-src": "'self'",
    "script-src": `'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
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
  };
  return Object.entries(directives)
    .map(([k, v]) => (v ? `${k} ${v}` : k))
    .join("; ");
}
