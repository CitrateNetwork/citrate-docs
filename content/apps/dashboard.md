---
title: Learning dashboard
codex_slug: /apps/dashboard
tier: public
org_scope: ~
source_kind: authored
source: citrate-dashboard/{app/, lib/daemon-api.ts}
surfaces: [APP-dashboard]
audited_against_sha: 727e62d
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The learning dashboard is the live window onto Citrate Orchard, the federated-learning surface where models
train across nodes without the training data leaving them. It shows each learning cycle as it runs, who
contributed, and which mentor pairings were committed, all read from a public, read-only view of the
network.

## What it is

Citrate Orchard runs a federated-learning loop: one round roughly every 25 seconds, in which nodes submit
embeddings, an on-chain Belnap-FOUR aggregator picks a canonical signal, the routing model retrains, and
mentor pairings are committed on chain. The dashboard is the observability layer over that loop. It is a
Next.js application, and it holds no canonical state of its own. Live cycle state, embeddings, mentor
pairings, and contribution scores are read through from the network: from chain RPC and from a read-only
daemon API. The only thing it persists locally is account-facing convenience, profiles, invite tokens, and
cycle subscriptions. The chain is the source of truth, and the dashboard does not mirror it.

The loop matters because of what it does not move. Embeddings are the only thing nodes publish; the data
those embeddings were computed from stays on the node. The dashboard makes that loop legible to the people
watching it without becoming a second copy of it.

## How to use it

The dashboard is read-mostly. Anyone can follow the cycles; participating in a cycle needs an account.

1. Open the dashboard and pick Cycles to see what is running now.
2. Click any cycle to see its contributors and the mentor pairings it committed.
3. Open Experiments to follow the research hypotheses and their status.
4. To take part, open Profile, sign in, link your Citrate account, and join a cycle. Your contribution
   score updates as cycles run.

## Reference

The screens and what they read (`app/`, `lib/daemon-api.ts`).

| Screen | Route | What you see | Code |
|---|---|---|---|
| Home | `/` | The loop explained, cards into Cycles, Experiments, and Profile, and the public daemon and RPC endpoints. | `app/page.tsx` |
| Cycles | `/cycles` | A live list of learning cycles with status, participant count, and start and finalize times. | `app/cycles/page.tsx` |
| Cycle detail | `/cycles/[id]` | One cycle's embedding contributors and committed mentor pairings. A missing cycle renders a standard 404. | `app/cycles/[id]/page.tsx` |
| Experiments | `/experiments` | The three research hypotheses, what each measures, and its current status. | `app/experiments/page.tsx` |
| Profile | `/profile` | Sign in, link your Citrate account, set display name, bio, and timezone, view subscriptions, and join a cycle. | `app/profile/page.tsx` |

A cycle moves through a fixed lifecycle, and the status badges map one-to-one onto it
(`lib/daemon-api.ts`):

```text
embeddings_open → embeddings_closed → aggregated → trained → matched → finalized
```

The Experiments page tracks three hypotheses from the second research paper. They are spec-locked and
awaiting testnet measurement, so the page renders the plan, not results
(`app/experiments/page.tsx`):

| Hypothesis | Question | Status |
|---|---|---|
| H1 | Belnap-FOUR aggregation versus a flat mean under injected mislabels, on a 4-node setup. | spec-locked, awaiting testnet |
| H2 | Whether adapter-composition accuracy follows a power law as adapters are added, to 100. | spec-locked, awaiting testnet |
| H3 | Routing-model convergence with Byzantine validators below the BFT threshold, to 30 nodes. | spec-locked, awaiting testnet |

Data sources are read-only. The daemon API at `federated.citrate.ai/api/{cycles, embeddings, mentors}` is
GET-only and enforced as such at the source by a tripwire that forbids mutating verbs; chain reads go to
`rpc.citrate.ai` on chain 40204 (`lib/daemon-api.ts`).

## Design rationale

A dashboard over a live network has one temptation, to cache the network into itself and slowly drift out
of truth. This one refuses that. Cycle pages render on every request with no caching, because cycle state
is live, and the dashboard reads through to the chain and the daemon rather than mirroring them, so the
chain stays canonical. The daemon API it depends on is read-only by construction, which means the
observability layer cannot become an accidental control surface. Identity is the same discipline: the
account a request acts as is derived server-side from a verified session token, never from an identifier
supplied in the URL or body, so one account can never read or write another's profile.

## Failure modes

The dashboard depends on services it does not own, so it is built to degrade rather than crash or leak.

- When the daemon is unreachable, a cycle page shows a clear "Daemon API unavailable" panel instead of
  failing, and a transient error on one of the three reads behind a cycle detail degrades that panel
  rather than the page (`app/cycles/page.tsx`, `app/cycles/[id]/page.tsx`).
- Upstream daemon error text, status lines, body snippets, connection strings, is never reflected to the
  client. The server logs it and returns a fixed-shape 503 (audit `CITRATE_DASHBOARD-2026-05-31-006`).
- The profile and invite APIs derive identity from a verified session token server-side and reject any
  client-supplied identifier, closing an account-enumeration path found in audit
  (`CITRATE_DASHBOARD-2026-05-31-001`).

## Access and canon

Tier: commercial. The dashboard surfaces operator- and participant-facing learning operations, cycle
internals, contribution scoring, and experiment tracking, intended for contracted principals rather than
anonymous scraping.

This is the observability window onto Citrate Orchard, not a place where learning data lives. Citrate
Orchard's premise is that models train across nodes without the training data leaving them: a node
publishes embeddings, not its underlying data, so the data stays on the node. The dashboard reads only the
public, read-only view of that loop and holds no canonical state. No secrets appear in this page; the
endpoints shown are public hostnames, and configuration lives in environment. See
[federated learning](/research/learning) for Citrate Orchard and the research the loop rests on, and
[the compute pool](/compute/pool) for how nodes join.

## Source and verification

- Source repo: `citrate-dashboard`, split from the Citrate monorepo on 2026-05-18, audited against SHA
  `727e62d`.
- Key paths: `app/page.tsx`, `app/cycles/page.tsx`, `app/cycles/[id]/page.tsx`, `app/experiments/page.tsx`,
  `app/profile/page.tsx`, `app/api/profile/route.ts`, `app/api/invites/route.ts`, `lib/daemon-api.ts`.
- Stack: Next.js 16, React 19, Prisma on Vercel Postgres for profiles and invites, ethers for chain reads,
  Privy for account sign-in.
- Status: Implemented (pre-audit), pilot, labelled `RM-FL-5` in the application. The Experiments page
  renders the plan: the three hypotheses are spec-locked and awaiting testnet, so treat experiment results
  as pre-data until the measurement work lands. The screens here are verified against the application code
  at this SHA; the repository README is monorepo-split boilerplate and is not the source of these claims.
  Tier 1 audit applies before a stable release.
