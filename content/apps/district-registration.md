---
title: District registration
codex_slug: /apps/district-registration
tier: commercial.kyc
org_scope: ~
source_kind: authored
source: citrate-district-registration/{README.md, app/, lib/, db/}
surfaces: [APP-district]
audited_against_sha: fbde52f
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

District registration is the web application a US K-12 school district uses to join Citrate Schools. A
district IT director registers the district, passes identity verification through CLEAR, and, once
approved, receives a signed deployment bundle. It is the front gate to Citrate Ground, and it is built so
that no student record ever passes through it.

## What it is

The registration site does one job: it confirms that a real public school district, represented by a real
identity-verified official, is the party asking for a Citrate deployment. It is a Next.js 14 application,
hosted by us, that runs a four-step pipeline: register, verify, approve, deliver. The classroom software,
the on-premise install, and the account and key setup all happen later, inside the bundle the district
downloads, on the district's own hardware.

Two boundaries define the design. The first is what the registry holds. It stores a district's NCES code,
its name and state, a handful of adult administrator contacts, the verification status from CLEAR, and an
append-only audit trail. It does not store student names, grades, identifiers, or any student record at
all. Student data and PII live on Citrate Ground, the district's on-premise instance, and never touch the
public Citrate Network or this registry. The second boundary is what we see during identity verification.
CLEAR runs the document upload, selfie, and liveness check on its own hosted flow. Citrate receives a
session identifier and a pass or fail, and nothing else. The ID images and biometrics stay with CLEAR.

## How to use it

You will need your 8-digit NCES district code and a government ID for the identity check. The whole flow
takes a few minutes, plus up to a business day if your registration goes to manual review.

1. Open `/register` and enter your NCES code. The district name and state fill in automatically from the
   local NCES cache (`GET /api/nces/[code]`); if the code is not recognized, the lookup returns a 404 and
   you can correct it.
2. Complete the contact, signing-official, and board-chair fields and submit. The server action validates
   every field and rate-limits submissions per IP (`app/register/actions.ts`).
3. You are handed to the CLEAR hosted verification flow: document upload, selfie, and liveness. Citrate
   never sees these images (`lib/clear/client.ts`). The pending screen shows your reference identifier
   while you wait (`/register/pending`).
4. When CLEAR reports back, the approval engine (`lib/approval/decide.ts`) either auto-approves a clean
   public-school registration or routes it to our operators for manual review.
5. On approval, a background worker builds your district bundle and emails you a single-use, signed
   download link, valid for seven days (`/api/download/[id]`).
6. Run the bundle's bootstrap CLI on your own hardware to stand up Citrate Ground. That step lives outside
   this application; see [Citrate Schools](/contracts/edu).

## Reference

The screens and routes below are the audited surface. Routes are role-gated: the registration flow is
public, the admin queue is behind GitHub OIDC restricted to an operator allowlist.

| Step | Screen or route | What happens |
|---|---|---|
| Register | `/register` | Enter the NCES code (auto-fills name and state), site type, and contact, signing-official, and board-chair details. |
| Verify, start | `POST /api/clear/start` | A CLEAR Risk-Based Verification session is created and you are redirected to CLEAR's hosted flow. Rate-limited and guarded against duplicate sessions. |
| Pending | `/register/pending` | Confirmation and reference identifier while verification completes. |
| Verify, result | `POST /api/webhooks/clear` | CLEAR posts the verified or failed result back, HMAC-verified and idempotent. |
| Decide | automatic | Auto-approve if every check passes, otherwise route to manual review. |
| Manual review | `/admin`, `/admin/[id]` | Operators sign in through GitHub OIDC and approve or reject queued registrations. |
| Deliver | `/api/download/[id]` | A signed, single-use bundle download link is delivered by email. |

The auto-approve rule is strict and fails to manual review on any doubt. All five conditions must hold
(`lib/approval/decide.ts`):

| Condition | Requirement |
|---|---|
| NCES district found | The 8-digit code resolves in the local NCES cache. |
| Public school | The NCES type is `public`, not charter, private, or unknown. |
| Real enrollment | NCES enrollment is greater than zero. |
| Verified | CLEAR returned `verified`. |
| Domain match | The contact email domain matches the district name within a Levenshtein distance of 5. |

