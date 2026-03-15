# Citrate Reference dApp — Model NFT

A reference implementation demonstrating how to build a dApp on the Citrate blockchain. This app mints ERC-721 NFTs that represent AI models, with each token bound to an IPFS content identifier (CID) for the model weights.

## What This Does

1. **Upload** an AI model file to IPFS
2. **Mint** an NFT on Citrate with the model's metadata (name, framework, CID, SHA-256 hash)
3. **Browse** a gallery of all minted model NFTs with on-chain SVG artwork
4. **Verify** model integrity by comparing on-chain hash with downloaded weights

## Quick Start

### Prerequisites

- [Foundry](https://book.getfoundry.sh/getting-started/installation) (forge, cast, anvil)
- [Node.js](https://nodejs.org/) >= 18
- [IPFS](https://docs.ipfs.tech/install/) daemon (optional, for model uploads)
- Running Citrate devnet node

### 1. Build & Test Contracts

```bash
cd contracts
forge build
forge test -vv
```

All 22 tests should pass covering minting, metadata, access control, and on-chain SVG generation.

### 2. Deploy to Devnet

```bash
# Start Citrate devnet (from citrate_v0.01.1/)
cargo run --bin citrate-node -- devnet

# Deploy ModelNFT contract
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 \
  --broadcast
```

Note the deployed contract address from the output. Update `MODEL_NFT_ADDRESS` in `frontend/src/config/network.ts` if it differs from the default.

### 3. Start IPFS Daemon (Optional)

```bash
ipfs daemon
```

The IPFS daemon enables model file uploads. If unavailable, you can still mint NFTs with manually-provided CIDs.

### 4. Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and connect your wallet (MetaMask or any injected provider).

### 5. Configure Wallet

Add the Citrate Devnet network to MetaMask:

| Setting | Value |
|---------|-------|
| Network Name | Citrate Devnet |
| RPC URL | http://localhost:8545 |
| Chain ID | 40204 |
| Currency Symbol | SALT |

The app will auto-prompt you to add/switch to this network.

## Project Structure

```
ReferenceApp/
├── contracts/              # Foundry smart contracts
│   ├── src/
│   │   └── ModelNFT.sol    # ERC-721 with IPFS CID binding (~240 lines)
│   ├── test/
│   │   └── ModelNFT.t.sol  # 22 Foundry tests
│   ├── script/
│   │   └── Deploy.s.sol    # Deployment script
│   ├── lib/                # Symlink → OpenZeppelin + forge-std
│   └── foundry.toml        # Foundry config (Solc 0.8.24, via_ir)
├── frontend/               # React + Vite + TypeScript
│   └── src/
│       ├── pages/           # Dashboard, Mint, Gallery, Detail
│       ├── components/      # ConnectButton, FileUpload, NFTCard, Layout
│       ├── hooks/           # useWallet, useContract
│       ├── services/        # IPFS upload + SHA-256 hashing
│       ├── config/          # Network config, contract ABI
│       └── styles/          # Citrate design tokens (CSS variables)
├── scripts/                # Automation scripts
│   └── smoke_test.sh       # E2E smoke test
└── docs/                   # Developer documentation
    ├── ARCHITECTURE.md     # System architecture and data flow
    └── CUSTOMIZATION.md    # How to extend this template
```

## Contract Interface

```solidity
// Mint a model NFT (requires mintFee in SALT)
function mintModel(
    string name,        // Model name (e.g. "ResNet-50")
    string framework,   // Framework (e.g. "PyTorch", "CoreML")
    string ipfsCID,     // IPFS CID for model weights
    bytes32 modelHash,  // SHA-256 hash of model data
    uint256 sizeBytes   // File size in bytes
) external payable returns (uint256 tokenId);

// Query model metadata
function getModelInfo(uint256 tokenId) external view returns (ModelInfo memory);

// Get all models by a creator
function getModelsByCreator(address creator) external view returns (uint256[] memory);

// On-chain SVG + Base64 JSON metadata
function tokenURI(uint256 tokenId) external view returns (string memory);

// Admin functions (owner only)
function setMintFee(uint256 fee) external;
function withdraw() external;
```

### ModelInfo Struct

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Model name |
| `framework` | `string` | ML framework (PyTorch, CoreML, ONNX, etc.) |
| `ipfsCID` | `string` | IPFS content identifier for model weights |
| `modelHash` | `bytes32` | SHA-256 hash for integrity verification |
| `sizeBytes` | `uint256` | Model file size in bytes |
| `creator` | `address` | Address that minted the token |
| `createdAt` | `uint256` | Block timestamp at mint time |

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Aggregate stats: total models, framework breakdown, recent mints |
| Mint | `/mint` | 5-step flow: upload file, fill metadata, review, sign tx, confirmation |
| Gallery | `/gallery` | Grid of all minted NFTs with on-chain SVG art. Filter: All / My Models |
| Detail | `/model/:id` | Full metadata view for a single NFT |

## Environment Variables

### Contracts (`contracts/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `RPC_URL` | `http://localhost:8545` | Citrate RPC endpoint |
| `PRIVATE_KEY` | Hardhat #0 | Deployer private key |
| `MINT_FEE` | `10000000000000000` | Initial mint fee in wei (0.01 SALT) |

### Frontend

Network configuration is in `frontend/src/config/network.ts`. No `.env` file needed for local development.

## Network Config

| Setting | Value |
|---------|-------|
| Chain ID | 40204 |
| Chain ID (hex) | 0x9d0c |
| RPC URL | http://localhost:8545 |
| Native Token | SALT (18 decimals) |
| Block Explorer | http://localhost:3000 |

## Interacting via CLI

```bash
# Check total supply
cast call <CONTRACT> "totalSupply()" --rpc-url http://localhost:8545

# Mint a model
cast send <CONTRACT> \
  "mintModel(string,string,string,bytes32,uint256)" \
  "MyModel" "PyTorch" "QmXyz..." \
  0x$(echo -n "test" | sha256sum | cut -d' ' -f1) \
  1048576 \
  --value 0.01ether \
  --private-key $PRIVATE_KEY \
  --rpc-url http://localhost:8545

# Get model info
cast call <CONTRACT> "getModelInfo(uint256)" 1 --rpc-url http://localhost:8545

# Get token URI (on-chain SVG)
cast call <CONTRACT> "tokenURI(uint256)" 1 --rpc-url http://localhost:8545
```

## Deploying to Testnet

```bash
cd contracts
forge script script/Deploy.s.sol \
  --rpc-url https://testnet.citrate.ai \
  --private-key $YOUR_KEY \
  --broadcast
```

Then update `MODEL_NFT_ADDRESS` in `frontend/src/config/network.ts` and build:

```bash
cd frontend
npm run build
# Deploy dist/ to Vercel, Netlify, or any static host
```

## Further Reading

- [Architecture](docs/ARCHITECTURE.md) — System design, data flow, contract storage layout
- [Customization Guide](docs/CUSTOMIZATION.md) — How to extend the contract, add pages, change styling

## License

MIT
