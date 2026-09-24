---
title: Procurement, how to buy Citrate
codex_slug: /enterprise/procurement
tier: public
org_scope: ~
source_kind: authored
source: citrate-commercial/CITRATE_PROCUREMENT_ORDER_FORM.md
surfaces: [ENT-procurement]
audited_against_sha: fea06db
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The non-sensitive shape of a Citrate procurement: a master agreement, order forms, and statements of work.
This page is for contracted and identity-verified principals planning a purchase. Deal-specific economics,
named parties, and rate cards are negotiated privately and are not published here. Nothing on this page is
a binding offer.

## What it is

Citrate is procured as software you run, not a hosted service. The software is delivered to infrastructure
you control, and you operate it; there is no vendor-operated hosting environment. The standard commercial
structure has three layers:

1. A master license and implementation services agreement, the umbrella contract that governs the
   relationship: definitions, IP ownership, confidentiality, warranties, indemnification, limitation of
   liability, term and termination, and dispute resolution. Signed once.
2. Order forms. Each transaction, a license procurement, an implementation engagement, or ongoing support,
   is issued as an order form under the master agreement. An order form carries the commercial specifics for
   that transaction and prevails over the master agreement for the deal it governs.
3. Statements of work. Implementation is scoped phase by phase as statements of work, signed by a joint
   steering committee, and billed on a time-and-materials basis against a rate card.

Three commercial properties are fixed, not negotiable per deal:

- On-premise, customer-controlled delivery. The software is delivered; you operate it. There is no
  vendor-operated hosting environment.
- No data services. The software operator does not host, store, transmit, process, or access customer data,
  and is not a data processor, controller, business associate, or sub-processor under any regime. This keeps
  the operator outside your authorization boundary. See [compliance posture](/enterprise/compliance).
- A one-time perpetual license for the software, plus separately billed time-and-materials implementation.
  There is no recurring subscription or usage fee for the license itself.

## How to use it

A typical deal proceeds in this order.

1. Introduction and mutual non-disclosure, before any deal-specific material is shared.
2. Discovery, the first implementation phase: an assessment of your environment, identity provider,
   monitoring stack, and compliance posture.
3. The master agreement and the first order form for the license, executed with the deal-specific economics
   filled in by the commercial team and outside counsel.
4. Statements of work per phase: discovery, then installation and configuration, then integration and
   validation, then knowledge transfer and operator training, then acceptance testing.
5. Acceptance and escrow. The acceptance certificate triggers the final license milestone, and the source
   escrow is deposited.
6. Optional ongoing support or a resale track, each via a separate order form.

To receive the procurement template, the master agreement, and the rate card under agreement, contact the
commercial team through your account channel. Per-deal materials are released after non-disclosure and
identity verification. See [district registration](/apps/district-registration) for the K-12 onboarding
path specifically.

## Reference

The procurement template, `citrate-commercial/CITRATE_PROCUREMENT_ORDER_FORM.md`, defines the following
components at a structural level.

| Component | What it covers, non-sensitive |
|---|---|
| Order form, license | Effective date, parties, a fee schedule keyed to milestones (execution, delivery, acceptance), location of use, and hosting marked not applicable because delivery is on-premise. |
| Order form, implementation | A phased engagement scoped against a rate card, invoiced monthly in arrears, governed by a steering committee. |
| License grant | Perpetual, non-exclusive, worldwide; rights to use, copy, modify, deploy, and white-label on customer-controlled infrastructure; restrictions on standalone resale and on open-sourcing. |
| Deliverables at delivery | Source, reproducible-build binaries, smart-contract source and tests, a documentation set, TLA+ specifications, build and test scripts, and detached cryptographic signatures over every artifact. |
| Acceptance testing | A defined window, 90 days by default, with an acceptance-certificate or rejection-notice path, and deemed acceptance if neither issues. |
| No-data-services carve-out | The explicit, absolute statement that the operator never holds customer data, central to your compliance boundary. |
| Master agreement terms | Confidentiality, IP ownership, fees and payment, warranties, indemnification, limitation of liability, term and termination, governing law, and arbitration. |
| Source-code escrow | A deposit with a mutually agreed escrow agent, with defined release conditions: insolvency, cessation of operations, or an uncured warranty breach. |
| Resale addendum | An optional, separately executed track if you later wish to resell the software. |

The supporting templates in `citrate-commercial/commercial/` cover the federal procurement path: a
commercial-item determination, representations and certifications, a statement-of-work template, a mutual
non-disclosure template, a source-code escrow agreement, and an acceptance test plan, among others. They are
released to contracted principals, not authored in this docs tree.

## Design rationale

The structure exists to remove negotiation friction rather than create it. A perpetual license plus
time-and-materials implementation separates what you own from what you pay people to do, so the two are
priced and accepted independently. The no-data-services carve-out is the load-bearing term: because the
operator never holds your data, your own assessment governs the regulated workload, and a contracting
officer's questions have clean answers. The mandatory knowledge-transfer phase exists so your own operations
team can run the deployment without us, which is the point of buying software you run.

## Failure modes and honest gaps

- The procurement template is a draft for legal review. Outside counsel reviews every clause against your
  deal context, jurisdiction, and regulatory profile before execution.
- The structure is final; the economics are not. Dollar values, dates, the customer entity, hosting
  locations, and warranty scope are negotiated per deal and are not published here.
- Implementation estimates are good-faith estimates only. Actual hours are invoiced against the rate card.
- Acceptance has a deadline. If you issue neither an acceptance certificate nor a rejection notice within the
  acceptance window, acceptance is deemed automatic.

## Access and canon

This page is the commercial-tier structural summary, shared with contracted and identity-verified principals
so a buyer's procurement team can plan. The terms and economics are gated to the private
`citrate-commercial` repo. No dollar values, named customer or vendor entities, rate-card figures, patent
schedule, signatory personal data, or hosting addresses are reproduced here; those are deal-specific and
confidential. Per-company spaces are provisioned at runtime per contract and are not authored in this docs
tree. For where the operator sits in your authorization boundary, see [compliance posture](/enterprise/compliance).

## Source and verification

Source: `citrate-commercial/CITRATE_PROCUREMENT_ORDER_FORM.md` and the templates under
`citrate-commercial/commercial/` (private repo). Audited against `citrate-commercial` SHA `fea06db`. Status:
Specified. The procurement structure is written down and current as of that SHA; it is a template for legal
review, not an executed agreement, and the deal-specific terms it brackets are negotiated privately.
