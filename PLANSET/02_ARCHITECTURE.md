---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Architecture

> Companion to `00_OVERVIEW.md` (vision, reuse map) and `06_INFORMATION_ARCHITECTURE.md` (the surface
> map). This doc defines the app layout, the hybrid content pipeline, the RBAC seam, the agentic harness,
> the sandbox runtime, and the deployment topology. Formal invariants for the access core are in
> `03_TLA_SPECS.md`; hardening detail is in `07_IMPLEMENTATION_AND_HARDENING_PLAN.md`.

## 1. Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + React 19** | Matches `citrate-explorer` and `citrate-memories/webapp`; SSR/edge for the runtime tier gate; the harness is built for it. |
| UI | **shadcn/ui + Tailwind 4** | Federation precedent; fast, accessible primitives for the sidebar/splash/docs shell. |
| Content render | **MDX** + remark/rehype | Tier-tagged frontmatter; code highlighting; embeds sandboxes as MDX components. |
| Data | **Neon Postgres + Drizzle** | Threads, audit log, access log, entitlement cache — same as explorer (`lib/db`). |
| Auth | **`citrate-identity` OIDC RP** via the lifted explorer seam | One chokepoint; provider-agnostic; KYC + entitlement claims. |
| Inference | **OpenAI-compatible** → `infer.citrate.ai` / DGX local-proxy | Lifted `lib/ai/provider.ts`. |
| Search | hosted/index (decide S1) | Don't build infra we can rent. |
| Host | **Vercel** (Fluid Compute for the chat route) | Federation precedent; per-request server gate fits edge/serverless. |

## 2. Directory layout (inside `citrate-docs/`)

```
citrate-docs/
├── PLANSET/                      ← this planset (00..07)
├── app/                          ← Next.js App Router
│   ├── (marketing)/page.tsx      ← splash
│   ├── docs/[...slug]/page.tsx   ← tier-aware doc renderer
│   ├── sandboxes/[id]/page.tsx   ← sandbox host pages
│   └── api/
│       ├── chat/route.ts         ← Ask agent (lifted; + tier check)
│       ├── threads/*             ← conversation history (lifted)
│       ├── mcp/route.ts          ← MCP server (lifted; docs resources)
│       ├── content/[...slug]/route.ts  ← Confidential runtime gateway (NET-NEW)
│       └── auth/*                ← OIDC callback/session (lifted seam)
├── lib/
│   ├── auth/                     ← session.ts + client.tsx (lifted; + entitlement/tier)
│   ├── ai/                       ← provider, system-prompt, tools, audit, mcpResources (lifted)
│   ├── content/                  ← NET-NEW: transclusion build + runtime gateway + tier index
│   ├── harness/                  ← read-only chain ops/client/allowlist (lifted; sandboxes + agent)
│   ├── api/ratelimit.ts          ← lifted
│   └── db/                       ← drizzle schema: threads, audit, access_log, entitlement_cache
├── components/                   ← sidebar, tier badge, disclosure modal, sandbox frames
├── content/                      ← app-authored IA pages, tier overviews, tutorials (Public/Comm/Acad)
├── sandboxes/                    ← the 5 widgets
├── content.manifest.ts           ← maps sidebar nodes → source (authored | transcluded | linked | gated)
│
│   ── existing content sources (unchanged; transcluded/linked, never moved) ──
├── gradient_papers_v3/  public-goods/  Tutorials/
└── AUDIT_TIER.md (→ Tier-1)   audits/ (new)
```

## 3. The content pipeline (hybrid)

Every sidebar node declares its **source kind** in `content.manifest.ts`:

| Source kind | Where it lives | When resolved | Tiers allowed |
|---|---|---|---|
| `authored` | `citrate-docs/content/**` (MDX, app-authored IA/overviews/tutorials) | build | Public, Commercial, Academic |
| `transcluded` | another repo's `docs/**` or README, pinned to a manifest SHA | build | Public, Commercial, Academic |
| `linked` | archive / external (Gradient Papers PDFs, TLA+ corpus) | render (link) | any |
| `gated` | a **private** repo (`citrate-security/`, `citrate-compliance/`, `ops/`, `funding/`) | **request** | **Confidential only** |

