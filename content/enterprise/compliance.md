---
title: Compliance posture, public and sanitized
codex_slug: /enterprise/compliance
tier: public
org_scope: ~
source_kind: authored
source: citrate-compliance/frameworks/README.md
surfaces: [ENT-compliance-pub]
audited_against_sha: 8757357
status: Specified
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Where Citrate stands on the major compliance frameworks, stated honestly and by deployment context. This is
the sanitized public summary. It is a point-in-time status, not a claim of certification or attestation, and
not legal advice. Where a framework is in progress, it is in progress, and we say so plainly.

## What it is

Two facts shape the whole posture, and the rest follows from them.

First, Citrate ships on-premise. The customer operates the software on hardware it controls; there is no
vendor-operated hosted environment. Citrate Ground is the private, on-premise half of the network, and it is
the default. The public Citrate Network only ever sees what an operator chooses to publish.

Second, the operator of the software performs no data services. It does not host, store, transmit, process,
or access customer data, and it is not a data processor, controller, business associate, or sub-processor
under any regime. That keeps the software operator outside the customer's authorization boundary: the
customer's own controls govern the regulated workload.

Because of those two facts, most frameworks apply to the customer's deployment rather than to a hosted
service. The compliance floor therefore depends on where Citrate runs:

- Public Citrate Network. Every node operator is identity-verified through VERI, Citrate's in-house verification; SOC 2 is the general floor
  for the surrounding services.
- Citrate Ground, on-premise. The customer's deployment carries the floor for its own context: HIPAA for
  health, NIST 800-171 and 800-53 with ITAR considerations for federal and regulated work, SOC 2 generally.
- Citrate Schools. FERPA, COPPA, and CIPA, covered separately under [K-12 and education](/enterprise/k12).

The table below describes Citrate's own readiness work to support customers who must meet these frameworks.
It does not assert that any certification has been earned where it has not.

## How to use it

1. Find your deployment context above, then read the matching rows in the table.
2. Read the honest caveat in each row before you plan around the status. A framework "in progress" is not a
   framework held.
3. For an authoritative, current, per-framework status with evidence, request the gated package. It is
   available to contracted and identity-verified principals and assessors under agreement. See
   [compliance posture, full](/enterprise/compliance-full).
4. For the K-12 floor specifically, read [K-12 and education](/enterprise/k12). For the federal context,
   read [federal](/enterprise/federal).

## Reference

Framework status, sanitized and point-in-time. Source: `citrate-compliance/frameworks/README.md` and the
per-framework digests in `citrate-compliance/frameworks/`.

| Framework | Status | Honest caveat |
|---|---|---|
| SOC 2 (Type I and II) | In progress. Control narratives drafted across the Trust Service Criteria; a CPA engagement is underway. | Not yet attested. No SOC 2 report has been issued. Type II additionally requires an operating-effectiveness observation window. |
| CMMC 2.0 Level 1 | Self-attestation model; the Level 1 practices are filled. | Self-attested, not third-party assessed. |
| CMMC 2.0 Level 2 (NIST 800-171 r2) | In progress. A self-assessment draft is authored; remediation of submission blockers is underway. | Not yet submitted and not certified. A third-party assessment would be a later, separate step for contracts that require it. |
| FedRAMP (Low and Moderate) | Not started as an authorization; sponsor-gated. Outline material is authored. | FedRAMP is the cloud pathway. Because the first deployments are on-premise, it is not required for them. An authorization requires an agency sponsor, a cloud provider, and a third-party assessor. |
| FIPS 140-3 | In progress, and out of our hands. The underlying cryptographic module is in the validation queue. | Validation timing is controlled by the validation program, not by Citrate. Tracked as a known residual. |
| ITAR and EAR | An export-control overlay; public-surface leakage scanning and a disclaimer-check gate are in place. | Responsibility for any controlled technical data deployed in the software remains with the customer. An outside-counsel opinion is still pending. |
| FERPA, COPPA, CIPA | The education-privacy floor for the school product track. | See [K-12 and education](/enterprise/k12). |

## Design rationale

We deliberately avoid certification language we have not earned. We describe the posture as high-assurance,
on-prem capable, air-gap friendly, role-gated, auditable, and private-network deployable, with encryption in
transit and at rest. We do not write "military grade," "fully compliant everywhere," "impossible to hack,"
or "zero risk." The reason is practical as much as honest: procurement teams want evidence, baselines, and
contract language, and a slogan fails every one of those tests.

The on-premise default is what makes the rest coherent. If the software operator never holds customer data,
then the customer's own assessment governs the regulated workload, and the questions a contracting officer
asks have clean answers rather than negotiated ones.

## Failure modes and honest gaps

- SOC 2 is in progress, not attested. Treat any reliance on a SOC 2 report as premature until one is issued.
- CMMC Level 2 is drafted, not submitted or certified. A third-party assessment is a separate future step.
- FedRAMP is not pursued as an authorization for on-premise deployments and requires a sponsor if it ever is.
- FIPS 140-3 validation timing depends on the external validation program, not on us.
- The ITAR and EAR outside-counsel opinion is pending; export responsibility for controlled data stays with
  the customer.

## Access and canon

This sanitized summary is intentionally public so a prospective customer or partner can understand where we
stand without an agreement in place. What is gated is the full framework packages: the system security
plans, control crosswalks, plan-of-action items, self-assessment detail, and audit evidence. Those live in
the private `citrate-compliance` corpus and the audit archive, behind contract and identity verification.
See [compliance posture, full](/enterprise/compliance-full) and [security questionnaires](/enterprise/questionnaires).

No control scores, plan-of-action item detail, operator personal data, named CPA, sponsor, or counsel, or
remediation timelines appear on this page. Every node operator on the public network is identity-checked
through VERI; Citrate keeps the verification result, not the personal data behind it.

## Source and verification

Source: `citrate-compliance/frameworks/README.md` and the per-framework digests under
`citrate-compliance/frameworks/` (private repo), which point in turn to the executive posture briefing and
the audit archive. Audited against `citrate-compliance` SHA `8757357`. Status: Specified. The posture and the
framework mappings are written down and current as of that SHA; the certifications described as "in progress"
are not yet held, and none of the underlying scores or evidence are reproduced here.