What the registry stores, and how it is protected (`db/schema.ts`, `db/encrypted.ts`):

| Field | Stored as |
|---|---|
| NCES code, district name, state | plaintext, used for lookup and filtering |
| Contact, signing-official, board-chair names | plaintext |
| Contact, signing-official, board-chair emails and phone | AES-256-GCM encrypted at rest |
| CLEAR session id and status | plaintext status, never the underlying ID images |
| Approval state, reviewer, timestamps | plaintext |
| Bundle URL, expiry, first-download timestamp | plaintext, in a private blob store |
| Audit events | append-only log with a unique idempotency key |

No student record appears anywhere in that schema.

## Design rationale

Most onboarding systems collect as much as they can. We do the opposite, because the institution we are
serving is a public school and the data we most want to avoid touching is the data those institutions
hold. The registry verifies an adult official and an institution, then steps out of the way. Identity
verification is delegated to CLEAR so the sensitive artifacts of that check, the ID and the face, never
reach us. The bundle, not the website, sets up keys and the on-premise install, so the part of onboarding
that handles real student data happens on the district's hardware from the start. The cost is a real
verification step and, for anything that does not cleanly match, a wait for human review. For public
schools that is the right trade.

## Failure modes

This surface is identity-gated and delivers a signed artifact, so its failures are designed to close
rather than open.

- The CLEAR result webhook is HMAC-verified and idempotent. A delivery with a bad signature is rejected; a
  duplicate delivery is claimed atomically against a unique index and returns a no-op, so a replayed
  webhook cannot re-run approval (`app/api/webhooks/clear/route.ts`).
- The bundle lives in a private blob store. The download route verifies a signed JWT, streams the bytes
  through an authenticated response rather than redirecting, and marks the bundle downloaded in the same
  update that serves it, so a second use returns 410 (`app/api/download/[id]/route.ts`).
- The CLEAR start route and the public form are rate-limited per IP, and the bundle cron compares its
  bearer secret in constant time, closing a vendor-cost abuse path and a timing leak found in audit.
- Administrator contact PII is encrypted at rest; only district and contact names, which the audit log and
  the queue need in plaintext, are stored unencrypted.

## Access and canon

Tier: commercial.kyc. This is onboarding gated on identity verification, deeper than a public quickstart
and meant for the institutional builder, not anonymous reference.

US K-12 public schools have free Citrate access in perpetuity. This application is where that access
begins. Identity verification is through CLEAR, which holds the sensitive personal data behind the check;
Citrate keeps only the verification result. Student data and PII stay on Citrate Ground, the district's
on-premise instance, and never reach the public Citrate Network or this registry. The compliance floor for
schools, FERPA, COPPA, and CIPA, is met before any pilot. No secrets appear in this page or in the repo;
all credentials live in environment configuration, and only an example file with no real values is
committed. See [identity verification](/aa/identity) for CLEAR, [enterprise compliance](/enterprise) for
the on-premise and compliance model, and [Citrate Schools](/contracts/edu) for what the bundle does next.

## Source and verification

- Source repo: `citrate-district-registration`, audited against SHA `fbde52f`.
- Key paths: `app/register/`, `app/api/clear/start/route.ts`, `app/api/webhooks/clear/route.ts`,
  `lib/approval/decide.ts`, `lib/clear/client.ts`, `app/api/download/[id]/route.ts`, `app/admin/`,
  `db/schema.ts`, `db/encrypted.ts`, `app/api/cron/process-bundles/route.ts`.
- Stack: Next.js 14 App Router, TypeScript, Drizzle ORM on Vercel Postgres, Vercel Blob, CLEAR
  Risk-Based Verification, NextAuth with GitHub OIDC for operators.
- Status: Implemented (pre-audit), not yet deployed. The core register, verify, approve, and deliver flow
  is built and tested (248 tests at this SHA), with email notifications and the production deploy still
  ahead. A Rule-8 security review is pending on the CLEAR integration, the bundle worker and JWT download,
  and the admin queue before the deploy gate. Recent audit findings, the form and CLEAR-start rate
  limits, the constant-time cron compare, webhook idempotency, and TOML escaping, are fixed and
  regression-tested. The production URL `register.citrate.ai` is not yet live.
