---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Sprints & Work Packages

> The execution plan for the SOW. Phases are defined in `01_SCOPE_OF_WORK.md` §1 (DOCS-CODEX-S0 … S6) and
> mirrored 1:1 below; the single demonstrable exit for each sprint is lifted from there. The Gherkin
> acceptance each sprint satisfies lives in `04_FEATURES_BDD.md`; the formal invariants each sprint
> discharges live in `03_TLA_SPECS.md`. This file is the **program-level index** — it is not the per-sprint
> truth (Rule 4 — that lives in the federation sprint file, `citrate-federation/agentile/sprints/active/2026-06-DOCS-CODEX.md`).

## Sequencing logic

```
S0 Planset & registration ──► S1 App shell + IA ──► S2 Auth + RBAC ──► S3 Confidential gateway
   (Tier-1 promotion,            (Public tier renders   (entitlement claim   (runtime gated fetch,
    drift-green)                   real federation IA)    + single chokepoint)  zero-in-bundle proof)
                                        │                       │
                                        │                       ├──► S4 Agentic harness (Ask + tier-RAG + MCP)
                                        │                       │     (needs the chokepoint from S2)
                                        └──────────────────────►└──► S5 Sandboxes (5 live testnet widgets)
                                                                      (needs the app shell from S1)
                                                                            │
                                                  S6 Content & hardening ◄──┘
                                                  (fill the 06_* map; Tier-1 release artifacts)
```

| Sprint | Depends on | May start after | Critical path? |
|---|---|---|---|
| S0 | — | — | yes (gates everything; Tier-1 + drift-green) |
| S1 | S0 | S0 done | yes |
| S2 | S1 (app shell, seam) | S1 done | yes (the RBAC core) |
| S3 | S2 (chokepoint) | S2 done | yes (discharges R1) |
| S4 | S2 (chokepoint) | **S2 done** (parallel to S3) | no (overlaps S3) |
| S5 | S1 (app shell) | **S1 done** (parallel to S2/S3) | no |
| S6 | S1–S5 feature-complete | all green | yes (release gate) |

Critical path: **S0 → S1 → S2 → S3 → S6**. S4 forks off S2 (it consumes the chokepoint, not the gateway);
S5 forks off S1 (sandboxes are public, read-mostly, and need only the app shell). S6 is the join point.

---

## Sprint DOCS-CODEX-S0 — Planset & registration
**Goal.** Author the planset, register the repo in the federation control plane, and promote it to Tier-1
before any gated code is written.
**Exit (single, demonstrable).** Planset approved and the repo is re-registered **Tier-1** with
`scripts/drift-check.sh` **green**.

| WP | Title | Deliverable(s) | Reused source / done-when |
|---|---|---|---|
| WP-S0.1 | Author the 8 planset docs | `citrate-docs/PLANSET/{00_OVERVIEW,01_SCOPE_OF_WORK,02_ARCHITECTURE,03_TLA_SPECS,04_FEATURES_BDD,05_SPRINTS_AND_WPS,06_INFORMATION_ARCHITECTURE,07_IMPLEMENTATION_AND_HARDENING_PLAN}.md` | Pattern from `citrate-comms/PLANSET/`; **done when** all 8 exist with Rule-12 frontmatter and cross-link (Rule 9, no copied bodies). |
| WP-S0.2 | Federation sprint file | `citrate-federation/agentile/sprints/active/2026-06-DOCS-CODEX.md` | Pattern from existing `active/` sprints; **done when** the file is in `active/` with frontmatter, WPs, and exit criteria mirroring this index. |
| WP-S0.3 | Manifest bump | `citrate-federation/manifest.toml` `[repos.citrate-docs]`: `audit_tier` **Tier-3 → Tier-1**, `consumes_repos` (`citrate-identity`, `citrate-explorer`, `citrate-inference-gateway`, `citrate-chatbot`, `citrate-buyer-webapp`, `citrate-sdk-marketplace`, `citrate-agentile-archive`), `publishes` (`citrate-codex` site/MCP) | `00_OVERVIEW.md` reuse map (consumes list); **done when** the entry parses and `drift-check` resolves all `consumes_repos`. |
| WP-S0.4 | Repo breakout | `citrate-federation/repos/citrate-docs/owners.md` + a `[[drift]]` entry for the **`citrate-identity` entitlement-claim** dependency | `02_ARCHITECTURE.md` §4 (the new `resolveEntitlement` at `findAccount`); **done when** `owners.md` lists owners and the drift entry pins the identity claim dep (Rules 11/12 — `[[drift]]` before any path-pin). |
| WP-S0.5 | Rule-13 visibility sign-off | A recorded sign-off in `citrate-docs/AUDIT_TIER.md` (+ ref in the federation breakout) attesting that no Confidential content is wired before gated code lands | `01_SCOPE_OF_WORK.md` R6; **done when** the sign-off record is committed and referenced from the breakout. |
| WP-S0.6 | Scaffold + license/audit posture | `citrate-docs/{AUDIT_TIER.md(→Tier-1), SECURITY.md, .github/AUDIT_POSTURE.md ref}` | `00_OVERVIEW.md` "Related"; **done when** `drift-check.sh` is green end-to-end. |

