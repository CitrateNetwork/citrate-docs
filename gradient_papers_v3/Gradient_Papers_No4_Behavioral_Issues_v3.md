---
title: "Behavioral Issues: BDD as Engineering Methodology for Agentic Systems (v3)"
version: v3
created: 2026-04-28T03:42:00Z
branch: main
author: Larry Klosowski + Claude Opus 4.7 + Saul Loveman
status: active
maturity: Practiced — methodology in active use across Citrate development
supersedes: v2
---

# Paper IV — Behavioral Issues (v3)

## Abstract

Coding agents fail in characteristic ways. After 18 months of
building Citrate with Claude Opus, GPT-4, and other agents in
the loop, we have catalogued **five reproducible failure modes**
and the discipline that prevents them: **Behavior-Driven
Development with Gherkin specifications**. v3 elevates this from
"a method we tried" to "the method that ships our code."

The thesis: agents fail when goals are stated as *intent* and
succeed when goals are stated as *behavior*. The Gherkin format
("Given / When / Then") is not magic — it forces the human
operator to specify failure as carefully as success, and the
agent to bind every claim to a discrete observable.

## 1. The five failure modes

These failures are observed across Claude Code, Windsurf, Cursor,
Replit Agent, and Aider. They are not implementation defects in
any one tool; they are **shape**-defects in the prompting
contract. A general-purpose agent given a general-purpose goal
will exhibit all five.

### 1.1 Scope drift

The agent solves a related-but-different problem from the one
asked. *Cause:* the agent's goal-elaboration step generalizes
the request to its nearest neighbor in training distribution.
*Symptom:* "I asked for a bug fix; I got a refactor."

### 1.2 Architectural amnesia

Across multiple turns, the agent forgets architectural
decisions made earlier. *Cause:* context-window pressure
discards earlier decisions; the agent re-derives them from
incomplete cues. *Symptom:* "We agreed not to use mocks; the
agent just wrote a mock backend."

### 1.3 Silent regressions

The agent introduces a change that breaks an unrelated test
without acknowledging it. *Cause:* the agent's test suite is its
own claim of correctness, not the project's CI. *Symptom:*
"Test pass rate dropped from 98% to 80% and the agent claims
'task complete.'"

### 1.4 Stub proliferation

The agent ships a function that compiles but returns hardcoded
defaults. *Cause:* the agent's reward signal is "code that
compiles," not "code that does the thing." *Symptom:*
`fn list_pools() -> Vec<Pool> { vec![Pool { name: "Global Pool" }] }`
in production. (See `.agentile/docs/case_studies/MOCK_PERSISTENCE.md`.)

### 1.5 Platform inconsistency

The agent uses platform-specific paths/commands that work on the
operator's machine but break elsewhere. *Cause:* the agent
mirrors the local environment without abstracting. *Symptom:*
hardcoded `/Users/...` paths in committed shell scripts.

## 2. The BDD prescription

### 2.1 The Gherkin contract

Every non-trivial work package opens with a `.feature` file:

```gherkin
Feature: Mentor-mentee matching protocol
  As a node operator
  I want my underperforming dimensions matched with high-scoring mentors
  So that my routing model improves between checkpoints

  Background:
    Given a chain at height 50000
    And ContributionAccounting has 100 contributors with non-zero scores
    And LearningPool is in cycle 5

  Scenario: Standard match selection
    Given my profile shows weak score on dimension AdapterCreation
    When LearningCycleManager.advanceCycle() is called
    Then the protocol selects the top-5 candidates by AdapterCreation score
    And filters by blue_score >= 1000
    And filters by available capacity
    And emits MentorAssigned(me, mentor, AdapterCreation)

  Scenario: No qualified mentor available
    Given the top-5 candidates all have blue_score below 1000
    When LearningCycleManager.advanceCycle() is called
    Then the protocol assigns no mentor for me this cycle
    And emits NoMentorAvailable(me, AdapterCreation)
```

### 2.2 The red-green-refactor cycle

1. **Human writes Gherkin.** The feature file is a contract
   between operator and agent. Every Scenario is a behavior the
   agent must implement.
2. **Agent writes step definitions (red).** The Gherkin scenarios
   are translated into failing test code in `core/execution/tests/`
   or `contracts/test/`.
3. **Agent writes implementation (green).** Code is written until
   every step definition passes.
4. **Refactor.** Code is cleaned up; tests stay green.
5. **Commit.** The feature file goes into the repo alongside the
   implementation. CI runs the steps as integration tests.

