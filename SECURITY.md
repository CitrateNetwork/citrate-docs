# Security — Citrate Codex (`citrate-docs`)

Citrate Codex is a **Tier 1 — full audit** repo (see `AUDIT_TIER.md`): it ships an auth/RBAC chokepoint
(`lib/auth/`), brokers Confidential material at runtime through `/api/content`, and carries an
inference-backed agent. Report vulnerabilities per the org policy, not via public issues.

## Reporting

- Federation policy: <https://github.com/CitrateNetwork/.github/blob/main/SECURITY.md>
- Direct: **security@citrate.ai** (no PGP key is published yet; prefer GitHub private vulnerability reporting for sensitive detail). Please include repro + impact; do not open a public issue.

## Security surface (what to look at first)

- **The chokepoint** — `lib/auth/session.ts` (`verifySession`, fail-closed), `lib/auth/entitlement.ts`,
  `lib/auth/request-session.ts`. Every gated route resolves tier through these.
- **The Confidential gateway** — `app/api/content/[...slug]/route.ts` + the **server-only**
  `lib/content/confidential-store.ts`. Confidential bodies must never reach the client bundle.
- **Tier-aware RAG** — `lib/ai/corpus.ts` filters retrieval by `canRead` before generation.
- **Sandboxes** — `lib/sandbox/rpc.ts` is read-only, deny-by-default, fail-closed (no signing path).

## Standing invariants (CI-enforced)

- **ConfidentialNeverInBuild** — `npm run verify:bundle` (runs as `postbuild` and in CI) asserts zero
  Confidential sentinel in `.next/static`. A failure blocks release.
- **Fail-closed auth** — unset/unknown `NEXT_PUBLIC_AUTH_MODE` resolves to `oidc` (rejects all tokens
  until a JWKS is configured); `mock` is disabled in production unless `ALLOW_MOCK_AUTH=1`.
- **No secrets in any tier** — no keys/mnemonics/credentials in any doc, fixture, or gated body.

## Scope

In scope: the auth seam, the content gateway, the AI/RAG layer, the sandbox harness, the MCP server.
Out of scope: the documented upstream services themselves (chain, identity, gateway) — report those to
their own repos.
