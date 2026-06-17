import { AuthSession, VIEWERS_BY_ID } from "@/prototype/fixtures";
import { resolveServerAuthMode, verifySession } from "./session";

/**
 * Resolve the caller's session for any gated API route (content gateway, chat, MCP).
 * oidc → the server-verified JWT session; mock/dev → trust the `x-codex-dev-viewer` header (only honored
 * when resolveServerAuthMode()==="mock", which in production requires the explicit ALLOW_MOCK_AUTH=1 —
 * the secure default is oidc/fail-closed, so an unset deploy never trusts the dev header).
 */
export async function resolveRequestSession(req: Request): Promise<AuthSession> {
  if (resolveServerAuthMode() === "oidc") return verifySession(req);
  const id = req.headers.get("x-codex-dev-viewer");
  if (id && VIEWERS_BY_ID[id]) return VIEWERS_BY_ID[id].session;
  return verifySession(req);
}
