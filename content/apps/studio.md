---
title: Citrate Studio
codex_slug: /apps/studio
tier: public
org_scope: ~
source_kind: authored
source: citrate-studio (BUSL-1.1)
surfaces: [APP-studio]
audited_against_sha: 39cadf3
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate Studio is the agent-control interface for node operators, a native application for driving the
Citrate agent runtime and watching its safety machinery work. This page is the overview; the full source is
public in the `citrate-studio` repository under BUSL-1.1.

## What it is

Citrate Studio is the native interface that an operator uses to run a compliance-first agent. It puts the
runtime's safety machinery, the approvals, the role quorum, the pre-flight checks, the tripwires, and the
audit replay, in front of the operator as the main thing on screen rather than hidden plumbing. It is built
in Slint, descends from the Citrate Market design system, and renders the agent runtime's own primitives
directly.

The runtime it drives is the [agent runtime](/compute/agent-runtime), and the people it is for are the
[node operators](/operators/run-a-node) who run agents on their own hardware and want the safety controls
to be visible and usable.

## Access and canon

Public. This page is the overview; the full implementation is public in the `citrate-studio` repository
under BUSL-1.1 (source-available, converting to Apache-2.0 on its Change Date). The design specification,
the map of what is built against what is modeled, the policy, signer-roster, approval-queue, and
Capsule-dispatch implementation, and the packaging and release detail all live in that repository. This page
summarizes and links to the source rather than reproducing it, and it contains no secrets.

## Source and verification

- Source repo: `citrate-studio` (public, BUSL-1.1). Overview audited against SHA `39cadf3`.
- Status: Implemented. The application is a hardened release candidate with real authentication, policy
  core, signer roster, and chain reads; the precise built-versus-modeled map and the remaining 1.0 work are
  tracked in the repository.
