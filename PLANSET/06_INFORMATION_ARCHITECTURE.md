---
created: 2026-06-14T00:00:00Z
branch: main
author: Saul Loveman + Claude Opus 4.8 (1M context)
status: active
sprint: DOCS-CODEX-S0
---

# Citrate Codex — Information Architecture & Surface Map

> This is the **"map the whole repository"** deliverable. It enumerates every owned surface across the
> federation, places it in the sidebar tree, and assigns each a default access **tier** (Public `P` /
> Commercial `C` / Academic `A` / Confidential `X`). Source: the 2026-06-14 inventory sweep across ~40
> repos (chain core, SDK/gateway/runtime, apps/dapps, identity/RBAC/compliance, GTM/ops, docs/archive,
> the explorer harness). Tiers here are **defaults**; the authoritative gate is the per-document
> frontmatter resolved at the chokepoint (`02_*` §4). Every section carries a **Tutorials** subsection.

## Legend

`P` Public · `C` Commercial (per-seat/enterprise; KYC where noted) · `A` Academic (admins + research
partners) · `X` Confidential (admins + issued auditors only; runtime-gated, never in the build).
**KYC-private band:** content marked `C·kyc` is the deep implementation/technical-user track open to
**any KYC'd ecosystem user** (gated on KYC, not on a paid seat) — the "extremely detailed implementation
strategies" band the spec calls for.

---

## 0. Start Here  *(P)*

- What Citrate is — AI-native L1 BlockDAG, GhostDAG, LVM, SALT, chain 40204 · `P`
- Mental models: blue-score vs height, finality-by-depth, merge parents · `P`
- The Mozi Cooperative / BUSL licensing & trademark posture · `P`
- **Agentile methodology** primer (the 13 rules, sprint lifecycle) · `P` → links `AGENTILE.md`, `docs/AGENTILE_RULES.md`
- **Tutorials:** "Your first 10 minutes", "Read a block on testnet", "Ask the docs agent" · `P`

## 1. Chain Core  *(P → A; security precompiles X)*

- **Consensus** — GhostDAG engine, tip selection, ECVRF proposer election (RFC 9381), BFT checkpoints/finality · overview `P`, invariants/proofs `A`
- **Execution (LVM)** — REVM/EVM adapter & opcodes `P`; MVCC + parallel executor `A`; state/MPT internals `A`
- **Precompiles / opcodes** — tensor format `A`; ZKP verify (halo2/poseidon/merkle) `X`; inference proof gate `X`; attestation gate `X`; x402 dispute `C`; compute proof `C`; Belnap-q16 lattice aggregation `A`
- **JSON-RPC / IPC / WS** — `eth_*`/`net_*`/`web3_*` `P`; `citrate_*` (blockDAG, blueScore, selectedParent, tipSet) `P`; `ai_*` (pools, cycle status, mentor) `P`; `economics_*` (reward estimate, institutional profile) `C`
- **CLI** — `citrate-cli` account/model/contract/network/governance/wizard `P`; advanced DAG/consensus/mempool introspection `A`; `citrate-wallet`, `citrate-faucet` `P`
- **Network / P2P** — bootstrap nodes, block/tx gossip `P`; peer reputation/connection strategy `C`
- **Sequencer / mempool** — admission policy, fee routing `P`; bundle strategy `A`; parent selection algorithm `A`
- **Storage** — pruning/retention `P`; block store `P`; artifact pinning `C`; MPT+RocksDB internals `A`
- **Economics** — fee distribution, tokenomics (SALT, 1B, 18dp) `P`; institutional rewards `C`; slashing & genesis accounts `X`
- **Bridge (cross-chain)** — mint/burn gate, oracle relay, mainnet ceremony · `X`
- **Chain config & genesis** — params (k=18, block time, finality committee) `P`; genesis private keys `X`
- **Tutorials:** run a private devnet · connect to testnet · deploy a contract with Foundry · call `citrate_*` RPC · `P`

## 2. Smart Contracts  *(P / C; KYC·TEE·bridge X)*

Grouped by domain (≈39 contracts; ABIs published as `@CitrateNetwork/contracts-abi`).

