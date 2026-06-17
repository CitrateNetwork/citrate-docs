---
title: Citrate marketing site
codex_slug: /apps/landing
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-landing/README.md
surfaces: [APP-landing]
audited_against_sha: d4f4a64
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate marketing site

> The public Citrate Network website, what it is, who it serves, and how to get in touch.
> The site holds no secrets, and every form submission is encrypted at rest.

## Overview

This is the Citrate Network marketing/landing site: a Next.js 16 (App Router) site on Neon Postgres,
deployed on Vercel. It presents the network to institutional and public-good audiences and collects a
few structured inquiries (contact, host-compute application, verification-packet request).

The mental model for readers: a normal marketing site, with the one notable difference that **anything
you type into a form is encrypted before it's stored**, the database never holds your plaintext PII.

> **Status, production.** The site is live and actively maintained (security headers, CSP with
> per-request nonce, OWASP ZAP baseline in CI, Playwright e2e). It is honest marketing copy, not a
> certification claim.

## Who it's for

- Institutions evaluating Citrate (defense/aerospace, manufacturing, healthcare, finance).
- Public institutions (schools/districts, libraries) exploring the public network doors.
- Anyone who wants to contact the team or request a verification packet.

## Key features & screens

Source: `src/app/`.

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | Hero, features, metrics, sector and public-door tiles |
| Solutions / Technology / Host-Compute | `/solutions`, `/technology`, `/host-compute` | Product and infrastructure detail |
| Compliance / Legal / Constitution | `/compliance`, `/legal`, `/constitution` | Posture and governance |
| About / Resources | `/about`, `/resources` | Team and docs |
| Contact | `/contact` | Contact form |

SEO/meta: sitemap, robots, JSON-LD, dynamic OG images (`/api/og`).

## How to use

1. Browse the pages above.
2. To reach the team, use one of the three forms:
   - **Contact** → `POST /api/contact`
   - **Host-compute application** → `POST /api/host-compute`
   - **Verification-packet request** → `POST /api/verification-packet`
3. Fill in the fields and submit. You'll get a confirmation; the team is notified by email and follows up.

### What happens to what you type

Every form submission is encrypted with **AES-256-GCM envelope encryption** before it's written to the
database (`src/lib/encryption.ts`). The stored columns are ciphertext only, plaintext PII never
persists. Email is deduplicated with a keyed HMAC blind index, so even the lookup value isn't your
plaintext address. Submissions are protected by origin checks, a honeypot, a timing heuristic, per-IP
rate limiting, and short-lived single-use challenge tokens (`GET /api/challenge`).

## Tutorials

- No runnable tutorial is needed for a visitor, the site is browse-and-submit. The forms are
  self-explanatory; see **How to use** above.

## Security & access

**Tier: public.** A marketing site is public-good content by definition.

**No secrets here, and none in the repo.** `.env*` files are gitignored; only `.env.example` (a template
with no real values) is committed. Secrets, the encryption key, database URL, SMTP password, live in
Vercel project environment variables, not in code and not in this doc. This was verified against the
repo's `.gitignore` and history.

The load-bearing fact for users: **forms are encrypted.** Submissions are stored as AES-256-GCM
ciphertext only; the only plaintext use is an internal notification email so the team can reply.

## Source & verification

- **Repo:** `citrate-landing`
- **Audited against SHA:** `d4f4a64`
- **Key paths:** `src/lib/encryption.ts`, `src/lib/schemas.ts`, `src/lib/submission.ts`,
  `src/app/api/contact/route.ts`, `src/app/api/host-compute/route.ts`,
  `src/app/api/verification-packet/route.ts`, `src/app/api/challenge/route.ts`, `README.md`

### Honest status

Production and actively maintained. No committed secrets, no TODOs found in the surveyed code; the
posture claims on the site are descriptive, not a third-party certification.
