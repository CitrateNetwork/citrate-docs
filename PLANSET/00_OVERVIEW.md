---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Planset Overview

> **One line.** A modern, gated, **agentic documentation surface** for the whole Citrate federation —
> one site that maps *every* surface (contracts, opcodes/precompiles, RPC, CLIs, SDKs, apps/dapps,
> primitives, papers, specs, SOPs), gates it behind a splash + `citrate-identity` auth into **four
> access tiers (Public / Commercial / Academic / Confidential)** keyed to team role, KYC, and
> per-enterprise/per-sector contract, carries the same **"Ask" agentic harness** the explorer ships,
> and embeds **live testnet sandboxes** so readers can *run* the network's novel concepts, not just
> read about them. We evolve the existing `citrate-docs` repo into this app in place.

This is the index document for the **Citrate Codex** planset. Read it first, then the numbered docs in order.

| # | Doc | What it is |
|---|---|---|
| 00 | `00_OVERVIEW.md` | This file — vision, locked decisions, the 4-tier model, architecture-at-a-glance, reuse map |
| 01 | `01_SCOPE_OF_WORK.md` | Phases (S0–S6), in/out of scope, dependencies, risk register (R1–R12) |
| 02 | `02_ARCHITECTURE.md` | App layout, hybrid content pipeline, agentic harness, the RBAC seam, sandbox runtime, deployment topology |
| 03 | `03_TLA_SPECS.md` | Formal invariants for the access-control state machine (the safety-critical core) |
| 04 | `04_FEATURES_BDD.md` | Gherkin features for every v1 capability |
| 05 | `05_SPRINTS_AND_WPS.md` | Sprint plan + work packages, Agentile-compliant |
| 06 | `06_INFORMATION_ARCHITECTURE.md` | The full surface map → sidebar tree → tier assignment (the "map the whole repository" deliverable) |
| 07 | `07_IMPLEMENTATION_AND_HARDENING_PLAN.md` | RBAC/entitlement impl, identity-claim changes, gateway hardening, access-review SOP, threat model |

## Why this exists

The federation's knowledge — ~3,000 Markdown files across ~40 repos, plus 1,900 frozen docs in
`citrate-agentile-archive` and the 10-part Gradient Papers in `citrate-docs/gradient_papers_v3/` — has
**no app, no framework, no search, no navigation, and no access control.** Today `citrate-docs` is a raw
Markdown directory with a CI check that only asserts "a README and ≥2 files exist." There is no single
place where a developer, node operator, enterprise customer, academic partner, or auditor can understand
the ecosystem coherently — and, worse, nothing structurally prevents audit/ops/funding material from
sitting next to public content.

**Citrate Codex** fixes both halves:
- **Coherence** — one tier-aware sidebar that maps every owned surface in the federation, with a
  **Tutorials** subsection in every section and a **sandbox** for the concepts that are genuinely novel
  to this network (GhostDAG, gasless AA, x402, verifiable inference, paraconsistent consensus).
- **Containment** — a four-tier RBAC tree where access is granted per the team, the user's KYC, and
  their contract/membership with the network, and where **Confidential / in-house / audit-level material
  is brokered server-side at request time and never enters the public build**.

It doubles as the front door for the go-to-market: the same site serves SOPs for customers, developers,
and node operators (public or private), and gives auditors a clean, access-logged way in.

## The locked decisions (this session, 2026-06-14)

