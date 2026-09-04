/**
 * The single, shared auth-mode resolver (S2). It is imported by BOTH the server verifier
 * (lib/auth/session.ts) and the client provider (components/providers.tsx) so the two halves can never
 * diverge — the divergence was DOC-B-002, where the client failed OPEN to the fixture tier-switcher for
 * every NEXT_PUBLIC_AUTH_MODE except the literal "oidc" (including unset and the "dev" that .env.example
 * shipped), while the server failed CLOSED onto the verifying path.
 *
 * Fail-closed contract (identical to the server's prior resolveServerAuthMode):
 *   - "oidc"                         → "oidc"   (verify a citrate-identity JWT; the real auth path)
 *   - "mock"  + non-production       → "mock"   (dev only: unsigned token / dev-viewer header / fixtures)
 *   - "mock"  + production           → "mock-disabled" (unless ALLOW_MOCK_AUTH=1 for a non-public staging)
 *   - anything else (unset, "", "dev", "OIDC", garbage) → "oidc"  (NEVER the fixture switcher)
 *
 * NOTE for the client bundle: only NEXT_PUBLIC_* and NODE_ENV are inlined into the browser build, so
 * `env.ALLOW_MOCK_AUTH` is undefined there. That is intentional — it means a production browser build with
 * NEXT_PUBLIC_AUTH_MODE=mock resolves to "mock-disabled", i.e. the real oidc path, not the fixtures.
 */
export type AuthMode = "oidc" | "mock" | "mock-disabled";

export function resolveAuthMode(env: Record<string, string | undefined> = process.env): AuthMode {
  const requested = env.NEXT_PUBLIC_AUTH_MODE;
  if (requested === "oidc") return "oidc";
  if (requested === "mock") {
    if (env.NODE_ENV === "production" && env.ALLOW_MOCK_AUTH !== "1") return "mock-disabled";
    return "mock";
  }
  return "oidc"; // fail closed onto the verifying path — never the fixture tier-switcher
}
