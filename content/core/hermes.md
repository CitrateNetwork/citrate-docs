---
title: Hermes, the agent in Citrate Core
codex_slug: /core/hermes
tier: public
source_kind: authored
source: citrate-core/src/agent, src-tauri/src/hermes.rs; citrate-agent-runtime/agent-sidecar, agent-loop
surfaces: [CORE-agent]
audited_against_sha: 81ef7a0
status: Implemented (pre-audit), arrives with Citrate Core 0.5.0
created: 2026-10-04T00:00:00Z
branch: hup/n7-docs-almanac-retro
author: Larry Klosowski + Claude Opus 5.5
nav_order: 8
---

Hermes is the agent that runs inside Citrate Core, on your own machine and on a model your machine
can hold. This page is for members who want to know what Hermes can do in Citrate Core 0.5.0, what it
asks you before it acts, and where the technical detail lives.

## What it is

Hermes proposes; you decide. It can read, plan, search, write inside folders you grant, run a
contract through tests and audits, and prepare an on-chain action. Every effect on the world, such
as a signature, a transaction, a file write outside a granted folder, a shell command, or a skill or
memory it wants to keep, waits behind a Human In Control (HIC) gate. Nothing is reported as done
unless a check outside the model, such as a passing test or an audit report, says so.

Hermes runs as a separate process next to the app, the sidecar. The sidecar holds no key and cannot
sign. When Hermes needs a signature it asks Citrate Core, and Core opens the same signing ceremony
you already use for every other approval. The chat in the app, the `citrate-agent` command line, and
an MCP client can all look at the same Hermes session.

## How to use it

1. Open the **Agent** surface. Hermes starts with the model your machine was matched to during
   onboarding (the tier probe picks it; a small machine gets a small model).
2. Ask for what you want in plain language. For a longer piece of work, pick a track (full project,
   smart contract, code, creative, or project management) and answer its short interview.
3. Pick a voice if you like, at the end of onboarding or in **Settings** under **Hermes, persona**.
   Hermes ships with six [personas](/core/personas); each changes tone and the skills on offer, never
   the approval rules.
4. Watch the approvals. An action that needs you appears as a card that says what will happen.
   Allow it once, or deny it.
5. Turn on the extras you want in **Settings**. Web search, page reading, the managed browser, the
   shell and the [node MCP server](/core/node-mcp) are all off until you turn them on.

## Reference

| Ability | Default | Where it is described |
|---|---|---|
| Chat with a local model | on | [Getting started](/core/getting-started) |
| Folder grants: read and write only inside folders you choose | no folder granted | [agent-grants](https://github.com/CitrateNetwork/citrate-agent-runtime/tree/main/agent-grants) |
| Web search, page reading and the decide step | off | [HERMES_WEB_SEARCH_AND_DECIDE](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/HERMES_WEB_SEARCH_AND_DECIDE.md) |
| The Browser pop-out, where you watch Hermes browse | off | [HERMES_BROWSER](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/HERMES_BROWSER.md) |
| Sign-in to sites you chose, a bounded number of times | no budget granted | [WEB_SIGNING_BUDGETS](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/WEB_SIGNING_BUDGETS.md) |
| Tools from MCP servers you add | none added | [MCP_USER_SERVERS](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/MCP_USER_SERVERS.md) |
| Skills, and learning a new one from verified work | reviewed set installed | [Skills](/core/skills) |
| Deploying a contract through the deploy gate | deploy waits for a READY verdict and your approval | the DeployGate section of [formal/README](https://github.com/CitrateNetwork/citrate-core/blob/main/src-tauri/formal/README.md); deploy gas from the faucet (off by default): [FAUCET_IN_APP](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/FAUCET_IN_APP.md) |
| Connecting your other machines | off | [Fleet wizard](/core/fleet-wizard) |

## Design rationale

Open agents fail in familiar ways: they grade their own work as a success, they act before asking,
and they hang without saying why. Hermes is built against each of those. The model never decides
that a step is done; verifiers do. The sidecar cannot sign at all, so a mistake in the agent cannot
move value without you. Each risky ability starts off, so a member who never opens Settings gets the
same app as before plus a better chat.

## Failure modes

- **A locked account.** Any request that would sign fails closed. Unlock and ask again.
- **Untrusted content.** Once a session has read a web page or MCP output, it is marked as tainted.
  A tainted session cannot keep a skill or memory, and its effectful calls always ask you.
- **The sidecar stops.** Core restarts it under a supervisor. A request that never reached a
  decision is not signed later; Hermes has to ask again.
- **A small model.** Small models make more tool-call mistakes. Hermes on a small machine uses a
  guided mode with fewer tools at a time.

## Access and canon

Hermes runs on your hardware. Prompts, files and memories stay on your machine unless you turn on a
feature that says it sends something out (web search sends the query; the Jina reader sends the URL).
Every decision you make on an approval card is written to a local decision log.

## Source and verification

Source: `citrate-core` (the app and Core side) and `citrate-agent-runtime` (the sidecar, the loop,
the tools). Audited against core `81ef7a0`. Status: **Implemented**, pre-audit, arriving with
Citrate Core 0.5.0. The agent loop, folder grants, sign-in budgets, the deploy gate and the spend
budget are each **Verified** as a TLA+ model checked with TLC at small bounds; that checks the
design, not the code.
