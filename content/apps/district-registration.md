---
title: District registration
codex_slug: /apps/district-registration
tier: commercial.kyc
org_scope: ~
source_kind: authored
source: citrate-district-registration/{README.md, app/, lib/, db/}
audited_against_sha: 884493a
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

District registration is the web application a US K-12 school district uses to join Citrate Schools. A
district IT director signs in, registers the district, passes identity verification with Citrate's in-house
verification (VERI), and, once approved, receives a signed deployment bundle. It is the front gate to
Citrate Ground, and it is built so that no student record ever passes through it.

## What it is

The registration site does one job: it confirms that a real public school district, represented by a real
identity-verified official, is the party asking for a Citrate deployment. It is a Next.js 14 application,
hosted by us, that runs a four-step pipeline: register, verify, approve, deliver. The classroom software,
the on-premise install, and the account and key setup all happen later, inside the bundle the district
downloads, on the district's own hardware.

Two boundaries define the design. The first is what the registry holds. It stores a district's NCES code,
its name and state, a handful of adult administrator contacts, the registrant's identity subject and their
verification status, and an append-only audit trail. It does not store student names, grades, identifiers,
or any student record at all. Student data and PII live on Citrate Ground, the district's on-premise
instance, and never touch the public Citrate Network or this registry. The second boundary is what we see
during identity verification. Verification runs at Citrate's authorization spine (auth.citrate.ai) through
VERI, our in-house check: the document upload, selfie, and liveness happen there, and this application
receives only a status keyed on the registrant's subject, never the ID images or biometrics.

## How to use it

You will need a Citrate sign-in, your 8-digit NCES district code, and a government ID for the identity
check. The whole flow takes a few minutes, plus up to a business day if your registration goes to manual
review.

1. Open `/register` and sign in with Citrate (`/api/oidc/login`). Registration is identity-first: the
   authenticated subject is the official whose verification the district's approval depends on.
2. Enter your NCES code. The district name and state fill in automatically from the local NCES cache
   (`GET /api/nces/[code]`); if the code is not recognized, the lookup returns a 404 and you can correct it.
3. Complete the contact, signing-official, and board-chair fields and submit. The server action validates
   every field, requires the sign-in, and rate-limits submissions per IP (`app/register/actions.ts`).
4. You are handed to VERI's hosted verification flow at the authority: document upload, selfie, and
   liveness. This application never sees those images. The pending screen shows your reference identifier
   and polls for the result (`/register/pending`, `GET /api/kyc/status`).
5. When VERI reports `verified`, the approval engine (`lib/approval/decide.ts`) either auto-approves a clean
   public-school registration or routes it to our operators for manual review.
6. On approval, a background worker builds your district bundle and emails you a single-use, signed
   download link, valid for seven days (`/api/download/[id]`).
7. Run the bundle's bootstrap CLI on your own hardware to stand up Citrate Ground. That step lives outside
   this application; see [Citrate Schools](/contracts/edu).

## Reference

The screens and routes below are the audited surface. Routes are role-gated: the registration flow requires
a registrant sign-in, and the admin queue is behind GitHub OIDC restricted to an operator allowlist.

| Step | Screen or route | What happens |
|---|---|---|
| Sign in | `/api/oidc/login` | The registrant authenticates at auth.citrate.ai (Authorization Code + PKCE). |
| Register | `/register` | Enter the NCES code (auto-fills name and state), site type, and contact, signing-official, and board-chair details. Gated on the sign-in. |
| Verify, start | `GET /api/kyc/start` | Binds the registration to the authenticated subject and redirects to the authority's VERI capture flow. Rate-limited. |
| Pending | `/register/pending` | Confirmation and reference identifier; the page polls for the verification result. |
| Verify, poll | `GET /api/kyc/status` | Reads the registrant's live `kyc_status` from the authority (fail-closed) and, on the first `verified`, runs approval exactly once. |
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
| Verified | The registrant's `kyc_status` is `verified`. |
| Domain match | The contact email domain matches the district name within a Levenshtein distance of 5. |

What the registry stores, and how it is protected (`db/schema.ts`, `db/encrypted.ts`):

| Field | Stored as |
|---|---|
| NCES code, district name, state | plaintext, used for lookup and filtering |
| Contact, signing-official, board-chair names | plaintext |
| Contact, signing-official, board-chair emails and phone | AES-256-GCM encrypted at rest |
| Registrant subject (`oidc_sub`) and `kyc_status` | plaintext status, never the underlying ID images |
| Approval state, reviewer, timestamps | plaintext |
| Bundle URL, expiry, first-download timestamp | plaintext, in a private blob store |
| Audit events | append-only log with a unique idempotency key |

