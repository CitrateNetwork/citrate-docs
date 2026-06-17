/**
 * Auth-cookie plumbing (lifted from citrate-explorer/src/lib/auth/cookies.ts).
 * OIDC tokens + the PKCE handshake live in httpOnly cookies — never in web storage, never readable by
 * page script. Web-standard Request/Headers only.
 */
export const ID_COOKIE = "citrate_oidc_id";       // the OIDC ID token (the app's session credential)
export const ACCESS_COOKIE = "citrate_oidc_access"; // authority access token (logout/userinfo)
export const PKCE_VERIFIER_COOKIE = "citrate_pkce_verifier";
export const PKCE_STATE_COOKIE = "citrate_pkce_state";

export function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function cookieValue(req: Request, name: string): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}
