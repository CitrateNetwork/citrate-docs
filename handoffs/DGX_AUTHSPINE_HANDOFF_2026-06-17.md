---
title: DGX authspine handoff, wire citrate-identity OIDC to Citrate Atlas
created: 2026-06-17
branch: main
author: Citrate team
status: open
audience: DGX agent (authspine / citrate-identity + infra)
---

# DGX authspine handoff, connect citrate-identity to Citrate Atlas

Atlas (the docs app, `citrate-docs`, deployed at `https://citrate-atlas.vercel.app`) is already built as an
OIDC relying party. The RP code is done and fail-closed; what is left is the **authspine side**: register
the client on `auth.citrate.ai`, set the env on the Atlas Vercel project, and (the real unblock) mint the
`entitlement` claim. This doc is the exact, runnable checklist.

## TL;DR (what to do)

1. Register an OIDC client `citrate-atlas` on citrate-identity (PKCE public client) with the redirect +
   post-logout URLs below.
2. Set the `OIDC_*` env on the Atlas Vercel project (production + preview) and flip
   `NEXT_PUBLIC_AUTH_MODE=oidc`, then redeploy.
3. Mint the `https://citrate.ai/entitlement` claim (shape below) OR stand up the entitlements source Atlas
   reads RP-side. Until then Atlas correctly resolves everyone to **Public**.
4. (Optional) Set the AI / sandbox env so Ask and the live sandboxes light up.

## 1. Register the OIDC client on citrate-identity

Atlas is a browser app, so a **public Authorization-Code + PKCE** client (no secret) is preferred.

