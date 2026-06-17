---
title: Citrate Customer Shell, Boeing (Overview)
codex_slug: /apps/boeing
tier: public
org_scope: boeing
source_kind: linked
source: citrate-boeing-shell (private repo)
surfaces: [APP-boeing]
audited_against_sha: b13ef41
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Customer Shell, Boeing

> A customer-specific native shell built on the Citrate Network. For the named customer's authorized
> users only.

## Overview

This surface is a **customer-specific shell**, a tailored native (Slint) application composed over the
Citrate Network for a single enterprise customer. The shell packages that customer's branded experience
and their role-bound access bindings on top of the federation's standard primitives.

## Security & access

Tier: **public** for this one-paragraph overview; `org_scope: boeing`.

> **The real space is Confidential, org-scoped, and gated.** All customer-specific content, panels,
> integrations, RBAC bindings, and any customer detail, is client-paid IP and is **not** authored into
> Codex. It lives in the private `citrate-boeing-shell` repo and is served at request time (S3 runtime
> gating) only to that customer's authorized principals, behind the org scope. This page is a deliberate
> public-safe stub that names the existence of a customer shell and nothing more; it contains **no
> customer detail and no secrets.**

## Source & verification

- **Source repo:** `citrate-boeing-shell` (PRIVATE, customer-specific). Public stub audited against SHA
  `b13ef41`.
- Confidential, org-scoped bodies remain in the private repo for runtime gating and are intentionally
  not in the public build.
