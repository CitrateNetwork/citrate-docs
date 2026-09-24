---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Prototype Fixtures (drop-in mock data)

Typed, deterministic mock data + a `mockApi` resolver for building the **Citrate Codex** prototype
without any backend. Every shape mirrors the **"Data shape"** column of `../../DESIGN_BRIEF.md` §14, so
swapping mocks for the real `/api/*` routes later is a drop-in: keep the types, replace the source.

> No build toolchain ships in `citrate-docs` yet (the Next.js app scaffold lands in sprint
> DOCS-CODEX-S1). These files are framework-agnostic TypeScript — drop them into the prototype app under
> `prototype/fixtures/` (or `src/fixtures/`) and import.

## Files

| File | What's in it |
|---|---|
| `types.ts` | All TypeScript types — the design/engineering contract (mirrors DESIGN_BRIEF §14, PLANSET 02 §4/§8). |
| `viewers.ts` | The 7 demo viewers (the dev-mode tier switcher) + the access helpers `resolveTier` / `canRead` / `visibility` / `filterNav`. **This is the fixture mirror of the server's single chokepoint — keep it identical when you wire in.** |
| `content.ts` | The tier-aware `NAV` tree, sample `DOCS` (one per tier + every state), `DISCLOSURES`, `SEARCH_RESULTS`. |
| `ask.ts` | Ask Codex `THREADS`, citations (with tier chips), tool-call traces, and a replayable `SAMPLE_STREAM`. |
| `sandboxes.ts` | `CHAIN_STATUS` + the 5 sandbox payloads, each with ok / rate-limited / fail-closed variants. |
| `settings.ts` | User settings: `DEFAULT_PREFS`, `SUBSCRIPTIONS`, `API_KEYS` (copy-once), `MY_ACCESS_LOG`. |
| `admin.ts` | Admin console: `PRINCIPALS`, `ORGS`, `SYNC_STATUS`, `EMBARGOES`, `GLOBAL_ACCESS_LOG`, `SANDBOX_CONFIG`. |
| `index.ts` | Barrel + the **`mockApi`** resolver — methods named after the §14 routes, each gated by `canRead`. |

## Quick start

```tsx
import { mockApi, VIEWERS, DEFAULT_VIEWER } from "@/prototype/fixtures";

// Dev-mode tier switcher (DESIGN_BRIEF §6.2) — cycle viewers to preview every state.
const [viewerId, setViewerId] = useState(DEFAULT_VIEWER.id);
const session = mockApi.getSession(viewerId);

const nav  = mockApi.getNav(session);                 // tier-filtered sidebar (hidden nodes dropped)
const page = mockApi.getDoc(session, "/internal/audit"); // → doc | gate | embargo | disclosure_required | not_found
const hits = mockApi.search(session, "blue score");   // no above-tier results
const reply = mockApi.ask(session, "what is SALT?");  // citations re-filtered to the caller's tier
```

`<ViewerSwitcher>` should list `VIEWERS` (Anonymous, KYC'd builder, Enterprise/defense_prime, Academic/academic_partner,
Administrator, Auditor time-gated, Auditor expired) so a reviewer can flip through every access state.

## The five viewer states to demo (acceptance, DESIGN_BRIEF §18)

| Viewer | Sees | Notably can't / special |
|---|---|---|
| **Anonymous** | Public docs, all sandboxes, Ask (public corpus) | Commercial → gate card; Confidential → hidden/404 |
| **KYC'd builder** | + Commercial/`C·kyc` implementation track | defense_prime space hidden (wrong org); Confidential hidden |
| **Enterprise (defense_prime)** | + the `defense_prime` private space | Other orgs' spaces hidden; Confidential hidden |
| **Academic (academic_partner)** | + Gradient Papers, TLA+ corpus, research portal | Confidential hidden |
| **Administrator** | Everything + Internal/Audit + Admin Console | — |
| **Auditor (time-gated)** | Confidential **audit** material, disclosure-gated, access-logged | expires in 30d; non-audit orgs scoped out |
| **Auditor (expired)** | Collapses to **Public** (EntitlementExpiry) | proves expiry revocation |

## Doc states covered (point the reader at these slugs)

- `/start/what-is-citrate` — Public, **authored**
- `/chain/rpc`, `/sdks/js` — Public, **transcluded** (last-synced badge; `/sdks/js` is **versioned**)
- `/sdks/marketplace` — **Commercial** (gate card for anonymous)
- `/enterprise/defense_prime` — **Commercial + org-scoped** (hidden from non-defense_prime; visible to defense_prime+admin)
- `/research/gradient-papers` — **Academic**, **linked** archive
- `/internal/audit` — **Confidential**, **gated + disclosure required + access-logged**
- `/enterprise/compliance-full` — **Confidential + embargoed** (body withheld until date)

## Invariants the fixtures enforce (so the prototype can't accidentally lie)

- **`canRead` is the one gate.** `getNav`, `getDoc`, `search`, and `ask` all route through it (mirror of
  the server chokepoint, PLANSET 02 §4). Don't bypass it in components.
- **Confidential is never in the payload when denied.** `getDoc` returns `not_found` (404) for
  Confidential/wrong-org — the body is never sent. (Real backend fetches Confidential at request time,
  server-side; these fixtures simply never expose it client-side to the unentitled.)
- **RAG never above tier.** `ask()` re-filters citations by `canRead` — a downgraded viewer never sees an
  above-tier citation (AgentRespectsTier).
- **Expiry collapses to Public.** `resolveTier` honors `expiresAt`; the "Auditor (expired)" viewer proves it.
- **Org scoping is hidden, not locked.** Wrong-org content is invisible (a customer sees only its own space).

## Determinism

All timestamps derive from `FIXED_NOW` (a constant epoch-ms) — no `Date.now()` — so snapshots and visual
diffs are stable. Disclosure acknowledgements are kept in an in-memory `Set` so the prototype can demo the
acknowledge → render flow (`mockApi.ackDisclosure(session, "audit-nda")`), reset on reload.

## Wiring in for real (later)

Replace each `mockApi.*` body with a `fetch` to the matching `/api/*` route from DESIGN_BRIEF §14. The
return types are already the contracts, so components don't change. The real server resolves the session
via the lifted explorer auth seam (`citrate-explorer/src/lib/auth/session.ts`) extended with the
`entitlement` claim — `viewers.ts` is the faithful stand-in until then.
