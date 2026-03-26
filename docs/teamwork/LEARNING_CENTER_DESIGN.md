# Learning Center — End-to-End Design Document

**Author:** Claude + Larry
**Date:** 2026-03-21
**Status:** DESIGN PHASE — Not yet implemented

---

## The Problem

The Citrate GUI currently has 12 tabs. They're organized for developers: wallet, DAG explorer, contracts, terminal. A teacher opening this app sees a blockchain IDE. They leave.

The Learning Center isn't another tab. It's a **mode** — a complete re-skin of the application that hides blockchain mechanics and surfaces what institutions care about:
- "How does my school earn money?"
- "How do students use AI safely?"
- "What is my node contributing to the network?"
- "How do I train a model for my curriculum?"

## Design Principles

1. **Two modes, one app** — "Explorer mode" (current: developer-focused) and "Learning mode" (new: institution-focused). Toggle in the sidebar. Same underlying infrastructure.
2. **Blockchain is invisible** — No transaction hashes in the Learning Center. No gas prices. "You earned 1,200 SALT today" not "block 14,523 mined reward 10 SALT tx 0x7a3f..."
3. **Agent-first** — The AI chat agent is the primary interface. "Help me set up a learning pool for my class" should work.
4. **Progressive disclosure** — Home user sees: join network → earn SALT → done. Teacher sees: join → create classroom → assign models → track students. Admin sees: join → manage nodes → view earnings → export reports.

---

## User Personas

### Persona 1: Home User ("Alex")
- Has a laptop or desktop
- Heard about Citrate, wants to earn SALT with idle compute
- Technical level: can install an app, but doesn't code
- **Journey:** Download → Install → One-click join → See earnings dashboard → Done

### Persona 2: Teacher ("Ms. Rivera")
- Has a classroom of 20 computers
- Wants students to learn about AI
- Needs to control what models students can access
- **Journey:** Download → Create classroom → Invite students → Deploy curriculum model → Monitor learning → View school earnings

### Persona 3: School Admin ("Mr.where Chen")
- Manages IT for the district
- Needs to justify the program to the school board
- Cares about: cost, security, compliance, ROI
- **Journey:** Review security docs → Approve pilot → Deploy to 10 machines → Monitor uptime + earnings → Generate reports for board

### Persona 4: Agent Developer ("Priya")
- Builds AI agents that use Citrate
- Needs SDK access, API docs, test environments
- **Journey:** Read SDK docs → Deploy agent → Test against learning pool → Publish

---

## Screen Architecture

### Mode Switch (Sidebar)

The sidebar gains a mode toggle at the top:

```
┌────────────────────┐
│  🔬 Explorer       │  ← Current mode (developer)
│  🎓 Learning       │  ← New mode (institution)
├────────────────────┤
│  [nav items...]    │
└────────────────────┘
```

When "Learning" mode is active, the sidebar navigation changes:

```
Learning Mode Sidebar:
┌────────────────────┐
│  🎓 LEARNING MODE  │
├────────────────────┤
│  🏠 Home           │  Dashboard with earnings + network health
│  🌐 Network        │  Join/leave learning pools, see peers
│  📚 Classroom      │  (Teachers only) Manage students + models
│  🤖 Models         │  Browse + deploy curriculum models
│  💬 Assistant       │  AI chat agent (reused from Explorer)
│  📊 Earnings       │  SALT earnings, contribution breakdown
│  ⚙️ Settings       │  Node config, power schedule, permissions
└────────────────────┘
```

Explorer Mode Sidebar (unchanged):
```
Explorer Mode Sidebar:
┌────────────────────┐
│  🔬 EXPLORER MODE  │
├────────────────────┤
│  Dashboard         │
│  Wallet            │
│  DAG Explorer      │
│  ... (all current tabs)
└────────────────────┘
```

---

## Screen Designs

### Screen 1: Home (Learning Mode Dashboard)

**What it shows:** The single most important metric for each persona.

