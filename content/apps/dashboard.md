---
title: Federated Learning Dashboard
codex_slug: /apps/dashboard
tier: commercial
org_scope: ~
source_kind: transcluded
source: citrate-dashboard/app
surfaces: [APP-dashboard]
audited_against_sha: f6e27c6
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Federated Learning Dashboard

> The live window into Citrate's federated-learning loop — watch each cycle run, see who contributed, and which mentor pairings landed.

## Overview

The Citrate dashboard (`citrate-dashboard`) is a Next.js web app that monitors the
network's **federated-learning (FL) loop in public**. One round of the loop runs
roughly every ~25 seconds: nodes submit embeddings, an on-chain Belnap-FOUR
aggregator picks a canonical signal, the routing model retrains, and mentor pairings
get committed on-chain. The dashboard is the live view into that pipeline (the pilot
is labeled `RM-FL-5`).

It reads cycle state through to a read-only daemon API
(`federated.citrate.ai/api/{cycles, embeddings, mentors}`) and chain RPC
(`https://rpc.citrate.ai`). Cycle pages render on every request (no caching) because
cycle state is live, and they **degrade honestly** — if the daemon is unreachable the
page shows a clear "Daemon API unavailable" panel instead of crashing.
(Source: `citrate-dashboard/app/page.tsx`, `app/cycles/page.tsx`,
`lib/daemon-api.ts`.)

## Who it's for

- **Network participants and operators** following live FL cycles and their own contribution scores.
- **Researchers** tracking the Paper II experiments (H1/H2/H3) and their measured outcomes.
- **Node runners** who want to join a cycle and see their embeddings land.

## Key features & screens

| Screen | Route | What you see | Code |
|---|---|---|---|
| **Home** | `/` | The FL loop explained, plus cards into Cycles, Experiments, and Profile; a developer section with the daemon API and RPC endpoints. | `app/page.tsx` |
| **Cycles** | `/cycles` | A live list of learning cycles with status (`embeddings_open` → `embeddings_closed` → `aggregated` → `trained` → `matched` → `finalized`), participant count, and start/finalize times. | `app/cycles/page.tsx` |
| **Cycle detail** | `/cycles/[id]` | One cycle: its embeddings contributors and committed mentor pairings. Missing/failed cycles render a standard 404. | `app/cycles/[id]/page.tsx` |
| **Experiments** | `/experiments` | The Paper II hypotheses H1 (Belnap-FOUR vs flat-mean under mislabel injection), H2 (adapter-composition power law), and H3 (Byzantine convergence below the BFT threshold) — what's measured and current status. | `app/experiments/page.tsx` |
| **Profile** | `/profile` | Connect your wallet via Privy, link your Citrate address, set display/bio/timezone, view subscriptions, and join a cycle. | `app/profile/page.tsx` |

### FL cycle monitoring

The cycle status badges map one-to-one to the daemon's cycle lifecycle, so the list
view is a real-time picture of where every cycle sits in the loop. Cycle detail joins
three daemon reads (`getCycle`, `listEmbeddings`, `listMentors`) and tolerates partial
failures, so a transient daemon 5xx degrades a panel rather than the page.
(Source: `app/cycles/page.tsx`, `app/cycles/[id]/page.tsx`.)

### Identity & profile

The Profile screen authenticates with **Privy** and derives identity from the verified
Privy access token server-side — the API does not trust a `did` supplied in the
URL/body (audit `CITRATE_DASHBOARD-2026-05-31-001`). The profile API
(`app/api/profile/route.ts`) and invites API (`app/api/invites/route.ts`) sit behind
that token. (Source: `app/profile/page.tsx`, `app/api/profile/route.ts`.)

## How to use

1. Open the dashboard and pick **Cycles** to see what's running now.
2. Click any cycle to see its contributors and mentor pairings.
3. Open **Experiments** to follow the research hypotheses and their status.
4. To participate, open **Profile**, sign in with Privy, link your Citrate address,
   and join a cycle — your contribution score updates as cycles run.

## Tutorials

- [Explore a transaction](/apps/tutorials/explore-a-transaction) (CitrateScan) — useful
  for inspecting the on-chain commits a cycle produces. A dashboard-specific
  "watch a cycle finalize" tutorial is tracked as a stub.

## Security & access

**Tier: commercial.** The dashboard surfaces operator- and participant-facing FL
operations (cycle internals, contribution scoring, experiment tracking) intended for
contracted/paid principals rather than anonymous scraping; access is gated per the
Codex chokepoint (`PLANSET/02_ARCHITECTURE.md` §4).

- Profile/invite actions require a verified Privy session; identity is derived
  server-side from the token, never from client-supplied IDs.
- The daemon API the dashboard reads is **read-only**.
- **No secrets in this page.** Endpoints shown are public hostnames; configuration
  such as `DAEMON_API_BASE_URL` lives in environment, not in docs.

## Source & verification

- **Source repo:** `citrate-dashboard` (split from the Citrate monorepo, 2026-05-18).
- **Audited against:** `f6e27c6` (`git -C citrate-dashboard rev-parse --short HEAD`).
- **Key paths:** `app/page.tsx`, `app/cycles/page.tsx`, `app/cycles/[id]/page.tsx`,
  `app/experiments/page.tsx`, `app/profile/page.tsx`, `app/api/*`, `lib/daemon-api.ts`.
- **Status:** Pilot (`RM-FL-5`). The Experiments page currently renders the *plan*
  (hypotheses are "spec-locked, awaiting testnet"); outcome measurement lands with the
  experiment-runner work. Treat experiment results as **pre-data**. This page mirrors
  code at the pinned SHA (Rule 9 — link, don't copy); the repo README is monorepo-split
  boilerplate, so screens here are audited against the app code, not the README.
