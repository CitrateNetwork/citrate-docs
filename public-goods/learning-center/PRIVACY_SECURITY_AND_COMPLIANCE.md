# Learning Center Privacy, Security, and Compliance

This document describes the Learning Center's intended public compliance posture
for school deployment.

It is not legal advice. It is a design-and-operations summary for district counsel,
IT, and procurement teams.

## Public posture in one sentence

The Learning Center is designed so that a school or district can keep operational
control over student data, run core workflows on its own infrastructure, and use
 contracts plus technical controls to limit secondary use, redisclosure, and role drift.

## What the architecture is trying to guarantee

- student records remain under school or LEA control
- access is role-gated and least-privilege by default
- data use is tied to educational purpose, not advertising
- parents and eligible students can be served through a controlled access path
- districts can prefer on-prem, restricted-network, or private-network deployment
- AI features are optional and must not weaken the privacy baseline

## Current security building blocks

- local wallet and keystore encryption with Argon2 and AES-256-GCM
- org-local encryption and key rotation support in the Learning Center app
- contract-level role checks in the education stack
- auditable on-chain events for key institutional actions
- ability to operate against a district-selected RPC or private Citrate deployment
- no targeted-advertising model in the school product posture

## Compliance mapping

### FERPA

The core FERPA model is straightforward:

- districts stay the decision-maker
- vendors act only within the school's delegated educational purpose
- record access and redisclosure stay constrained by contract and system design

The strongest design pattern for Citrate is the familiar "school official" path:

- outsourced institutional service
- direct school control over use and maintenance of records
- use only for the authorized educational purpose
- written agreement defining the boundaries

FERPA also matters on access rights:

- parents and eligible students must be able to inspect and review records
- the school must respond within the required timeline

For the Learning Center, that means the parent/guardian access story is not an
optional UX add-on. It is part of the compliance baseline.

### COPPA

Where the product is used solely in the educational context and for the school's
benefit, schools may act as the parent's agent for COPPA consent. That only works
if the operator is not using the student's information for unrelated commercial
purposes.

That is why the public product posture must remain:

- no targeted advertising
- no unrelated profiling
- no hidden secondary data monetization

### CIPA

If a school relies on E-Rate-supported internet access or internal connections,
content filtering and internet safety obligations are real operational requirements,
not marketing language.

For the Learning Center, the honest rule is:

- do not imply CIPA compliance from "AI safety" alone
- districts still need an internet safety policy, filtering, monitoring, and records
- app-level content controls can help, but they do not replace district obligations

### California student privacy contracts

California's AB 1584 contract model is especially useful because it turns school
privacy expectations into explicit vendor terms:

- pupil records remain the LEA's property and under LEA control
- contracts must describe review, correction, breach notice, retention, and deletion
- targeted advertising against pupil records is prohibited

That is the right public contract posture even outside California.

## Honest gaps that still need closure

- attorney-reviewed DPA template is not yet complete
- state-specific filings are not yet complete for every state
- the guardian portal is planned and security-scoped, but not yet the finished public baseline
- the new end-to-end integration and live smoke gates are still under construction
- federal or defense-grade packages would require additional controls beyond school compliance

## Security language we should use publicly

Use this:

- high-assurance
- on-prem capable
- air-gap friendly
- role-gated
- auditable
- district-controlled
- encryption in transit and at rest
- private-network deployable

Avoid this:

- military grade
- impossible to hack
- fully compliant everywhere
- zero risk

Public procurement teams want evidence, baselines, and contract language, not slogans.