```
┌─────────────────────────────────────────────────────┐
│  Welcome back, Alex                                  │
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│  │  1,247 SALT  │  │  12 Peers    │  │  99.2%     │ │
│  │  earned today │  │  connected   │  │  uptime    │ │
│  └──────────────┘  └──────────────┘  └────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Your Node is Contributing                       │ │
│  │  ████████████████████████░░░░  82% utilized      │ │
│  │                                                   │ │
│  │  Inference queries served today: 3,421            │ │
│  │  Adapters shared with network: 7                  │ │
│  │  Learning cycles completed: 4                     │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Earnings This Week          [View Details →]    │ │
│  │  ▂▃▅▇█▇▅  ← bar chart by day                    │ │
│  │  Mon Tue Wed Thu Fri Sat Sun                      │ │
│  │  Total: 8,729 SALT                                │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Network Activity (Live)                         │ │
│  │  ● Node A (you) ──── Node B                      │ │
│  │       \               /                           │ │
│  │        Node C ── Node D                           │ │
│  │  4 peers in your learning pool                    │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**For teachers:** Additional card: "Your Classroom — 18/20 students active, 3 models deployed"
**For admins:** Additional card: "District Overview — 47/50 nodes online, $2,340 earned this month"

### Screen 2: Network (Join/Manage Learning Pools)

**What it shows:** Available learning pools and how to join.

```
┌─────────────────────────────────────────────────────┐
│  Learning Pools                        [Create New] │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  🌍 Global Pool                    [Join]        │ │
│  │  Open to everyone. 1,247 participants.           │ │
│  │  Models: General NLP, Image Classification       │ │
│  │  Avg earnings: 200 SALT/day per node             │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  🏫 Lincoln High School District   [Join]        │ │
│  │  Restricted: requires invitation code.           │ │
│  │  12 nodes. Models: STEM Curriculum.              │ │
│  │  Avg earnings: 350 SALT/day per node             │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  🔬 AI Research Collective          [Request]    │ │
│  │  Application required. 89 nodes.                 │ │
│  │  Models: Protein folding, Climate prediction     │ │
│  │  Avg earnings: 500 SALT/day per node             │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ── Your Active Pools ──                            │
│  ✅ Global Pool — joined 3 days ago — 612 SALT earned│
└─────────────────────────────────────────────────────┘
```

**"Create New" flow (for teachers/admins):**
1. Name your pool
2. Set access: Open / Invitation Code / Application Required
3. Select models to include
4. Set compute requirements (min uptime, min hardware)
5. Deploy → smart contract created on-chain

### Screen 3: Classroom (Teacher View)

```
┌─────────────────────────────────────────────────────┐
│  Ms. Rivera's AP Computer Science         [Manage]  │
│                                                      │
│  Students (18/20 active)                             │
│  ┌──────────────────────────────────────────────┐   │
│  │ Name          │ Status  │ Queries │ Adapters │   │
│  │ ─────────────│─────────│─────────│──────────│   │
│  │ Sarah K.      │ 🟢 Active│  142    │  3       │   │
│  │ Marcus L.     │ 🟢 Active│  89     │  1       │   │
│  │ Aiden T.      │ 🔴 Offline│ 0      │  0       │   │
│  │ ...           │         │         │          │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Models Deployed                     [Deploy New]    │
│  ┌──────────────────────────────────────────────┐   │
│  │ 📗 STEM Tutor v2.1    │ Active  │ 890 queries│   │
│  │ 📕 Essay Reviewer v1.0 │ Active  │ 234 queries│   │
│  │ 📘 Math Helper v3.2    │ Pending │ —          │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  Learning Progress                                   │
│  ┌──────────────────────────────────────────────┐   │
│  │  Cycle 12 completed 2 hours ago               │   │
│  │  Network improved STEM model accuracy by 2.3% │   │
│  │  Best adapter: Sarah K. (+4.1% on algebra)    │   │
│  │  [View Full Report]                            │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### Screen 4: Models (Curriculum Model Browser)

