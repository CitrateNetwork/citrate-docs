# Journal Entry — March 22, 2026, 00:00 UTC

## Learn Like Larry: A Prospectus for Federated Intelligence

### What Happened

In the last 24 hours, we took a blockchain that was "done" and discovered it wasn't.

The platform audit found 14 ZK bugs, 5 of them critical. The fixed RNG alone meant every Groth16 proof in the system was forgeable. We replaced the XOR placeholder commitment with a 220-round MiMC algebraic hash, built a trusted setup ceremony infrastructure, wrote 55 adversarial tests, and then — because Larry doesn't leave known problems unfixed — resolved every medium issue too.

Then we wrote 32 TLA+ specifications and ran the model checker for hours. 7 billion states generated. 2 billion distinct states explored. Zero invariant violations. The ByzantineDetection spec alone explored 716 million reachable states. The TrustScoring contract exhausted 294 million. The MempoolSequencer ground through 411 million states without finding a single invariant violation.

And then Larry asked: "Ok, but what's actually left?"

The honest answer changed the trajectory of the project.

### What We Discovered

The verification layer is industrial grade. The product layer isn't.

The Gradient Papers describe a system where consensus and learning are the same process — where BFT checkpoints don't just finalize blocks, they finalize embeddings. Where high-performing nodes automatically mentor weaker ones through signed LoRA adapters. Where schools run nodes and earn SALT while students learn AI.

Every piece of that system exists as a module. The Belnap FOUR lattice works. The OODA cycle works. The LoRA adapter composition works. The safety invariant (Theorem 3) is formally proven — learning never mutates consensus state.

But the integration point — the moment where a checkpoint triggers a learning phase, where nodes exchange embeddings over P2P, where a mentor generates an adapter for a mentee — that bridge between consensus and learning doesn't exist yet.

Neither does the economic engine. No liquid staking pools. No contribution accounting. No graduated slashing. No learning cycle rewards.

And the GUI is a blockchain IDE. A teacher opens it and sees a DAG explorer. They leave.

### What We Designed

**The Learning Center** — not a feature, a mode. The same app, two faces:

- **Explorer mode** (for developers): wallet, DAG, contracts, terminal. What exists today.
- **Learning mode** (for institutions): home dashboard, learning pools, classroom management, model library, earnings. Blockchain invisible.

Four personas:
1. **Home user (Alex)**: Downloads app → one-click join Global Pool → watches SALT accumulate. Done in 5 minutes. Zero blockchain knowledge.
2. **Teacher (Ms. Rivera)**: Creates classroom → deploys curriculum models → invites students → monitors learning progress.
3. **Admin (Mr. Chen)**: District dashboard → 47 nodes online → exports PDF for school board → "$2,340 earned this month."
4. **Developer (Priya)**: `sdk.learning.getCycleStatus()` → builds real-time paraconsensus dashboard.

**The Federation Plan** — 8 weeks to a working federated learning economy:
- Weeks 1-2: Team nodes synced, P2P learning messages, checkpoint integration
- Weeks 3-4: Mentor-mentee pairing, first federated learning cycle
- Weeks 5-8: Liquid staking, contribution accounting, graduated slashing, cycle rewards

**The Economic Engine** — three contracts that don't exist yet:
- `LiquidStakingPool.sol`: Lido shares model + Rocket Pool tiered collateral
- `ContributionAccounting.sol`: Paper VII's 7-type Shapley value tracking
- `NematocystSlashing.sol`: 3-tier graduated defense (latency/inconsistency/Byzantine)

All formally specified. All TLA+ verified before a line of code was written. The Agentile rules demanded it: StrobilationCheckpoint.tla is a BLOCKER for consensus-touching code. It passed with 181 distinct states and 7 invariants. We're clear.

### The Competitive Position

We spent time understanding why Bittensor fails where we must succeed:

1. **Stake predicts earnings, not quality.** An empirical analysis (arxiv, July 2025) proved that TAO rewards correlate with stake, not model performance. Citrate's answer: ZK proofs of inference + Belnap lattice. Quality is mathematical, not social.