**BDD satisfied.** `04_*` *Federation registration* feature (manifest parses, drift-green, sprint in `active/`).
**TLA discharged.** None directly; S0 only *states* the core invariant that S3 will discharge.
**Agentile compliance.** Rule 12 (frontmatter on all 8 docs + sprint), Rule 9 (link, don't copy — bodies stay in source repos), Rules 11/12 (`[[drift]]` for the identity claim dep), Rule 13 (visibility sign-off recorded **here, before** any gated wiring).

## Sprint DOCS-CODEX-S1 — App shell + IA
**Goal.** Stand up the Next.js 16 app in place, the splash, the tier-aware sidebar over real federation
content, the hybrid pipeline for the Public tier, and search.
**Exit.** The **Public tier renders the complete sidebar from real federation content**, with working
search and a Tutorials subsection in every section.

| WP | Title | Deliverable(s) | Reused source / done-when |
|---|---|---|---|
| WP-S1.1 | App scaffold | `citrate-docs/app/(marketing)/page.tsx` (splash), `app/docs/[...slug]/page.tsx`, shell + Tailwind 4 + shadcn | UI pattern from `citrate-explorer` / `citrate-memories/webapp`; **done when** the app boots and the splash renders. |
| WP-S1.2 | Content manifest + transclusion | `citrate-docs/content.manifest.ts`, `citrate-docs/lib/content/{transclude.ts,index.ts}` | `02_ARCHITECTURE.md` §3 (source kinds `authored`/`transcluded`/`linked`); **done when** a `transcluded` node pulls a real repo `docs/**` at its pinned SHA and stamps `last-synced @ SHA`. |
| WP-S1.3 | Tier-aware sidebar (Public render) | `citrate-docs/components/{sidebar.tsx,tier-badge.tsx}` rendering `06_*` IA | `06_INFORMATION_ARCHITECTURE.md` surface map; **done when** every `06_*` Public node appears with a Tutorials subsection per section. |
| WP-S1.4 | Authored IA + tutorials | `citrate-docs/content/**` (MDX overviews + tutorials for Public sections 0–12) | `06_*`; **done when** each section has an overview page and ≥1 tutorial, all `authored`. |
| WP-S1.5 | Search | `citrate-docs/lib/content/search.ts` (hosted index **or** Neon FTS — decide here) | `01_SCOPE_OF_WORK.md` §3 ("don't build infra we can rent"); **done when** Public search returns hits and is wired to filter by tier (filter is a no-op at Public, proven extensible for S2). |
| WP-S1.6 | Drizzle baseline | `citrate-docs/lib/db/schema.ts` (`threads`, `tool_call_audit` stubs to be filled S4; `access_log`, `entitlement_cache` tables created) | `02_ARCHITECTURE.md` §8; **done when** migrations apply on Neon. |

**BDD satisfied.** `04_*` *Public navigation* + *Search* + *Tutorials-per-section* features.
**TLA discharged.** None (no gate yet); the sidebar renderer is built to call `canRead` in S2.
**Agentile compliance.** Rule 1 (no mock content — every sidebar node resolves to real `authored`/`transcluded`/`linked` source; no placeholder pages on the prod path), Rule 9 (transclude/link, never fork source Markdown), Rule 2 (the test count established here only grows).

## Sprint DOCS-CODEX-S2 — Auth + RBAC
**Goal.** Wire `citrate-identity` as an OIDC RP through the lifted explorer seam, add the `entitlement`
claim, and enforce 4-tier resolution + per-`org_id` scope at one server-side chokepoint.
**Exit.** A signed-in user sees **exactly their tier and their org's space**, and **tier escalation is
impossible** (proven by the BDD denial suite + the `03_*` TLA invariant).

| WP | Title | Deliverable(s) | Reused source / done-when |
|---|---|---|---|
| WP-S2.1 | Lift the auth seam | `citrate-docs/lib/auth/{session.ts,client.tsx}`, `app/api/auth/*` | `citrate-explorer/src/lib/auth/{session.ts,client.tsx}`; **done when** OIDC + PKCE sign-in round-trips a session, fail-closed default Public. |
| WP-S2.2 | Extend the session shape | `entitlement{ tier, orgId, citrateRole, milestone, expiresAt }` added to `AuthSession` | `02_ARCHITECTURE.md` §4 interface; **done when** `verifySession` returns the entitlement and ignores expired ones. |
| WP-S2.3 | `resolveTier` / `canRead` chokepoint | `citrate-docs/lib/auth/resolveTier.ts` (`resolveTier(s,now)`, `canRead(s,node,now)`) | `02_ARCHITECTURE.md` §4 (`tier ∧ org ∧ disclosure ∧ ¬expired`); **done when** **one** function decides tier and every gated path imports it. |
| WP-S2.4 | identity entitlement resolution | drift-tracked change in `citrate-identity/src/claims.ts` + `resolveEntitlement` at `findAccount` | `00_*` reuse map ("add `entitlement` at `findAccount`"); **done when** identity emits the claim (coordinated via the S0 `[[drift]]` entry — no fork). |
| WP-S2.5 | Sidebar + content gating | `components/sidebar.tsx` filters by `canRead`; `app/docs/[...slug]` SSR-gates Commercial/Academic | `02_ARCHITECTURE.md` §3 (build-but-gated); **done when** a Commercial user sees their org space and nothing above tier. |
| WP-S2.6 | RBAC BDD + TLA gate | `04_*` denial scenarios; re-run `03_*` TLC | `03_*`/`04_*`; **done when** escalation/cross-org scenarios are red-tested first, then green; TLC green. |

**BDD satisfied.** `04_*` *Tier scoping*, *Tier-escalation denied*, *Cross-org denied* features.
**TLA discharged.** `NoTierEscalation`, `NoCrossOrgRead` (`03_*`) — this is the sprint that proves them.
**Agentile compliance.** Rule 1 (real OIDC from day one — no mock-first identity, per locked decision #4), Rules 11/12 (the identity change goes through the `[[drift]]` entry from S0, no path-pin first), Rule 13 (the S0 visibility sign-off is the precondition for shipping this gated wiring).

## Sprint DOCS-CODEX-S3 — Confidential gateway
**Goal.** The runtime, server-side gated gateway that fetches Confidential docs from their private home
repos per request — after the entitlement check, behind a disclosure acknowledgement, fully access-logged.
**Exit.** An issued auditor reads a Confidential doc through the site **and** a build-bundle grep proves
**zero** Confidential content is present in the static output.

| WP | Title | Deliverable(s) | Reused source / done-when |
|---|---|---|---|
| WP-S3.1 | Gated content gateway | `citrate-docs/app/api/content/[...slug]/route.ts`, `lib/content/gateway.ts` | `02_ARCHITECTURE.md` §3 runtime path (5-step: verify → entitle → disclosure → fetch → log); **done when** a `gated` node is reachable **only** through this route. |
| WP-S3.2 | Server-side private fetch | server-side fetch from `citrate-security/`, `citrate-compliance/`, `ops/`, `funding/` | `01_*` §4 content sources; **done when** Confidential bytes are fetched at request time and never written to `content/` or the bundle. |
| WP-S3.3 | Disclosure acknowledgement | `components/disclosure-modal.tsx`, `disclosure_ack` table + `disclosure_gate` per-doc field | `02_*` §8 data model; **done when** a click-through ack is required and recorded before first read. |
| WP-S3.4 | Access log | `access_log` rows (`sub`, slug, tier, org_id, disclosure_ack, ts) | `02_*` §8; **done when** every Confidential read writes exactly one audited row. |
| WP-S3.5 | Bundle-grep CI gate | `citrate-docs/.github/workflows/no-confidential-in-bundle.yml` | `01_*` R1 mitigation; **done when** CI greps the build output for Confidential markers and **fails the build** on any hit. |
| WP-S3.6 | Confidential BDD + TLA | `04_*` auditor-read + bundle-clean scenarios; `03_*` TLC | `03_*`/`04_*`; **done when** scenarios green and TLC green. |

**BDD satisfied.** `04_*` *Auditor reads Confidential*, *Disclosure required*, *Zero-Confidential-in-bundle* features.
**TLA discharged.** `ConfidentialNeverInBuild` (the core invariant) + `DisclosureBeforeRender` + `EntitlementExpiry` (R4) (`03_*`).
**Agentile compliance.** Rule 1 (no stubbed gateway — the fetch hits real private repos; no TODO on the gated path), Rule 13 (gateway is exactly the wiring the S0 sign-off authorized), R1/R4/R9 mitigations land here as code, not policy.

## Sprint DOCS-CODEX-S4 — Agentic harness
**Goal.** Lift the explorer "Ask" harness and make it tier-aware: RAG filtered by caller tier *before*
generation, docs tools, threads, and an MCP server exposing Codex surfaces. *(Forks off S2.)*
**Exit.** Ask answers a Public and a Commercial question with correct tier scoping; an **Academic-only
chunk is never returned to a Commercial caller**.

| WP | Title | Deliverable(s) | Reused source / done-when |
|---|---|---|---|
| WP-S4.1 | Lift chat route + provider | `app/api/chat/route.ts`, `lib/ai/provider.ts` + `verifySession`/`resolveTier` at the top | `citrate-explorer/src/app/api/chat/route.ts`, `src/lib/ai/provider.ts`; **done when** the route 401s on `auth.required && !authenticated` and passes caller tier downstream. |
| WP-S4.2 | Tier-partitioned RAG | `lib/ai/rag.ts` — corpus chunked + partitioned by `tier + org`; retrieval filtered to `≤ caller tier ∧ org` **pre-generation** | `02_*` §5 (partition is the control, prompt is defense-in-depth); **done when** an Academic chunk is structurally unretrievable for a Commercial caller. |
| WP-S4.3 | Docs tools | `lib/ai/tools.ts`: `searchDocs(query,tier)`, `getSurface(id)`, `listSandboxes()` + lifted read-only chain tools | `citrate-explorer/src/lib/ai/tools.ts`, `lib/harness/{ops,client,allowlist}.ts`; **done when** tools respect the caller tier and tool-calls are audited. |
| WP-S4.4 | System prompt + threads | `lib/ai/system-prompt.ts` (docs-knowledge swap, keep guardrails), `app/api/threads/*`, `lib/db/conversations.ts` | `citrate-explorer/src/lib/ai/system-prompt.ts`, `src/lib/db/conversations.ts`; **done when** per-`sub` history persists (AES-GCM at rest). |
| WP-S4.5 | MCP server | `app/api/mcp/route.ts`, `lib/ai/mcpResources.ts` (resources = surface map; API-key entitlement caps tier) | `citrate-explorer/src/app/api/mcp/route.ts`; **done when** an external agent's API key caps the tier it can retrieve. |
| WP-S4.6 | Rate-limit + agent BDD | `lib/api/ratelimit.ts` (lifted); `04_*` agent scenarios | `citrate-explorer/src/lib/api/ratelimit.ts`; **done when** per-`sub`/IP limits hold and exfil scenarios are red-then-green. |

**BDD satisfied.** `04_*` *Ask scoped to tier*, *Agent never exfiltrates above tier*, *MCP entitlement-capped* features.
**TLA discharged.** `NoTierEscalation` extended to the retrieval path (`AgentRespectsTier`, `03_*`) — discharges R3.
**Agentile compliance.** Rule 1 (lifted real harness, no mock provider on the prod path), Rule 9 (lift the explorer files as the reuse map directs; don't re-author), Rule 2 (tool/RAG tests are net-additive).

## Sprint DOCS-CODEX-S5 — Sandboxes
**Goal.** Five live testnet widgets — read-mostly, rate-limited, fail-closed. *(Forks off S1.)*
**Exit.** Each widget executes a **live chain-40204 call from the browser** and **fails closed** when its
endpoint is down.

| WP | Title | Deliverable(s) | Reused source / done-when |
|---|---|---|---|
| WP-S5.1 | Sandbox host + frames | `app/sandboxes/[id]/page.tsx`, `components/sandbox-frame.tsx` | `02_*` §6; **done when** a sandbox embeds as an MDX component and links to its concept doc + source repo. |
| WP-S5.2 | GhostDAG blue-score viz | `sandboxes/ghostdag.tsx` (`citrate_blockDAG`/`citrate_blueScore`/`citrate_tipSet`) | `citrate-explorer` DAG tools; **done when** it renders live tip-set blue scores. |
| WP-S5.3 | Gasless EIP-2771 relay demo | `sandboxes/relay.tsx` (public forwarder meta-tx) | `citrate-chatbot` `/api/relay`; **done when** a meta-tx relays on testnet with no key custody in Codex. |
| WP-S5.4 | x402 402-payment walkthrough | `sandboxes/x402.tsx` (`X402Client` challenge → 402 → settle) | `citrate-buyer-webapp` + `@citratenetwork/marketplace-sdk`; **done when** the 402 flow completes on testnet. |
| WP-S5.5 | Inference-gateway + RPC explorer | `sandboxes/{inference,rpc-explorer}.tsx` (`POST /v1/chat/completions`; allowlisted `eth_*`/`citrate_*`) | `citrate-inference-gateway`, `citrate-explorer/lib/harness/allowlist.ts`; **done when** both run live reads and fail closed when down. |
| WP-S5.6 | Sandbox BDD | `04_*` sandbox scenarios | `04_*`; **done when** the live-call + fail-closed scenarios are green. |

**BDD satisfied.** `04_*` *Sandbox runs live call*, *Sandbox fails closed* features.
**TLA discharged.** None safety-critical (read-mostly, no gate); `04_*` covers behavior.
**Agentile compliance.** Rule 1 (real testnet calls — no mocked chain responses on the sandbox path; fail-closed is the only fallback, never a fake "ok"), Rule 8 (no `.unwrap()`-equivalent unguarded throws on the widget path), R8 mitigations (rate-limit, read-mostly) land here.

## Sprint DOCS-CODEX-S6 — Content & hardening
**Goal.** Fill the `06_*` map across all four tiers, finalize rate-limit/SBOM/cosign, the quarterly
access-review SOP, and disclosure/embargo automation. *(Join point — needs S1–S5.)*
**Exit.** Every surface in `06_*` resolves to a real page or a tracked backlog stub, and **Tier-1 release
artifacts are produced**.

| WP | Title | Deliverable(s) | Reused source / done-when |
|---|---|---|---|
| WP-S6.1 | Surface coverage close-out | content + transclusions for every `06_*` node across Public/Commercial/Academic/Confidential | `06_*` coverage check; **done when** no orphan/untiered surface remains (each resolves to a page or a tracked stub). |
| WP-S6.2 | Release supply-chain | `.github/workflows/release.yml` with SBOM + cosign signing | `00_*` audit posture; **done when** a signed release manifest + SBOM are emitted. |
| WP-S6.3 | Access-review SOP | `citrate-docs/audits/ACCESS_REVIEW_SOP.md` (quarterly) | `07_*`; **done when** the SOP is committed and references the `expires_at` revocation path (R4). |
| WP-S6.4 | Disclosure/embargo automation | embargo auto-hold on Confidential/compliance content | `01_*` R9; **done when** embargoed content is held until its release date. |
| WP-S6.5 | Tier-1 audit prep | threat model + audit packet → `citrate-security` | `01_*` §6; **done when** the packet is handed off and the bundle-grep gate is green on release. |

**BDD satisfied.** `04_*` *Full-surface coverage*, *Embargo auto-hold*, *Release-artifacts-produced* features.
**TLA discharged.** Re-run the full `03_*` spec set green on the release candidate.
**Agentile compliance.** Rule 1 (tracked stubs are explicitly *not* prod-path pages — they are backlog links, not TODO content shown to users), Rule 13 (final visibility re-confirm before Tier-1 release), Rule 2 (release-candidate test count ≥ every prior sprint's).

---

## Test ratchet (Rule 2)
- **Rule 2 — monotone tests.** The app test count is non-decreasing within a sprint; no WP lands a net
  test deletion. RBAC/RAG/gateway denial tests (S2–S4) are **red-tested first**, then made green.
- **Rule 1 — no mocks/TODOs on prod paths.** Real OIDC from S2, real private-repo fetch in S3, real
  testnet calls in S5; test doubles stay in test code; `gated` content is never stubbed into the bundle.
- **Rule 9 — link, don't copy.** Source Markdown stays in its home repo / the archive; Codex transcludes
  (pinned SHA) or links — it never forks the source of truth.

## Agentile compliance checklist (applies to every WP)
- [ ] Rule 0: read `AGENT_ENTRY.md` + owners before starting.
- [ ] Rule 1: no mocks/stubs/TODOs on prod paths.
- [ ] Rule 2: app test count monotone non-decreasing; denial tests red-first.
- [ ] Rule 9: transclude/link source docs; never copy bodies into the app or the bundle.
- [ ] Rule 12: Rule-12 frontmatter on every doc/ADR/sprint.
- [ ] Rules 11/12: `[[drift]]` entry before any cross-repo dep / path-pin (the `citrate-identity` claim dep).
- [ ] Rule 13: visibility sign-off recorded (S0) before any gated wiring (S2/S3) ships.
- [ ] TLA+ gate: re-run affected `03_*` spec; green before merge.
- [ ] Each WP closes by updating the federation sprint file (Rule 4), not this index.

## Definition of done (whole project)
Tied to `01_SCOPE_OF_WORK.md` §6 success criteria:

- [ ] Every federation surface in `06_*` carries a tier assignment — no orphan, no untiered surface. *(S1, S6)*
- [ ] An unauthenticated visitor navigates the Public sidebar, runs every sandbox, and uses Ask. *(S1, S4, S5)*
- [ ] A signed-in Commercial user sees their org's space and nothing above tier; Academic sees the research
      portal; an issued auditor reads Confidential through an access-logged, acknowledged gate. *(S2, S3)*
- [ ] The static build contains **zero** Confidential content — CI-proven by the bundle-grep gate. *(S3)*
- [ ] The Ask agent never returns an above-tier chunk — RAG filtered before retrieval. *(S4)*
- [ ] `scripts/drift-check.sh` is green after the manifest bump; the sprint file lives in `active/`. *(S0)*
- [ ] All `03_*` TLA invariants (`NoTierEscalation`, `ConfidentialNeverInBuild`, `NoCrossOrgRead`,
      `EntitlementExpiry`, `KycGateMonotonic`, `DisclosureBeforeRender`, `AgentRespectsTier`)
      model-check green on the release candidate. *(S6)*
- [ ] Tier-1 release artifacts (SBOM + cosign-signed manifest) produced and audit packet handed to
      `citrate-security`. *(S6)*

---

© Mozi Cooperative. Licensed under Apache-2.0.