**Build-time path (Public/Commercial/Academic).** A build step reads `content.manifest.ts`, pulls
`transcluded` docs at their pinned SHA (via the federation manifest), renders MDX, stamps each page with
`tier` + `last-synced @ SHA`, and emits the tier-tagged static/SSR content. Commercial/Academic pages are
built but **served only behind the tier gate** (the gate is server-side; the bundle never ships
Confidential, but Commercial/Academic HTML is rendered per request after the check — they are *gated*,
not *secret-from-the-bundle* the way Confidential is).

**Runtime path (Confidential).** `gated` nodes are **never built in.** `app/api/content/[...slug]` is the
only way to reach them: it (1) runs `verifySession`, (2) checks the entitlement/role gate, (3) checks any
per-document `disclosure_gate` acknowledgement, (4) fetches the doc from its private home repo
server-side, (5) writes an access-log row (`sub`, doc, tier, ts), (6) returns rendered HTML. No
Confidential bytes exist in the client bundle at any point.

> **Why the split.** Commercial/Academic are *access-controlled but not secret-from-infrastructure* —
> acceptable to render server-side from the build. Confidential is *secret-from-infrastructure* — it must
> not transit the build pipeline of the public-facing deployment at all. This is the line that makes R1 (the critical
> risk) structurally impossible, not merely policy.

## 4. The RBAC seam (the single chokepoint)

Lifted from `citrate-explorer/src/lib/auth/session.ts` (`verifySession`) and `client.tsx`
(`<AuthProvider>`/`useAuth`). We extend the normalized session:

```ts
interface AuthSession {
  required: boolean;
  authenticated: boolean;
  sub?: string;            // OIDC subject (verbatim owner key)
  walletAddress?: string;
  entitlement?: {          // NET-NEW (resolved in citrate-identity at findAccount)
    tier: "public" | "commercial" | "academic" | "confidential";
    orgId?: string;        // per-company / per-sector scope
    citrateRole?: string;  // named operational role (admins, auditors)
    milestone?: string;
    expiresAt: number;     // epoch-ms; expiry enforced at the gate
  };
}

// One function the whole app calls. Returns the highest tier the caller may read.
function resolveTier(s: AuthSession, now: number): Tier;       // never escalates; default Public
function canRead(s: AuthSession, node: SidebarNode, now: number): boolean; // tier ∧ org ∧ disclosure ∧ !expired
```

Every gated route, the content gateway, the sidebar renderer, and the agent's RAG retrieval call
`canRead`/`resolveTier`. **There is exactly one place tier is decided.** `citrate-identity` changes
(`src/claims.ts` + a new `resolveEntitlement` at `findAccount`, sourced from KYC status, an
entitlements/contracts table, the team operators roster, and time-gated auditor enrollments) are tracked
in `07_*` and via the federation drift map.

Tiers are **totally ordered** (Public < Commercial < Academic < Confidential) for the *band* a principal
sits in, but access is **`tier ∧ org_id ∧ disclosure ∧ ¬expired`** — a Confidential auditor scoped to one
engagement does **not** thereby see another sector's Confidential space. (See `03_*` `NoTierEscalation`
and `NoCrossOrgRead`.)

## 5. The agentic harness (lifted from explorer)

Pattern and files per `00_OVERVIEW.md` reuse map. Codex-specific changes:

- **`app/api/chat/route.ts`** — add `verifySession` + `resolveTier` at the top; pass the caller tier into
  the tools and the RAG layer; 401 when `auth.required && !authenticated`.
- **`lib/ai/system-prompt.ts`** — swap the explorer's network-knowledge section for a docs-knowledge
  section (the IA, the surface taxonomy, how to cite a doc). Keep the guardrails block.