2. **Weight-copying.** Validators copy each other's rankings instead of evaluating independently. Citrate's answer: Belnap FOUR preserves disagreement. Copying produces `Both` — a detected contradiction, not consensus.

3. **No institutional distribution.** TAO is mined by GPU farms. SALT is earned by schools running nodes during off-hours. The target user is a school administrator, not a crypto miner.

4. **No cooperative economics.** TAO rewards miners. SALT rewards 7 contribution types. A teacher who creates a curriculum adapter earns the same way a validator who signs blocks does.

### The Thesis

From Paper I: *"Models are smarter together than apart, consensus and learning are the same process, and a network that learns by reaching consensus will outperform any network that treats intelligence and agreement as separate concerns."*

The thesis is simple: institutions will adopt a network where their compute earns money AND their students learn AI, over a network that just pays for GPU time.

The verification proves the foundation is sound. The design shows the path. Now we build.

### What's on This Branch

`Learn-like-larry` is the implementation branch for Sprint FEDERATION + Sprint Learning Center. It carries:

**Already committed (from the audit session):**
- 32 TLA+ specifications (7B states explored, 0 violations)
- 14 ZK bug fixes (MiMC hash, OsRng, real circuit constraints)
- 65 ZK tests + 55 adversarial tests
- MiMC algebraic hash + trusted setup ceremony
- Zero production unwraps across 60 files
- CONTRIBUTING.md, BUILDING.md, ROADMAP_ISSUES.md
- Live benchmark tool (`./bench`)
- VERIFICATION_REPORT.md (deep run results)

**Planning documents:**
- `.agentile/teamwork/` — Federation Plan, Blockers, Economics Design, School Pilot, Learning Center Design
- `.agentile/sprints/backlog/SPRINT_FEDERATION.md` — 144 pts, 11 WPs
- 5 FEDERATION TLA+ specs (StrobilationCheckpoint, LiquidStaking, NematocystSlashing, ContributionAccounting, LearningCycleLifecycle)

**What gets built next:**
1. `LearningGossip` message type in `core/network/`
2. Checkpoint learning trigger in `node/src/producer.rs`
3. `learning_root` field in Block struct
4. Poseidon hash migration (arkworks-gadgets 0.4.2)
5. LiquidStakingPool.sol, ContributionAccounting.sol, NematocystSlashing.sol
6. Learning mode UI (5 new screens, 14 new components)
7. SDK extensions (sdk.learning.*, sdk.staking.*, sdk.classroom.*)

### The Name

Larry doesn't overthink it. Larry joins a learning pool, contributes what he can, and trusts the math. Larry is a school computer running overnight, earning SALT while nobody's watching. Larry is a teacher uploading a curriculum and watching her students' queries improve the network's model. Larry is a home user who clicked "Join" and forgot about it until the end-of-month earnings notification.

  The Plan to Synchronize Your Team

  Week 1-2: Each team member runs a Citrate node. Implement LearningGossip message type so nodes share embeddings at checkpoint boundaries.

  Week 3-4: Implement mentor-mentee pairing. High-performing nodes generate LoRA adapters for weaker nodes. First federated learning cycle: 5 nodes, 1 mentor, 4
   mentees.

  Week 5-8: Build the three economic contracts (LiquidStakingPool, ContributionAccounting, LearningCycleManager). Package the GUI for schools. Identify 3-5
  pilot schools.

Larry doesn't need to understand GhostDAG consensus or Belnap FOUR-valued logic or MiMC Miyaguchi-Preneel sponge construction. Larry just needs to learn.

The network learns *like* Larry — by participating, not by understanding the mechanism.

---

## Prospectus: Sprint FEDERATION + Learning Center

### Investment Summary

