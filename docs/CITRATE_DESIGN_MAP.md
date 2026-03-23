# Citrate Blockchain: Design Map & Product Overview

**Version:** 0.3.0 | **Date:** March 2026 | **Audience:** Frontend team, designers, product managers, and external partners

---

## 1. What Is Citrate?

Citrate is an **AI-native Layer-1 blockchain** that makes AI models first-class on-chain citizens. Unlike traditional blockchains that bolt on AI as an afterthought, Citrate was designed from the ground up so that deploying, running, and monetizing AI models is as natural as deploying a smart contract on Ethereum.

### Core Value Proposition

| For Users | For Developers | For Model Creators | For Compute Providers |
|-----------|---------------|-------------------|----------------------|
| Run AI models trustlessly | EVM-compatible smart contracts | On-chain model registry with provenance | Earn SALT by providing GPU/CPU |
| Desktop wallet with embedded node | TypeScript, Python, & CLI SDKs | Monetization via marketplace | Heartbeat-monitored liveness |
| Visual DAG explorer | Foundry toolchain for contracts | Verifiable inference with ZK proofs | Dispute resolution on-chain |
| Conversational AI agent built in | OpenAI/Anthropic-compatible API | IPFS-backed weight storage | Pooled compute via ComputePool |
| Learning Center for education | 41 TLA+ formal specs | Learning cycles with Belnap logic | Verified execution via ComputeVerifier |

### The Token: SALT

- **Symbol:** SALT
- **Total Supply:** 1,000,000,000 (1 billion)
- **Decimals:** 18
- **Uses:** Gas fees, model inference payments, staking, governance

---

## 2. How It Works (Non-Technical)

### The DAG: Not a Chain, a Web

Traditional blockchains produce one block at a time in a single line. Citrate uses a **Directed Acyclic Graph (DAG)** structure called **GhostDAG**, which allows multiple blocks to be produced simultaneously. Think of it as a highway with many lanes instead of a single-lane road.

```
Traditional Blockchain:     Citrate DAG:

[A] → [B] → [C] → [D]     [A] → [B] ──→ [E] → [G]
                                ↘ [C] ↗        ↗
                                  [D] ──────→ [F]
```

**Key benefits:**
- **Faster:** Multiple blocks produced in parallel
- **Fairer:** No wasted work from concurrent miners
- **Safer:** Harder to attack than linear chains

### AI Models as First-Class Assets

On Citrate, an AI model is a registered, versioned, on-chain asset with:
- **Identity** - Unique model ID derived from content hash
- **Ownership** - Linked to a wallet address
- **Provenance** - Full deployment/update history on-chain
- **Weights** - Stored on IPFS, referenced by content ID (CID)
- **Access Control** - Public, private, paid, or whitelisted
- **Marketplace** - Listed, priced, reviewed, and traded

---

## 3. Product Map: What Exists Today

### 3.1 Desktop Application (Citrate Core)

A native desktop application built with **Tauri** (Rust backend + React frontend) that bundles a full blockchain node inside a polished GUI.

#### Navigation Structure (11 Tabs)

```
Sidebar
├── Blockchain
│   ├── Dashboard          ← Home/overview
│   ├── Wallet             ← Send, receive, manage accounts
│   └── DAG Visualization  ← Interactive 3D graph
│
├── AI & Models
│   ├── Chat               ← AI agent conversation
│   ├── Models             ← Deploy, browse, run inference
│   └── GPU Compute        ← GPU job management
│
└── Developer
    ├── Contracts           ← Write, compile, deploy Solidity
    ├── Studio              ← File explorer + code editor
    ├── Terminal            ← Built-in terminal
    ├── IPFS                ← Decentralized storage
    └── Settings            ← Node control, network, config
```

#### Feature Status Matrix

