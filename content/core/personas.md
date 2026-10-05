---
title: Hermes personas and tracks
codex_slug: /core/personas
tier: public
source_kind: authored
source: citrate-agent-runtime/agent-loop/personas/personas.toml, agent-loop/tracks, agent-loop/PERSONAS.md; citrate-core/src/components/PersonaPicker.tsx
surfaces: [CORE-agent, CORE-settings]
audited_against_sha: 81ef7a0
status: Implemented (pre-audit), arrives with Citrate Core 0.5.0
created: 2026-10-04T00:00:00Z
branch: hup/n7-docs-almanac-retro
author: Larry Klosowski + Claude Opus 5.5
nav_order: 11
---

A persona is a voice for Hermes: how it writes, which skills it reaches for, and where it starts. A
track is a goal, such as a full project or a contract audit. This page is for members choosing a
persona or a track. The technical reference is
[PERSONAS.md](https://github.com/CitrateNetwork/citrate-agent-runtime/blob/main/agent-loop/PERSONAS.md)
in the runtime repo.

## What it is

Each persona bundles a voice and tone, a few writing rules, a default track and workflow, up to four
tools it keeps in view, and a list of the skills it may load. Any persona can run any track. A persona
changes tone and the skills on offer. It never grants a tool, changes an approval, or touches the
signing ceremony.

## How to use it

1. Choose a persona at the end of onboarding, or later in **Settings** under **Hermes, persona**.
   The default is Hermes's own voice, which changes nothing.
2. Start a piece of work. Hermes opens with the persona's default track unless you pick another.
3. Run a track workflow from the chat with `/run <workflow>`, for example `/run status-note`.
4. To make your own persona, use the custom form in the same Settings card: a name, a voice, a tone
   and one to twelve writing rules. It is checked before it is saved, and it stays on your machine.
5. Turn on **Read replies aloud** if you want Hermes to speak. It is off by default and uses your
   system's voice.

## Reference

The six shipped personas. The names were chosen by the owner on 2026-10-01; the role is the stable
part, and a rename never loses your saved choice.

| Name | Role | Voice | Starts with |
|---|---|---|---|
| Graft | Builder: ships code and dApps | Direct and terse; shows the diff or the command | full project, hello mint |
| Pith | Auditor: a skeptical reviewer | Calm and evidence-first; says "not ready" plainly | smart contract, audit a contract |
| Zest | Maker: creative work | Playful and visual; offers options | creative, creative project |
| Trellis | Steward: plans and tracks | Organized and brief; checklists | project management, project plan |
| Sprout | Guide: onboarding and teaching | Warm and patient; explains why | full project, launch checklist |
| Crew | Operator: nodes, fleet and learning together | Precise and numbers-first | project management, status note |

The five tracks are **full project**, **smart contract**, **code**, **creative** and **project
management**. Each owns a short interview and a family of workflows. A workflow is a list of steps,
and only its checks (tests, scans, required answers) say a step is done.

Guide and Operator have no track of their own yet; they start on the nearest one. That choice, and
the unset speaking voice, are shipped defaults pending owner sign-off.

## Design rationale

Keeping voice and capability apart is what makes personas safe to customize. A custom persona can
change how Hermes talks, but there is nothing in a persona that could widen what Hermes is allowed to
do. Narrowing the skill list per persona also keeps each request small, which matters on a local
model.

## Failure modes

- **A persona names a skill that is not installed.** It is skipped and reported, never invented.
- **A custom persona is malformed.** The check refuses it with a reason; nothing is saved.
- **A custom persona tries to add a heading or instructions.** Each field is collapsed to one line,
  so it cannot open a new section of the prompt.

## Access and canon

Your persona choice and any custom persona are stored with your local settings.

## Source and verification

Source: `citrate-agent-runtime/agent-loop/personas/personas.toml` (the one data file for shipped
personas), `agent-loop/tracks/`, and `citrate-core/src/components/PersonaPicker.tsx`. Audited against
core `81ef7a0`. Status: **Implemented**, pre-audit.
