# Learning Center Pilot and Roadmap

This is the public version of the Learning Center delivery sequence.

The internal closure contract is stricter and lives under `.agentile/`. This page is
the outward-facing version: plain language, same direction, fewer internals.

## Pilot promise

Pilot readiness means all of the following are true:

- role-gated school workflows are proven end-to-end
- live smoke checks against chain `40204` exist for the critical flows
- districts can install and manage the software with standard IT tooling
- parents or guardians have a defensible access path to student information
- the public privacy story matches the actual product behavior

## Delivery sequence

### P-1: Proof

Goal: prove that role boundaries and core flows hold under automated tests.

Public outcome:

- role x view matrix
- happy-path workflow coverage
- error recovery coverage
- live smoke checks on the running testnet

### P-2: Deployment

Goal: make the product installable, supportable, and parent-ready.

Public outcome:

- silent installers
- MDM and GPO packaging
- SIS import formats
- guardian enrollment model for parent access
- incident and support runbooks

### P-3: Extensibility

Goal: let districts and partners build their own interfaces without forking the product blindly.

Public outcome:

- SDK packages
- example app
- public API and integration docs

### P-4: Optional on-prem AI

Goal: add tutoring and local inference without making the pilot depend on it.

Public outcome:

- optional local model runtime
- grade-aware guardrails
- educator-reviewed anti-cheat posture
- content safety controls

### P-5: Financial clarity

Goal: make teacher and district economics understandable in dollars, not protocol jargon.

Public outcome:

- SALT-to-USD display
- accrual dashboard
- manual payout runbook
- funding and grant support material

## Non-negotiable public boundaries

- pilot does not require bundled LLM tutoring
- PIN-only parent access is not acceptable
- anti-cheat cannot silently punish students
- manual USD payout cannot be marketed as automated finance
- public screenshots do not count as integration proof

## What will make this feel deployment-grade

- one-day district pilot setup
- predictable IT ownership
- clear parent and teacher language
- evidence-backed compliance posture
- platform-neutral deployment choices

