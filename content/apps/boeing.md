---
title: A regulated-manufacturing customer shell
codex_slug: /apps/boeing
tier: public
org_scope: boeing
source_kind: authored
source: citrate-boeing-shell (private repo)
surfaces: [APP-boeing]
audited_against_sha: b13ef41
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is a customer shell, a native application tailored for one enterprise customer in regulated
manufacturing and run on an on-premise Citrate Ground deployment. This page is a deliberate public stub; the
customer-specific internals are gated.

## What it is

A customer shell is a tailored native application composed over the network's standard parts for a single
enterprise customer. It packages that customer's branded workspace and their role-bound access bindings on
top of the same primitives every Citrate application uses. This particular shell serves a customer in
regulated manufacturing and runs on [Citrate Ground](/enterprise/ground), the on-premise enterprise
deployment, often alongside an isolated agent like [the air-gapped agent sidecar](/apps/nist-agent).

## Access and canon

Public, for this one overview, with `org_scope: boeing`. The real space is Confidential, org-scoped, and
gated. All customer-specific content, panels, integrations, access bindings, and any customer detail is
client-paid intellectual property and is not written into Citrate Atlas. It lives in the private
`citrate-boeing-shell` repository and is served at request time only to that customer's authorized people,
behind the org scope. This page names the existence of a customer shell and nothing more; it contains no
customer detail and no secrets.

## Source and verification

- Source repo: `citrate-boeing-shell` (private, customer-specific). Public stub audited against SHA
  `b13ef41`.
- Status: Implemented. The Confidential, org-scoped bodies remain in the private repository for runtime
  gating and are intentionally not in the public build.