No student record appears anywhere in that schema.

## Design rationale

Most onboarding systems collect as much as they can. We do the opposite, because the institution we are
serving is a public school and the data we most want to avoid touching is the data those institutions
hold. The registry verifies an adult official and an institution, then steps out of the way. Identity
verification runs in-house at the authorization spine (VERI), so the sensitive artifacts of that check, the
ID and the face, are held inside that boundary and never reach this application, which keeps only a status
keyed on the subject. The bundle, not the website, sets up keys and the on-premise install, so the part of
onboarding that handles real student data happens on the district's hardware from the start. The cost is a
real verification step and, for anything that does not cleanly match, a wait for human review. For public
schools that is the right trade.

## Failure modes

This surface is identity-gated and delivers a signed artifact, so its failures are designed to close
rather than open.

- The status poll is a live re-check that fails closed. `GET /api/kyc/status` reads the authority's
  `kyc_status` and treats anything other than an explicit `verified` (and any transport failure) as
  not-verified, so approval never runs on a stale or absent signal (`lib/oidc/kyc.ts`). Because the
  authority's ML backends route ambiguous cases to human adjudication, a registration reaches manual
  review rather than a fabricated pass whenever verification is not clean.
- Approval runs exactly once. The first poll that observes `verified` claims a one-shot trigger atomically
  against a unique index on `audit_events.idempotency_key`; a concurrent poll that loses the claim is a
  no-op, so approval cannot double-run (`app/api/kyc/status/route.ts`).
- The bundle lives in a private blob store. The download route verifies a signed JWT, streams the bytes
  through an authenticated response rather than redirecting, and marks the bundle downloaded in the same
  update that serves it, so a second use returns 410 (`app/api/download/[id]/route.ts`).
- The verification-start route and the public form are rate-limited per IP, and the bundle cron compares
  its bearer secret in constant time, closing an abuse path and a timing leak found in audit.
- Administrator contact PII is encrypted at rest; only district and contact names, which the audit log and
  the queue need in plaintext, are stored unencrypted.

## Access and canon

Tier: commercial.kyc. This is onboarding gated on identity verification, deeper than a public quickstart
and meant for the institutional builder, not anonymous reference.

US K-12 public schools have free Citrate access in perpetuity. This application is where that access
begins. Identity verification is in-house through VERI at the authorization spine, which holds the
sensitive personal data behind the check; this application keeps only the verification result. Student data
and PII stay on Citrate Ground, the district's on-premise instance, and never reach the public Citrate
Network or this registry. The compliance floor for schools, FERPA, COPPA, and CIPA, is met before any
pilot. No secrets appear in this page or in the repo; all credentials live in environment configuration,
and only an example file with no real values is committed. See [identity verification](/aa/identity) for
the VERI model, [enterprise compliance](/enterprise) for the on-premise and compliance model, and
[Citrate Schools](/contracts/edu) for what the bundle does next.

## Source and verification

- Source repo: `citrate-district-registration`, audited against SHA `884493a`.
- Key paths: `app/register/`, `app/api/kyc/start/route.ts`, `app/api/kyc/status/route.ts`,
  `lib/approval/decide.ts`, `lib/oidc/` (registrant OIDC RP seam), `app/api/download/[id]/route.ts`,
  `app/admin/`, `db/schema.ts`, `db/encrypted.ts`, `app/api/cron/process-bundles/route.ts`.
- Stack: Next.js 14 App Router, TypeScript, Drizzle ORM on Vercel Postgres, Vercel Blob, in-house VERI
  identity verification at auth.citrate.ai, NextAuth with GitHub OIDC for operators.
- Status: Implemented (pre-audit), not yet deployed. The core register, verify, approve, and deliver flow
  is built and tested (223 tests at this SHA), with email notifications and the production deploy still
  ahead. A Rule-8 security review is pending on the VERI / registrant-OIDC integration, the bundle worker
  and JWT download, and the admin queue before the deploy gate. Recent audit findings, the form and
  verification-start rate limits, the constant-time cron compare, approval-run idempotency, and TOML
  escaping, are fixed and regression-tested. The production URL `register.citrate.ai` is not yet live.