```
┌─────────────────────────────────────────────────────┐
│  Model Library                     🔍 Search...     │
│                                                      │
│  Categories: [All] [STEM] [Language] [Arts] [Custom] │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  📗 STEM Tutor                                   │ │
│  │  General science + math tutoring model           │ │
│  │  Accuracy: 87.3%  │  Size: 2.1GB  │  ⭐ 4.7     │ │
│  │  Used by: 142 classrooms                         │ │
│  │  [Deploy to Classroom]  [Try It]  [View Details] │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌─────────────────────────────────────────────────┐ │
│  │  📕 Essay Reviewer                               │ │
│  │  English writing feedback and grammar correction │ │
│  │  Accuracy: 91.2%  │  Size: 1.4GB  │  ⭐ 4.5     │ │
│  │  Used by: 89 classrooms                          │ │
│  │  [Deploy to Classroom]  [Try It]  [View Details] │ │
│  └─────────────────────────────────────────────────┘ │
│                                                      │
│  ┌── Train Your Own ──────────────────────────────┐ │
│  │  Upload curriculum materials → Fine-tune a base │ │
│  │  model → Deploy to your classroom               │ │
│  │  [Start Training Wizard]                         │ │
│  └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Screen 5: Earnings (Contribution Breakdown)

```
┌─────────────────────────────────────────────────────┐
│  Earnings & Contributions                            │
│                                                      │
│  Total Earned: 24,721 SALT          [Withdraw →]    │
│  Staked: 32,000 SALT (stSALT)      [Manage Stake]  │
│                                                      │
│  ── Contribution Breakdown ──                        │
│  ┌──────────────────────────────────────────────┐   │
│  │  Validation          ████████░░░░  42%        │   │
│  │  Model Hosting       ██████░░░░░░  31%        │   │
│  │  Adapter Creation    ███░░░░░░░░░  14%        │   │
│  │  Data Provision      ██░░░░░░░░░░   9%        │   │
│  │  Governance          █░░░░░░░░░░░   4%        │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ── Earnings History (30 days) ──                    │
│  [line chart showing daily SALT earnings]            │
│                                                      │
│  ── Learning Cycle Rewards ──                        │
│  Cycle 12: +45 SALT (mentor bonus)                   │
│  Cycle 11: +30 SALT (participation)                  │
│  Cycle 10: +30 SALT (participation)                  │
└─────────────────────────────────────────────────────┘
```

---

## What Needs to Be Built

### Layer 1: Smart Contracts (On-Chain Primitives)

| Contract | Purpose | Interaction |
|----------|---------|-------------|
| **LearningPool.sol** | Create/join/leave learning pools. Tracks members, models, compute requirements. | GUI "Network" screen |
| **LiquidStakingPool.sol** | Deposit SALT → stSALT. Reward accrual. 7-day withdrawal. | GUI "Earnings" screen |
| **ContributionAccounting.sol** | 7-type contribution tracking. Score calculation. Reward distribution. | GUI "Earnings" breakdown |
| **NematocystSlashing.sol** | 3-tier graduated slashing with correlation multiplier. | Background (transparent to user) |
| **LearningCycleManager.sol** | On-chain learning cycle orchestration. Embedding commitments. Adapter records. | GUI "Network" cycle status |
| **ClassroomRegistry.sol** | Teacher creates classroom. Student enrollment. Model whitelist. | GUI "Classroom" screen |

### Layer 2: Tauri Backend (New IPC Commands)

| Command | Purpose | Screen |
|---------|---------|--------|
| `learning_get_pools` | List available learning pools | Network |
| `learning_join_pool` | Join a pool (stake SALT) | Network |
| `learning_leave_pool` | Leave a pool (unstake) | Network |
| `learning_create_pool` | Create a new pool | Network |
| `learning_get_cycle_status` | Current OODA cycle phase + metrics | Home |
| `learning_get_earnings` | Earnings breakdown by contribution type | Earnings |
| `learning_get_peers` | Active peers in your pools | Home/Network |
| `classroom_create` | Create a classroom (teacher only) | Classroom |
| `classroom_add_student` | Enroll student by invitation code | Classroom |
| `classroom_deploy_model` | Deploy model to classroom whitelist | Classroom |
| `classroom_get_stats` | Student activity + model usage | Classroom |
| `staking_deposit` | Deposit SALT → stSALT | Earnings |
| `staking_withdraw` | Request withdrawal | Earnings |
| `staking_get_balance` | stSALT balance + pending rewards | Earnings |

### Layer 3: Frontend (New React Components)

| Component | Location | Purpose |
|-----------|----------|---------|
| `LearningModeSwitch` | `shell/` | Toggle between Explorer and Learning mode |
| `LearningSidebar` | `shell/` | Learning-mode navigation |
| `LearningHome` | `features/learning/` | Dashboard with earnings, utilization, network viz |
| `NetworkPools` | `features/learning/` | Browse/join/create pools |
| `PoolCard` | `features/learning/` | Individual pool display |
| `CreatePoolWizard` | `features/learning/` | Multi-step pool creation |
| `Classroom` | `features/learning/` | Teacher classroom management |
| `StudentTable` | `features/learning/` | Student list with activity metrics |
| `ModelBrowser` | `features/learning/` | Curriculum model library |
| `TrainingWizard` | `features/learning/` | Upload curriculum → fine-tune → deploy |
| `EarningsDashboard` | `features/learning/` | Contribution breakdown + history chart |
| `StakingPanel` | `features/learning/` | Deposit/withdraw stSALT |
| `CycleStatus` | `features/learning/` | Live OODA cycle indicator |
| `PeerGraph` | `features/learning/` | Network topology visualization |

### Layer 4: SDK Extensions

| Method | Purpose |
|--------|---------|
| `sdk.learning.listPools()` | Get available learning pools |
| `sdk.learning.joinPool(poolId, stake)` | Join a pool |
| `sdk.learning.getCycleStatus(poolId)` | Current cycle phase |
| `sdk.learning.getContributions(address)` | Contribution scores |
| `sdk.staking.deposit(amount)` | Stake SALT |
| `sdk.staking.withdraw(shares)` | Request withdrawal |
| `sdk.staking.getBalance()` | stSALT balance |
| `sdk.classroom.create(name, config)` | Create classroom |
| `sdk.classroom.addStudent(code)` | Enroll by invite code |
| `sdk.classroom.deployModel(modelId)` | Deploy model to classroom |

### Layer 5: Node/Consensus Changes

| Change | Location | Purpose |
|--------|----------|---------|
| `learning_root` in Block header | `core/primitives/` | Persistent learning state at checkpoints |
| `LearningGossip` message type | `core/network/` | P2P embedding exchange |
| `AdapterOffer` message type | `core/network/` | Mentor → mentee adapter sharing |
| Checkpoint learning trigger | `node/src/producer.rs` | Trigger OODA cycle at BFT checkpoints |
| Learning state sync | `core/network/src/sync.rs` | Sync learning state from checkpoints |

---

## Onboarding Flows

### Flow A: Home User (Alex)

```
1. Download & Install (existing Tauri installer)
2. "What brings you here?"
   [🏠 Earn with idle compute]  [🎓 I'm a teacher]  [🔬 I'm a developer]