| Feature | Status | Description |
|---------|--------|-------------|
| Dashboard | Complete | Node stats, block height, peers, mempool, wallet summary, recent blocks |
| Wallet | Complete | Create/import accounts, send SALT, session management, mnemonic backup |
| DAG Visualization | Complete | Interactive force-directed graph, click blocks for details, auto-refresh |
| AI Chat Agent | Complete | Multi-provider LLM (local Qwen 2.5 / OpenAI / Anthropic), tool approvals |
| Model Manager | Partial | UI complete, deploy/list/inference; backend integration in progress |
| Contracts | Complete | Foundry-backed compile, deploy, read/write, event logs |
| Developer Studio | Complete | File explorer + Monaco editor + output logs |
| Terminal | Complete | Full PTY terminal via xterm.js |
| Settings | Complete | Node start/stop, environment switching, AI config, factory reset |
| Onboarding | Complete | 12-step guided setup flow |
| GPU Compute | Complete | ComputeMarketplace, ComputeVerifier, HeartbeatMonitor, DisputeResolution, ComputePool |
| Learning Center | Complete | LearningPool, ClassroomRegistry, LearningCycleManager, ContributionAccounting |
| IPFS Storage | Partial | Basic daemon control, file upload/pin |

#### Embedded Node

The desktop app runs a **full Citrate node** inside the application:
- Produces blocks every 2 seconds
- Executes EVM transactions
- Stores state in RocksDB
- Distributes block rewards
- Serves JSON-RPC on port 8545
- Connects to P2P network

#### Onboarding Flow (12 Steps)

```
1. System Readiness Check
2. Identity Selection (Privy social login OR traditional)
3. Authentication
4. Device Binding
5. Wallet Creation/Import
6. Mnemonic Backup Confirmation
7. Network Selection (devnet/testnet/mainnet)
8. Node Bootstrap
9. AI Model Setup (download local or configure API key)
10. Interactive Tutorial
11. Hello World Contract Deploy
12. Ready!
```

### 3.2 Block Explorer

Web-based blockchain explorer for browsing blocks, transactions, and accounts.

| Aspect | Detail |
|--------|--------|
| Stack | Next.js + PostgreSQL 15 |
| Database | Indexer continuously syncs chain state |
| Ports | Web: 3000, Indexer: internal |
| Status | Basic — blocks, transactions, accounts |

### 3.3 Smart Contracts (On-Chain)

31 Solidity contracts deployed on-chain via Foundry, organized into four domains:

#### AI & Marketplace (8 contracts)

| Contract | Purpose |
|----------|---------|
| **ModelRegistry** | Core model registration, ownership, versioning |
| **ModelMarketplace** | Buy/sell model access, 2.5% fee, reviews |
| **ModelAccessControl** | Granular permissions (owner, delegate, whitelist) |
| **InferenceRouter** | Route inference requests to models, pricing |
| **LoRAFactory** | Create fine-tuned model variants |
| **AgentDecisionRegistry** | On-chain agent decision audit trail |
| **SpecRegistry** | Specification registration and versioning |
| **X402Paywall** / **X402Facilitator** | HTTP 402 paywall for model access |

#### Compute Marketplace (5 contracts)

| Contract | Purpose |
|----------|---------|
| **ComputeMarketplace** | Job listing, matching, escrow-based payments |
| **ComputeVerifier** | Verified compute execution (challenge-response) |
| **ComputePool** | Pooled compute resources with worker management |
| **HeartbeatMonitor** | Provider liveness monitoring and auto-slashing |
| **DisputeResolution** | On-chain dispute arbitration for compute jobs |

#### Learning Center (5 contracts)

| Contract | Purpose |
|----------|---------|
| **LearningPool** | Paraconsistent learning pools with Belnap lattice |
| **LearningCycleManager** | OODA-based learning cycle orchestration |
| **ClassroomRegistry** | Classroom creation, enrollment, mentor assignment |
| **ContributionAccounting** | Contribution tracking and reward distribution |
| **NematocystSlashing** | Biologically-inspired slashing for bad actors |

