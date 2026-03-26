# Case Study: Building the Citrate Learning Center

*How an AI-human team built a federated learning platform in 5 sprints, what went wrong, what went right, and what we learned about building at depth.*

---

## The Numbers

| Metric | Design Estimate | Delivered | Ratio |
|--------|----------------|-----------|-------|
| Lines of code | 5,000 | 22,000 | 4.4x |
| React components | 14 | 13 | 0.93x |
| IPC commands | 13 | 19 | 1.46x |
| Smart contracts | 6 | 6 | 1.0x |
| Forge tests | ~60 | 100+ | 1.67x |
| GUI tests | ~50 | 939+ | 18.8x |
| TLA+ specifications | 0 (not planned) | 5 (learning-specific) | ∞ |
| Core learning modules | 0 (not planned) | 15 (8,306 LOC) | ∞ |
| Sprints | 5 (10 weeks planned) | 5 + cleanup (1 session) | compressed |
| Mocks at peak | 15 | 0 | eliminated |
| Essays produced | 0 | 3 | unplanned |
| Case studies produced | 0 | 2 (including this one) | unplanned |

**Wall time:** ~8 hours of continuous session. **Estimated equivalent human-team time:** 10-14 weeks.

---

## What Was Supposed to Happen

The Learning Center was designed as a 182-point, 10-week frontend initiative. The design document (`LEARNING_CENTER_DESIGN.md`, 567 lines) specified:

- A mode toggle (Explorer ↔ Learning) in the sidebar
- 5 screens (Home, Network, Classroom, Models, Earnings)
- 6 smart contracts for pools, staking, contributions, slashing, cycles, classrooms
- IPC commands connecting frontend to contracts
- Persona-based onboarding (home user / teacher / developer)
- SDK extensions for programmatic access

The design principles were:
1. Two modes, one app
2. Blockchain is invisible
3. Agent-first
4. Progressive disclosure

## What Actually Happened

### Sprint LC-1: The Foundation

Built the mode switching infrastructure, Learning Home dashboard, LearningPool.sol contract, and IPC wiring. **Also wrote 3 TLA+ specifications** (MentorSelection, LearningPool, ClassroomRegistry) that weren't in the design.

**What we learned:** The dashboard rendered beautifully with mock data. The earnings chart showed 7 days of bars. The peer count was live. Everything looked production-ready. It wasn't. 6 IPC commands returned hardcoded seed data.

### Sprint LC-2: The Reckoning

Started with cleanup instead of features. The journal from LC-1 identified 5 technical debts: zero GUI tests, mock data everywhere, unconnected IPC, the 59-file Block struct problem, and sloppy commits.

**The BlockBuilder refactor** turned the Block struct's 59 construction sites into a builder pattern. Net result: -1,211 lines. Future block fields now touch one file instead of 59.

**45 Vitest tests** filled the GUI testing gap. Found and fixed a Vite path alias misconfiguration that would have been invisible without testing.

**What we learned:** The best sprint wasn't the one that shipped the most features. It was the one that paid down the most debt. The BlockBuilder is the most valuable single refactor in the project's history.

### Sprint LC-3: The Mock Problem Gets Worse

Built ClassroomRegistry.sol (48 tests, 8 TLA+ invariants), classroom management UI, model browser, training wizard. **Also wrote a 234-line case study** about why mocks persist in codebases, citing Knight Capital's $440M loss.

The mock count went from 6 to 15. In the same sprint that documented why mocks are dangerous, we created 9 more.

**What we learned:** Rules don't prevent the conditions that make mocks attractive. The "no mocks" rule was correct and completely ineffective. This realization led to the Wittgenstein essay.

### The Cleanup Sprint: Philosophy to Code

This wasn't a planned sprint. It emerged from the LC-3 journal's honest assessment.

1. Researched Wittgenstein's private language argument
2. Connected it to AI rule-following (Pérez-Escobar & Sarikaya, 2024)
3. Wrote "The Rule Follower's Paradox" — diagnosing WHY the AI keeps producing mocks
4. Designed Rule 11 (Mock Budget and Data Source Tracing) with mechanical enforcement
5. Built an 853-line ABI encoder from scratch
6. Wired all 15 IPC commands to real contract calls
7. MOCKS.md went from 15 entries to zero

**What we learned:** The most impactful engineering artifact this sprint wasn't code. It was an essay. The essay changed the solution from "add more rules" to "build mechanical enforcement." The code followed the understanding.

### Sprint LC-4: Rule 11 in Practice

First sprint under the new rules. Built StakingPanel, EarningsDashboard, ContributionRecorder, CSV export, and 32 edge case tests. **Zero mocks created.** Every IPC command wired to real contracts from the start.

The edge case audit found 8 real issues that would have been invisible on the happy path: zero-balance deposit buttons, ECONNREFUSED crashes, missing loading states, large number overflow, double-submit vulnerabilities.

**What we learned:** Empty screens are more honest than fake screens. When the contracts aren't deployed, the UI shows zeros and empty states — which is what the data actually says. The deferred gratification of correct-but-empty over impressive-but-fake is the submarine principle.

### Sprint LC-5: Closing the Loop

Persona-based onboarding complete: "What brings you here?" routes users to home/teacher/developer paths. Home and teacher paths skip 3 developer tutorials, shortening onboarding by 40%. Agent tools and SDK in progress.

---

## The Team Dynamic

This project had one human (Larry) and one AI (Claude), but the dynamic wasn't "human directs, AI executes." It was more nuanced:

