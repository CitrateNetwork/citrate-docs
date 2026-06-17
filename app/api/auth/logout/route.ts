import { ACCESS_COOKIE, ID_COOKIE } from "@/lib/auth/cookies";

/** Clear the session cookies and (optionally) bounce through the authority end-session endpoint. */
export async function GET() {
  const clear = (n: string) => `${n}=; Path=/; HttpOnly; Max-Age=0`;
  const end = process.env.OIDC_END_SESSION_ENDPOINT;
  const h = new Headers({ Location: end || "/" });
  h.append("Set-Cookie", clear(ID_COOKIE));
  h.append("Set-Cookie", clear(ACCESS_COOKIE));
  return new Response(null, { status: 302, headers: h });
}
