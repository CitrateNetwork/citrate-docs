import { createHash, randomBytes } from "node:crypto";
import { PKCE_STATE_COOKIE, PKCE_VERIFIER_COOKIE } from "@/lib/auth/cookies";

/** Begin the OIDC Authorization Code + PKCE flow against citrate-identity (auth.citrate.ai). */
export async function GET() {
  const authEndpoint = process.env.OIDC_AUTH_ENDPOINT;
  const clientId = process.env.OIDC_CLIENT_ID;
  const redirectUri = process.env.OIDC_REDIRECT_URI;
  const scope = process.env.OIDC_SCOPES || "openid profile wallet kyc offline_access";
  if (!authEndpoint || !clientId || !redirectUri) {
    return new Response("OIDC not configured (set OIDC_AUTH_ENDPOINT, OIDC_CLIENT_ID, OIDC_REDIRECT_URI).", { status: 500 });
  }
  const b64 = (b: Buffer) => b.toString("base64url");
  const verifier = b64(randomBytes(32));
  const challenge = b64(createHash("sha256").update(verifier).digest());
  const state = b64(randomBytes(16));

  const url = new URL(authEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", scope);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const set = (n: string, v: string) => `${n}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
  const h = new Headers({ Location: url.toString() });
  h.append("Set-Cookie", set(PKCE_VERIFIER_COOKIE, verifier));
  h.append("Set-Cookie", set(PKCE_STATE_COOKIE, state));
  return new Response(null, { status: 302, headers: h });
}
