---
title: Procurement, How to Buy Citrate (MSA, Order Forms, SOW)
codex_slug: /enterprise/procurement
tier: commercial
org_scope: ~
source_kind: authored
source: citrate-commercial/CITRATE_PROCUREMENT_ORDER_FORM.md
surfaces: [ENT-procurement]
audited_against_sha: fea06db
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Procurement, How to Buy Citrate

> The non-sensitive shape of a Citrate enterprise procurement: a Master Agreement,
> Order Forms, and Statements of Work. For contracted / KYC'd principals. Deal-specific
> economics, named parties, and rate cards are negotiated privately and are not published here.

## Overview

Citrate is procured as **software you run**, not a hosted service. The standard
commercial structure has three layers:

1. **Master License & Implementation Services Agreement (MLISA)**, the umbrella contract
   that governs the relationship (definitions, IP ownership, confidentiality, warranties,
   indemnification, liability, term/termination, dispute resolution). Signed once.
2. **Order Forms**, each transaction (a license procurement, an implementation engagement,
   ongoing support) is issued as an Order Form under the MLISA. An Order Form carries the
   commercial specifics for that transaction and prevails over the MLISA for the deal it governs.
3. **Statements of Work (SOW)**, implementation work is scoped phase-by-phase as SOWs,
   signed by a joint Steering Committee, and billed on a time-and-materials basis against a
   rate card.

The defining commercial properties (these are **final**, not negotiable):

- **On-premise / customer-controlled delivery.** Software is delivered; the customer operates it.
  There is no vendor-operated hosting environment.
- **No data services.** The vendor does not host, store, transmit, process, or access customer
  data, and is not a data processor/controller/business-associate/sub-processor under any
  regulatory regime. This keeps the vendor outside the customer's authorization boundary
  (FedRAMP/CMMC/HIPAA/GDPR/CCPA/ITAR). See [Compliance posture](/enterprise/compliance).
- **One-time perpetual license** for the software, plus **separately-billed T&M implementation**.
  There is no recurring subscription or usage fee for the license itself.

## Reference

The procurement template (`citrate-commercial/CITRATE_PROCUREMENT_ORDER_FORM.md`) defines the
following components at a structural level:

| Component | What it covers (non-sensitive) |
|---|---|
| **Order Form, License** | Effective date, parties, fee schedule keyed to milestones (execution / delivery / acceptance), ship-to / location of use, hosting (N/A, on-prem). |
| **Order Form, Implementation (Anchor SOW)** | Phased engagement scoped against a rate card, invoiced monthly in arrears, governed by a Steering Committee. |
| **License Grant** | Perpetual, non-exclusive, worldwide; rights to use, copy, modify, deploy, and white-label on customer-controlled infrastructure; restrictions on standalone resale and open-sourcing. |
| **Deliverables at delivery** | Source + reproducible-build binaries + smart-contract source/tests + documentation set + TLA+ specs + build/test scripts + detached cryptographic signatures over every artifact. |
| **Acceptance testing** | A defined window (default 90 days) with an Acceptance Certificate or Rejection Notice path, and deemed acceptance if neither issues. |
| **No-Data-Services carve-out** | The explicit, absolute statement that the vendor never holds customer data, central to the customer's compliance boundary. |
| **MLISA terms** | Confidentiality, IP ownership, fees/payment, warranties, indemnification, limitation of liability, term/termination, governing law + arbitration. |
| **Source-code escrow** | Deposit with a mutually-agreed escrow agent, with defined release conditions (insolvency, cessation of operations, uncured warranty breach). |
| **Resale addendum** | Optional, separately-executed track if the customer later wishes to resell the software. |

> **Audit note (Rule 9).** This page summarizes the *structure* of the procurement template.
> The authoritative contract terms, fee schedules, rate card, named parties, and patent
> schedule live in the private `citrate-commercial` repo and are surfaced only to
> contracted principals. Nothing in this page is a binding offer.

## How a deal proceeds (typical flow)

1. **Intro + NDA.** Mutual confidentiality before any deal-specific material is shared.
2. **Discovery.** Environment, identity, monitoring, and compliance-posture assessment
   (the first implementation phase).
3. **MLISA + Order Form #1 (License).** Executed with deal-specific economics filled in by
   sales + outside counsel.
4. **SOWs per phase.** Discovery → Installation → Integration → Knowledge Transfer → Acceptance.
5. **Acceptance + escrow.** Acceptance Certificate triggers the final license milestone; source
   escrow is deposited.
6. **Optional ongoing support / resale** via separate Order Forms.

## Security & access

- **Tier: commercial.** The procurement *shape* is shared with contracted / KYC'd principals so
  a buyer's procurement team can plan; the *terms and economics* are gated to the private
  `citrate-commercial` repo. This page is the public-safe structural summary only.
- **No secrets here.** No dollar values, named customer/vendor entities, rate-card figures,
  patent schedule, signatory PII, or hosting addresses are reproduced on this page, those are deal-specific and confidential.
- Per-company spaces (`ENT-org-<id>`) are provisioned at runtime per contract and are not
  authored in this docs tree.

## Request access

To receive the procurement template, MLISA, and rate card under NDA, contact the commercial
team through your account channel. Per-deal materials are released after NDA and KYC.

## Source & verification

- Source of truth: `citrate-commercial/CITRATE_PROCUREMENT_ORDER_FORM.md` (PRIVATE repo).
- Audited against `citrate-commercial` SHA `fea06db`.
- Registry row: `ENT-procurement`.
