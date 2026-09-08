---
title: The Gherkin acceptance library
codex_slug: /research/bdd
tier: academic
org_scope: ~
source_kind: linked
source: citrate-chain/specs/gherkin/ + per-repo .agentile features
surfaces: [RES-bdd]
audited_against_sha: e68af83
created: 2026-06-17T00:00:00Z
author: Citrate team
status: Specified
---

This is the behavioral half of how Citrate pins down correctness: a library of Gherkin acceptance
specifications that say, in plain Given/When/Then steps, what each piece of the system must do before any
code is written. It is for researchers and reviewers who want to read the protocol as observable behavior.
We link the features here; we do not copy them.

## What it is

A Gherkin feature file states a behavior as a set of scenarios, each written in the same shape: a `Feature`
that names the surface, a `Background` that fixes the starting conditions, and one or more `Scenario` blocks
of `Given` a situation, `When` an action, `Then` an expected outcome. At Citrate the feature file is the
specification, not a description written after the fact. A feature file that disagrees with the code is a
continuous-integration failure, because the steps are run as integration tests on every commit.

The reason for working this way is that coding agents fail in recognizable patterns: they drift from the
agreed scope, they forget earlier architecture, they let regressions through quietly, they leave stubs in
place, and they make assumptions about the platform. Stating a work package as concrete observable behavior
blocks each of these. A scenario that begins `Given an empty pool` will fail any hardcoded stub return, and
a `Background` that pins the chain id and the RPC endpoint stops platform assumptions from drifting. The
methodology is argued in Gradient Paper No. 4, `Behavioral Issues`.

## How to use it

The cycle ties each feature to code and to a test, in order.

1. A person writes the Gherkin. The feature file is the contract between the operator and the agent; each
   scenario is a behavior to implement.
2. An agent writes the step definitions so the scenarios become failing tests, for example under
   `core/execution/tests/` or `contracts/test/`. They fail first, on purpose.
3. The agent writes the implementation until every step passes.
4. The code is refactored while the tests stay green.
5. The feature lands in the repository beside the implementation, and continuous integration runs the steps
   as integration tests from then on.

To read a feature, open the `.feature` file under the relevant repo's `specs/gherkin/` or `.agentile`
features directory and read its scenarios top to bottom; each one is a behavior the running system commits
to. To check that the code still honors a feature, run that repo's test suite, which executes the step
definitions.

## Reference

The largest single library is in `citrate-chain/specs/gherkin/`, with 31 feature files. A representative
scenario, abridged from `mentor_matching.feature`:

```gherkin
Feature: Mentor-mentee matching + adapter verification flow
  Background:
    Given the Citrate testnet (chain id 40204) is live
    And the inference-proof-verify precompile is dispatched at 0x0108
    And the trust floor is set to accuracy >= 0.30 (Q16: 19661)

  Scenario: Standard mentor match with adequate accuracy gap
    Given my profile shows a weak score on dimension AdapterCreation
    When LearningCycleManager.advanceCycle() is called
    Then the protocol selects the top candidates by AdapterCreation score
    And filters by blue_score above the floor
    And emits MentorAssigned(me, mentor, AdapterCreation)
```

The chain library spans these areas, named from the real feature files:

| Area | Example features |
|---|---|
| Credits and accounts | `token_transfer.feature`, `wallet_integration.feature` |
| Contracts and deploy | `contract_deploy.feature`, `model_deploy.feature` |
| Learning and mentorship | `learning_daemon.feature`, `mentor_matching.feature`, `belnap_aggregation.feature`, `dataparallel_training.feature` |
| Inference and routing | `model_inference.feature`, `inference_pool.feature`, `routing_model.feature`, `pipeline_parallel_inference.feature` |
| Gateway and billing | `gateway_inference.feature`, `gateway_batch.feature`, `gateway_api_key.feature`, `gateway_usage.feature`, `credit_billing.feature`, `x402_payment.feature` |
| Compute settlement | `computepool_settlement.feature` |
| Desktop flows | `assistant_pane_flow.feature`, `drawer_lifecycle.feature`, `modal_lifecycle.feature`, `toast_lifecycle.feature`, `scope_switch_flow.feature`, `batch_operation.feature` |
| Governance and safety | `role_escalation_timer.feature`, `school_safety.feature`, `listing_visibility.feature` |
| Research hypotheses | `hypothesis_h1.feature`, `hypothesis_h2.feature`, `hypothesis_h3.feature` |

The convention reaches across the federation, each repo keeping its behavior contracts next to its code:

- `citrate-chain/specs/gherkin/`: 31 features; step definitions in `core/execution/tests/` and
  `contracts/test/`.
- `citrate-agentile-archive/bdd/agent/`: the agent-harness contracts, grouped as `approval/`, `audit/`,
  `break_glass/`, `capsule_install/`, and `data_class/` (for example
  `low_risk_auto_approve.feature`, `single_security_officer.feature`, `no_read_up.feature`).
- `citrate-explorer/.agentile/specs/features/`: 17 features covering the explorer surfaces (for example
  `live-dag.feature`, `search.feature`, `authentication.feature`, `data-privacy-storage.feature`).
- `citrate-federation/.agentile/gtm-spine/features/`: 25 features for identity, console, sell, and
  inference sprints (for example `IDP-S3-wallet-linking.feature`, `SELL-S1-node-agent-mvp.feature`).
- `citrate-agent-runtime/capsules/*/gherkin/`: one feature per capsule (for example `hello`,
  `anchor-session`, `revoke-role`, `verify-provenance-chain`).
- `nist-agent/features/`: features grouped under `core/`, `chain/`, `capsule/`, `distribution/`,
  `overlays/`, and `surfaces/`.

A feature describes behavior, run as an executable acceptance test, while the [TLA+ corpus](/research/tla)
proves state-machine invariants with a model checker. Many features have a TLA+ counterpart for the same
surface; `belnap_aggregation.feature` lines up with `BelnapLattice.tla` and `ParaconsistentAggregation.tla`,
and `computepool_settlement.feature` with `GatewayBatchLifecycle.tla`. The engineering rules that make a
feature file mandatory are in [the rules](/methodology/rules).

## Design rationale

Writing the behavior first, then the test, then the code, is slower at the start of a work package and
cheaper across its life. The feature file gives the operator and the agent one artifact to agree on before
work begins, and because it is executed on every commit, it cannot quietly fall out of step with the code
the way prose documentation can. The cost is discipline: a behavior that is hard to state as a scenario is
usually a behavior that is not yet well understood, and the method forces that to surface early rather than
late.

## Access and canon

Academic tier. The features describe behavior over public addresses and the public testnet RPC; no keys or
credentials appear in them or on this page. We link the `.feature` files and their step definitions rather
than copy them, and show only an abridged illustrative scenario, so the files in the repositories remain the
truth.

## Source and verification

- Source: `citrate-chain/specs/gherkin/` (31 features) plus the per-repo libraries named above under
  `bdd/`, `.agentile/`, and `features/` directories. Methodology: Gradient Paper No. 4,
  `gradient_papers_v3/Gradient_Papers_No4_Behavioral_Issues_v3.md` (linked, not copied).
- Audited against SHA: `e68af83` (citrate-chain); per-repo libraries pinned at each repo's HEAD.
- Status: Specified, the features are written and run as acceptance tests in continuous integration; a
  feature with passing steps in CI is Verified for the surface it covers. The `.feature` files and their
  step definitions are the truth; this page links them.
