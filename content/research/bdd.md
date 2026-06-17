---
title: The Gherkin BDD Feature Library
codex_slug: /research/bdd
tier: academic
org_scope: ~
source_kind: linked
source: citrate-chain/specs/gherkin/ (per-repo specs/gherkin/ + features/)
surfaces: [RES-bdd]
audited_against_sha: 03d7851
status: draft
created: 2026-06-15T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# The Gherkin BDD Feature Library

> Citrate's behavior contracts: human-written Gherkin `.feature` files that
> define what each work package must do, before any code is written. For
> researchers and reviewers who want to read the protocol as observable
> behavior. Codex **links** the features; it does not copy them.

## Overview

Behavior-Driven Development is a first-class engineering methodology at Citrate,
codified in the Agentile framework and argued in **Gradient Paper IV**
([`Behavioral Issues`](../../gradient_papers_v3/Gradient_Papers_No4_Behavioral_Issues_v3.md)).
Every non-trivial work package opens with a `.feature` file written in Gherkin
(`Feature` / `Background` / `Scenario` / `Given`/`When`/`Then`). The feature
file **is the spec**: a stale feature file that disagrees with code is a CI
failure, not a documentation lapse.

The motivation is that coding agents fail in characteristic, reproducible ways
(scope drift, architectural amnesia, silent regressions, stub proliferation,
platform inconsistency). Stating a work package as concrete observable behavior
structurally blocks each failure mode, e.g. a `Given an empty pool` scenario
fails any hardcoded stub return, and `Background` steps pin the exact chain id
and RPC URL so platform assumptions can't drift.

## Index / structure

Features are grouped by surface area. The primary library lives in
[`citrate-chain/specs/gherkin/`](../../../citrate-chain/specs/gherkin/) (31
`.feature` files), spanning:

| Area | Example features |
|------|------------------|
| **Tokens & wallet** | `token_transfer.feature`, `wallet_integration.feature` |
| **Contracts & deploy** | `contract_deploy.feature`, `model_deploy.feature` |
| **Learning & mentorship** | `learning_daemon.feature`, `mentor_matching.feature`, `belnap_aggregation.feature`, `dataparallel_training.feature` |
| **Inference & routing** | `model_inference.feature`, `inference_pool.feature`, `routing_model.feature`, `pipeline_parallel_inference.feature` |
| **Gateway & billing** | `gateway_inference.feature`, `gateway_batch.feature`, `gateway_api_key.feature`, `gateway_usage.feature`, `credit_billing.feature`, `x402_payment.feature` |
| **Compute settlement** | `computepool_settlement.feature` |
| **GUI flows** | `assistant_pane_flow.feature`, `drawer_lifecycle.feature`, `modal_lifecycle.feature`, `toast_lifecycle.feature`, `scope_switch_flow.feature`, `batch_operation.feature` |
| **Governance & safety** | `role_escalation_timer.feature`, `school_safety.feature`, `listing_visibility.feature` |
| **Research hypotheses** | `hypothesis_h1.feature`, `hypothesis_h2.feature`, `hypothesis_h3.feature` |

A representative scenario (mentor matching), abridged from the corpus:

```gherkin
Feature: Mentor-mentee matching protocol
  Scenario: Standard match selection
    Given my profile shows weak score on dimension AdapterCreation
    When LearningCycleManager.advanceCycle() is called
    Then the protocol selects the top-5 candidates by AdapterCreation score
    And filters by blue_score >= 1000
    And emits MentorAssigned(me, mentor, AdapterCreation)
```

## How features map to specs and tests

The BDD cycle (Paper IV §2.2) ties each feature to code and tests:

1. **Human writes Gherkin**, the feature file is the operator↔agent contract;
   each `Scenario` is a behavior to implement.
2. **Agent writes step definitions (red)**, scenarios become failing tests in
   `core/execution/tests/` or `contracts/test/`.
3. **Agent writes implementation (green)**, code until every step passes.
4. **Refactor**, clean up, tests stay green.
5. **Commit**, the `.feature` file lands in the repo beside the implementation;
   **CI runs the steps as integration tests** on every commit.

Relationship to the other research surfaces: Gherkin features describe
*behavior* (executable acceptance criteria run as tests), while the
[TLA+ corpus](./tla.md) proves *state-machine invariants* with a model checker.
Many features have a corresponding TLA+ spec for the same surface (e.g.
`belnap_aggregation.feature` ↔ `BelnapLattice` / `ParaconsistentAggregation`;
`computepool_settlement.feature` ↔ `GatewayBatchLifecycle`).

## Where features live (per repo)

- **citrate-chain:** `specs/gherkin/*.feature` (31 features). Step definitions
  live alongside tests in `core/execution/tests/` and `contracts/test/`.
- Per-repo convention: each repo keeps its behavior contracts under
  `specs/gherkin/` (or a `features/` directory) next to the code they govern.

## Source & verification

- **Source:** `citrate-chain/specs/gherkin/` plus per-repo `specs/gherkin/` /
  `features/`. Methodology: Gradient Paper IV (`citrate-docs/gradient_papers_v3/`).
- **Audited against SHA:** `03d7851` (citrate-chain).
- **Rule 9 (link, don't copy):** the `.feature` files and their step
  definitions are the truth; Codex links them and shows only an abridged
  illustrative scenario.
- **No secrets.** Features describe behavior over public addresses and the
  public testnet RPC only; no keys or credentials appear here.