- **Education (edu/)** — ClassroomRegistry, ClassroomClusterV1, BudgetAllocation, CashoutRequest, MentorMatcher, InstitutionalVault `P`/`C`
- **Compute** — ComputeMarketplace, ComputePool(/Training), ComputePricingOracle, BulkComputeGateway `C`; ComputeVerifier `A`
- **Marketplace / Models** — ModelRegistry, ModelMarketplace, LoRAFactory, ModelAccessControl, InferenceRouter, AIModelRegistryPortable `P`/`C`
- **Economics** — WrappedSALT, LiquidStakingPool, IPFSIncentives(V2), ContributionAccounting, StablecoinTreasury, MarketMakerAllocation `P`/`C`
- **Governance** — TreasuryGovernor, DisputeResolution, AgentDecisionRegistry, SpecRegistry `C`/`A`
- **Account Abstraction (aa/)** — Forwarder (EIP-2771), CitrateWalletFactory, CitratePaymaster, CitrateECDSAValidator, WebAuthnP256Validator, GuardianRecoveryModule `C` (pre-audit caveat)
- **x402** — X402Facilitator, X402Paywall `C`
- **Security / consensus** — KYCRegistry, TEEAttestationRegistry, NematocystSlashing `X`/`A`
- **Reference** — DEPLOYED_ADDRESSES (40204), build/test (Foundry) `P`
- **Tutorials:** verify a contract · read ABIs · interact read-only · deploy a model to ModelRegistry · `P`/`C`

## 3. SDKs & APIs  *(P; marketplace/bundler C)*

- **citrate-sdk-js** (`@citratenetwork/sdk`) — CitrateClient, WebSocketClient, Crypto/KeyManager, `aa/*` (userop, webauthn, kernel, recovery, bundler), React hooks, Shamir utils · `P`
- **citrate-sdk-python** (`citrate-ai-sdk`) — CitrateClient + Learning/Staking/Classroom/Compute/Treasury/Farming managers, `citrate` CLI · `P`
- **citrate-sdk-marketplace** (`@citratenetwork/marketplace-sdk`) — MarketplaceClient, X402Client, CitrateWallet, ABI/calldata builders · `C`
- **citrate-inference-gateway** — OpenAI-compatible REST (`/v1/chat/completions`, `/v1/batch`, `/v1/usage`, `/v1/models`), x402 auth, modes (marketplace/local-proxy) · `P` (keys `C`)
- **citrate-bundler** — ERC-4337 v0.7 JSON-RPC (`eth_sendUserOperation`, …, `citrate_getUserAddress`) · `C`
- **Tutorials:** install each SDK · gasless tx via AA · OpenAI client → gateway · post a marketplace job · `P`/`C`

## 4. Account Abstraction & Identity  *(P → C; KYC internals X)*

- Passkeys / WebAuthn-P256, EOA enrollment, Kernel v3 UserOps · `P`
- Paymaster policy (daily/recovery/first-op caps), bundler topology · `C`
- Guardians & social recovery (2–7 of N; Citrate never a guardian) · `P`/`C`
- **citrate-identity** — OIDC issuer (`auth.citrate.ai`), claim shapes (`sub`, `wallet_address`, `email`), SIWE, device grant · overview `P`; KYC store/vendor wiring (CLEAR/Sumsub) `X`
- The **`entitlement` claim** (this project) — tier/org/role/milestone · spec `A`, impl `X`
- **Tutorials:** sign in with a passkey · sponsor a tx via paymaster · nominate guardians · `P`

## 5. Compute & Inference  *(C; operator depth C·kyc)*

- **citrate-node-agent** (sell side) — register/bid/heartbeat/execute/claim, supervision HTTP, compute.json, schedule · `C·kyc`
- **citrate-compute-pool** — pool coordinator + training worker · `C`
- **citrate-inference-gateway** (server side) — metering, x402, batch, local-proxy/DGX · `C`
- x402 payment protocol deep dive · `C`
- **Tutorials:** become a seller ("set and forget") · run a training worker · meter inference · `C·kyc`

## 6. Apps & dApps  *(mostly P; studio/boeing X)*

- **citrate-explorer (CitrateScan)** — AI-native BlockDAG explorer; the harness we lift · `P`
- **citrate-wallet-extension** — MV3 browser wallet (EIP-1193, WASM signing) · `P`
- **citrate-chatbot** — gasless AI-native dApp (EIP-2771 relay) · `P`
- **citrate-landing** — marketing site (encrypted forms) · `P`
- **citrate-dashboard** — federated-learning cycle monitoring · `C`
- **citrate-buyer-webapp** — compute marketplace buyer UI (x402) · `C`
- **citrate-learning-center** — Slint education desktop app · `A`
- **citrate-district-registration** — KYC district onboarding · `C·kyc`
- **citrate-comms** — E2E agentic team workspace (MLS) · `C` (internal first)
- **citrate-memories (Memrizz)** — federated knowledge DAG + MCP · `C`
- **citrate-studio** — agent-runtime control UI (HITL/quorum/audit replay) · `X`
- **citrate-boeing-shell** — customer-specific Boeing shell (26 panels) · `X` (org-scoped to Boeing)
- **nist-agent** — air-gapped NIST/CMMC agent sidecar · RFC/product `P`; compliance internals `X`
- **Tutorials:** explore a tx in CitrateScan · install the wallet · chat gaslessly · `P`

## 7. Federated Learning & Research  *(A)*