#### Staking & Infrastructure (6 contracts)

| Contract | Purpose |
|----------|---------|
| **LiquidStakingPool** | Liquid staking with stSALT token |
| **WrappedSALT** | ERC-20 wrapped SALT for DeFi compatibility |
| **IPFSIncentives** | Reward IPFS nodes for hosting model weights |
| **ColorCirclesNFT** | Achievement/ownership NFTs |
| **Counter** | Simple demo/test contract |

### 3.4 Developer SDKs

Three SDKs for building on Citrate:

#### Official TypeScript SDK (`@citrate/sdk` v0.3.0)
```
npm install @citrate/sdk
```
- Model deployment & inference
- Account management (create, import, sign)
- Smart contract interaction (deploy, call, read)
- DAG statistics & block queries
- IPFS artifact pinning
- **Learning Center** — `sdk.learning` (pools, cycles, contributions)
- **Staking** — `sdk.staking` (stake, unstake, pending withdrawals)
- **Classrooms** — `sdk.classrooms` (create, enroll, manage)
- **Compute Marketplace** — `sdk.compute` (jobs, providers, pools, disputes)
- 248 integration tests passing

#### Alternative JavaScript SDK (`citrate-js` v0.1.3)
- Lower-level crypto utilities
- WebSocket streaming for inference
- React hooks (`useCitrateClient`, `useModelDeployment`, `useInference`)
- Shamir secret sharing for key management

#### Python SDK (`citrate-sdk` v0.1.0)
```
pip install citrate-sdk
```
- Full model lifecycle (deploy, infer, list)
- Pydantic data models
- Encryption support (AES-256-GCM)

### 3.5 CLI Tools

| Tool | Binary | Purpose |
|------|--------|---------|
| **Node** | `citrate` | Run blockchain node (devnet/testnet/mainnet) |
| **CLI** | `citrate-cli` | Account, model, contract, network commands |
| **Wallet** | `wallet` | Dedicated wallet (create, import, send, balance) |

### 3.6 Developer Tools Suite

| Tool | Port | Purpose |
|------|------|---------|
| Citrate Studio | 3001 | Web IDE with Monaco editor, visual blockchain monitor |
| Debug Dashboard | 3003 | Real-time transaction monitor, gas analytics |
| VS Code Extension | N/A | IntelliSense, deployment commands, snippets |
| API Testing Suite | CLI | RPC endpoint testing, benchmarking |

### 3.7 Testnet Faucet

REST service for distributing test SALT tokens:

```
POST /faucet { "address": "0x..." }  →  10 SALT
GET  /status                         →  Network info
```
- 24-hour cooldown per address
- IP rate limiting
- Runs on port 3001

---

## 4. Network Environments

| Network | Chain ID | RPC Port | Mining | Purpose |
|---------|----------|----------|--------|---------|
| **Devnet** | 1337 | 8545 | Enabled (auto) | Local development |
| **Testnet** | 1338 | 18545 | Enabled | Public testing |
| **Mainnet** | TBD | TBD | PoS/VRF | Production |

### Pre-Funded Devnet Accounts

| Address | Balance | Purpose |
|---------|---------|---------|
| `0x1111...1111` | 1 ETH in SALT | Testing |
| `0xf39F...2266` | 10,000 ETH | Forge deployer |
| `0xfcad...377c` | 10,000 ETH | Recovered deployer |

---

## 5. User Journeys

### Journey 1: First-Time User

```
Download App → Onboarding (12 steps) → Dashboard
  ↓
Create Wallet → Receive SALT from faucet → View balance
  ↓
Chat with AI Agent → "Deploy a hello world contract"
  ↓
Agent writes, compiles, deploys → View contract on dashboard
```

### Journey 2: Model Creator

