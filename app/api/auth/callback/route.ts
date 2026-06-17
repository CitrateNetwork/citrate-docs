import {
  ACCESS_COOKIE, ID_COOKIE, PKCE_STATE_COOKIE, PKCE_VERIFIER_COOKIE, cookieValue,
} from "@/lib/auth/cookies";

/** OIDC redirect target: validate state, exchange code (PKCE) for tokens, set httpOnly session cookies. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const verifier = cookieValue(req, PKCE_VERIFIER_COOKIE);
  const expectedState = cookieValue(req, PKCE_STATE_COOKIE);

  if (!code || !state || !verifier || state !== expectedState) {
    return new Response("Invalid OIDC callback (state/PKCE mismatch).", { status: 400 });
  }
  const tokenEndpoint = process.env.OIDC_TOKEN_ENDPOINT;
  const clientId = process.env.OIDC_CLIENT_ID;
  const redirectUri = process.env.OIDC_REDIRECT_URI;
  if (!tokenEndpoint || !clientId || !redirectUri) return new Response("OIDC not configured.", { status: 500 });

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code, redirect_uri: redirectUri, client_id: clientId, code_verifier: verifier,
  });
  if (process.env.OIDC_CLIENT_SECRET) body.set("client_secret", process.env.OIDC_CLIENT_SECRET);

  const res = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return new Response("Token exchange failed.", { status: 502 });
  const tokens = (await res.json()) as { id_token?: string; access_token?: string };
  if (!tokens.id_token) return new Response("No id_token returned.", { status: 502 });

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const set = (n: string, v: string, maxAge: number) =>
    `${n}=${v}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
  const clear = (n: string) => `${n}=; Path=/; HttpOnly; Max-Age=0`;
  const h = new Headers({ Location: "/" });
  h.append("Set-Cookie", set(ID_COOKIE, tokens.id_token, 3600));
  if (tokens.access_token) h.append("Set-Cookie", set(ACCESS_COOKIE, tokens.access_token, 3600));
  h.append("Set-Cookie", clear(PKCE_VERIFIER_COOKIE));
  h.append("Set-Cookie", clear(PKCE_STATE_COOKIE));
  return new Response(null, { status: 302, headers: h });
}
