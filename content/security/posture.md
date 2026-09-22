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
- **Email** [security@citrate.ai](mailto:security@citrate.ai) - encrypt with our PGP key (`keys.openpgp.org`, search `security@citrate.ai`, or the `Encryption` field of our [`security.txt`](https://citrate.ai/.well-known/security.txt)).

Full policy: [`SECURITY.md`](https://github.com/CitrateNetwork/.github/blob/main/SECURITY.md).
We acknowledge within **72 hours**, triage within **5 business days**, and follow a
**90-day coordinated disclosure** window.

## How we audit

Security is continuous, not a one-time gate. We run an internal **adversarial audit
program** (the Agentile-Audit standard) across the federation on every meaningful change,
with a per-repository **tier** that sets the bar a change must clear:

| Tier | Repositories (examples) | Policy |
|---|---|---|
| **Tier 1** - consensus & value | `citrate-chain` (consensus, EVM/LVM, contracts, ZK), `citrate-identity`, `citrate-inference-gateway`, `citrate-compute-pool`, `citrate-coop`, `citrate-core` | Full adversarial audit before every stable release; two-reviewer merges; coordinated disclosure with an advisory for High+ |
| **Tier 2** - supporting services | daemons, SDKs, agent surfaces | Audit on security-relevant change; single-reviewer merges |
| **Tier 3** - docs & tooling | documentation, examples | Content review |

Every merge to a protected branch requires review, green CI (including a secret-scanning
gate), and signed history. Third-party GitHub Actions are pinned to commit SHAs, and the
default CI token is read-only.

> **Independent review.** We welcome external audits and engage independent reviewers for
> Tier-1 code. Completed external engagements (firm and scope) will be listed here as they
> are finalized.

## Prior known issues

Resolved, disclosable vulnerabilities are published as **[GitHub Security Advisories](https://github.com/CitrateNetwork/citrate-chain/security/advisories)**
on the affected repository (Security → Advisories), with affected and patched versions.
That is the authoritative, machine-readable record - subscribe to a repo's advisories to be
notified.

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
