---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Frontend Design Brief & Prototype SOW

> **For:** the design team building the **Citrate Codex** prototype async.
> **Purpose:** a single document that (a) proposes the layouts, screens, components, and *every*
> setting/feature for a gated, agentic documentation platform, and (b) maps every interface surface to
> the backend it wires into — so the design covers *all* the functionality, nothing orphaned, and the
> engineering team can **rebuild it 1:1 and wire it in**.
> **Status:** working contract to build from. The **functional contract** (the wiring map in §14 + the
> component inventory in §13 + the states matrix in §15) is the part to honor exactly; the **visual
> direction** (§§4–12) is a strong proposal, not a constraint on your craft.
> **Companion docs (read these):** the planset `PLANSET/00..07`, especially
> `PLANSET/06_INFORMATION_ARCHITECTURE.md` (the full surface→tier map this brief renders) and
> `PLANSET/02_ARCHITECTURE.md` (the seam, the gateway, the harness). Sibling gold standards:
> `citrate-explorer/DESIGN_BRIEF.md` and `citrate-explorer/DESIGN_HARNESS_AND_SETTINGS.md` — Codex
> shares their ethos and lifts their auth seam + "Ask" harness.

---

## 1. What we're building (north star)

**Citrate Codex** (`citrate-docs`, evolved in place) is the **one documentation surface for the entire
Citrate federation** — a gated, agentic, modern docs platform that maps *every* owned surface (contracts,
opcodes/precompiles, RPC, CLIs, SDKs, apps/dapps, primitives, papers, specs, SOPs), lets people **run**
the network's novel ideas in **live sandboxes**, and answers questions with a tier-aware **"Ask Codex"**
agent — all behind a splash and a four-tier access model.

It must do everything a best-in-class docs site does (search, deep-linkable pages, versioned reference,
copy-paste-ready code, dark/light, fast) and then the two things ordinary docs never do:

1. **Gate gracefully by who you are.** Four tiers — **Public / Commercial / Academic / Confidential** —
   resolved from your `citrate-identity` role, your KYC status, and your organization's contract. The
   same URL shows the right depth to the right person, and **never** leaks the wrong depth to the wrong
   person. Locked content is *visible as locked* (with a clear path to access), not invisible — except
   Confidential, which is invisible to anyone without the grant.
2. **Let you do, not just read.** Every novel concept (GhostDAG, gasless AA, x402, verifiable inference)
   has a **live testnet sandbox** and a **Tutorials** track, and the **Ask Codex** agent is woven into
   every page — it answers by reading the docs corpus *at your tier* and citing what it read.

**Design north star:** **"A handbook you can run, gated like a vault, calm like a reading room."**
Dark-first, Citrate-green identity, generous reading measure, fast. The gating is felt as *quiet trust*,
never friction: a signed-in enterprise architect glides into their org's space; an anonymous developer
gets the full public handbook + sandboxes without ever hitting a wall they don't need to.

**Tone:** confident, precise, a little futuristic. Linear/Vercel restraint with a warm Citrate-green
accent and editorial typography for long-form reading.

---

## 2. Primary users & their job-to-be-done

| User (tier) | Who | Job-to-be-done |
|---|---|---|
| **Anonymous visitor** (Public) | Curious dev, prospective customer, student, press | Understand what Citrate is, read public SDK/RPC/CLI docs, **run a sandbox**, ask the agent — with no login. |
| **Authenticated developer / KYC'd builder** (Commercial · `C·kyc`) | Any KYC'd ecosystem user | The **deep implementation track** — extremely detailed technical-user docs, operator SOPs, full API depth. Gated on KYC, not a paid seat. |
| **Enterprise seat-holder** (Commercial) | District admin, defense prime, partner engineer | Their **org's private space** — enterprise implementation guides, contracts/DPA, per-company docs, support SOPs. Sees only their org. |
| **Academic / research partner** (Academic) | Rutgers et al., admins | The **research portal** — full Gradient Papers, TLA+ corpus, consensus/crypto deep dives, formal-verification methodology, testnet access. |
| **Administrator / executive** (Confidential) | Citrate team leads, execs | Everything, plus the **admin console**: grant/revoke entitlements, manage orgs, disclosures, embargoes, view access logs. |
| **3rd-party auditor** (Confidential, time-gated) | Coalfire, Trail of Bits, C3PAO | A **time-boxed, scoped** view of exactly the Confidential audit material their engagement covers — acknowledged + access-logged. |

The design must serve the **anonymous visitor** with zero friction while giving the **auditor** and
**admin** a rigorous, access-logged, scoped experience on the same chrome.

---

## 3. Information architecture (the tier-aware sidebar)

The left sidebar renders the full surface map from `PLANSET/06_INFORMATION_ARCHITECTURE.md`. Every
section has a **Tutorials** subsection. Each node carries a **tier** that controls how it renders for the
current viewer (visible / locked-with-CTA / hidden — see §5.3). Top-level sections:

```
Codex
├── ✦ Ask Codex            (persistent drawer, every page)
├── ⌕ Search               (⌘K command palette + results page)
│
├── Start Here                                  [Public]
│   ├── What Citrate is · GhostDAG/LVM/SALT primer · Licensing
│   ├── Agentile methodology primer
│   └── Tutorials
├── Chain Core                                  [Public→Academic; security precompiles Confidential]
│   ├── Consensus · Execution (LVM) · Precompiles/Opcodes · JSON-RPC · CLI
│   ├── Network/P2P · Sequencer/Mempool · Storage · Economics · Bridge · Genesis/Config
│   └── Tutorials
├── Smart Contracts                             [Public/Commercial; KYC·TEE·bridge Confidential]
│   ├── by domain: edu · compute · marketplace/models · economics · governance · aa · x402 · security
│   └── Tutorials
├── SDKs & APIs                                 [Public; marketplace/bundler Commercial]
│   ├── sdk-js · sdk-python · marketplace-sdk · inference-gateway · bundler
│   └── Tutorials
├── Account Abstraction & Identity              [Public→Commercial; KYC internals Confidential]
│   ├── Passkeys/WebAuthn · Paymaster · Guardians/Recovery · OIDC/KYC · the entitlement claim
│   └── Tutorials
├── Compute & Inference                         [Commercial; operator depth C·kyc]
│   ├── node-agent (sell) · compute-pool · gateway · x402 deep dive
│   └── Tutorials
├── Apps & dApps                                [mostly Public; studio/boeing Confidential]
│   ├── explorer · wallet-ext · chatbot · landing · dashboard · buyer-webapp · learning-center
│   ├── district-registration · comms · memories · studio · boeing-shell · nist-agent
│   └── Tutorials
├── Federated Learning & Research               [Academic]
│   ├── Learning cycles · Mentorship Protocol · Paraconsistent consensus · Verifiable inference · ATIS
│   ├── Gradient Papers v3 (10) · TLA+ corpus · Gherkin BDD library
│   └── Tutorials
├── Node Operators                              [Public / C·kyc]
│   ├── Run a node · Sell compute · Rewards/reputation · Operator SOPs
│   └── Tutorials
├── Enterprise & Compliance                     [Commercial / Confidential]
│   ├── Procurement · DPA/SLA · Compliance posture · Security questionnaires · Per-company spaces · K-12 · Federal
│   └── Tutorials
├── Sandboxes                                   [Public]
│   ├── GhostDAG blue-score · Gasless relay · x402 · Inference-gateway · RPC explorer
│   └── (each has an inline guided walkthrough)
├── Methodology & SOPs                          [Public; some ops SOPs Confidential]
│   ├── The 13 rules · Sprint lifecycle · Customer/Dev/Operator SOPs · Internal SOPs
│   └── Tutorials
└── ── (admin/confidential, only when entitled) ──
    ├── Internal / Audit                        [Confidential] — audit reports, ops, funding, incidents, registers
    └── Admin Console                           [Confidential·admin] — entitlements, orgs, disclosures, embargoes, access log
```

Sidebar behaviors: collapsible groups (state persisted per user); a **tier filter** chip row at top
("Show: Public · Commercial · Academic · Confidential" — only tiers the viewer can see are offered);
sticky section headers; a "you are here" rail; keyboard navigable. On mobile the sidebar is a slide-over;
Ask Codex becomes a bottom sheet.

---