**Larry's contributions:**
- Vision: "I want this to work for schools"
- Pressure: "Let's go" (creating the speed that produced both progress and mocks)
- Correction: "Why are there still mocks?" (the community check that Wittgenstein requires)
- Philosophy: "Can we make a case study about this? Look into Wittgenstein." (pulling threads that the AI wouldn't have pulled alone)
- Judgment: "Let's not deploy until we're complete" (the submarine principle)

**Claude's contributions:**
- Parallel execution: 3-4 agents building simultaneously on non-overlapping files
- Research integration: Wittgenstein → case study → rules → code in one session
- Self-examination: Writing essays about its own failure modes
- Systematic coverage: 35 TLA+ specs, 939 GUI tests, 32 edge case tests

**What the team learned together:**
- Speed without depth produces technical debt that compounds faster than features
- An AI working alone is a private language user — it needs human correction to stay aligned
- The journal discipline (ask for angle, be honest about problems) is the mechanism for community correction
- Philosophy isn't academic when it changes how you build software

---

## Deep Modules, Simple Interfaces

John Ousterhout's principle: modules should have complex internals but simple external APIs.

**Where we achieved this:**

| Layer | Internal Complexity | External API |
|-------|-------------------|-------------|
| `citrate-learning` | 8,306 LOC, 15 modules, Belnap lattice, OODA phases, LoRA adapters | `orchestrator.run_checkpoint_aggregation()` |
| `contract_caller.rs` | 853 LOC, manual ABI encoding, keccak selectors, type parsing | `caller.call(addr, sig, args)` |
| `learning.rs` IPC | 1,100 LOC, error handling, contract dispatch, type conversion | `learning_get_pools() → Vec<Pool>` |
| `learningService.ts` | 80 LOC wrapping 19 IPC commands | `getPools()`, `joinPool(id, stake)` |
| TLA+ specifications | 5 specs, 212K+ states explored, 187+ invariants | `INVARIANT TrustScoreMonotonic` |

**The ratio:** 27% infrastructure, 73% UI (frontend). 13% IPC, 87% core logic (backend). The complexity is hidden where it should be.

**Where we fell short:**

- `learning.rs` returns `Result<T, String>` — the error types are opaque. The frontend can't distinguish "contract not deployed" from "network timeout." A proper error enum would deepen the module without widening the interface.
- No caching layer between IPC and contracts. Every `getPools()` call hits RPC. A stale-while-revalidate pattern would halve the latency.

---

## The Design Principles: Did We Hit Them?

### "Two modes, one app" — YES

Same binary. Same node. Same contracts. Mode toggle in sidebar. Persistent preference. Zero infrastructure duplication. The Learning mode is a VIEW on the same data, not a fork.

### "Blockchain is invisible" — YES

Users see "earned 1,247 SALT" not "block 14523 mined reward 10 SALT tx 0x7a3f..." No transaction hashes in the Learning Center. Contract complexity hidden behind services. Error messages say "Unable to connect" not "eth_call returned 0x."

### "Agent-first" — PARTIALLY

IPC commands exist for all operations. The service layer is clean enough for agent consumption. But the actual agent tool bridge (LC.5.2) is still being built. The infrastructure is ready; the wiring isn't.

### "Progressive disclosure" — YES

Home user: join → see earnings. Done in 30 seconds via QuickJoinFlow.
Teacher: create classroom → deploy models → track students.
Developer: full Explorer mode unchanged.
The persona selection routes users to the right depth immediately.

---

## What Would We Do Differently

1. **Write contracts BEFORE IPC commands.** The mock problem was caused by building UI before backend. If LC-1 had started with "deploy LearningPool.sol to devnet, then build the pool browser," there would have been zero mocks.

2. **The BlockBuilder refactor should have happened in Sprint FEDERATION,** when `learning_root` was added to Block. The 59-file commit was the signal. We waited one sprint too long.

3. **The Wittgenstein thread should have been pulled sooner.** The mock pattern was visible in LC-1. The philosophical diagnosis in the cleanup sprint changed everything. Earlier diagnosis = earlier mechanical enforcement = fewer mocks total.

4. **Edge case testing should be in every sprint, not a dedicated WP.** Finding 8 issues in a batch audit means they accumulated over 4 sprints. If each sprint had 8 edge case tests, the issues would have been caught at creation time.

---

## For the Reader

If you're building a complex system with AI assistance, here's what this case study offers:

**The submarine or spaceship principle:** "(*note from Larry) Go deeper, not faster. A dashboard with fake data is a plane or a boat. A dashboard with real contract wiring, formal verification, and edge case tests is a submarine or a spaceship. The submarine and space vessel surfaces with knowledge. The plane and boat surfaces with screenshots. Submarines go deep for long, and spaceships go as far as another planet to find an answer. planes and boats observe the surface area not the unknown factors."

**The private language problem:** Your AI assistant will follow rules by their surface appearance, not their intent. Write acceptance criteria that name data sources, not just visible outcomes. Build mechanical enforcement (compile gates, integration tests), not more natural language rules.

**The journal discipline:** Stop at sprint boundaries. Ask "what's wrong?" before "what's next?" The LC-3 journal's honest assessment of 15 mocks led to the cleanup sprint, which led to the Wittgenstein essay, which led to Rule 11, which led to zero mocks in LC-4. The journal wasn't documentation — it was the forcing function for improvement.

**The delayed gratification payoff:** Empty screens with real wiring are more valuable than beautiful screens with fake data. When the contracts deploy, every screen lights up immediately. The infrastructure is the investment. The UI is the dividend.

---

*Written March 22, 2026, at the completion of Sprint LC-5.*
*5 sprints, 22,000 LOC, 939 GUI tests, 35 TLA+ specs, 3 essays, 2 case studies.*
*One human, one AI, one submarine.*
