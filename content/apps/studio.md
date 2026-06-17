---
title: Citrate Studio, Native Agent-Harness Interface (Overview)
codex_slug: /apps/studio
tier: public
org_scope: ~
source_kind: linked
source: citrate-studio (private repo)
surfaces: [APP-studio]
audited_against_sha: c93a827
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Studio

> The native agent-harness interface for the Citrate runtime, a creative tool for driving a
> compliance-first agent. For operators and builders who want the runtime's safety machinery to be
> visible and usable rather than buried.

## Overview

Citrate Studio is the native UI for driving the Citrate agent runtime. It hides the transformer at the
top (chat) and reveals the calldata at the bottom (code), so each layer down trades one abstraction for
one truth. The compliance the runtime enforces, hash-pinned approvals, the quorum lattice, the doctor
checks, the tripwires, and frame-accurate audit replay, is surfaced as the primary interface rather
than hidden plumbing.

It is built in Slint, descends from the Citrate Marketplace design system, and renders
`citrate-agent-runtime` primitives directly. It is intended as the forward-looking UI kit for Citrate
native apps.

**Who it's for:** operators running compliance-first agents, and teams building native Citrate apps that
want a consistent agent-control surface.

## Security & access

Tier: **public** for this overview only.

> **The implementation docs are Confidential and gated.** Citrate Studio's internals, the design spec,
> the real-vs-modeled-vs-gated completion map, the policy/signer-roster/approval-queue/capsule-dispatch
> implementation, packaging and release detail, are **not** authored into Codex. They live in the
> private `citrate-studio` repo and are served at request time (S3 runtime gating) to authorized
> principals only. This page is a public-safe overview that points to that gated material; it
> deliberately does not reproduce competitive implementation depth, and it contains **no secrets**.

## Source & verification

- **Source repo:** `citrate-studio` (private). Public overview audited against SHA `c93a827`.
- Confidential bodies (design spec, completion status, release docs) remain in the private repo for
  runtime gating and are intentionally not in the public build.
