---
title: Hermes skills, and how Hermes learns
codex_slug: /core/skills
tier: public
source_kind: authored
source: citrate-core/skills.lock, src-tauri/skills, docs/HERMES_LEARNING.md; citrate-agent-runtime/agent-loop/src/skills.rs, agent-learn
surfaces: [CORE-agent]
audited_against_sha: 81ef7a0
status: Implemented (pre-audit), arrives with Citrate Core 0.5.0; publishing to the network is off
created: 2026-10-04T00:00:00Z
branch: hup/n7-docs-almanac-retro
author: Larry Klosowski + Claude Opus 5.5
nav_order: 10
---

A skill is a short written method that Hermes can load when a task calls for it, such as how to
review a contract or how to write a status note. This page is for members who want to know where
Hermes's skills come from, how to see them, and how Hermes may add one of its own.

## What it is

Each skill is a folder with a `SKILL.md` file: a name, a one-line description, and the method in
plain text. Hermes keeps a short index of the skills on offer and loads the full text of one only
when it needs it, which keeps each request small enough for a local model.

Skills come from three places:

- **The reviewed set.** Third-party skills from Trail of Bits, frontend-skills, agentile-skills and
  the open-source hermes-agent project, each reviewed one by one before it ships. The review records
  the source commit and a hash of every file in `skills.lock`. On 2026-10-01 the lock held 296
  reviewed skills, of which 240 ship. Scripts and other executables are stripped from every skill
  that ships.
- **Citrate skills.** Four skills written for Citrate itself: paraconsensus, the precompiles, Belnap
  aggregation and sidecar consensus.
- **Skills Hermes learned.** Skills that you accepted from Hermes's own verified work (below).

## How to use it

1. In the **Agent** surface, ask Hermes which skills it has. A [persona](/core/personas) narrows
   the list to the skills that fit its role.
2. Ask for the work, not the skill. Hermes loads a skill when the task matches its description.
3. To teach Hermes, open **What Hermes learned**, then **Teach Hermes**. Write a task and the phrases
   a correct answer must contain. Hermes runs it on your local model.
4. If every check passed, Hermes may propose keeping a skill or a memory. Review the card, which shows
   the content and every check result, then choose **Accept** or **Reject**.

## Reference

| Rule | What it means for you |
|---|---|
| Only verified work | A proposal must come from a run whose checks all passed. Hermes saying it succeeded never counts. |
| Nothing is kept without you | Every proposal waits for Accept or Reject, and the decision is logged first. |
| Untrusted input blocks learning | A session that read a web page or MCP output cannot propose anything. |
| Contradictions are shown, not merged | A memory that disagrees with one you have is kept alongside it as unresolved until you choose **Keep this one**. |
| Publishing is a signature | Sending a skill to the on-chain SkillRegistry needs one approval per publish through the signing ceremony. It is off in this release. |

The technical flow is in
[HERMES_LEARNING.md](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/HERMES_LEARNING.md),
and the review of every third-party skill is in the core repo under
[.agentile/skill-intake](https://github.com/CitrateNetwork/citrate-core/tree/main/.agentile/skill-intake).

## Design rationale

Open agents tend to grade their own runs as a success and then save the mistake as a skill. Hermes
separates the two: a check outside the model decides whether a run passed, and you decide whether
anything is kept. Third-party skills are pinned by hash so that a later change upstream cannot
change what Hermes reads without a new review.

## Failure modes

- **A skill does not load.** The loader is strict and refuses a malformed skill instead of guessing.
  The skill stays out of the index.
- **A skill file changed on disk.** It no longer matches its recorded hash and is refused.
- **A proposal from an unverified run.** It is refused before it reaches you.

## Access and canon

Skills and learned memories live in your app data folder on your machine. Nothing leaves it unless
you publish, and publishing is off in this release.

## Source and verification

Source: `citrate-core/skills.lock`, `src-tauri/skills/`, `docs/HERMES_LEARNING.md`, and in
`citrate-agent-runtime` the skill loader (`agent-loop/src/skills.rs`) and `agent-learn`. Audited
against core `81ef7a0`. Status: **Implemented**, pre-audit. Skill persistence is **Verified** as a
TLA+ model (`SkillPersistence.tla`) checked with TLC at small bounds. "Teach Hermes" has not yet been
run in a packaged build.
