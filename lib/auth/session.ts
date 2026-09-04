/**
 * Server-side session verification — the server half of the Codex auth seam (S2), adapted from
 * citrate-explorer/src/lib/auth/session.ts. `verifySession(req)` is the ONLY identity check; it returns
 * a normalized AuthSession (the SAME shape the fixtures use) regardless of issuer, and attaches the
 * resolved entitlement (tier/org/role/expiry) via resolveEntitlement().
 *
 * Modes (fail-closed, lifted from explorer WEB-1/FUA-EXPLORER-01):
 *  - oidc  — verify a citrate-identity JWT against the authority JWKS (issuer + audience BOTH enforced).
 *  - mock  — dev only: unsigned token / dev header; disabled in production unless ALLOW_MOCK_AUTH=1.
 * Unset/unknown mode → oidc (rejects until a JWKS is configured — never fail open).
 */
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { AuthSession } from "@/prototype/fixtures";
import { ID_COOKIE, cookieValue } from "./cookies";
import { resolveEntitlement } from "./entitlement";
import { type AuthMode, resolveAuthMode } from "./auth-mode";

// Kept as a stable alias for existing callers. The resolution itself lives in the shared, client+server
// module lib/auth/auth-mode.ts so the browser provider cannot diverge from the server (DOC-B-002).
export type ServerAuthMode = AuthMode;
export const resolveServerAuthMode = resolveAuthMode;

const MODE = resolveServerAuthMode();

function tokenFromRequest(req: Request): string | null {
  const header = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return header || cookieValue(req, ID_COOKIE);
}

function normKyc(v: unknown): AuthSession["kycStatus"] {
  const s = String(v ?? "none");
  if (s === "verified" || s === "pending" || s === "revoked" || s === "none") return s;
  if (s === "expired") return "revoked";
  return "none";
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
function jwkSet() {
  const url = process.env.OIDC_JWKS_URL;
  if (!url) throw new Error("OIDC_JWKS_URL is not set");
  if (!jwks) jwks = createRemoteJWKSet(new URL(url));
  return jwks;
}

let warnedOidc = false;

async function verifyOidc(req: Request): Promise<AuthSession> {
  const token = tokenFromRequest(req);
  if (!token) return { required: true, authenticated: false, kycStatus: "none" };
  const issuer = process.env.OIDC_ISSUER;
  const audience = process.env.OIDC_AUDIENCE;
  if (!issuer || !audience || !process.env.OIDC_JWKS_URL) {
    if (!warnedOidc) {
      warnedOidc = true;
      console.error("[auth] oidc mode needs OIDC_ISSUER + OIDC_AUDIENCE + OIDC_JWKS_URL; refusing all tokens until set (fail closed).");
    }
    return { required: true, authenticated: false, kycStatus: "none" };
  }
  try {
    const { payload } = await jwtVerify(token, jwkSet(), { issuer, audience });
    const sub = payload.sub as string | undefined;
    const walletAddress = (payload.wallet_address as string | undefined)?.toLowerCase();
    const email = payload.email as string | undefined;
    const kycStatus = normKyc(payload.kyc_status);
    const entitlement = resolveEntitlement(payload as Record<string, unknown>, { sub, walletAddress, email, kycStatus });
    return { required: true, authenticated: Boolean(sub), sub, walletAddress, email, kycStatus, entitlement };
  } catch {
    return { required: true, authenticated: false, kycStatus: "none" };
  }
}

let warnedMockDisabled = false;

function verifyMock(req: Request): AuthSession {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || cookieValue(req, ID_COOKIE);
  if (token) {
    try {
      const json = JSON.parse(Buffer.from(token, "base64url").toString("utf8"));
      const sub = json.sub as string | undefined;
      const walletAddress = (json.wallet_address as string | undefined)?.toLowerCase();
      const email = json.email as string | undefined;
      const kycStatus = normKyc(json.kyc_status);
      if (sub || walletAddress) {
        const entitlement = resolveEntitlement(json, { sub, walletAddress, email, kycStatus });
        return { required: false, authenticated: true, sub, walletAddress, email, kycStatus, entitlement };
      }
    } catch {
      /* fall through */
    }
  }
  return { required: false, authenticated: false, kycStatus: "none" };
}

export async function verifySession(req: Request): Promise<AuthSession> {
  if (MODE === "oidc") return verifyOidc(req);
  if (MODE === "mock-disabled") {
    if (!warnedMockDisabled) {
      warnedMockDisabled = true;
      console.error("[auth] NEXT_PUBLIC_AUTH_MODE=mock is DISABLED in production (forged-token risk). Set oidc, or ALLOW_MOCK_AUTH=1 for non-public staging.");
    }
    return { required: true, authenticated: false, kycStatus: "none" };
  }
  return verifyMock(req);
}

/** The canonical owner key (SR-0): the OIDC subject, verbatim (case-sensitive). */
export function sessionOwner(s: AuthSession): string | null {
  return s.sub ?? null;
}
