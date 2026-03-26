# Checklist to 100%

*Everything remaining between current state and production-ready.*

---

## Status: 85% Complete

### What's Done
- [x] Blockchain node producing blocks (5s interval, 0.01 SALT/block)
- [x] GhostDAG consensus with ECVRF proposer election
- [x] EVM-compatible execution (REVM)
- [x] 38 smart contracts deployed (ModelRegistry, LearningPool, ComputeMarketplace, etc.)
- [x] Desktop GUI with wallet, DAG explorer, agent chat, contracts IDE
- [x] AI assistant bundled (Qwen2.5-1.5B, 3000-word ecosystem prompt)
- [x] Public RPC at https://rpc.citrate.ai
- [x] Block explorer at https://explorer.citrate.ai
- [x] Faucet at https://faucet.citrate.ai
- [x] P2P bootnode (Noise encrypted, genesis hash verified)
- [x] 1,961 tests all passing
- [x] TypeScript and Python SDKs
- [x] One-click installer with bundled model
- [x] Build script for cross-platform builds
- [x] CI/CD for all platforms (GitHub Actions)
- [x] Multi-node sync guide
- [x] Infrastructure documentation

---

## Critical Path (Must Complete)

### Week 1: Verification

- [ ] **Multi-node sync test** — Larry + partner, different states
  - Add bootnode in both GUIs
  - Verify both nodes see same block height
  - Verify block sync logs show "SYNC: Received X blocks"
  - Test: kill one → restart → resync works

- [ ] **Visual verification of GUI changes**
  - [ ] Dashboard shows real numbers (not "undefined")
  - [ ] SALT Earned counter updates
  - [ ] Transaction history shows rewards
  - [ ] Settings > Peer Connections works
  - [ ] AI chat responds to "What is SALT?"
  - [ ] Send animation shows checkmark
  - [ ] Receive section shows address + copy

- [ ] **Faucet end-to-end test**
  - [ ] POST to https://faucet.citrate.ai/faucet with wallet address
  - [ ] Verify 10 SALT arrives in GUI balance
  - [ ] Verify 24-hour cooldown works

### Week 2: Hardening

- [ ] **Second bootnode** (different region — EU or Asia)
  - $24/month additional VPS
  - Same systemd setup as NYC1
  - Hardcode both bootnodes as defaults in GUI config

- [ ] **RPC rate limiting review**
  - Current: 100 req/s per IP
  - Add API key authentication for production apps
  - Keep anonymous access for light usage

- [ ] **Faucet key security**
  - Generate dedicated faucet keypair
  - Fund from community fund
  - Store private key in environment variable (not genesis address)

- [ ] **Monitoring**
  - [ ] UptimeRobot or Betterstack for https://rpc.citrate.ai (free)
  - [ ] Alert on service down (email/Slack)
  - [ ] Optional: Grafana dashboard for Prometheus metrics

### Week 3: Documentation & Polish

- [ ] **README rewrite**
  - Current state (not aspirational)
  - Quick start: install → run → chat → send SALT
  - Links to explorer, faucet, docs

- [ ] **LoRA training data extraction**
  - Extract Q&A pairs from CLAUDE.md (150-200 pairs)
  - Extract from whitepaper (80-100 pairs)
  - Extract from contract ABIs (50-70 pairs)
  - Review for accuracy

- [ ] **Cross-platform GUI testing**
  - [ ] macOS build and test
  - [ ] Windows build and test
  - [ ] Linux amd64 build and test (currently arm64 only)

- [ ] **Explorer polish**
  - DAG visualization page
  - Address page (balance + tx history)
  - Transaction detail page

### Week 4: Pre-Mainnet

- [ ] **External security review**
  - Consensus (GhostDAG parameters, finality)
  - Execution (REVM config, gas limits)
  - Crypto (ed25519 + ECDSA handling)
  - P2P (Noise handshake, peer banning)

- [ ] **Governance contract**
  - On-chain parameter changes (block reward, gas price)
  - DAO structure for treasury management

- [ ] **DLP market maker**
  - 10% gas fee routing
  - DAO-reconfigurable parameters
  - CEX listing preparation

- [ ] **State migration tooling**
  - Snapshot/restore for chain state
  - Version upgrade procedure

---

## Nice to Have (Not Blocking Launch)

- [ ] Grafana monitoring dashboard
- [ ] Log aggregation (Loki)
- [ ] Automated backups (cron + S3)
- [ ] Load testing in CI
- [ ] Marketing site updates
- [ ] SDK documentation site
- [ ] Mobile wallet (future)
- [ ] Hardware wallet support (Ledger/Trezor)

---

## Definition of 100%

A user can:
1. Download the installer from GitHub Releases (1 click)
2. Install and launch (1 click)
3. See their node producing blocks
4. Earn SALT from block production
5. Send SALT to another user
6. See the transaction in the explorer
7. Ask the AI assistant about Citrate and get correct answers
8. Deploy a Solidity contract
9. Connect to the testnet via bootnode (automatic)
10. Get test SALT from the faucet

All of this works today except #9 (automatic bootnode — currently manual in Settings). When the bootnode is hardcoded as default, the product is 100%.
