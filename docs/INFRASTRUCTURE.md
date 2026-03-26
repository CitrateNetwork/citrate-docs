# Citrate Infrastructure Reference

*All URLs, chain IDs, addresses, and configuration for the Citrate testnet.*

---

## Live Services

| Service | URL | Status |
|---------|-----|--------|
| **RPC (HTTPS)** | https://rpc.citrate.ai | Live |
| **Block Explorer** | https://explorer.citrate.ai | Live |
| **Faucet** | https://faucet.citrate.ai | Live |
| **Documentation** | https://citrate.ai/docs/getting-started | Live |
| **Website** | https://citrate.ai | Live |

## Chain Configuration

| Parameter | Value |
|-----------|-------|
| **Chain ID** | `40204` |
| **Token** | SALT |
| **Token Decimals** | 18 |
| **Block Time** | 5 seconds |
| **Block Reward** | 0.01 SALT/block |
| **Consensus** | GhostDAG (k=18) |
| **VM** | LVM (EVM-compatible via REVM) |
| **Gas Price** | 1 Gwei minimum |
| **Finality** | ~12 seconds (BFT committee checkpoints) |

## Bootnode

```
noise_1a1c9f4acfcbe5495f38746f8b396853456a439487004eb0bb55c230a476a366@159.65.227.42:30303
```

Add this in your GUI: **Settings > Peer Connections > Paste > Add**

## Genesis Accounts

| Address | Balance | Purpose |
|---------|---------|---------|
| `0x1111...1111` | 100,000,000 SALT | Ecosystem Treasury |
| `0x2222...2222` | 250,000,000 SALT | Foundation Reserve |
| `0x3333...3333` | 10,000,000 SALT | Community Fund / Faucet |
| `0x9f5B...401a` | 5,000,000 SALT | Deployer Wallet |
| `0xFCAd...377c` | 1,000,000 SALT | Dev Deployer (Foundry) |

## Deployed Contracts (Testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| ModelRegistry | `0x582898c863947EB779eDd55463348c3FB46207F7` | AI model registration |
| ComputeMarketplace | `0x2d71307f7453268AD1a7570f13C985eD87105A67` | Compute job marketplace |
| ComputePool | `0x68b5B97ccab29FC73D58165746107224c9Ef1d05` | GPU pool management |
| ContributionAccounting | `0xD518fd81c0012Ce7Ca4ed5EdF2B9D40E6FFefCe1` | Contribution tracking |
| LearningPool | `0xBaB17672A2AF9F103784F885b68bAbe3D9ca6531` | Federated learning pools |
| WrappedSALT | — | ERC-20 wrapped SALT |
| InferenceRouter | — | Inference request routing |

## RPC Endpoints

### Standard Ethereum JSON-RPC

```bash
# Get block number
curl -X POST https://rpc.citrate.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'

# Get balance
curl -X POST https://rpc.citrate.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0xYOUR_ADDRESS","latest"],"id":1}'

# Get chain ID
curl -X POST https://rpc.citrate.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}'

# Estimate gas
curl -X POST https://rpc.citrate.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_estimateGas","params":[{"from":"0xFROM","to":"0xTO","value":"0x1"}],"id":1}'

# Send raw transaction
curl -X POST https://rpc.citrate.ai \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_sendRawTransaction","params":["0xSIGNED_TX"],"id":1}'
```

### Faucet API

```bash
# Get testnet SALT (10 SALT per request, 24-hour cooldown)
curl -X POST https://faucet.citrate.ai/faucet \
  -H "Content-Type: application/json" \
  -d '{"address":"0xYOUR_ADDRESS"}'

# Check faucet status
curl https://faucet.citrate.ai/status
```

## Adding Citrate to MetaMask / Web3 Wallets

| Field | Value |
|-------|-------|
| Network Name | Citrate Testnet |
| RPC URL | `https://rpc.citrate.ai` |
| Chain ID | `40204` |
| Currency Symbol | `SALT` |
| Block Explorer URL | `https://explorer.citrate.ai` |

## SDK Quick Start

### TypeScript
```bash
npm install @citrate/sdk
```

```typescript
import { CitrateProvider } from '@citrate/sdk';
const provider = new CitrateProvider('https://rpc.citrate.ai');
const balance = await provider.getBalance('0xYOUR_ADDRESS');
```

### Python
```bash
pip install citrate-python
```

```python
from citrate import CitrateClient
client = CitrateClient('https://rpc.citrate.ai')
balance = client.get_balance('0xYOUR_ADDRESS')
```

### Foundry (Solidity)
```bash
# Deploy contract
forge script script/Deploy.s.sol --rpc-url https://rpc.citrate.ai --broadcast

# Call contract
cast call 0xCONTRACT "balanceOf(address)" 0xADDRESS --rpc-url https://rpc.citrate.ai
```

## Infrastructure Details

| Component | Host | Cost |
|-----------|------|------|
| Bootnode + RPC + Faucet + Explorer | DigitalOcean NYC1 (s-2vcpu-4gb) | $24/month |
| SSL termination | Caddy (auto Let's Encrypt) | Free |
| DNS | citrate.ai (Cloudflare/registrar) | Included |
| AI Model (bundled in GUI) | Qwen2.5-1.5B-Instruct-Q4_K_M | 1.1GB in installer |

## VPS Access (Team Only)

```bash
ssh -i ~/.ssh/citrate-do root@159.65.227.42

# Check services
systemctl status citrate-bootnode
systemctl status citrate-faucet
systemctl status citrate-explorer

# View logs
journalctl -u citrate-bootnode -f
journalctl -u citrate-faucet -f
journalctl -u citrate-explorer -f
```
