# TLA+ Specification Gaps

> Audit date: 2026-03-22
> Auditor: Claude Opus 4.6
> Scope: All state machines referenced in `citrate_v0.01.1/` checked against `specs/tla/` and `gui/citrate_gui_v2/specs/`

## Existing Coverage (28 specs, 27 in SPEC_INDEX + 1 unlisted)

| State Machine | Spec File | Status |
|---|---|---|
| LiquidStakingPool withdrawal queue lifecycle | `specs/tla/LiquidStaking.tla` | COVERED -- models Deposit, RequestWithdrawal (with delay), ClaimWithdrawal, AccrueRewards. 7 invariants including WithdrawalDelayEnforced and TotalSharesConsistent. |
| ClassroomRegistry enrollment lifecycle | `specs/tla/ClassroomRegistry.tla` | COVERED -- models CreateClassroom, EnrollStudent, UnenrollStudent, whitelist ops, code rotation. 8 invariants including EnrollmentBounded and StudentInOneClass. |
| Block producer checkpoint trigger | `specs/tla/StrobilationCheckpoint.tla` | COVERED -- models embedding submission, quorum-gated aggregation, normal vs checkpoint block production. 7 invariants including StateRootIndependent (Theorem 3). |nt
| LearningCycleManager full lifecycle | `specs/tla/LearningCycleLifecycle.tla` | COVERED -- models Open->Collecting->Aggregating->AdapterGen->Finalized with 9 invariants. |
| ContributionAccounting scoring | `specs/tla/ContributionAccounting.tla` | COVERED -- models RecordContribution, FundPool, DistributeRewards with 7 invariants. |

## Identified Gaps

### GAP-1: OnboardingFlow.tla missing `persona_selection` step

**Severity**: SHOULD (state machine change)

**Details**: The implementation (`gui/citrate_gui_v2/src/features/onboarding/types.ts`) defines 14 onboarding steps including `persona_selection` between `security_confirmation` and `environment_selection`. The TLA+ spec (`specs/tla/OnboardingFlow.tla`) defines only 13 steps -- it omits `persona_selection` entirely.

The `Steps` set in the spec jumps directly from `security_confirmation` to `environment_selection`, and the `SecurityConfirmationComplete` action transitions directly to `environment_selection`. In the actual implementation, the flow is: `security_confirmation` -> `persona_selection` -> `environment_selection`.

The `UserPersona` type (`'home' | 'teacher' | 'developer'`) introduces a branch point similar to the auth method selection, where the chosen persona may affect downstream behavior. The spec does not model this branching.

**Impact**: The spec cannot verify that persona selection is mandatory before environment selection, or that the chosen persona is preserved through the remaining steps. If downstream steps depend on persona (e.g., different onboarding content for teachers vs developers), the spec misses that constraint.

**Fix**: Add `persona_selection` to the `Steps` set, add a `persona` variable with values `{"none", "home", "teacher", "developer"}`, insert the step between `security_confirmation` and `environment_selection`, and add invariants:
- `PersonaChosenBeforeEnvironment`: step past persona_selection implies persona != "none"
- `PersonaConsistency`: persona is immutable once set

### GAP-2: ContractCaller error/retry behavior -- no spec needed

**Severity**: N/A

**Details**: `ContractCaller` (`gui/citrate_gui_v2/src-tauri/src/services/contract_caller.rs`) is a stateless utility that encodes ABI calls and sends them over JSON-RPC. It has no internal state machine -- each call is independent. It does not maintain retry state, queues, or sessions.

Per the formal verification rules, API endpoint changes are MAY-level and do not require TLA+ specs. A stateless request-response pattern has no state space to model-check.

**Recommendation**: No TLA+ spec needed. The existing 29 unit tests in the module are sufficient.

### GAP-3: QueryCache TTL and invalidation -- no spec needed

**Severity**: N/A (MAY at most)

**Details**: `QueryCache` (`gui/citrate_gui_v2/src-tauri/src/services/cache.rs`) is a simple TTL-based in-memory cache with get/set/invalidate/prune operations. It is thread-safe via RwLock.

This is infrastructure code, not a consensus, economic, or protocol state machine. The formal verification rules classify this as MAY at most. The existing 8 unit tests (including concurrent access and expiry tests) provide adequate coverage.

**Recommendation**: No TLA+ spec needed. If cache-related bugs surface in production, a lightweight spec modeling TTL expiry, concurrent read/write, and prefix invalidation could be added, but it is not a priority.

### GAP-4: LearningCycleManager `phaseStartBlock` tracking -- spec update needed

**Severity**: SHOULD (state machine change to economic contract)

**Details**: The `LearningCycleManager.sol` contract is being updated to track `phaseStartBlock` on each state transition (Task 3 of this work session). The existing `LearningCycleLifecycle.tla` spec does not model block-height-dependent phase durations or phase start tracking.

**Impact**: Without modeling `phaseStartBlock`, the spec cannot verify that:
- Phase start blocks are set on every transition
- Phase start blocks are monotonically non-decreasing
- Phase durations can be computed from `phaseStartBlock` + duration

**Recommendation**: After the contract change lands, update `LearningCycleLifecycle.tla` to add a `phaseStartBlock` variable and invariants verifying it is set on every state transition and is monotonically non-decreasing. This is a SHOULD-level update.

## Summary

| Gap ID | Component | Severity | Action |
|---|---|---|---|
| GAP-1 | OnboardingFlow.tla | SHOULD | Add `persona_selection` step and persona variable |
| GAP-2 | ContractCaller | N/A | No spec needed (stateless utility) |
| GAP-3 | QueryCache | N/A | No spec needed (infrastructure, not protocol) |
| GAP-4 | LearningCycleLifecycle.tla | SHOULD | Update after `phaseStartBlock` contract change |

**Net result**: 1 spec needs updating (OnboardingFlow), 1 spec will need updating after current work (LearningCycleLifecycle), 2 components do not warrant specs. No BLOCKER-level gaps found.