## 4. Global layout & chrome

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR  ✦Codex   [⌕ search ⌘K]            [tier badge]  [▢ sandbox]  [◐ theme]  [account ▾]│
├───────────────┬──────────────────────────────────────────────────┬───────────────────┤
│  SIDEBAR      │  CONTENT (doc reader / sandbox / settings)          │  ASK CODEX drawer  │
│  (IA §3)      │   ┌ breadcrumb ─────────────── [tier chip][last-sync]│  (collapsible)     │
│  tier filter  │   │ # Page title                                     │  thread list       │
│  groups       │   │ TOC (right-rail on wide, inline on narrow)       │  streamed answer   │
│  you-are-here │   │ MDX body · code blocks · callouts · sandboxes    │  tool-call trace   │
│               │   │ "Was this helpful" · "Ask about this" · edit-src │  cited entities    │
└───────────────┴──────────────────────────────────────────────────┴───────────────────┘
```

- **Topbar:** brand mark (`branding/icons/citrate-mark.svg`) + wordmark; global search trigger; the
  **tier badge** (shows the viewer's resolved tier + org, click → "your access" panel); a sandbox quick-
  launch; theme toggle; account menu (or **Sign in** when anonymous).
- **Three-column on wide** (sidebar · content · Ask drawer). Ask drawer is collapsible to a rail with the
  ✦ affordance. **Two-column** when Ask is collapsed. **Single-column** on mobile with slide-overs.
- **Right rail** inside content holds the page TOC + "On this page" + per-section "Ask about this".

---

## 5. The access model in the UI (the part that makes Codex Codex)

### 5.1 Tiers, visually

| Tier | Chip color (proposal) | Sidebar/affordance |
|---|---|---|
| **Public** | neutral / no chip | always visible |
| **Commercial** | Citrate green | green dot; locked-state shows "Request a seat" |
| **Academic** | violet | violet dot; locked-state shows "Apply for research access" |
| **Confidential** | amber + lock | **hidden** unless entitled; when entitled, amber lock + "access-logged" note |

A small **tier chip** appears on the page header, on sidebar nodes, on search results, and on agent
citations — it is the consistent signal of "what band this is."

### 5.2 "Your access" panel (click the tier badge)

A panel that plainly states: your resolved tier, your `org_id`/sector, your KYC status, any time-gated
grant + its expiry, and **what each higher tier would unlock** with the action to get it ("Complete KYC",
"Request a seat", "Apply for research access", "Contact your admin"). This is the user-facing face of the
entitlement claim.

### 5.3 Locked-content states (precise — engineering honors these)

- **Visible-locked (Commercial/Academic):** the node and page *title/summary* render, body is replaced by
  a **paywall/gate card**: what's inside (1-2 lines), the tier required, and the CTA (KYC / seat / apply /
  contact admin). Never show the gated body.
- **Hidden (Confidential):** the node does not appear in the sidebar, search, or agent retrieval for
  anyone without the grant. No 403 that reveals existence to the unentitled — a Confidential URL returns
  **404** to the unentitled (see states matrix §15). Entitled users see it normally (with the amber lock).
- **Per-org scoping:** a Commercial/Confidential node tagged to `org_id` is only visible to that org (and
  admins). Org A never sees org B's space, even at the same tier.

### 5.4 The disclosure gate (Confidential reads)

Before a Confidential doc with a `disclosure_gate` renders, a **modal**: the disclosure text (NDA/handling
terms), an "I acknowledge" checkbox, and an "Open document" button. On accept: the ack is recorded, the
doc fetches **server-side at request time** (never in the bundle), the read is **access-logged**, and a
persistent **"Confidential · access-logged · acknowledged {date}"** banner sits atop the page. Embargoed
docs show a "Held until {date}" state instead of the body.

---

## 6. Splash & authentication

### 6.1 Splash (`/`)

A real landing/splash (the front door before the app): the product line, what Codex is, the four tiers
explained in one row, a prominent **"Browse the docs"** (enters Public), **"Sign in"** (OIDC), and a
**"Try a sandbox"** teaser. Includes a live ChainBadge (testnet 40204 height ticking) to signal "this is
wired to a real network." Footer: license/trademark, links to the federation, status.

### 6.2 Sign-in (OIDC + PKCE via `citrate-identity`)

- **Sign in** → redirect to `auth.citrate.ai` (Authorization Code + PKCE) → callback → session cookie
  (httpOnly). Methods surfaced by identity: passkey/WebAuthn, email, SIWE (wallet). Design the **method
  chooser** and the **post-login resolution** ("Welcome — you have Commercial access for {org}").
- **KYC prompt:** when a user hits a `C·kyc` surface without verified KYC, an inline **"Verify to unlock
  the implementation docs"** flow (links to the identity KYC vendor; Codex shows only the *status*, never
  PII).
- **Account menu (authed):** name/avatar, tier+org, links to Settings, Threads, API keys, "Your access",
  Sign out.
- **Dev mode (prototype only):** a tier-switcher so the design/prototype can preview all five viewer
  states (anonymous, Commercial+org, Academic, Confidential+admin, time-gated auditor) without a real IdP.
  Engineering replaces this with the real seam — the prototype MUST expose it so we can see every state.

---

## 7. The document reader

The core surface. Must be a first-class reading experience:

- **Header:** breadcrumb, H1 title, tier chip, "last synced @ {sha}" badge for transcluded pages, source
  link ("View source in {repo}"), reading-time, "Ask about this page" button.
- **Body (MDX):** headings with anchor links; **code blocks** with language label, copy button, and
  per-language tabs (e.g. JS/Python/cURL for API examples); callouts (note/warning/security/tier-only);
  tables; mermaid/diagrams; **inline sandbox embeds**; footnotes; cross-links render with a tier chip if
  they point to gated content.
- **Right rail:** "On this page" TOC (scroll-spy), "Related surfaces", "Edit/Improve" (source link),
  per-section "Ask about this".
- **Footer of page:** prev/next in section, "Was this helpful? 👍/👎 + optional note", contributors,
  last-updated.
- **Versioning:** a version selector where a surface is versioned (e.g. SDK, contracts ABI). Default to
  latest; show a banner on non-latest.
- **States:** loading skeleton; "warming" for transcluded content being fetched; gate card for locked;
  embargo state; 404.

---

## 8. Tutorials

A distinct content type (not just a doc): **step-by-step, runnable**. Each tutorial:
- A header with prerequisites, est. time, the tier it requires, and a "what you'll build".
- **Numbered steps** with a progress indicator; each step can embed a sandbox or a copyable command.
- A **"run it" affordance** that opens the relevant sandbox pre-seeded with the step's inputs.
- Completion state (per-user, persisted) + "next tutorial".
- Lives in a **Tutorials** subsection of every section (§3).

---

## 9. Sandboxes (live testnet, chain 40204 — read-mostly, fail-closed)

Each sandbox is an interactive widget, embeddable in docs/tutorials and also reachable from the Sandboxes
section. Shared frame: a **title + concept blurb**, the **interactive controls**, a **live result panel**,
a **"what just happened" explainer** (optionally agent-generated), a **"view the code" link to the source
repo**, and a **rate-limit / fail-closed** state. All are read-mostly; no private keys live in Codex.

| # | Sandbox | Controls | Result | Calls (wiring → §14) |
|---|---|---|---|---|
| S-1 | **GhostDAG blue-score visualizer** | live toggle, block selector, depth slider | animated DAG (blue/red nodes, selected vs merge edges, blue_score, finality ring) | `citrate_getDagStats`, `chain_getTips`, `chain_getBlock` |
| S-2 | **Gasless relay (EIP-2771)** | pick a demo action, sign (testnet), submit | tx hash + "no gas, on us" + receipt | the public relay endpoint (forwarder meta-tx) |
| S-3 | **x402 402-payment** | request a metered resource → see 402 → pay (testnet) → retry | the 402 challenge, the settlement, the unlocked response | `X402Client` challenge → 402 → settle |
| S-4 | **Inference-gateway call** | model picker, prompt box | streamed completion + token/cost usage | `POST /v1/chat/completions` (OpenAI-compatible) |
| S-5 | **RPC method explorer** | method picker (allowlisted), param form | request + decoded response, copyable cURL | allowlisted `eth_*` / `citrate_*` reads |

Sandbox visual language reuses the explorer DAG vocabulary (blue=blue set, red=red block, bold edge=
selected parent, thin edge=merge parent, ring=finalizing). Respect `prefers-reduced-motion`.

---

## 10. Ask Codex (the agentic harness, lifted from the explorer)

A persistent, collapsible **right drawer** on every page (bottom sheet on mobile). It is woven in, not
bolted on: every page and every section has an **"Ask about this"** affordance that pre-seeds context.

- **Composer:** multiline input, send, stop, model/temperature is fixed by us (not user-exposed), a
  "scope" indicator showing it answers **at your tier** ("Answering from your Commercial-tier corpus").
- **Streamed answer:** markdown with code, tables, and **clickable citations** (each citation is a doc
  chunk with its tier chip — never above the caller's tier). A **tool-call trace** (collapsible) shows
  which docs/tools it read (`searchDocs`, `getSurface`, the read-only chain tools for sandbox-linked Qs).
- **Threads:** per-user history (rename, delete, resume), persisted for authed users; ephemeral for
  anonymous. Graceful no-DB degradation (chat works, history isn't saved).
- **Guardrails (surface as quiet trust):** "Codex answers only from documentation you can access and cites
  what it read." Rate-limited; 429 shows a friendly retry. Inference-unavailable shows a calm 503.
- **MCP note:** the same toolbox is exposed as an MCP server for external agents (API-key, entitlement-
  capped) — no UI beyond the API-keys settings page, but the design should mention it on the API page.

---

## 11. Settings & account (comprehensive — "catch all the settings")

A full settings area at `/settings`, tabbed. **Every tab below is in scope.**

### 11.1 Profile & identity
- Display name, avatar, email (from identity, read-only where identity-owned).
- **Identity methods:** passkeys, email, linked wallet(s) — managed via identity (Codex links out).
- **KYC status:** verified / pending / none, with verify CTA. Status only — no PII shown.

### 11.2 Access & entitlements (read-only mirror of the claim)
- Resolved **tier**, **org_id/sector**, **citrate_role** (if any), **milestone**, **grant expiry**.
- A clear "what each tier unlocks + how to get it" map (same as the "Your access" panel §5.2).
- For time-gated principals (auditors): a countdown to expiry.

### 11.3 Appearance
- Theme: **dark (default) / light / system**. Accent locked to Citrate green. Density: comfortable/compact
  (affects power-user tables). Font size / reading width. Code theme. Reduce motion.

### 11.4 Ask Codex preferences
- Default drawer open/closed; show/hide tool-call traces by default; "Ask about this" affordances on/off.
- Thread retention (keep/auto-delete after N days). Clear all threads.

### 11.5 Notifications (if/when present)
- Doc-change subscriptions (watch a section → notify on update); embargo-release alerts for content you're
  waiting on; security/disclosure notices. Channels: in-app + email. Per-type toggles.

### 11.6 API keys & MCP
- Create/list/revoke API keys (Codex content API + MCP). Keys **hashed at rest, shown copy-once**. Each
  key shows masked value, created, last used, quota used/limit, **and the tier it's capped at** (a key
  can never exceed the creator's entitlement). cURL/MCP connection snippets.

### 11.7 Transparency / activity (the user's own audit view)
- The user's **own access log**: which Confidential/Commercial docs they opened, when, and the disclosures
  they acknowledged. Their Ask tool-call history. This mirrors the explorer's "Transparency" ethos — it
  makes "the agent/app can only do X" *verifiable* by the user.

### 11.8 Data & privacy
- **Export** my data (threads, prefs, acks, access log) → bundle. **Delete** my account (purge rows).
  Clear copy on what Codex stores (no PII; KYC status only).

---

## 12. Admin console (Confidential·admin — the operational settings)

A separate, role-gated area at `/admin`. **All of the following are in scope** — these are the operational
settings the org runs Codex with:

### 12.1 Entitlements & people
- Search principals (by `sub`/email/wallet). View/edit their **tier, org_id, citrate_role, milestone,
  expires_at**. Grant/revoke. **Issue a time-gated auditor grant** (scope to a sector/engagement +
  expiry). Bulk import for an enterprise's seats. Every change is itself audit-logged + shows who made it.
- **Source-of-truth note:** Codex writes to the entitlements/contracts table; the *claim* is minted by
  `citrate-identity`. The admin UI is the human face of that table (Squad ③ Growth owns enterprise seats;
  admins own role/auditor grants).

### 12.2 Organizations & sectors
- Create/manage **orgs** (districts, enterprises, Boeing, research partners). Set an org's tier band, its
  KYC requirement, its seat count, and its **per-company private space**. Assign content scopes.

### 12.3 Content & transclusion
- A **sync dashboard**: every transcluded node, its source repo + pinned SHA, last-sync status, drift
  flag. Trigger a re-sync. See orphan/untiered surfaces (the S6 coverage gate). Map a surface → tier.

### 12.4 Disclosures & embargoes
- Manage **disclosure gates** (text, which docs require them). Manage **embargoes** (set `embargo_until`,
  see what's auto-held, what just released). Every embargo/visibility down-shift requires the **Rule-13
  sign-off** chain — the UI captures the approver + records it.

### 12.5 Access log & audit
- The **global access log** viewer: who read what Confidential/Commercial doc, when, which disclosures
  acknowledged, filterable by principal/org/doc/time. Export for auditors. This is the compliance face of
  the whole system.

### 12.6 Sandboxes & rate limits
- Toggle individual sandboxes, set rate limits, see endpoint health (fail-closed status), set the
  inference model/endpoint.

---

## 13. Component inventory (build these as a real library)

The prototype must ship a reusable component set (Storybook-style states). Minimum:

- **Chrome:** `TopBar`, `Sidebar` (+ `SidebarGroup`, `SidebarItem` with tier state), `TierFilter`,
  `Breadcrumb`, `AskDrawer`, `CommandPalette` (⌘K), `ThemeToggle`, `AccountMenu`, `ChainBadge`.
- **Access:** `TierChip`, `TierBadge`, `YourAccessPanel`, `GateCard` (visible-locked), `DisclosureModal`,
  `ConfidentialBanner`, `EmbargoState`, `KycPrompt`.
- **Reader:** `DocHeader`, `Toc`, `CodeBlock` (multi-lang tabs + copy), `Callout` (note/warn/security/
  tier-only), `CrossLink` (tier-aware), `LastSyncedBadge`, `SourceLink`, `HelpfulVote`, `PrevNext`,
  `VersionSelector`.
- **Tutorials:** `TutorialHeader`, `StepList`, `Step`, `RunItButton`, `ProgressRail`, `CompletionState`.
- **Sandboxes:** `SandboxFrame`, `DagViz`, `RelayDemo`, `X402Demo`, `InferenceDemo`, `RpcExplorer`,
  `ResultPanel`, `FailClosedState`, `RateLimitState`.
- **Ask:** `AskComposer`, `MessageStream`, `Citation`, `ToolCallTrace`, `ThreadList`, `ScopeIndicator`.
- **Settings/Admin:** `SettingsTabs`, `EntitlementTable`, `OrgManager`, `SyncDashboard`,
  `DisclosureManager`, `EmbargoManager`, `AccessLogTable`, `ApiKeyManager`, `ActivityLog`,
  `DataExportDelete`.
- **Primitives:** buttons, inputs, selects, tabs, modal, toast, skeleton, empty-state, error-state,
  pagination, table (dense + comfortable), badge, tooltip, copy-button.

Each component must render its **full state set** (default/hover/focus/disabled/loading/empty/error +
tier-variant where relevant) so engineering can rebuild 1:1.

---

## 14. Backend ↔ frontend wiring map (the functional contract)

**This table is the coverage checklist — if the design omits a row, functionality is missing.** Stack:
**Next 16, React 19, shadcn/Tailwind 4, Vercel AI SDK v6, Drizzle + Neon**; auth = `citrate-identity` OIDC
RP via the lifted explorer seam (`lib/auth`); inference = OpenAI-compatible gateway (`infer.citrate.ai`);
chain reads = read-only harness (`lib/harness`) on chain 40204. The single RBAC chokepoint
(`verifySession` → `resolveTier`/`canRead`) gates **every** row.

| UI surface | Hook / client call | API route / data source | Data shape |
|---|---|---|---|
| Splash ChainBadge | `useChainStatus()` poll | `rpc.citrate.ai` `eth_*` / `citrate_*` | `{ chainId:40204, height, blueScore, up }` |
| Sign in / callback | `useAuth().login()` → OIDC PKCE | `auth.citrate.ai` + `/api/auth/*` (lifted seam) | redirect → httpOnly session |
| Session + tier resolution | `useAuth()` / server `verifySession()` | `lib/auth/session.ts` + entitlement claim | `AuthSession{ sub, walletAddress, entitlement{tier,orgId,citrateRole,milestone,expiresAt} }` |
| "Your access" panel | `useAuth().entitlement` | session | the entitlement object + upgrade map |
| Sidebar / IA | `useNav(tier, org)` → `GET /api/nav` | `content.manifest.ts` filtered by `canRead` | tier-filtered tree (hidden nodes omitted) |
| Doc page (authored/transcluded) | `useDoc(slug)` → `GET /api/content/[...slug]` | build output (Public/Comm/Acad) gated by `canRead` | `{ mdx, tier, source, syncedSha, toc }` |
| Doc page (**Confidential**) | `useDoc(slug)` → `GET /api/content/[...slug]` (runtime) | **server-side fetch from private repo** after gate; **never in bundle**; access-logged | `{ html, tier:"confidential", disclosureRequired, accessLogged:true }` |
| Locked node body | derived from `canRead` = false | the gate card (no body fetched) | `{ locked:true, requiredTier, cta }` |
| Disclosure gate | `useDisclosure(doc)` → `POST /api/disclosures/ack` | `disclosure_ack` table | `{ acknowledged, ts }` |
| Embargo state | within `useDoc` | `embargo_until` field | `{ embargoed:true, until }` |
| Search (structured) | `useSearch(q, tier)` → `GET /api/search?q=` | index filtered by `canRead` (no above-tier hits) | `{ results[]{title,slug,tier,snippet} }` |
| Search (natural language) | `useChat()` → `POST /api/chat` | the agent (tier-aware) | message stream |
| Ask Codex (stream) | `useChat()` (`@ai-sdk/react`) → `POST /api/chat` | `streamText` + tools; **tier-filtered RAG** before retrieval; inference gateway | UI message stream (SSE) + tool-call events |
| "Ask about this" (page/section) | `useChat().sendMessage` w/ context | same; pre-seeded `getSurface` | streamed answer + citations |
| Citations | within message stream | retrieved chunks (≤ caller tier ∧ org) | `{ slug, tier, title }[]` |
| Tool-call trace | message tool parts | `searchDocs`, `getSurface`, read-only chain tools | tool name + args (audited) |
| Threads list/CRUD | `useThreads()` → `/api/threads/*` | Neon (per-`sub`, AES-GCM) | `Thread[]` / `Message[]` |
| Sandbox S-1 DAG | `useDag()` → harness | `rpc.citrate.ai` `citrate_getDagStats` + `chain_getTips/getBlock` | `{ tips[], nodes[], edges }` |
| Sandbox S-2 relay | `useRelayDemo()` → `POST /api/sandbox/relay` | public EIP-2771 forwarder relay (testnet) | `{ txHash, receipt }` |
| Sandbox S-3 x402 | `useX402Demo()` | `X402Client` (testnet) | `{ challenge, settlement, unlocked }` |
| Sandbox S-4 inference | `useChat()`-style → `POST /api/sandbox/infer` | `infer.citrate.ai` `/v1/chat/completions` | stream + `{ usage }` |
| Sandbox S-5 RPC | `useRpcExplorer(method,args)` → harness | allowlisted `eth_*`/`citrate_*` | decoded result + cURL |
| Helpful vote | `useVote(slug)` → `POST /api/feedback` | Neon | `{ ok }` |
| Settings — profile/KYC | `useAuth()` + identity links | `auth.citrate.ai` (status only) | `{ kycStatus }` |
| Settings — appearance | `usePrefs()` → `/api/prefs` | Neon | prefs blob |
| Settings — Ask prefs | `usePrefs()` | Neon | drawer/trace/retention prefs |
| Settings — notifications | `useSubscriptions()` → `/api/subscriptions` | Neon | watch list + channels |
| Settings — API keys/MCP | `useApiKeys()` → `/api/keys` | Neon; **hashed**, copy-once, tier-capped | `{ id, masked, tierCap, quota }` |
| Settings — transparency | `useMyAccessLog()` → `/api/me/access-log` | `access_log` (own rows) | access + tool-call history |
| Settings — export/delete | `/api/account/export`, `DELETE /api/account` | bundle / purge | `{ bundle }` / `{ ok }` |
| Admin — entitlements | `useEntitlements()` → `/api/admin/entitlements` | entitlements/contracts table (admin only) | grant CRUD + audit |
| Admin — orgs | `useOrgs()` → `/api/admin/orgs` | orgs table | org CRUD + scopes |
| Admin — content sync | `useSync()` → `/api/admin/sync` | manifest SHAs + drift | per-node sync status |
| Admin — disclosures | `/api/admin/disclosures` | disclosure config | CRUD |
| Admin — embargoes | `/api/admin/embargoes` | embargo config + Rule-13 sign-off capture | CRUD + approver |
| Admin — access log | `useAccessLog()` → `/api/admin/access-log` | `access_log` (all rows, admin) | filterable log + export |
| Admin — sandboxes/limits | `/api/admin/sandboxes` | config | toggles + health |
| MCP server | external agents → `/api/mcp` | the docs toolbox over MCP, entitlement-capped by key | MCP tool schema/results |

**Notes for design:**
- **One chokepoint:** every row resolves through `canRead`. The design must never assume a node renders —
  it renders *for this viewer's tier ∧ org ∧ ¬expired ∧ disclosure*.
- **Confidential is runtime-only:** Confidential doc bodies are never in the static bundle; they arrive
  via `/api/content` server-side after the gate, and the page wears the access-logged banner.
- **RAG never above tier:** the agent's retrieved set is filtered to `≤ caller tier ∧ org` *before*
  generation; citations carry tier chips as proof.
- **No PII in Codex:** only KYC *status* is read; no PII columns anywhere.
- **Two independent streams** on a doc page: the doc body (`/api/content`) and any agent summary
  (`/api/chat`) resolve independently — never block the doc on the agent.

---

## 15. States matrix (every surface, every state)

Design and deliver these states for each surface (not just the happy path):

| Surface | Loading | Empty | Error | Denied / locked | Offline / fail-closed |
|---|---|---|---|---|---|
| Doc page | skeleton + warming (transcluded) | "no content yet" stub | calm error + retry | GateCard (Comm/Acad) / 404 (Confidential to unentitled) | cached or "source unavailable" |
| Sidebar/search | shimmer | "no results at your tier" | retry | above-tier nodes omitted/hidden | last-known tree |
| Ask Codex | streaming cursor | "ask me anything in these docs" | 503 inference / 429 rate-limit | "answers limited to your tier" | "agent offline" |
| Sandboxes | "connecting to testnet" | n/a | call error | (Public, no denial) | **fail-closed** + "testnet endpoint down" |
| Settings/Admin | skeleton | "nothing here yet" | retry | non-admin → 404 on /admin | save-failed toast |
| Disclosure/embargo | — | — | — | acknowledge required / held-until | — |

---

## 16. Design system

- **Mode:** **dark-first.** `zinc-950` canvas, `zinc-900` panels, `zinc-800` borders, `zinc-100` text.
  Ship a polished **light** theme (a handbook is read in daylight). System option.
- **Accent — calm, single:** **Citrate green** (`branding/citrate_marquee_green.svg`,
  `branding/icons/citrate-mark.svg`). Used sparingly: the ✦ Ask affordance, primary CTAs, Commercial tier,
  status dots, sandbox highlights. **Amber** = Confidential lock (reserved). **Violet** = Academic.
  **Red** = errors / failed states / red DAG blocks only.
- **Brand:** the geometric **mark** as the ✦ Codex/agent motif; wordmark in the topbar/splash. Assets in
  `branding/` (mark + marquee in black/white/green/yellow). Mirror the explorer's usage discipline.
- **Type:** a clean UI sans (Geist Sans or similar) + **mono (Geist Mono) for all code, hashes,
  addresses, ABI, CLI**. Editorial reading: generous line-height and a constrained measure (~72ch) for
  long-form docs; denser in reference tables and the admin console.
- **Tier as a system rule:** the `TierChip` vocabulary (neutral/green/violet/amber-lock) is consistent
  everywhere a tier appears — sidebar, page header, search result, citation.
- **Radius:** 2xl on cards/modals/sandbox frames; full on chips/dots.
- **Motion:** 120–180ms ease-out; agent tokens stream with a live cursor; DAG animates at the frontier;
  the blue_score ticks with a subtle count-up. Respect `prefers-reduced-motion`.
- **Density:** roomy in reading + Ask; dense in reference tables, the access log, and the admin console.

---

## 17. Accessibility & responsiveness

- WCAG 2.2 AA: contrast in both themes, visible focus rings, full keyboard nav (sidebar, ⌘K palette, Ask,
  modals trap focus), semantic landmarks, ARIA-live for streamed agent answers and sandbox results.
- The tier system must be conveyed **not by color alone** — always pair the chip color with a label/icon
  (lock for Confidential, text for tier).
- Responsive: three-column (≥1280) → two-column → single-column (<768) with slide-over sidebar and
  bottom-sheet Ask. Sandboxes degrade gracefully on small screens (DAG becomes a scrollable canvas).
- `prefers-reduced-motion` honored across DAG, ticks, streaming cursor.

---

## 18. Prototype deliverable (what we need back, so we rebuild 1:1)

To let engineering **rebuild 1:1 and wire in**, the prototype must include:

1. **A running front-end** (Next.js + React + Tailwind/shadcn preferred, to match the target stack) — or,
   if the team works in static HTML/CSS, a **1:1 component package** the way `citrate-comms` translated
   its design package 1:1. Either way, **real components, real routes, real states.**
2. **Every route** in the IA (§3) + splash + sign-in + settings (all tabs §11) + admin (all panels §12) +
   each sandbox + the Ask drawer — navigable end to end.
3. **The dev-mode tier switcher** (§6.2) so all five viewer states are demonstrable without a real IdP.
4. **Mock data / fixtures** for every wiring-map row (§14): sample docs (one per tier, incl. a
   visible-locked and a Confidential-with-disclosure), sample sidebar tree, sample threads, sample access
   log, sample entitlement/org records, sample sandbox responses. Fixtures shaped to the **Data shape**
   column so swapping mocks for real `/api/*` is a drop-in.
5. **The component library** (§13) with its full state set (Storybook or an equivalent states page).
6. **Design tokens** exported (colors, type scale, spacing, radius, motion) as a theme file we can adopt.
7. **Redlines/spec** for spacing, type, and the tier/lock/disclosure states (the parts engineering must
   honor exactly).
8. **Both themes** (dark default + light) and the responsive breakpoints.

Acceptance: a reviewer can walk every screen, flip through all five tiers, open a locked page (see the
gate), acknowledge a disclosure on a Confidential doc, run all five sandboxes (mocked), ask the agent and
see tier-scoped citations, and open every settings + admin panel — all from the prototype.

---

## 19. Non-goals (v1 prototype)

- Not a CMS / authoring tool — Codex serves & links source docs (Rule 9); authoring stays in the repos.
- No real key custody or write-heavy chain actions beyond the public relay/x402 demos.
- No new identity provider — we consume `citrate-identity`; the prototype mocks it via the tier switcher.
- Don't design the source-Markdown migration — the content already exists; we render & gate it.
- Don't surface model/temperature controls for Ask — inference config is ours, not the user's.

---

## 20. Coverage check (designer's checklist)

Every item must have a screen/state in the prototype:

- [ ] Splash · OIDC sign-in (passkey/email/SIWE chooser) · KYC prompt · post-login resolution
- [ ] Tier-aware sidebar + tier filter + every section's **Tutorials** subsection
- [ ] Doc reader: authored, transcluded (last-synced), visible-locked gate, Confidential + disclosure +
      access-logged banner, embargo state, versioned page, 404
- [ ] "Your access" panel + tier badge + every locked-state CTA (KYC / seat / apply / contact admin)
- [ ] All 5 sandboxes with controls/result/explainer/fail-closed/rate-limit
- [ ] Ask Codex: drawer + bottom sheet, streaming, citations w/ tier chips, tool-call trace, threads,
      "Ask about this", scope indicator, 429/503 states
- [ ] Search: ⌘K palette + results page, tier-filtered, NL → agent
- [ ] Settings: profile/identity/KYC · access/entitlements · appearance · Ask prefs · notifications ·
      API keys/MCP · transparency/activity · data export/delete
- [ ] Admin: entitlements/people · orgs/sectors · content/transclusion sync · disclosures · embargoes +
      Rule-13 sign-off · access log + export · sandboxes/limits
- [ ] Component library with full state set · both themes · responsive · a11y · motion/reduced-motion
- [ ] Fixtures for every §14 wiring row, shaped to the data contracts
