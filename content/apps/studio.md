---
title: Citrate Studio
codex_slug: /apps/studio
tier: public
org_scope: ~
source_kind: authored
source: citrate-studio (private repo)
surfaces: [APP-studio]
audited_against_sha: 39cadf3
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate Studio is the agent-control interface for node operators, a native application for driving the
Citrate agent runtime and watching its safety machinery work. This page is a public overview; the
implementation internals are gated.

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

Public, for this overview only. The implementation internals are Confidential and gated. The design
specification, the map of what is built against what is modeled, the policy, signer-roster, approval-queue,
and Capsule-dispatch implementation, and the packaging and release detail are not written into Citrate
Almanac. They live in the private `citrate-studio` repository and are served at request time to authorized
people only. This page points to that gated material; it does not reproduce it, and it contains no secrets.

## Source and verification

- Source repo: `citrate-studio` (private). Public overview audited against SHA `39cadf3`.
- Status: Implemented. The application is a hardened release candidate with real authentication, policy
  core, signer roster, and chain reads; the precise built-versus-modeled map and the remaining 1.0 work are
  in the gated material. The Confidential bodies remain in the private repository and are intentionally not
  in the public build.