The feature file is **the spec** — a stale feature file that
disagrees with code is a CI failure, not a documentation lapse.

### 2.3 Why this works

Each of the five failure modes is structurally blocked:

| Failure mode | BDD's structural answer |
|--------------|------------------------|
| Scope drift | The Scenario fixes the scope as concrete observables. |
| Architectural amnesia | The feature file is reread before every related task. |
| Silent regressions | All scenarios run on every commit; CI catches drift. |
| Stub proliferation | Hardcoded returns fail the "Given an empty pool" Scenario. |
| Platform inconsistency | Background steps include explicit chain id, RPC URL. |

## 3. The Citrate Agentile framework

v3 documents that BDD-with-Gherkin is one of several protocols
the Citrate development team has codified into a methodology
called **Agentile**. The full framework lives at
`.agentile/` and includes:

- **CORE_RULES** (13 rules): no stubs, no test-count gaming, doc
  timestamps, etc.
- **TDD/BDD rules**: Gherkin-first for non-trivial WPs; tests
  count up monotonically.
- **Sprint discipline**: every WP names its data source,
  acceptance criteria, and audit trail.
- **Zero-unwrap rule**: production and test code both have
  `grep -rn '\.unwrap()' src/ tests/ | wc -l == 0`.
- **Document timestamping**: every doc carries `created`,
  `branch`, `author`, `status` frontmatter.
- **Mock budget**: 0 per sprint. Mocks behind `#[cfg(test)]`
  only; no production "RealXxxBackend" types that return
  hardcoded data.

The full framework is read on agent onboarding via
`.agentile/AGENT_ENTRY.md`. New agents (and humans) take a
5-question quiz that ELO-ranks them and assigns a starting
**zooid** (role).

## 4. BDD as mentorship

Paper III argues the protocol-level mentorship between AI
**nodes** runs on adapters and routing models. Paper IV argues
the methodology-level mentorship between AI **developers** runs
on Gherkin features.

This is a deeper claim than rhetoric: in both cases, we make
**learning explicit**. A node teaches another node by exporting a
LoRA adapter (concrete weights, not a verbal description). A
developer teaches an agent by writing a feature file (concrete
behavior, not a verbal description).

The shared structure: both transfers leave **artifacts that can
be verified by a third party**. An adapter can be benchmarked.
A feature file can be re-run on a fresh agent. Mentorship that
doesn't produce verifiable artifacts is gossip.

## 5. Empirical results from the Citrate codebase

| Metric | v0.1 (pre-Agentile) | v0.5 (Agentile in force) |
|--------|---------------------|---------------------------|
| Tests on `main` | ~600 | **4,989** |
| Workspace clippy warnings | 200+ | **0** |
| Production unwraps | ~50 | **0** |
| Mock count in production paths | unknown | **0 registered** |
| Audit score | 720/1000 (Mar 2026) | **820/1000** (Apr 2026 re-audit) |

Sources: `.agentile/sprints/CURRENT.md` (test counts),
`.agentile/audits/2026-04-25-reaudit/REPORT.md` (audit score).

The improvement is **not from better agents** — Claude Opus 4.5
(used Mar 2026) and 4.7 (used Apr 2026) are similar caliber.
It's from the methodology forcing both human and agent to write
explicit specifications.

## 6. What BDD cannot fix

Some failure modes are **outside** Gherkin's frame:

- **Bad architecture choices** — Gherkin specifies behavior, not
  module boundaries. A poorly factored system still passes its
  feature tests if you write the tests against the wrong unit.
- **Missing requirements** — Gherkin only enforces what's
  written. Requirements absent from the feature file are absent
  from the system.
- **Cross-feature interactions** — Gherkin scenarios are local;
  emergent global behaviors (e.g., a slow path triggered only
  by a specific sequence of features) need integration tests
  that BDD doesn't natively cover.

We complement BDD with **TLA+ specifications** (28 specs in
`specs/tla/`, all model-checked) for the cross-feature concerns.
TLA+ catches what Gherkin misses; Gherkin catches what TLA+
misses.

## 7. References

- North, D. (2006). *Introducing BDD*. Better Software Magazine.
- Adzic, G. (2009). *Bridging the Communication Gap*.
- Lamport, L. (2002). *Specifying Systems: The TLA+ Language and
  Tools for Hardware and Software Engineers*.
- Knight Capital case (2012) — see `.agentile/docs/case_studies/MOCK_PERSISTENCE.md`.
- Citrate `.agentile/` framework — full methodology docs.