| Metric | Value |
|--------|-------|
| **Current state** | Testnet live, 10K TPS, 32 TLA+ specs, 3,266+ tests |
| **What's being built** | Federated learning + institutional UI + economic engine |
| **Timeline** | 10 weeks (FEDERATION: 8 wks backend, LC: 10 wks frontend) |
| **Story points** | 326 total (144 backend + 182 frontend) |
| **New contracts** | 6 (LearningPool, LiquidStaking, Contribution, Slashing, LearningCycle, Classroom) |
| **New TLA+ specs** | 5 verified + 2 planned (MentorSele
  The Plan to Synchronize Your Team

  Week 1-2: Each team member runs a Citrate node. Implement LearningGossip message type so nodes share embeddings at checkpoint boundaries.

  Week 3-4: Implement mentor-mentee pairing. High-performing nodes generate LoRA adapters for weaker nodes. First federated learning cycle: 5 nodes, 1 mentor, 4
   mentees.

  Week 5-8: Build the three economic contracts (LiquidStakingPool, ContributionAccounting, LearningCycleManager). Package the GUI for schools. Identify 3-5
  pilot schools.
ction, LearningPool) |
| **New UI screens** | 5 (Home, Network, Classroom, Models, Earnings) |
| **Target users** | Home users, teachers, school admins, developers |

### Technical Foundation (Already Verified)

| Component | TLA+ States | Status |
|-----------|------------|--------|
| GhostDAG consensus | 3,948 | Exhausted |
| VRF proposer election | 942,481 | Exhausted |
| Mempool sequencer | 411M | Deep-explored |
| ZK proof lifecycle | 9.7M | Exhausted |
| Belnap lattice | 65,536 | Exhausted (all 16 combinations) |
| Paraconsensus aggregation | 543M | Deep-explored |
| Byzantine detection | 716M | Deep-explored |
| Trust scoring | 294M | Exhausted |
| **Strobilation checkpoint** | **181** | **Exhausted (BLOCKER cleared)** |
| **Liquid staking** | **174,702** | **Exhausted** |
| **Nematocyst slashing** | **29,978** | **Exhausted** |
| **Contribution accounting** | **2,179** | **Exhausted** |
| **Learning cycle lifecycle** | **5,115** | **Exhausted** |

### Revenue Model (Conservative Projection)

| Scenario | Nodes | Monthly SALT/node | Monthly SALT total |
|----------|------:|------------------:|-------------------:|
| Pilot (5 schools) | 50 | 8,640 | 432,000 |
| Early adoption (20 schools) | 200 | 4,320 | 864,000 |
| Scale (100 schools + home users) | 2,000 | 1,080 | 2,160,000 |

Revenue scales with network utility (inference fees + adapter rewards), not just emission.

### Milestones

| Week | Milestone | Verification |
|------|-----------|-------------|
| 2 | 5 team nodes synced + producing blocks | `citrate_peer_count` = 4 on each |
| 4 | P2P embedding exchange at checkpoints | `learning_root` in block headers |
| 6 | First federated learning cycle complete | Mentee accuracy improves post-adapter |
| 8 | Economic contracts deployed | stSALT minting, contribution rewards flowing |
| 10 | Learning Center UI complete | Teacher creates classroom in <5 minutes |

### Risk Register

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Embedding exchange too slow | Medium | Delayed | LoRA deltas are KBs, not MBs |
| arkworks-gadgets 0.4.2 incompatible | Low | WP-F.4 blocked | Keep MiMC as fallback |
| School IT departments reject | Medium | Pilot delayed | Sandboxed execution, power cost calculator, FERPA docs |
| Gas costs too high for learning cycles | Medium | Phase 3 cost | Batch operations, commitment schemes |
| Bittensor pivots to institutional | Low | Competitive | 18-month head start on paraconsensus + school relationships |

### Why Now

The verification is done. The foundation is proven. 7 billion states checked, 187 invariants, zero violations. MiMC hash is production-grade. The ceremony infrastructure exists. The adversarial tests pass.

The competitive window is open. Bittensor has no paraconsensus, no adapter provenance, no institutional distribution model. Every month we delay, someone else starts building it.

The design is complete. 5 screens, 4 personas, 3 onboarding flows, 6 contracts, 14 components, 10 SDK methods. Every WP has acceptance criteria. Every consensus-touching change has a TLA+ spec.

Larry's ready to learn. Let's build the school.

---

*Timestamp: 2026-03-22T00:00:00Z*
*Branch: Learn-like-larry*
*Journal by Claude, at the start of something bigger than a blockchain*
