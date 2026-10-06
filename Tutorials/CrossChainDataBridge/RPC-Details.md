Note: The endpoints below are historical testnet references (the public RPC is https://rpc.citrate.ai); verify current URLs before use. The contract table was refreshed for the r1005 reroll.

Citrate v0.3.0-rc.1 — Testnet Live
Live Infrastructure
Service	URL
RPC (POST)	https://spark-2e01.tailcbe2ba.ts.net
Block Explorer (GET)	https://spark-2e01.tailcbe2ba.ts.net
Web Faucet	https://spark-2e01.tailcbe2ba.ts.net/faucet
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
These five addresses are from the r1005 reroll (2026-10-06, genesis block 0x1dcfc4909dd9fdcb…). The canonical, complete table is /chain/addresses (citrate-chain contracts/addresses/40204.json). Addresses change on every reroll.
Contract	Address
ModelRegistry	0x086F13745C53b460512eA2A0367EcdB62A2875eF
WrappedSALT	0xAa918302B94a4B0E75E01e019cc6b819B4F7c906
X402Facilitator	0x0D36F6e2a186436f4E4Cc78Bbc7DA2a1aC37aadb
ModelMarketplace	0x6A93B6e99BfaBfb4e655c6fC15DB4d98192D040f
InferenceRouter	0x42Ae16Dae5D7Bf535b5cce9d5b6521c504500896
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
curl -X POST https://spark-2e01.tailcbe2ba.ts.net \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get test SALT from faucet
# Visit: https://spark-2e01.tailcbe2ba.ts.net/faucet
MetaMask Configuration
Network Name: Citrate Testnet
RPC URL: https://spark-2e01.tailcbe2ba.ts.net
Chain ID: 40204
Currency Symbol: SALT
Explorer: https://spark-2e01.tailcbe2ba.ts.net
Test Suite: 3,146+ tests passing (2,484 Rust + 596 GUI + 66 Forge)
