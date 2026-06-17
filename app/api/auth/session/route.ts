import { verifySession } from "@/lib/auth/session";

/** The client (oidc mode) fetches this to get its resolved AuthSession + entitlement (never the token). */
export async function GET(req: Request) {
  const session = await verifySession(req);
  return Response.json(session, { headers: { "cache-control": "no-store" } });
}