| # | Decision | Choice |
|---|---|---|
| 1 | Repo strategy | **Evolve `citrate-docs` in place** into the app — do not create a new repo. Product name **Citrate Codex**. |
| 2 | Content model | **Hybrid** — app authors top-level IA, tier overviews, tutorials; per-repo API/spec docs **transcluded** at build via the manifest; archive (Gradient Papers, TLA+) **linked**. Honors **Rule 9** (one source of truth; link, don't copy). |
| 3 | Access tiers | **Public / Commercial / Academic / Confidential** — exactly four, in that order of openness. |
| 4 | Identity | **Wire `citrate-identity` OIDC immediately** — real OIDC RP + KYC gate + new `entitlement` claim from day one. No mock-first phase. |
| 5 | Auth seam | **Lift the explorer's auth seam** (`citrate-explorer/src/lib/auth/{session.ts,client.tsx}`) — one provider-agnostic chokepoint; extend `verifySession` with the tier/entitlement claim. |
| 6 | Agentic harness | **Lift the explorer's "Ask" harness** (chat route, provider, system-prompt, tools, audit, ratelimit, threads, MCP) and re-skin with **tier-aware RAG** over the docs corpus. |
| 7 | Inference | **OpenAI-compatible** via `citrate-inference-gateway` (`infer.citrate.ai`) / DGX local-proxy — the same provider pattern Ask/explorer use. |
| 8 | Sandboxes | **Live testnet (chain 40204), read-mostly, fail-closed**: GhostDAG blue-score viz, gasless EIP-2771 relay, x402 402-flow, inference-gateway call, RPC method explorer. |
| 9 | Tech stack | **Next.js 16 + React 19 + shadcn/Tailwind + Drizzle/Neon**, matching `citrate-explorer` / `citrate-memories/webapp` precedent. |
| 10 | Per-sector privacy | **`org_id` / sector scope** on Commercial + Confidential content — a customer sees only its own space; per-company and per-sector confidentiality with a disclosures system. |
| 11 | Audit posture | Repo **`audit_tier` rises Tier-3 → Tier-1** (it now brokers Confidential material); **Rule-13 visibility sign-off** required before any gated wiring ships. |

## The core invariant (everything hangs off this)

> **`citrate-docs` deploys a public-facing site (`docs.citrate.ai`). Confidential-tier content MUST NEVER
> be copied into the repo or baked into the publicly-served build.** (The repo is `visibility = "private"`
> today per the manifest; we do not flip it, and the invariant binds the public deployment regardless of
> repo visibility.) Audit, ops, funding, incident, and cap-table material stays in its
> private home repos (`citrate-security/`, `citrate-compliance/`, `ops/`, `funding/`) and is served
> **only at request time, server-side, after auth, and access-logged**. Public / Commercial / Academic
> content may be build-time/hybrid; **Confidential is always runtime-fetched and never present in the bundle.**

A second invariant of equal weight:

> **The tier check is a single server-side chokepoint, and the agent obeys it too.** Every gated route,
> every content fetch, and every Ask-agent RAG retrieval resolves the caller's tier through the *same*
> `verifySession`-derived entitlement. The agent can never surface a chunk above the caller's tier — RAG
> is filtered by tier *before* retrieval, not after generation.

These two rules are what let "open, modern, agentic docs" and "holds a lot of sensitive material" coexist
instead of contradict.

## The four-tier model, in one screen

| Tier | Who | Gate | What they get |
|---|---|---|---|
| **Public** | Anyone, no login | none (IP rate-limit) | Overviews, quickstarts, public SDK/RPC/CLI reference, Gradient-Paper summaries, testnet guides, all sandboxes, the "Ask" agent (public corpus). |
| **Commercial** | Authenticated + per-seat/per-enterprise entitlement | `sub` + `entitlement.tier ∈ {pilot, production}` (+ KYC where the surface requires it) | Enterprise implementation guides, marketplace/compute/node-operator depth, metered-API detail, district onboarding, **per-company / per-sector private spaces**. |
| **Academic** | Administrators + named research partners (Rutgers et al.) | `entitlement.tier = academic` **or** team member; KYC verified | Full Gradient Papers, TLA+ corpus, consensus/crypto/proof-system deep dives, formal-verification methodology, research portal + testnet access. |
| **Confidential** | Administrators + 3rd-party auditors issued access by the executive team / team lead | named `citrate_role` **or** an active, **time-gated** auditor engagement | Audit reports & findings, ops/funding/cap-table, incident response, compliance registers. **Runtime-gated, access-logged, never in the static build.** |

> Note the asymmetry the user asked for: **all KYC'd users in the ecosystem** also get a deep,
> implementation-grade *private technical* band (it lives inside **Commercial** as the
> "Implementation / technical-user" track, gated on KYC but not on a paid seat), while **house laundry
> and audit-level materials are locked to Confidential** (admins + issued auditors only).

## Architecture at a glance

```
            ┌──────────────────────────── visitor ────────────────────────────┐
            │  Splash  →  (optional) Sign in via citrate-identity (OIDC + PKCE)  │
            └───────────────────────────────┬──────────────────────────────────┘
                                             ▼
                         ┌───────────────────────────────────────┐
   citrate-identity ───▶ │  verifySession()  → AuthSession +       │  ◀── the ONE RBAC chokepoint
   (auth.citrate.ai)     │  entitlement{ tier, org_id, role, exp } │      (lifted from explorer seam)
   OIDC · KYC · claims   └───────────────────┬───────────────────┘
                                             ▼
        ┌────────────────────────────────────────────────────────────────────────────┐
        │  Next.js (Citrate Codex)                                                       │
        │                                                                                │
        │  Public/Commercial/Academic content        Confidential content               │
        │  ── build-time hybrid pipeline ──          ── runtime gated gateway ──         │
        │  app-authored IA + transcluded repo docs   server-side fetch from private repos│
        │  (in the static bundle, tier-tagged)       (NEVER in the bundle; access-logged)│
        │            │                                          │                        │
        │            ├──────────────┬───────────────┬──────────┘                        │
        │            ▼              ▼               ▼                                     │
        │   tier-aware sidebar   "Ask" agent     live sandboxes                          │
        │   + Tutorials/section  (tier-filtered   (chain 40204, read-mostly,             │
        │                         RAG; MCP server) fail-closed)                          │
        └───────────────────────────────┬───────────────────────────────┬───────────────┘
                                         ▼                               ▼
                       inference-gateway (OpenAI-compatible)     rpc.citrate.ai / relayer / x402
                       infer.citrate.ai · DGX local-proxy        (sandbox calls)
```

Public/Commercial/Academic docs are tier-tagged and shipped in a hybrid build; **Confidential docs are
never built in** — they are fetched server-side, per request, only after the entitlement check passes,
and every fetch is written to the access log. The agent and the sandboxes both go through the same seam.

## Reuse map (verified 2026-06-14)

| Need | Source | Verdict |
|---|---|---|
| Auth seam (provider-agnostic OIDC RP, claims, fail-closed) | `citrate-explorer/src/lib/auth/{session.ts,client.tsx}` | ✅ lift; extend `verifySession` with `entitlement`/tier |
| OIDC issuer, claim shapes, KYC store, guardians | `citrate-identity/src/{server.ts,claims.ts,kyc-pg.ts,aa/guardians.ts,wallet-claims.ts}` | ✅ consume; **add** `entitlement` resolution at `findAccount` |
| Agentic "Ask" harness (chat route, streaming, threads) | `citrate-explorer/src/app/api/chat/route.ts`, `src/app/api/threads/*` | ✅ lift; add tier check + tier-aware RAG |
| Inference provider (local/gateway/onchain, OpenAI-compatible) | `citrate-explorer/src/lib/ai/provider.ts` | ✅ lift as-is |
| Composable system prompt + guardrails | `citrate-explorer/src/lib/ai/system-prompt.ts` | ✅ lift pattern; swap network knowledge → docs knowledge |
| Tool wrapping + tool-call audit | `citrate-explorer/src/lib/ai/{tools.ts,audit.ts}` | ✅ lift; add `searchDocs`/`getSurface` docs tools |
| MCP server (expose Codex to external agents) | `citrate-explorer/src/app/api/mcp/route.ts`, `src/lib/ai/mcpResources.ts` | ✅ lift; resources = docs surfaces |
| Rate limiting (Upstash + in-memory fallback) | `citrate-explorer/src/lib/api/ratelimit.ts` | ✅ lift as-is |
| Thread persistence (Neon + Drizzle, per-`sub`) | `citrate-explorer/src/lib/db/conversations.ts` | ✅ lift as-is |
| UI shell / components (Next 16, shadcn, Tailwind) | `citrate-explorer`, `citrate-memories/webapp` | ✅ pattern reuse |
| Gasless relay sandbox | `citrate-chatbot` `/api/relay` (EIP-2771 forwarder) | ✅ pattern reuse for sandbox |
| x402 sandbox | `citrate-buyer-webapp` + `@citratenetwork/marketplace-sdk` (`X402Client`) | ✅ pattern reuse for sandbox |
| Read-only chain tools (blocks, DAG, RPC) | `citrate-explorer/src/lib/harness/{ops.ts,client.ts,allowlist.ts}` | ✅ lift for sandboxes + agent |
| Content sources (transclude/link, never copy) | `citrate-docs/{gradient_papers_v3,public-goods,Tutorials}`, each repo `docs/`, `citrate-agentile-archive/formal/` | ✅ transclude at build / link |
| Hybrid build transclusion pipeline | — | ❌ net-new (`lib/content/`) |
| Confidential runtime content gateway + access log | — | ❌ net-new (`lib/content/gateway`) |
| `entitlement` claim + 4-tier resolution | — | ❌ net-new (identity + `lib/auth`) |
| Tier-aware sidebar/IA renderer | — | ❌ net-new (`components/`, `06_*`) |
| Live sandbox widgets (5) | — | ❌ net-new (`sandboxes/`) |

Net: **identity, auth, harness, inference, rate-limit, threads, MCP, and the chain/relay/x402 patterns
all exist** in the federation; the **build is the tier system (entitlement claim + RBAC chokepoint + the
runtime Confidential gateway), the hybrid content pipeline, the tier-aware IA, and the sandbox widgets.**

## Related (Rule 9 — link, don't copy)

- Methodology: `../../AGENTILE.md`, `../../docs/AGENTILE_RULES.md`, `../../docs/AGENTILE_WORKFLOW.md`
- Control plane: `../../citrate-federation/manifest.toml` (entry `[repos.citrate-docs]`),
  `../../citrate-federation/repos/citrate-docs/` (owners, deps, sprints),
  `../../citrate-federation/agentile/sprints/active/2026-06-DOCS-CODEX.md`
- Audit posture: `../../.github/AUDIT_POSTURE.md`, `./AUDIT_TIER.md`
- Auth seam + harness to lift: `../../citrate-explorer/src/lib/auth/`, `../../citrate-explorer/src/lib/ai/`
- Identity: `../../citrate-identity/src/{server.ts,claims.ts,kyc-pg.ts}`
- Sandboxes: `../../citrate-chatbot` (relay), `../../citrate-buyer-webapp` + `../../citrate-sdk-marketplace` (x402), `../../citrate-inference-gateway` (inference)
- Content sources: `./gradient_papers_v3/`, `./public-goods/`, `./Tutorials/`, `../../citrate-agentile-archive/formal/`
