---
title: The Citrate marketing site
codex_slug: /apps/landing
tier: public
org_scope: ~
source_kind: authored
source: citrate-landing/README.md, citrate-landing/src/app, citrate-landing/src/lib
surfaces: [APP-landing]
audited_against_sha: 63adc44
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The public website for the Citrate Network is the first place most people meet us. It explains what the
network is, who it serves, and how to reach the team, and it holds none of your plaintext: anything you type
into a form is encrypted before it is written down.

## What it is

The marketing site is a plain website with one unusual property. It is built on Next.js 16 with the App
Router, backed by Neon Postgres through Drizzle, and runs on Vercel. Around twenty pages describe the
network and the institutions it is built for, from the core marketing surfaces to the American Learning
Federation, Groves, membership, join, and desktop-download flows. Three contact forms let you reach us.

The property worth knowing is that the site never keeps what you type in readable form. Every form
submission is encrypted with AES-256-GCM before it reaches the database, so the stored columns are
ciphertext and nothing else. The only plaintext use is a notification email so the team can write back. The
site is a public front door for the network described in [what Citrate is](/start/what-is-citrate); it makes
no claim of its own beyond that.

## How to use it

You read the pages, and if you want to talk to us, you submit a form.

1. Browse the pages: the core surfaces are home, solutions, technology, compliance, constitution, about,
   products, enterprise, resources, FAQ, and legal, with further pages for the American Learning Federation,
   Groves, membership, the join flow, open source, and the desktop download. Each is a server-rendered page
   under `src/app/`.
2. Choose the form that fits. Contact is for general inquiries, host-compute is to apply to run hardware on
   the network, and verification-packet is to request our compliance and security documentation.
3. Fill in the fields and submit. You receive a confirmation, and the team is notified by email and follows
   up.

There is no account to create and nothing to install. The site is read and submit.

## Reference

The core pages and the three form endpoints, each citing its path in `citrate-landing`.

| Page | Route | What it covers |
|---|---|---|
| Home | `/` | Hero, the network at a glance, the sectors and public doors |
| Solutions | `/solutions` | What you can build and run on the network |
| Technology | `/technology` | The substrate, consensus, and on-premise model |
| Compliance | `/solutions/compliance` | The compliance posture by deployment context |
| Constitution | `/constitution` | Network governance |
| Products | `/products` | The applications and surfaces on the network |
| Enterprise | `/enterprise` | The on-premise enterprise offering |
| About | `/about` | The team and the mission |
| Resources | `/resources` | Documentation and reading |
| Legal | `/legal` | Terms and policies |

Further pages cover the American Learning Federation (`/alf`), Groves (`/groves`), membership
(`/membership`), the join flow (`/join`), open source (`/open-source`), and the desktop download
(`/download/desktop`, `/download/get`). The host-compute application posts to `/api/host-compute`; it has no
dedicated page.

| Form endpoint | Method | Purpose |
|---|---|---|
| `/api/contact` | `POST` | General contact |
| `/api/host-compute` | `POST` | Apply to host compute |
| `/api/verification-packet` | `POST` | Request the verification packet |
| `/api/challenge` | `GET` | Issues a short-lived, single-use submission token |

Search and machine readers are served by a sitemap, a `robots.txt` written to welcome agents, JSON-LD for
`Organization` and `WebSite`, and dynamic Open Graph images from `/api/og`.

## Design rationale

A site that gathers inquiries from schools, hospitals, and contractors is gathering names and email
addresses, which are exactly the records those institutions are careful with. So the site is built to hold
none of it in the clear. Submissions are written as AES-256-GCM ciphertext through envelope encryption
(`src/lib/encryption.ts`), and email is deduplicated with a keyed HMAC blind index, so even the lookup value
is not your address in plaintext. Submissions pass an origin check, a hidden honeypot, a Cloudflare Turnstile
challenge, a Postgres-backed sliding-window rate limit, and the single-use token from `/api/challenge`. The
trade is that a form submission does a little more work before it lands; for the records involved, that is
the right trade.

## Access and canon

Public. A marketing site is public by definition, and this page carries no secrets, keys, or private
endpoints. None live in the repository either: `.env*` files are ignored by git, only `.env.example` is
committed, and the real values for the encryption key, database URL, and SMTP password live in Vercel project
environment variables. The encryption is the load-bearing fact for a visitor: forms are stored as ciphertext
only, and the single plaintext use is the team's reply.

## Source and verification

- Source repo: `citrate-landing`, `README.md`.
- Audited against SHA: `63adc44`.
- Key paths: `src/lib/encryption.ts`, `src/lib/schemas.ts`, `src/app/api/contact/route.ts`,
  `src/app/api/host-compute/route.ts`, `src/app/api/verification-packet/route.ts`,
  `src/app/api/challenge/route.ts`, `src/app/` (nine pages).
- Status: Implemented. The site is in production and actively maintained, with a strict Content Security
  Policy carrying a per-request nonce, HSTS, an OWASP ZAP baseline scan in CI, and Playwright tests across
  five viewports. The posture statements on the site are descriptive; they are not a third-party
  certification.