```
Train model locally → Export to ONNX/PyTorch format
  ↓
Open Models tab → Deploy Model (name, version, weights)
  ↓
Weights uploaded to IPFS → Model registered on-chain
  ↓
Set pricing & access control → List on Marketplace
  ↓
Earn SALT from inference requests
```

### Journey 3: Developer

```
Install SDK → Connect to devnet
  ↓
Deploy smart contract (Foundry or SDK)
  ↓
Register AI model → Run inference via RPC
  ↓
Build dApp that calls both contracts + AI
  ↓
Test on testnet → Deploy to mainnet
```

### Journey 4: Compute Provider

```
Register as provider → Stake SALT collateral
  ↓
Join ComputePool → HeartbeatMonitor tracks liveness
  ↓
Accept compute jobs → Execute verified workloads
  ↓
ComputeVerifier validates results → Earn SALT rewards
  ↓
If disputed → DisputeResolution arbitrates on-chain
```

### Journey 5: Learner / Educator

```
Create classroom → Set curriculum, invite learners
  ↓
LearningPool manages knowledge aggregation (Belnap lattice)
  ↓
OODA-based learning cycles → Observe, Orient, Decide, Act
  ↓
ContributionAccounting tracks participation → Earn rewards
  ↓
MentorSelection assigns qualified mentors based on trust scores
```

### Journey 6: AI Consumer

```
Browse Model Marketplace → Find model by category/rating
  ↓
Purchase access (pay SALT) → Run inference
  ↓
Verify proof of inference → Use result in dApp
```

---

## 6. API Surface (For Website/Docs Reference)

### JSON-RPC (Port 8545)

**Standard Ethereum Methods:**
- `eth_chainId`, `eth_blockNumber`, `eth_gasPrice`
- `eth_getBalance`, `eth_getTransactionCount`, `eth_getCode`
- `eth_sendRawTransaction`, `eth_sendTransaction`
- `eth_call`, `eth_estimateGas`
- `eth_getBlockByNumber`, `eth_getBlockByHash`
- `eth_getTransactionByHash`, `eth_getTransactionReceipt`

**Citrate AI Methods:**
- `citrate_deployModel` - Register AI model on-chain
- `citrate_runInference` - Execute model inference
- `citrate_getModel` - Query model metadata
- `citrate_listModels` - Browse model registry
- `citrate_updateModel` - Update model metadata
- `citrate_getDagTips` - Get current DAG tips
- `citrate_getBlueSet` - Query GhostDAG blue set
- `citrate_getMempoolSnapshot` - View pending transactions

**MCP REST API (Port 3000):**
- `/v1/models` - Model registry
- `/v1/chat/completions` - OpenAI-compatible inference
- `/v1/embeddings` - Embedding generation
- `/v1/messages` - Anthropic-compatible inference

### WebSocket (Port 8546)
- Real-time block notifications
- Transaction subscription
- DAG tip updates

---

## 7. Visual Design System

### Color Palette

| Token | Dark Theme | Light Theme | Usage |
|-------|-----------|-------------|-------|
| `--color-bg` | `#0a0a1a` | `#ffffff` | Primary background |
| `--color-surface` | `#1e1e2e` | `#ffffff` | Cards, panels |
| `--color-text` | `#f9fafb` | `#111827` | Primary text |
| `--color-accent` | `#6366f1` | `#6366f1` | Primary accent (indigo) |
| `--color-success` | `#10b981` | `#059669` | Success states |
| `--color-warning` | `#f59e0b` | `#d97706` | Warning states |
| `--color-error` | `#ef4444` | `#dc2626` | Error states |

### Typography
- **Body:** Inter, -apple-system, sans-serif
- **Mono:** JetBrains Mono, Fira Code, monospace

### Spacing Scale (4px base)
`4px → 8px → 12px → 16px → 24px → 32px → 48px`

### Layout Constants
- Sidebar: 240px (expanded) / 52px (collapsed)
- Status bar: 32px height

