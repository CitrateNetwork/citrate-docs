# Citrate Codex — app (DOCS-CODEX-S1…S3)

S1 app shell + content pipeline, S2 `citrate-identity` OIDC seam, S3 Confidential runtime gateway —
wired to the prototype fixtures (`prototype/fixtures/`) via the dev-mode tier switcher.

```bash
npm install
npm run dev            # http://localhost:3000  (dev baked to NEXT_PUBLIC_AUTH_MODE=mock + ALLOW_MOCK_AUTH=1)
npm run build          # production build; postbuild runs verify:bundle automatically
npm run typecheck      # tsc --noEmit
npm run verify:bundle  # S3 gate: asserts ZERO Confidential content in .next/static
```

## Auth modes (S2)
- **dev/mock** (default for `npm run dev`): the "view as" switcher previews every tier; the Confidential
  gateway trusts the `x-codex-dev-viewer` header.
- **oidc** (`NEXT_PUBLIC_AUTH_MODE=oidc` + the `OIDC_*` env in `.env.example`): real citrate-identity
  Authorization-Code+PKCE; the gateway uses the server-verified session. Fail-closed when unconfigured.

## Confidential gateway (S3)
This repo is **public open-core** and ships **no gated content** — every doc is `public`. The gateway
mechanism remains for private overlay deployments (Homestead / enterprise): there, gated bodies live ONLY
in the **server-only** store (`lib/content/confidential-store.ts`, `import "server-only"`) and are served
exclusively by `GET /api/content/[...slug]` after the gate (tier ∧ org ∧ ¬expired), a disclosure ack
(`x-codex-ack`), and an access-log write — **never** in the client bundle (proven by `verify:bundle`).
Unentitled callers get 404 (existence is never revealed). In this public repo the store is an empty,
fail-closed stub. Authorized as the Rule-13 gateway sign-off in `AUDIT_TIER.md`.

- **Splash** `/` · **docs** `/<section>/<page>` (e.g. `/chain/rpc`) · **search** `/search` ·
  **sandboxes** `/sandboxes` · **settings** `/settings` · **admin** `/admin`.
- Use the **"view as"** switcher (top bar) to preview every access state: Anonymous, KYC'd builder,
  Enterprise (defense_prime), Academic (academic_partner), Administrator, Auditor (time-gated / expired).
- The access chokepoint is `prototype/fixtures` `canRead`/`visibility` (mirror of the server seam).
  S2 replaces the switcher with the real citrate-identity OIDC session — components are unchanged.

## Tier-1 (S6)
Security policy: [`SECURITY.md`](./SECURITY.md). Audit trail: [`audits/`](./audits/). Release process:
[`RELEASE.md`](./RELEASE.md). CI (`.github/workflows/ci.yml`) runs build + typecheck + **`verify:bundle`**
(the Confidential-never-in-build gate) + SBOM on every push.

See `DESIGN_BRIEF.md` (the spec), `PLANSET/` (the plan), and `prototype/fixtures/README.md` (the data).
