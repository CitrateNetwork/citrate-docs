---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Scope of Work

> Companion to `00_OVERVIEW.md` and `02_ARCHITECTURE.md`. Defines what we build, in what order, what we
> explicitly do **not** build, the dependencies we reuse, and the risks we accept and mitigate. The
> sprints and work packages that execute this SOW live in `05_SPRINTS_AND_WPS.md`; the formal invariants
> are in `03_TLA_SPECS.md`; the Gherkin acceptance lives in `04_FEATURES_BDD.md`; the surface→tier map
> lives in `06_INFORMATION_ARCHITECTURE.md`.

## 1. Phases

The build maps 1:1 onto the sprint arc in `05_SPRINTS_AND_WPS.md` (DOCS-CODEX-S0 … S6). Each phase exits
on a single, demonstrable property — never on a checklist.

**Phase 0 — Planset & registration (S0).** Author the eight PLANSET docs; open the federation sprint;
bump `[repos.citrate-docs]` in the manifest (audit_tier Tier-3 → Tier-1, `consumes_repos`, `publishes`);
add the `citrate-federation/repos/citrate-docs/` breakout (owners, drift entry for the new
`citrate-identity` claim dep); record the **Rule-13 visibility review**. *Exit:* planset approved and the
repo is re-registered Tier-1 with drift-check green.

**Phase 1 — App shell + IA (S1).** Next.js 16 + shadcn/Tailwind app inside `citrate-docs/`; the splash
page; the **tier-aware sidebar** rendering the full IA from `06_*`; the **hybrid content pipeline** for
the Public tier (app-authored IA + build-time transclusion of real repo docs); search. *Exit:* the Public
tier renders the complete sidebar from real federation content, with working search and a Tutorials
subsection in every section.

**Phase 2 — Auth + RBAC (S2).** Wire `citrate-identity` as an OIDC RP through the lifted explorer seam;
add the **`entitlement` claim** (`tier`, `org_id`, `citrate_role`, `milestone`, `expires_at`) resolved at
`findAccount`; implement 4-tier resolution and per-`org_id` scoping at the single chokepoint. *Exit:* a
signed-in user sees exactly their tier and their org's space; tier escalation is impossible (proven by the
BDD suite + the `03_*` TLA invariant).

**Phase 3 — Confidential gateway (S3).** The runtime, server-side gated content gateway that fetches
Confidential docs from their private home repos per request, after the entitlement check, with a
click-through **disclosure acknowledgement** and an **access log**. *Exit:* an issued auditor reads a
Confidential doc through the site; a build-bundle grep proves **zero** Confidential content is present in
the static output.

**Phase 4 — Agentic harness (S4).** Lift the explorer "Ask" harness; add **tier-aware RAG** (retrieval
filtered by caller tier *before* generation), the docs tools (`searchDocs`, `getSurface`), threads, and
the MCP server exposing Codex surfaces. *Exit:* Ask answers a Public question and a Commercial question
with correct tier scoping; an Academic-only chunk is never returned to a Commercial caller.

**Phase 5 — Sandboxes (S5).** The five live testnet widgets: GhostDAG blue-score visualizer, gasless
EIP-2771 relay demo, x402 402-payment walkthrough, inference-gateway call, RPC method explorer. *Exit:*
each widget executes a live chain-40204 call from the browser and fails closed when its endpoint is down.

**Phase 6 — Content & hardening (S6).** Author/transclude content across all four tiers to the
`06_*` map; finalize rate-limit, SBOM/cosign on release, the quarterly access-review SOP, and the
disclosure/embargo automation. *Exit:* every surface in `06_*` resolves to a real page or a tracked
backlog stub; Tier-1 release artifacts are produced.

## 2. In scope (v1)

- The Next.js webapp evolved **in place** inside `citrate-docs/` (Citrate Codex).
- Splash page + `citrate-identity` OIDC sign-in.
- The four-tier RBAC system (Public / Commercial / Academic / Confidential) with per-`org_id`/sector
  scoping and a disclosures/acknowledgement system.
- The hybrid content pipeline (app-authored IA + build-time transclusion + runtime Confidential gateway).
- Tier-aware sidebar covering the full federation surface map, with a Tutorials subsection per section.
- The "Ask" agentic harness with tier-aware RAG and an MCP server.
- Five live testnet sandboxes.
- Federation registration updates (manifest, sprint, repo breakout) and Tier-1 audit artifacts.

## 3. Explicitly out of scope (v1)

- **Rewriting or migrating the source Markdown.** We transclude/link existing docs (Rule 9); we do not
  fork them into the app. Source of truth stays in each repo / the archive.
- **Building a new identity provider.** We consume `citrate-identity`; we only *add* the `entitlement`
  claim. (`citrate-identity` S2/S3 work is tracked there, referenced via the drift map.)
- **Write actions against the chain from sandboxes** beyond the already-public gasless-relay / x402
  demos. Sandboxes are read-mostly and fail-closed; no key custody in the docs app.