---

## 8. Infrastructure Map

```
┌─────────────────────────────────────────────────────────────────┐
│                     CITRATE ECOSYSTEM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Desktop App  │  │   Explorer   │  │   Marketing Site     │  │
│  │ (Tauri/React)│  │  (Next.js)   │  │   (Next.js)          │  │
│  │   Port 3457  │  │   Port 3000  │  │                      │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────────────────┘  │
│         │                  │                                     │
│  ┌──────┴──────────────────┴────────────────────────────────┐  │
│  │                   JSON-RPC / REST API                     │  │
│  │             Port 8545 (HTTP) / 8546 (WS)                 │  │
│  │                  Port 3000 (MCP REST)                     │  │
│  └──────────────────────┬───────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────┴───────────────────────────────────┐  │
│  │                    CITRATE NODE                            │  │
│  │  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌────────────┐  │  │
│  │  │GhostDAG │ │   EVM    │ │   Model   │ │   Block    │  │  │
│  │  │Consensus│ │ Executor │ │ Registry  │ │  Producer  │  │  │
│  │  │ (k=18)  │ │ (REVM)   │ │   (MCP)   │ │  (2s/blk)  │  │  │
│  │  └────┬────┘ └────┬─────┘ └─────┬─────┘ └─────┬──────┘  │  │
│  │       │           │             │              │          │  │
│  │  ┌────┴───────────┴─────────────┴──────────────┴──────┐  │  │
│  │  │              RocksDB + IPFS Storage                 │  │  │
│  │  │   Accounts │ Blocks │ Receipts │ Models │ Artifacts │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│  ┌──────────────────────┴───────────────────────────────────┐  │
│  │                    P2P NETWORK                            │  │
│  │          Block Propagation │ Transaction Gossip           │  │
│  │           Peer Discovery │ Sync Manager                   │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ TypeScript   │  │  Python SDK  │  │   CLI Tools          │  │
│  │ SDK (npm)    │  │  (PyPI)      │  │  citrate, wallet,    │  │
│  │ @citrate/sdk │  │ citrate-sdk  │  │  citrate-cli         │  │
│  └─────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                 SMART CONTRACTS (EVM) — 31 contracts         │  │
│  │  ModelRegistry │ Marketplace │ InferenceRouter │ LoRA      │  │
│  │  AccessControl │ IPFSIncentives │ NFTs │ WrappedSALT       │  │
│  │  ComputeMarketplace │ ComputeVerifier │ ComputePool        │  │
│  │  HeartbeatMonitor │ DisputeResolution │ LiquidStaking      │  │
│  │  LearningPool │ ClassroomRegistry │ LearningCycleManager   │  │
│  │  ContributionAccounting │ NematocystSlashing │ SpecRegistry │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MONITORING & OBSERVABILITY                    │  │
│  │     Prometheus (9090) │ Grafana (3001) │ Structured Logs  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Competitive Positioning

| Feature | Citrate | Ethereum | Solana | Bittensor |
|---------|---------|----------|--------|-----------|
| AI Models On-Chain | Native, first-class | Via contracts only | Via contracts only | Native (subnets) |
| Consensus | GhostDAG (DAG) | PoS (linear) | PoH + PoS (linear) | Yuma consensus |
| EVM Compatible | Yes (REVM) | Native | No | No |
| Block Structure | DAG (parallel) | Linear chain | Linear chain | Linear chain |
| Target TPS | 10,000+ | ~30 | ~65,000 | ~100 |
| Finality | ~12 seconds | ~12 minutes | ~0.4s | ~12s |
| Desktop App | Full-featured | None official | None official | Basic CLI |
| Model Marketplace | Built-in | Third-party | Third-party | TAO marketplace |
| Compute Marketplace | Built-in (5 contracts) | Third-party | N/A | Subnet-based |
| Learning Center | Built-in (Belnap lattice) | N/A | N/A | N/A |
| ZK Inference Proofs | Native precompile (Poseidon, MiMC) | Via contracts | N/A | N/A |
| Formal Verification | 41 TLA+ specs | Partial | None | None |
| Developer SDKs | TS, Python, CLI | Many | Many | Python only |
| Smart Contracts | 31 contracts | N/A | N/A | N/A |

---

## 10. Website Content Sections (Recommended)

Based on the product surface, the website should cover:

1. **Hero:** "The AI-native blockchain" — deploy, run, and monetize AI models on-chain
2. **How It Works:** DAG visualization, model lifecycle, inference flow
3. **For Developers:** SDK quickstart, API reference, contract examples
4. **For Model Creators:** Registry, marketplace, monetization
5. **For Users:** Desktop app download, wallet setup, faucet
6. **Explorer:** Link to block explorer
7. **Documentation:** Full technical docs portal
8. **Tokenomics:** SALT supply, distribution, utility
9. **Roadmap:** Current phase and upcoming milestones
10. **Community:** GitHub, Discord, social links

---

## 11. Key Metrics & Performance Targets

| Metric | Target | Current Status |
|--------|--------|---------------|
| Throughput | 10,000+ TPS | 5,000 sustained, 10,000 ceiling |
| Finality | 12 seconds | Implemented (BFT + depth-based) |
| Block Time | 1-2 seconds | 2 seconds |
| DAG Width | 100+ parallel blocks | Supported |
| Rust Tests | 2,484+ | Complete |
| GUI Tests | 1,018 passing | Complete |
| Forge Tests | 873 | Complete |
| TLA+ Specs | 41 specs, 306+ invariants | Complete |
| Precompiles | 9 EVM + 7 AI | Implemented |
| Smart Contracts | 31 deployed | Complete |
| SDK Modules | 7 (models, contracts, accounts, AI, learning, staking, compute) | Complete |

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **BlockDAG** | Block Directed Acyclic Graph — allows parallel block production |
| **GhostDAG** | Greedy Heaviest-Observed Sub-Tree on a DAG — Citrate's consensus protocol |
| **Blue Set** | The set of blocks consistent with the k-cluster rule (honest blocks) |
| **Blue Score** | Cumulative count of blue ancestors — used for ordering |
| **k-Cluster** | Parameter controlling DAG width (k=18); larger = more parallelism |
| **Selected Parent** | The primary parent block (highest blue score) |
| **Merge Parents** | Additional parent blocks from parallel branches |
| **SALT** | Citrate's native token (like ETH for Ethereum) |
| **LVM** | Lattice Virtual Machine — Citrate's EVM-compatible execution engine |
| **MCP** | Model Context Protocol — standard for AI model interaction |
| **CID** | Content Identifier — IPFS hash for model weights |
| **REVM** | Rust EVM — the battle-tested EVM implementation used by Foundry/Anvil |
| **Precompile** | Built-in contract at a fixed address for efficient operations |
| **VRF** | Verifiable Random Function — used for fair block proposer selection |
| **Compute Marketplace** | On-chain marketplace matching compute jobs to GPU/CPU providers |
| **ComputeVerifier** | Challenge-response system for verifying compute job results |
| **HeartbeatMonitor** | Liveness monitoring for compute providers with auto-slashing |
| **Learning Center** | Educational framework using paraconsistent logic for knowledge aggregation |
| **Belnap Lattice** | Four-valued logic (True, False, Both, Neither) used in learning pools |
| **OODA Cycle** | Observe-Orient-Decide-Act learning loop used in LearningCycleManager |
| **Nematocyst Slashing** | Biologically-inspired penalty mechanism for malicious validators |
| **Poseidon Hash** | ZK-friendly hash function used in proof systems |
| **MiMC** | Minimal Multiplicative Complexity hash for ZK circuits |
| **stSALT** | Liquid staking token representing staked SALT |
