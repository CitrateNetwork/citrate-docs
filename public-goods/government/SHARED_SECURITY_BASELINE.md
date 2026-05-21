# Shared Security Baseline

This is the common security posture Citrate would need across government sectors.

## What Citrate already brings

- encrypted peer networking in the core stack
- local-node-first architecture rather than mandatory browser SaaS
- strong modern primitives in current application code, including AES-256-GCM for
  local encryption in the Learning Center path
- contract- and event-level auditability
- support for small private networks and institutional forks
- ability to separate "public network", "private network", and "local-only" deployment models

## What public-sector deployments will still require

Strong algorithms are not the same as public-sector acceptance.

Government programs will often require some combination of:

- FIPS 140-3 validated cryptographic modules, not just strong cryptographic choices
- NIST 800-53 or 800-171 control mappings with assessment evidence
- zero-trust identity and device posture
- phishing-resistant authentication and smart-card or hardware-token options
- centralized logging, alerting, and incident response integration
- software supply-chain evidence such as SBOMs, signed releases, provenance, and patch policy
- accessibility conformance for public-facing and official-use interfaces
- records retention, export, and legal hold support
- offline update and removable-media procedures for restricted networks

## What we should say publicly

Say:

- designed for high-assurance deployment
- capable of private-network and restricted-network operation
- security posture can be mapped to NIST and CISA guidance
- roadmap includes FIPS, identity federation, accessibility, and assessment evidence

<!--
Disclaimer (required by REM-03 disclaimer-check):
This document describes general government-program requirements
including references to FIPS 140-3 validated modules. Citrate's
actual posture on FIPS 140-3 is in active remediation — the
aws-lc-rs migration is documented, but CMVP certification is in
the public queue (18–24 months). We make no claim of FIPS 140-3
validation today. Our compliance posture is "in progress / not yet
certified" across CMMC L2 (phase-1 remediation, self-attestation
at L1) and FedRAMP (outline SSP, sponsor not yet identified).
See citrate-agentile-archive/audits/2026-05/2026-05-19-federation-split-audit/
for full status.
-->

Do not say:

- already FedRAMP
- already IL5 or IL6
- already CJIS-certified
- already HIPAA-complete in every workflow
- already military grade

## Shared engineering backlog for government readiness

- pluggable crypto provider strategy, including FIPS-capable runtime options
- PIV, CAC, and hardware-token identity support
- policy packs for Windows, macOS, Linux, and managed kiosk deployments
- STIG-style hardening guides
- OSCAL, SSP, SAR, and POA&M-friendly evidence packaging
- structured audit export to SIEM tooling
- signed offline bundle format for binaries, policies, and model artifacts
- built-in records export and retention controls
- accessibility test suite and VPAT-ready documentation