3. → Home user path:
   a. Create wallet (simplified — no seed phrase display, auto-backup)
   b. "Your node is starting..." (auto-start devnet or testnet)
   c. "Join the Global Learning Pool?" [Yes, join] [Maybe later]
   d. → Home dashboard showing earnings accumulating in real-time
4. Done in <5 minutes. No blockchain knowledge required.
```

### Flow B: Teacher (Ms. Rivera)

```
1. Download & Install
2. "What brings you here?" → [🎓 I'm a teacher]
3. → Teacher path:
   a. Create wallet (same simplified flow)
   b. "Create your classroom"
      - School name, class name
      - How many students?
      - Generate invitation codes (one per student, or one for all)
   c. "Choose models for your class"
      - Browse model library (pre-curated for education)
      - Deploy selected models (auto-IPFS + auto-register)
   d. "Share this code with your students: STEM-2026-ALPHA"
   e. → Classroom dashboard
4. Students install the app → enter invitation code → auto-join classroom pool
```

### Flow C: School Admin (Mr. Chen)

```
1. Receive pilot proposal from teacher
2. Review SCHOOL_PILOT.md security documentation
3. Download admin version (same app, admin role)
4. → Admin path:
   a. Create institutional wallet (multi-sig recommended)
   b. "Set up your district"
      - District name
      - Schools under management
      - Node deployment plan (which computers, what hours)
   c. Deploy nodes via MDM/manual install
   d. → District dashboard:
      - All schools, all nodes, uptime, earnings
      - Export CSV reports for school board
5. Generate quarterly report: "District earned X SALT, served Y queries, saved Z hours"
```

---

## Agent Integration

The AI assistant in Learning Mode has different tools than Explorer Mode:

### Learning Mode Agent Tools

| Tool | What It Does | Example Prompt |
|------|-------------|---------------|
| `join_pool` | Join a learning pool | "Help me join the Global Pool" |
| `create_classroom` | Set up a classroom | "Create a classroom for my AP CS class" |
| `deploy_model` | Deploy a model | "Deploy the STEM Tutor to my classroom" |
| `check_earnings` | Show earnings | "How much have I earned this week?" |
| `explain_concept` | Use deployed model | "Explain neural networks to a high schooler" |
| `train_model` | Start fine-tuning | "I want to train a model on my algebra curriculum" |
| `invite_students` | Generate invite codes | "Generate 25 invite codes for my class" |
| `show_progress` | Student progress | "Show me how Sarah is doing" |

### Existing Agent Tools (Reused from Explorer)

| Tool | Reuse |
|------|-------|
| `send_transaction` | For staking operations |
| `get_balance` | For earnings display |
| `deploy_contract` | For creating pools (advanced) |
| `run_inference` | For "Try It" on models |

---

## Scope of Work — Complete WP Breakdown

### Sprint LC-1: Foundation (Weeks 1-2, 34 pts)

| WP | Title | Pts | Description |
|----|-------|-----|-------------|
| LC.1.1 | Mode switching infrastructure | 8 | `LearningModeSwitch` component, `LearningSidebar`, routing by mode, persisted mode preference |
| LC.1.2 | Learning Home screen | 8 | Earnings summary cards, utilization bar, peer count, network viz placeholder |
| LC.1.3 | LearningPool.sol contract | 10 | Create/join/leave pools, member tracking, model whitelist, min stake |
| LC.1.4 | Tauri IPC for pools | 8 | `learning_get_pools`, `learning_join_pool`, `learning_leave_pool`, `learning_create_pool` |

**Acceptance:**
- [ ] Mode toggle works, navigation changes between Explorer and Learning
- [ ] Home screen shows live data (earnings, peers, utilization)
- [ ] LearningPool contract deployed and tested (10+ Forge tests)
- [ ] IPC commands return real data from on-chain state

### Sprint LC-2: Network & Pools (Weeks 3-4, 40 pts)

| WP | Title | Pts | Description |
|----|-------|-----|-------------|
| LC.2.1 | NetworkPools screen | 10 | Browse/filter pools, join with stake, create new pool wizard |
| LC.2.2 | CreatePoolWizard | 8 | Multi-step: name → access level → models → compute requirements → deploy |
| LC.2.3 | PeerGraph visualization | 8 | Force-directed graph of peers in your pool (reuse DAG viz library) |
| LC.2.4 | CycleStatus component | 6 | Live indicator: Observe/Orient/Decide/Act phase, countdown to next checkpoint |
| LC.2.5 | LearningGossip integration | 8 | Wire P2P learning messages into frontend status updates |

**Acceptance:**
- [ ] Can browse, filter, and join pools from the GUI
- [ ] Pool creation wizard deploys on-chain contract
- [ ] Peer graph shows real connected peers
- [ ] Cycle status updates live at each checkpoint

### Sprint LC-3: Classroom & Models (Weeks 5-6, 42 pts)

| WP | Title | Pts | Description |
|----|-------|-----|-------------|
| LC.3.1 | ClassroomRegistry.sol | 10 | Teacher creates classroom, generates invite codes, enrolls students, whitelists models |
| LC.3.2 | Classroom screen | 10 | Student table, model list, activity metrics, learning progress |
| LC.3.3 | Student join flow | 8 | Student enters invite code → auto-joins classroom pool → sees restricted model list |
| LC.3.4 | ModelBrowser screen | 8 | Curriculum model library with categories, ratings, "Try It" preview |
| LC.3.5 | TrainingWizard | 6 | Upload curriculum docs → select base model → configure LoRA → start training |

**Acceptance:**
- [ ] Teacher can create classroom and generate invite codes
- [ ] Students can join by code and see only whitelisted models
- [ ] Model browser shows curated education models
- [ ] Training wizard produces a deployable LoRA adapter

### Sprint LC-4: Earnings & Staking (Weeks 7-8, 36 pts)

| WP | Title | Pts | Description |
|----|-------|-----|-------------|
| LC.4.1 | LiquidStakingPool.sol | 10 | Deposit/withdraw with shares model, oracle reporting, 7-day lockup |
| LC.4.2 | EarningsDashboard screen | 8 | Contribution breakdown (7 types), history chart, cycle rewards |
| LC.4.3 | StakingPanel | 6 | Deposit SALT → stSALT, withdraw, show APY |
| LC.4.4 | ContributionAccounting integration | 8 | Auto-record contributions from inference, adapters, validation |
| LC.4.5 | Admin export | 4 | CSV/PDF report for school boards (earnings, uptime, queries served) |

**Acceptance:**
- [ ] stSALT share price increases with rewards
- [ ] Earnings screen shows real contribution breakdown
- [ ] Admin can export monthly report
- [ ] 7-day withdrawal lockup enforced

### Sprint LC-5: Onboarding & Polish (Weeks 9-10, 30 pts)

| WP | Title | Pts | Description |
|----|-------|-----|-------------|
| LC.5.1 | Persona-based onboarding | 10 | "What brings you here?" → three paths (home/teacher/admin) |
| LC.5.2 | Agent Learning tools | 8 | `join_pool`, `create_classroom`, `deploy_model`, `check_earnings`, `invite_students` |
| LC.5.3 | SDK learning extensions | 6 | `sdk.learning.*`, `sdk.staking.*`, `sdk.classroom.*` methods |
| LC.5.4 | E2E integration tests | 6 | Full user journeys: home user join, teacher classroom, admin report |

**Acceptance:**
- [ ] New user completes onboarding in <5 minutes
- [ ] Agent can handle all Learning mode tasks via natural language
- [ ] SDK methods documented with examples
- [ ] 3 E2E tests pass (home, teacher, admin journeys)

---

## Total Scope

| Sprint | Weeks | Points | Deliverable |
|--------|-------|--------|-------------|
| LC-1: Foundation | 1-2 | 34 | Mode switch, home screen, pool contract, IPC |
| LC-2: Network | 3-4 | 40 | Pool browser, create wizard, peer graph, cycle status |
| LC-3: Classroom | 5-6 | 42 | Classroom contract, teacher view, student join, model browser |
| LC-4: Earnings | 7-8 | 36 | Staking, earnings dashboard, contribution tracking, admin reports |
| LC-5: Polish | 9-10 | 30 | Onboarding paths, agent tools, SDK, E2E tests |
| **TOTAL** | **10 weeks** | **182 pts** | **Complete Learning Center** |

---

## Dependencies on Federation Plan

The Learning Center GUI depends on the FEDERATION sprint backend work:

| Learning Center WP | Requires | From Sprint |
|--------------------|----------|-------------|
| LC.2.4 CycleStatus | Checkpoint learning trigger | FEDERATION WP-F.3 |
| LC.2.5 LearningGossip integration | P2P learning messages | FEDERATION WP-F.2 |
| LC.3.5 TrainingWizard | LoRA adapter generation | Existing (built) |
| LC.4.1 LiquidStakingPool | — | FEDERATION WP-F.8 (can be shared) |
| LC.4.4 ContributionAccounting | — | FEDERATION WP-F.9 (can be shared) |

**Strategy:** Run FEDERATION (backend) and LC (frontend) sprints in parallel. Shared contracts (LiquidStakingPool, ContributionAccounting) are built once, used by both.

---

## What This Achieves

When both Sprint FEDERATION and Sprint LC are complete:

1. **Home user (Alex)** downloads the app, clicks "Earn with idle compute", joins the Global Pool, and sees SALT accumulating. Zero blockchain knowledge required.

2. **Teacher (Ms. Rivera)** creates a classroom, deploys curriculum models, invites students, and watches her students' inference queries improve the network's STEM model through federated learning.

3. **Admin (Mr. Chen)** sees a district dashboard with 47 nodes earning SALT. He exports a PDF for the school board showing $2,340 earned in the first month and 12,000 student queries served.

4. **Developer (Priya)** uses `sdk.learning.getCycleStatus()` to build a real-time dashboard showing the paraconsensus aggregation happening across the network.

The blockchain is invisible. The learning is visible. The money flows.