| Field | Value |
|---|---|
| client_id | `citrate-atlas` (this becomes Atlas's `OIDC_AUDIENCE`) |
| client_type | public (PKCE, S256). Confidential is fine too; then set `OIDC_CLIENT_SECRET`. |
| redirect_uri | `https://citrate-atlas.vercel.app/api/auth/callback` (prod) and `http://localhost:3000/api/auth/callback` (local) |
| post_logout_redirect_uri | `https://citrate-atlas.vercel.app/` |
| grant_types | `authorization_code`, `refresh_token` |
| scopes | `openid profile wallet kyc offline_access` (the entitlement scope too, once it exists) |
| token audience | must include `citrate-atlas` (Atlas enforces `aud` per-RP; FUA-EXPLORER-01) |

If preview deploys also need auth, add `https://citrate-atlas-*-saulbuilds-projects.vercel.app/api/auth/callback`
(or wildcard per the identity server's policy). The custom domain `docs.citrate.ai` is not attached yet; add
its callback when it is.

## 2. Atlas env (Vercel project `citrate-atlas`, prj_THzHQQrzLyQeo0zllzUYZUukyeuQ)

Atlas verifies tokens **fail-closed**: `OIDC_ISSUER` + `OIDC_AUDIENCE` + `OIDC_JWKS_URL` must ALL be set or
every token is rejected. Set these for Production (and Preview):

```bash
# from the citrate-docs repo, authenticated as the project owner
vercel env add NEXT_PUBLIC_AUTH_MODE production     # value: oidc
vercel env add OIDC_ISSUER production               # https://auth.citrate.ai
vercel env add OIDC_AUDIENCE production             # citrate-atlas   (the client_id)
vercel env add OIDC_JWKS_URL production             # https://auth.citrate.ai/.well-known/jwks.json
vercel env add OIDC_AUTH_ENDPOINT production        # https://auth.citrate.ai/auth
vercel env add OIDC_TOKEN_ENDPOINT production       # https://auth.citrate.ai/token
vercel env add OIDC_END_SESSION_ENDPOINT production # https://auth.citrate.ai/session/end
vercel env add OIDC_CLIENT_ID production            # citrate-atlas
vercel env add OIDC_REDIRECT_URI production         # https://citrate-atlas.vercel.app/api/auth/callback
vercel env add OIDC_SCOPES production               # openid profile wallet kyc offline_access
# OIDC_CLIENT_SECRET — ONLY if the client is confidential (omit for public PKCE)
```

Then redeploy so the env takes effect: `vercel deploy --prod --archive=tgz --yes`.

Notes:
- `NEXT_PUBLIC_AUTH_MODE` is build-time inlined (it is `NEXT_PUBLIC_`), so it must be set BEFORE the build,
  hence the redeploy. The others are read at runtime.
- The full list with defaults is in `citrate-docs/.env.example`.
- Do **not** set `ALLOW_MOCK_AUTH` in production. `NEXT_PUBLIC_AUTH_MODE=mock` is refused in prod (forged-token
  risk); it is for non-public staging only.
- Vercel SSO "deployment protection" is intentionally OFF on this project so Atlas's own splash + OIDC + tier
  gating governs access. Do not re-enable it (it would 401 the public splash before the app can run).

## 3. The entitlement claim (the real unblock)

Atlas maps a verified identity to a tier at one chokepoint (`lib/auth/entitlement.ts`,
`resolveEntitlement`). Today citrate-identity (verified @ `4aa869c`) mints scopes
`openid profile wallet kyc offline_access` and claims `sub / wallet_address / wallets / signing_method /
kyc_status`, but **no entitlement claim**, so Atlas resolves everyone to Public (fail-safe). Pick one:

**Option A (preferred), mint the claim on citrate-identity.** Add a namespaced claim to the ID/access token:

```
"https://citrate.ai/entitlement": {
  "tier": "public" | "commercial" | "commercial.kyc" | "academic" | "confidential",
  "orgId": "<org slug>" | null,        // scopes org-only content (enterprise per-company)
  "citrateRole": "<role>",             // optional, e.g. operator, auditor, admin
  "milestone": "<string>",             // optional
  "expiresAt": <unix-ms> | null         // optional; Atlas treats an expired grant as Public
}
```

Atlas reads this verbatim when present (forward-compatible override) and otherwise falls back to its source.
KYC can only **narrow**: a `commercial`/`commercial.kyc`/higher grant requires `kyc_status = verified`, else
Atlas drops to Public. So the claim and the `kyc_status` claim must be consistent.

**Option B, RP-side source.** If the claim is not minted, Atlas looks up an entitlements source keyed by
`sub` / `wallet_address` / `email` plus `kyc_status`. In production that source is the seat/contracts table
(commercial seats), the team operators roster, and time-gated auditor enrollments (see
`PLANSET/07_IMPLEMENTATION_AND_HARDENING_PLAN.md` §2). If you choose B, stand up that table/endpoint and
wire the lookup in `entitlement.ts` (today it reads the prototype `PRINCIPALS` fixtures).

Either way the tier set is: `public`, `commercial`, `commercial.kyc`, `academic`, `confidential`. Confidential
content is served only at request time through the gateway (`/api/content/...`), never in the bundle.

Per Rule 12, the entitlement claim is Atlas's one pinned cross-repo dependency: add a `[[drift]]` entry in
the federation manifest when citrate-identity ships it.

## 4. Optional, AI gateway + live sandboxes

These are independent of auth; set them to light up Ask and the non-RPC sandboxes (the RPC/DAG sandboxes
already work against the public `rpc.citrate.ai`):

```bash
vercel env add CITRATE_GATEWAY_URL production       # OpenAI-compatible inference gateway base URL
vercel env add CITRATE_GATEWAY_API_KEY production   # gateway key (server-only)
vercel env add CITRATE_MODEL_NAME production         # model id served by the gateway
vercel env add CITRATE_RELAY_URL production          # EIP-2771 relay endpoint (gasless sandbox)
vercel env add CITRATE_X402_URL production           # x402 facilitator endpoint (x402 sandbox)
vercel env add CITRATE_RPC_URL production            # override the default rpc.citrate.ai if needed
```

Without these, Ask falls back to extractive answers and the inference/relay/x402 sandboxes return a clean
503 (fail-closed), the app stays up.

## 5. Verify (after env + redeploy)

```bash
BASE=https://citrate-atlas.vercel.app
# unauthenticated session is fail-closed:
curl -s "$BASE/api/auth/session"            # -> {"authenticated":false,...}
# login kicks off the PKCE flow (302 to auth.citrate.ai/auth with code_challenge + state + nonce):
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' "$BASE/api/auth/login"
# after completing login in a browser, the session reflects the resolved entitlement:
#   {"authenticated":true,"sub":"...","kycStatus":"verified","entitlement":{"tier":"commercial",...}}
# confidential gateway stays fail-closed for the unentitled:
curl -s -o /dev/null -w '%{http_code}\n' "$BASE/api/content/internal/audit"   # -> 404
```

Success = login redirects to `auth.citrate.ai`, the callback sets the session cookie, `/api/auth/session`
returns `authenticated:true` with the right `entitlement.tier`, and a confidential route renders for an
entitled admin/auditor while returning 404 to everyone else.

## Reference (RP code, already done)

- `lib/auth/session.ts` — the only identity check; verifies the JWT against JWKS (issuer + audience both
  enforced), reads `sub / wallet_address / email / kyc_status`, resolves entitlement.
- `lib/auth/entitlement.ts` — `resolveEntitlement` (claim override -> source -> Public).
- `lib/auth/{cookies,request-session}.ts`, `app/api/auth/{login,callback,session,logout}/route.ts` — PKCE flow.
- `.env.example` — the full env list with inline notes.

## Open follow-ups owned elsewhere

- Attach `docs.citrate.ai` (custom domain) and add its callback to the client.
- Paymaster registrar wiring gap (EW-S1): the account factory must `registerWallet` or first-op sponsorship
  reverts (documented on `/aa/paymaster`).
- Standing risk: Commercial/Academic doc bodies are currently in the client bundle (only Confidential is
  gateway-gated). If those tiers must be non-scrapable before a public launch, harden them onto the runtime
  gateway too.
