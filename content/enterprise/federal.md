---
title: Federal and On-Prem Isolation (Gated)
codex_slug: /enterprise/federal
tier: public
org_scope: ~
source_kind: gated
source: citrate-compliance + nist-agent
surfaces: [ENT-federal]
audited_against_sha: 8757357
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This page confirms that a federal and on-prem isolation package exists and explains how to request it. The package is confidential; it is never built into these public docs, and nothing here is a claim of certification or authorization.

## What it is

For federal and defense engagements, Citrate maintains a confidential package covering the federal control families, the authorization pathway, and the export-control overlay that those engagements require. Citrate runs on-premise on Citrate Ground and can run air-gapped, so a customer deploys inside their own authorization boundary, on their own hardware. The vendor performs no data services and is not itself inside that boundary.

The package ties to the air-gapped deployment described for [Citrate NIST Agent](/apps/nist-agent), which is the surface that runs against the federal control corpus on Citrate Ground. The detail behind all of this, the control implementations, the system security plan bodies, and any sponsor or assessor particulars, stays in the private home. No scores, control detail, sponsor names, or customer specifics appear on this page or anywhere in the public docs.

These frameworks are in progress, not certified. Nothing on this page is a claim of authorization to operate, of certification, or of attestation. The honest public summary is at [Compliance posture](/enterprise/compliance).

## How to request access

Access is for people with a contractual reason to read the package: federal contracting officers, sponsors, contracted assessors, and issued auditors, each under a non-disclosure agreement.

1. Ask through your commercial or compliance contact at Citrate.
2. We confirm your role and put the non-disclosure agreement in place.
3. We grant time-bound access to the package in its private home.

## Access and canon

The package is confidential. It is served at request time from its private home, under a non-disclosure agreement, to named recipients only. It is never copied into this documentation tree, and the public build never includes it. Every access is logged. The sanitized public summary, which anyone may read, is at [Compliance posture](/enterprise/compliance); for the schools deployment context see [Citrate Schools](/enterprise/k12).

## Source and verification

Private source: the `citrate-compliance` corpus and the `nist-agent` control corpus. Audited against `citrate-compliance` SHA `8757357`. Status: Specified (the package and the air-gapped deployment are designed and documented; the frameworks it targets are in progress, not certified, with no scores shown here).
