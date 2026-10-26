Note: The endpoints below are historical testnet references (the public RPC is https://rpc.citrate.ai); verify current URLs before use. The contract table moved to /chain/addresses.

Citrate v0.3.0-rc.1 — Testnet Live
Live Infrastructure
Service	URL
RPC (POST)	https://rpc.citrate.ai
Block Explorer (GET)	https://explorer.citrate.ai
Web Faucet	https://faucet.citrate.ai
Chain ID: 40204 | Token: SALT | Block Time: ~2s

What's New (since v0.3.0-beta)
Infrastructure:

Persistent testnet node (systemd, survives reboot)
Block explorer deployed (Next.js, live blocks)
Web faucet with HTML UI (10 SALT per request, 24h cooldown)
5 smart contracts deployed and verified on testnet
GUI Fixes:

Fixed blank screen on NVIDIA GPUs (DGX, datacenter cards)
Fixed model download progress crash (undefined fields)
IPFS now auto-installs AND auto-starts on first launch
Embedded node chain_id fixed: 1 → 40204 (now peers with testnet)
Auto-detects local testnet node and configures as peer
Documentation:

Website roadmap (Phase 1-5, Sept 2025 → H1 2027)
Complete commit history (277 commits)
Agentile framework with 217 governance files
18/18 crate READMEs
Deployed Contracts (Chain 40204)
Contract addresses change on every reroll, so this page no longer lists them. Read the current table at /chain/addresses (citrate-chain contracts/addresses/40204.json).
Downloads
File	Platform	Size
citrate-linux-aarch64.tar.gz	CLI node (Linux ARM64)	11 MB
Citrate_0.1.0_arm64.deb	Desktop GUI (deb, ARM64)	30 MB
Citrate_0.1.0_aarch64.AppImage	Desktop GUI (AppImage, ARM64)	160 MB
Quick Start
# CLI node
tar xzf citrate-linux-aarch64.tar.gz && chmod +x citrate
./citrate devnet

# Desktop GUI (Debian/Ubuntu)
sudo dpkg -i Citrate_0.1.0_arm64.deb

# Connect to testnet RPC
curl -X POST https://rpc.citrate.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get test SALT from faucet
# Visit: https://faucet.citrate.ai
MetaMask Configuration
Network Name: Citrate Testnet
RPC URL: https://rpc.citrate.ai
Chain ID: 40204
Currency Symbol: SALT
Explorer: https://explorer.citrate.ai
Test Suite: 3,146+ tests passing (2,484 Rust + 596 GUI + 66 Forge)
