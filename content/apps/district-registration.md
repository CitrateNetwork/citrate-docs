---
title: District registration (KYC onboarding)
codex_slug: /apps/district-registration
tier: commercial.kyc
org_scope: ~
source_kind: transcluded
source: citrate-district-registration/README.md
surfaces: [APP-district]
audited_against_sha: fbde52f
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# District registration

> The self-service onboarding flow for US K-12 school districts to join the Citrate Learning Center —
> register, pass identity verification (KYC), get approved, and download a signed district bundle.

## Overview

District Registration is a Next.js 14 web app where a district's IT director registers their district,
completes **KYC identity verification** through CLEAR, and — once approved — receives a district-specific
deployment bundle. The site itself handles registration, verification, approval, and bundle delivery;
the on-chain ceremony and node setup happen later, inside the bundle's CLI (not in this app).

Mental model: a guided intake → verify → approve → download pipeline. You **do not** set up wallet keys
here; the bundle does that.

> **Status — in progress, not yet deployed.** Core flow is built and tested (248 tests as of
> 2026-06-11), but several surfaces still await a security sign-off and the app is not yet in
> production. See "Honest status".

## Who it's for

- US K-12 public/charter/BIE school districts onboarding to the Citrate Learning Center.
- The Citrate ops team, who manually review registrations that don't auto-approve.

## Key features & screens

Source: `app/`.

| Step | Screen / route | What happens |
|---|---|---|
| 1. Register | `/register` | Enter NCES code (auto-fills district name/state), site type, and contact / signing-official / board-chair details |
| 2. KYC start | `POST /api/clear/start` | A CLEAR Risk-Based Verification session is created; you're redirected to CLEAR's hosted flow (ID upload, selfie, liveness) |
| 3. Pending | `/register/pending` | Confirmation + reference ID while verification completes |
| 4. Result | `POST /api/webhooks/clear` | CLEAR posts the verified/failed result back (HMAC-verified) |
| 5. Decision | (automatic) | Auto-approve if all checks pass, otherwise routed to manual review |
| 6. Manual review | `/admin`, `/admin/[id]` | Ops (GitHub OIDC, allowlisted) approve/reject |
| 7. Bundle + download | `/api/download/[id]` | A signed, single-use bundle download link is delivered by email |

## How to use

1. Go to `/register` and enter your 8-digit NCES district code; name and state auto-fill via
   `GET /api/nces/[code]`.
2. Complete the contact, signing-official, and board-chair fields and submit
   (`app/register/actions.ts`). Submissions are rate-limited per IP.
3. You're taken into the CLEAR hosted KYC flow. **Citrate never sees your ID images** — CLEAR handles
   all biometric data (`lib/clear/client.ts`).
4. Wait on the pending screen. When CLEAR reports back, the approval engine
   (`lib/approval/decide.ts`) either auto-approves (public district + enrollment > 0 + verified +
   name/domain match) or sends it to ops for manual review.
5. On approval, you receive an email with a signed, time-limited, single-use bundle download link.
6. Run the bundle's bootstrap CLI to complete deployment (outside this app).

## Tutorials

- A step-by-step district onboarding walkthrough is planned. The **How to use** flow above is the
  authoritative ordering until then.

## Security & access

**Tier: commercial.kyc.** Onboarding deeper than a public quickstart, gated on KYC: the flow itself
verifies real institutional identity, and the implementation depth is contracted-builder material, not
anonymous reference.

**No secrets in this doc or repo.** All credentials — CLEAR API key/webhook secret, bundle signing key,
GitHub token, PII encryption key, auth secret — live in Vercel environment variables; only `.env.example`
(no real values) is committed. Verified against `.gitignore` and history.

User-facing privacy: contact/email/phone fields are encrypted at rest; ID/biometric data stays with
CLEAR; right-to-erasure (revoke → null PII + audit) is implemented; the audit log is append-only.
Webhooks are HMAC-verified and idempotent; the cron secret uses a constant-time compare; bundle
downloads are JWT-signed and single-use.

## Source & verification

- **Repo:** `citrate-district-registration`
- **Audited against SHA:** `fbde52f`
- **Key paths:** `app/register/`, `app/api/clear/start/route.ts`, `app/api/webhooks/clear/route.ts`,
  `lib/approval/decide.ts`, `app/api/download/[id]/route.ts`, `app/admin/`, `db/schema.ts`,
  `README.md`, `.agentile/PRODUCT_SPEC.md`

### Honest status

- **Feature-complete core (9 of 11 milestones); in progress (email notifications, S-8).**
- **Not yet deployed.** A Rule-8 security review is pending on the CLEAR integration, the bundle
  worker + JWT download, and the admin queue before any deploy gate.
- Recent audit findings (rate limit, constant-time cron compare, webhook idempotency, TOML escaping)
  are fixed and regression-tested. No wallet/key setup happens in this app by design.
