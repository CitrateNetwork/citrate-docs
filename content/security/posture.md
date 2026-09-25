---
title: Security Posture & Audit History
codex_slug: /security/posture
tier: public
org_scope: ~
source_kind: authored
source: internal security control plane; GitHub Security Advisories
surfaces: [SEC-posture]
status: Implemented
created: 2026-09-21T00:00:00Z
author: Citrate team
---

Citrate secures real value - a Layer-1, on-chain settlement, embedded-account key custody, and
metered compute. This page is the public, standing summary of how we keep it safe: how we
audit, how to report a vulnerability, and where to read the record of issues we've already
fixed.

## Report a vulnerability

**Never open a public issue for a security problem.** Report privately:

- **GitHub Private Vulnerability Reporting** - on the affected repository's **Security** tab → *Report a vulnerability* (encrypted, no key exchange).
- **Email** [security@citrate.ai](mailto:security@citrate.ai). We do not publish a PGP key yet, so send sensitive details through private vulnerability reporting.

Full policy: [`SECURITY.md`](https://github.com/CitrateNetwork/.github/blob/main/SECURITY.md). Bounty scope,
safe-harbor rules and testing limits: coming soon.
We acknowledge within **72 hours**, triage within **5 business days**, and follow a
**90-day coordinated disclosure** window.

## How we audit

Security is continuous, not a one-time gate. We run an internal **adversarial audit
program** (the Agentile-Audit standard) across the federation on every meaningful change,
with a per-repository **tier** that sets the bar a change must clear. This is the same table as the
org [`SECURITY.md`](https://github.com/CitrateNetwork/.github/blob/main/SECURITY.md):

| Tier | Repositories | Audit policy | Vulnerability handling |
|---|---|---|---|
| **Tier 1**: consensus, value, keys, identity | `citrate-chain` (node, contracts, ZK), `citrate-core`, `citrate-identity`, `citrate-inference-gateway`, `citrate-compute-pool`, `citrate-coop`, `citrate-agent-runtime`, `citrate-sdk-js`, `citrate-sdk-python` | Full adversarial audit before every stable release | Coordinated disclosure; a GitHub Security Advisory (with a CVE request) for fixed High and Critical issues in released code |
| **Tier 3**: docs and content | `citrate-docs`, `.github`, and other content-only repositories | Content review | Triage as documentation corrections, no CVE |

A repository's own `AUDIT_TIER.md` is authoritative for that repository. A public repository without an
`AUDIT_TIER.md` is handled as Tier 1 for reports.

Supply-chain hardening is in progress: required review and CI checks on every public repository,
third-party GitHub Actions pinned to commit SHAs, and signed releases with SBOMs. Current prereleases are
unsigned.

> **Independent review.** We welcome external audits. No external-firm audit has been completed
> yet; completed engagements (firm and scope) will be listed here.

## Prior known issues

Resolved, disclosable vulnerabilities will be published as **[GitHub Security Advisories](https://github.com/CitrateNetwork/citrate-chain/security/advisories)**
on the affected repository (Security → Advisories), with affected and patched versions. None
have been published yet; the first will follow the fixes from the 2026-09 pre-bounty audit.
Subscribe to a repo's advisories to be notified.

At a high level, the classes of issue we've found and fixed to date include node **sync
robustness** (deep-sync and restart edge cases), **consensus liveness** under adversarial
load, and hardening from our recurring RM-Q audit passes. **Always run the latest release**
of node software - older binaries can diverge from the current chain.

## What this page does not contain

To keep the network safe, we don't publish: unfixed or embargoed vulnerabilities, exploit
details ahead of coordinated disclosure, secrets or credentials, or operational details
(host addresses, keys, internal topology). Our internal audit trail is kept private for that
reason; this page and the advisories are its public, secret-free derivative.

---

*Questions about our security program: [security@citrate.ai](mailto:security@citrate.ai).*