- Federated learning cycles & orchestration (propose→train→aggregate→verify→checkpoint) · `A`
- The Mentorship Protocol · `A`
- Paraconsistent consensus (Belnap four-valued logic) · `A`
- Verifiable inference (Q16.16 + Halo2-KZG + TEE attestation) · `A`
- ATIS (Analog Token Importance Scoring) · `A`
- **Gradient Papers v3** (10 papers + index) — linked from `gradient_papers_v3/` · `A` (summaries `P`)
- **TLA+ corpus** (200+ specs) — linked from `citrate-agentile-archive/formal/` + per-repo `specs/` · `A`
- Gherkin BDD scenario library · `A`
- **Tutorials:** read the TLA+ spec index · reproduce a learning round on testnet · cite a Gradient Paper · `A`

## 8. Node Operators  *(P / C·kyc)*

- Run a node (devnet, multi-node, dockerized) · `P`
- Sell compute end-to-end · `C·kyc`
- Rewards, reputation, slashing-protection guardrails · `C`
- Operator SOPs (heartbeat, model provisioning, IPFS CID validation) · `C·kyc`
- **Tutorials:** join testnet as a validator · monetize idle GPU · `P`/`C·kyc`

## 9. Enterprise & Compliance  *(C / X)*

- Procurement (MSA + SOW, order forms) · `C`
- DPA / SLA / data-residency, subprocessor list · `C`
- Compliance posture (SOC 2 → CMMC L2 → FedRAMP-readiness) — **sanitized** public summary `P`; full posture `X`
- Security questionnaires (SIG / CAIQ) · `C`
- **Per-company / per-sector spaces** (`org_id`-scoped: districts, defense primes, Boeing) · `C`/`X`
- K-12 onboarding, FERPA/COPPA/CIPA story, "no student data on the network" · `C·kyc`/`P` summary
- Federal/defense (CMMC, FedRAMP, FOCI/DFARS/NDAA-889, ATO pathway) · `X`
- **Tutorials:** request a verification packet · complete district onboarding · `C`

## 10. Internal / Audit  *(X — runtime-gated, never in build)*

> Served only through `/api/content/*` after the entitlement check + disclosure acknowledgement; sourced
> from **private** repos; access-logged. Never authored into or copied to `citrate-docs`.

- Audit reports & findings — `citrate-security/audits/`, pre-audit assessment (NET-1 + Highs), SECREM-01, follow-up audit · `X`
- Ops pack — `ops/` org design, role charters, SOP standard, readiness gates, surfaces/data-flow, founder memo · `X`
- Funding / data room — `funding/docs/` valuation, strategy, red-team, team assessment, risks, cap table · `X`
- Incident response plans & reports · `X`
- Compliance registers — roles/privileges matrix, audit-readiness, security-readiness · `X`
- Cap table / equity / founder-confidential · `X` (founder scope)
- Auditor materials — time-gated per SOW (Coalfire / Trail of Bits / C3PAO) · `X`
- **Tutorials (internal):** auditor onboarding · how to file an erratum (Rule 3) · `X`

## 11. Sandboxes  *(P)*

Live testnet (chain 40204), read-mostly, fail-closed — see `02_*` §6.

- GhostDAG blue-score visualizer · gasless EIP-2771 relay demo · x402 402-payment walkthrough ·
  inference-gateway call · RPC method explorer · all `P`
- **Tutorials:** each sandbox has an inline guided walkthrough · `P`

## 12. Agentile / Methodology & SOPs  *(P; some ops SOPs X)*

- The 13 rules in full, the sprint lifecycle, the audit-driven workflow · `P` → links archive
- SOPs for **customers / developers / node operators** (public or private) · `P`/`C`
- Internal-only SOPs (incident, access-review, hardware disposal, FIPS tracker) · `X`
- **Tutorials:** start a sprint · write a Rule-12 doc · run claim-grade · `P`

---

## Coverage check (reconcile against the 7 inventories)

| Inventory domain | Covered in section(s) |
|---|---|
| Chain core (contracts, opcodes, RPC, CLI, consensus, storage, bridge, genesis) | 1, 2 |
| SDKs / gateway / runtime / bundler / simulation | 3, 5 |
| Apps / dapps (12 repos) | 6 |
| Identity / KYC / RBAC / AA | 4 |
| Federated learning / papers / TLA+ | 7 |
| GTM / enterprise / compliance / SOPs | 9, 12 |
| Existing docs + archive (Gradient Papers, public-goods, archive) | 0, 7, 9, 12 |
| Confidential (audit/ops/funding) | 10 |
| Agentic harness reuse | (implemented per `02_*` §5; documented in 6 → explorer) |

> S6 exit gate: every row of the per-repo inventories maps to a node here with a tier, or to a tracked
> backlog stub. No surface is left unmapped or untiered.