- **A bespoke search backend** if a hosted option (e.g. the existing Neon + a lightweight index, or
  Algolia/Meili) covers it. Decide in S1; do not build infra we can rent.
- **Authoring net-new Confidential documents.** Codex *serves* existing Confidential material from its
  home repos; it does not become the authoring home for it.
- **Replacing `citrate-agentile-archive`.** The archive stays frozen and is linked, not absorbed.

## 4. Dependencies we reuse (do not rebuild)

See the reuse map in `00_OVERVIEW.md` for the verdicts. Load-bearing:

- `citrate-explorer/src/lib/auth/` — the auth seam (the RBAC chokepoint).
- `citrate-explorer/src/lib/ai/` + `src/app/api/{chat,threads,mcp}/` — the agentic harness.
- `citrate-explorer/src/lib/{harness,api/ratelimit,db/conversations}` — chain tools, rate-limit, threads.
- `citrate-identity/src/{server.ts,claims.ts,kyc-pg.ts,aa/guardians.ts,wallet-claims.ts}` — identity/KYC.
- `citrate-inference-gateway` — OpenAI-compatible inference (`/v1/chat/completions`).
- `citrate-chatbot` (relay), `citrate-buyer-webapp` + `citrate-sdk-marketplace` (x402) — sandbox patterns.
- `citrate-docs/{gradient_papers_v3,public-goods,Tutorials}` + each repo `docs/` + `citrate-agentile-archive/formal/` — content sources.

## 5. Risk register

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| **R1** | **Confidential leak into the publicly-served build** — audit/ops/funding content baked into the static bundle of the public-facing deployment (`docs.citrate.ai`). | **Critical** | Architectural prohibition (core invariant): Confidential is *only* runtime-gated server-fetch, never in the bundle. CI step greps the build output for known Confidential markers and **fails the build** on any hit (see `03_*` invariant + `07_*` gateway). |
| **R2** | Tier escalation — a lower-tier principal reads higher-tier content via a missed check. | High | Single server-side chokepoint (`verifySession` → entitlement); every route, fetch, and RAG retrieval resolves through it; TLA `NoTierEscalation` invariant + BDD denial tests; agent RAG filtered *before* retrieval. |
| **R3** | Agent exfiltration — the Ask agent surfaces above-tier chunks. | High | RAG corpus partitioned by tier; retrieval filtered by caller tier pre-generation; system-prompt guardrail is defense-in-depth, not the control. |
| **R4** | Stale entitlements — an off-boarded auditor/employee keeps access. | High | `expires_at` on every entitlement; auditor grants are time-gated; quarterly access-review SOP (`07_*`); revocation honored at the chokepoint. |
| **R5** | Content drift — transcluded repo docs go stale vs. source. | Medium | Build-time transclusion keyed to manifest SHAs; drift-check covers the content deps; "last synced @ SHA" badge per transcluded page. |
| **R6** | Repo visibility mistake — `citrate-docs` flips visibility or leaks via the Tier-1 promotion. | High | Rule-13 sign-off recorded before gated wiring; REM-03-style disclaimer/visibility check in CI. |
| **R7** | KYC/PII handling — the app touches PII it shouldn't. | High | Codex stores **no** PII; it reads only the KYC *status* claim from `citrate-identity` (which itself stores only the claim, not PII). |
| **R8** | Sandbox abuse — sandboxes used to spam/relay against testnet. | Medium | Read-mostly; rate-limited per `sub`/IP; relay/x402 demos bounded to existing public testnet flows; fail-closed when endpoints are down. |
| **R9** | Honest-posture violation — compliance/audit claims published prematurely. | High | Confidential gate keeps audit material in-house; public compliance copy passes the disclaimer/claim-grade gate; embargo dates auto-hold. |
| **R10** | Scope creep into a CMS / authoring tool. | Medium | Out-of-scope §3 — Codex serves and links; it is not the authoring home for source docs. |
| **R11** | Small-context inference blowing budget on large docs. | Medium | History/step/output caps from the explorer provider; tier-scoped RAG keeps context tight; chunked retrieval. |
| **R12** | Per-sector spillover — one customer sees another's space. | High | `org_id`/sector scope enforced at the chokepoint and in RAG partitioning; BDD cross-tenant denial tests. |

## 6. Success criteria

- Every surface inventoried across the federation appears in `06_*` with a tier assignment (no orphan,
  no untiered surface).
- A visitor can, unauthenticated, navigate the Public sidebar, run every sandbox, and use Ask.
- A signed-in Commercial user sees their org's space and nothing above their tier; an Academic sees the
  research portal; an issued auditor reads Confidential material through an access-logged, acknowledged gate.
- The static build contains **zero** Confidential content (CI-proven).
- `scripts/drift-check.sh` is green after the manifest bump; the sprint file lives in `active/`.