- **`lib/ai/tools.ts`** — add docs tools: `searchDocs(query, tier)`, `getSurface(id)`,
  `listSandboxes()`; keep the explorer's read-only chain tools for sandbox-linked answers.
- **Tier-aware RAG** — the corpus is chunked and **partitioned by tier + org**. Retrieval filters to
  `≤ caller tier ∧ caller org` **before** the model sees anything. The guardrail prompt is
  defense-in-depth; the partition is the control.
- **`app/api/mcp/route.ts`** — expose Codex as an MCP server (resources = the surface map); external
  agents authenticate with an API key whose entitlement caps the tier they can retrieve.

## 6. Sandbox runtime

Sandboxes are MDX-embeddable React components under `sandboxes/`, each calling the federation's existing
public surfaces through `lib/harness` (read paths) or the documented public flows (relay/x402). All are
**read-mostly, rate-limited, and fail-closed**.

| Sandbox | Calls | Source pattern |
|---|---|---|
| GhostDAG blue-score visualizer | `citrate_blockDAG`, `citrate_blueScore`, `citrate_tipSet` | `citrate-explorer` DAG tools |
| Gasless relay (EIP-2771) demo | the public relay endpoint (forwarder meta-tx) | `citrate-chatbot` `/api/relay` |
| x402 402-payment walkthrough | `X402Client` challenge → 402 → settle (testnet) | `citrate-buyer-webapp` + `marketplace-sdk` |
| Inference-gateway call | `POST /v1/chat/completions` (testnet key) | `citrate-inference-gateway` |
| RPC method explorer | allowlisted `eth_*` / `citrate_*` reads | `citrate-explorer/lib/harness/allowlist.ts` |

No signing keys live in the docs app; the relay/x402 demos use the same public, already-shipped testnet
flows the chatbot and buyer-webapp expose. Each sandbox links to the doc that explains the concept and to
the source repo.

## 7. Deployment topology

```
        Vercel (Citrate Codex, Next 16)
          │  ├─ static/SSR: Public + (gated) Commercial/Academic content
          │  ├─ /api/chat  ──────────────▶ infer.citrate.ai/v1  (OpenAI-compatible; DGX behind Caddy)
          │  ├─ /api/content/* (gated) ──▶ private repos (server-side fetch; Confidential only)
          │  ├─ /api/mcp  (external agents, API-key entitlement-capped)
          │  └─ auth callback ───────────▶ auth.citrate.ai (citrate-identity OIDC + KYC + entitlement)
          │
          ├─ Neon Postgres: threads · tool-call audit · access_log · entitlement_cache
          └─ sandboxes ─────────────────▶ rpc.citrate.ai · relayer · x402 facilitator (chain 40204)
```

Confidential content never leaves the private repos except through the authenticated, access-logged
`/api/content/*` gateway on the server; it is never present in the deployed static bundle.

## 8. Data model (Drizzle / Neon)

- `threads`, `messages` — per-`sub` Ask history (lifted from explorer; AES-GCM at rest).
- `tool_call_audit` — `sub`, tool, args (truncated), ts (lifted).
- `access_log` — `sub`, doc slug, tier, org_id, disclosure_ack, ts (**NET-NEW**, for Confidential reads).
- `entitlement_cache` — short-TTL cache of resolved entitlements (source of truth is `citrate-identity`).
- `disclosure_ack` — `sub`, doc/disclosure id, ts (click-through acknowledgements).

## 9. Open questions for S1

- Search: hosted index vs. Neon FTS — pick the lowest-infra option that covers gated filtering.
- Whether Commercial/Academic should be SSR-gated (default) or also build-excluded for the most sensitive
  Commercial spaces (per-customer NDAs may push specific Commercial nodes onto the runtime gateway path).
- Exact `citrate-identity` claim-delivery shape (scope name, claim namespacing) — coordinate via the
  drift entry and `07_*`.
