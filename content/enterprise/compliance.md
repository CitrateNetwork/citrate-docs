---
title: Compliance Posture (Public, Sanitized)
codex_slug: /enterprise/compliance
tier: public
org_scope: ~
source_kind: authored
source: citrate-compliance/frameworks/README.md
surfaces: [ENT-compliance-pub]
audited_against_sha: 8757357
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Compliance Posture (Public, Sanitized)

> Where Citrate stands on the major compliance frameworks, stated honestly.
> This is the sanitized public summary. Audit-grade evidence, POA&Ms, and full
> framework packages are gated.

> **Disclaimer.** This page is an honest, point-in-time status summary, **not** a
> claim of certification or attestation. Where a framework is "in progress," it is
> not certified. This is not legal advice. Nothing here authorizes a deployment for
> any regulated workload, that depends on the customer's own authorization boundary
> and assessment. For an authoritative, current status under NDA, request the gated
> package (see below).

## Overview

Two facts shape Citrate's compliance posture:

1. **Citrate ships on-premise / customer-controlled.** The customer operates the software.
   The vendor does not run a hosted environment.
2. **The vendor performs no data services.** It does not host, store, transmit, process,
   or access customer data, and is not a data processor / controller / business associate /
   sub-processor under any regime. This keeps the vendor **outside the customer's
   authorization boundary**, the customer's own controls govern the regulated workload.

Because of (1) and (2), many frameworks apply to *the customer's deployment* rather than to
a vendor-operated service. The status below describes Citrate's own readiness work to support
customers who must meet these frameworks.

## Framework status (honest, point-in-time)

| Framework | Status (sanitized) | Honest caveat |
|---|---|---|
| **SOC 2 (Type I/II)** | **In progress.** Control narratives drafted across the Trust Service Criteria; CPA engagement underway. | **Not yet attested.** No SOC 2 report has been issued. Type II additionally requires an operating-effectiveness observation window. |
| **CMMC 2.0 Level 1** | Self-attestation model; the Level 1 practices are filled. | Self-attested, not third-party assessed. |
| **CMMC 2.0 Level 2 (NIST 800-171 r2)** | **In progress.** Self-assessment (SPRS) draft authored; remediation of submission blockers underway. | **Not yet submitted / not certified.** A C3PAO assessment would be a later, separate step for contracts requiring it. |
| **FedRAMP (Low / Moderate)** | **Not started as an authorization; sponsor-gated.** SSP outline material authored. | FedRAMP is the *cloud* pathway. Because V1 is on-premise, FedRAMP is **not** required for first deployments. An ATO requires an agency sponsor, a cloud provider, and a 3PAO. |
| **FIPS 140-3** | **In progress (vendor-external).** The underlying cryptographic module is in the NIST CMVP validation queue. | Validation timing is controlled by NIST CMVP, not by Citrate. Tracked as a known residual. |
| **ITAR / EAR** | Export-control overlay; public-surface leakage scanning and a disclaimer-check gate are in place. | Export-control responsibility for any controlled technical data deployed in the software remains with the customer. |
| **FERPA / COPPA / CIPA** | Education-privacy posture for the school product track. | See [K-12 / education](/enterprise/k12). |

## What "in progress" means

We deliberately avoid certification language we have not earned. Per our public-language rule,
we use terms like **high-assurance**, **on-prem capable**, **air-gap friendly**, **role-gated**,
**auditable**, **encryption in transit and at rest**, and **private-network deployable**, and we
avoid "military grade," "fully compliant," "impossible to hack," and "zero risk." Procurement
teams want evidence, baselines, and contract language, not slogans.

## Security & access

- **Tier: public.** This sanitized summary is intentionally public so prospective customers and
  partners can understand where we stand without an NDA.
- **What is gated:** the full framework packages (SSPs, control crosswalks, POA&Ms, SPRS
  calculator detail, audit evidence) live in the **private** `citrate-compliance` corpus and the
  audit archive. See [Compliance posture (full)](/enterprise/compliance-full) and
  [Security questionnaires](/enterprise/questionnaires), both gated.
- **No secrets here.** No SPRS scores, POA&M item detail, operator PII, named CPA/sponsor/counsel,
  or remediation timelines are reproduced on this page.

## Request access

The full, current posture and per-framework evidence are available to contracted / KYC'd
principals and assessors under NDA. Request through your account channel or the commercial team.

## Source & verification

- Source of truth: `citrate-compliance/frameworks/` (PRIVATE repo) and the executive posture
  briefing it points to.
- Audited against `citrate-compliance` SHA `8757357`.
- Registry row: `ENT-compliance-pub`.
