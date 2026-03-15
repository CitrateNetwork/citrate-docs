# Architecture

## Overview

The Citrate Model NFT reference dApp is a two-layer application:

1. **Smart Contract Layer** (`contracts/`) — A Solidity ERC-721 contract deployed to Citrate devnet
2. **Frontend Layer** (`frontend/`) — A React+Vite+TypeScript web app that interacts with the contract

```
User Browser
    │
    ├── React Frontend (Vite dev server, port 5173)
    │       │
    │       ├── ethers.js ──► Citrate Devnet (JSON-RPC, port 8545)
    │       │                     │
    │       │                     └── ModelNFT.sol (ERC-721)
    │       │
    │       └── fetch() ──► IPFS Daemon (HTTP API, port 5001)
    │
    └── MetaMask / Injected Wallet
```

## Contract Architecture

### ModelNFT.sol

Inherits from:
- `ERC721Enumerable` — token enumeration (totalSupply, tokenByIndex)
- `Ownable` — owner-only admin functions
- `ReentrancyGuard` — reentrancy protection on mint

**Storage Layout**:
```
_nextTokenId          — auto-incrementing token counter
mintFee               — configurable mint fee in SALT (wei)
_models[tokenId]      — ModelInfo struct per token
_creatorTokens[addr]  — array of tokenIds per creator
```

**Key Design Decisions**:
- On-chain SVG: `tokenURI()` returns fully self-contained base64 JSON with embedded SVG — no external URI dependencies
- Open minting: any address can mint (no allowlist), controlled by mint fee
- Creator tracking: `_creatorTokens` mapping enables `getModelsByCreator()` queries
- Immutable model data: once minted, ModelInfo cannot be changed (integrity guarantee)

## Frontend Architecture

### Directory Structure

```
src/
├── config/           # Network config (chain ID, RPC), contract ABI
├── hooks/            # React hooks (useWallet, useContract)
├── components/       # Reusable UI components
├── pages/            # Route-level page components
├── services/         # IPFS upload service
└── styles/           # CSS variables (Citrate design tokens)
```

### Data Flow

**Mint Flow**:
1. User uploads file → `FileUpload` component
2. File is hashed (SHA-256 via WebCrypto) and uploaded to IPFS → `services/ipfs.ts`
3. User fills metadata form → `MintPage` state
4. Transaction sent via `contract.mintModel()` → ethers.js → MetaMask → Citrate RPC
5. Receipt parsed for `ModelMinted` event → token ID extracted
6. User redirected to gallery/detail page

**Gallery Flow**:
1. `totalSupply()` fetched from contract
2. For each token: `tokenByIndex(i)` → `getModelInfo(tokenId)` → `tokenURI(tokenId)`
3. SVG extracted from base64 JSON in tokenURI
4. Cards rendered with model metadata

### Hooks

- `useWallet()` — MetaMask connection, chain validation, account/chain change listeners
- `useContract(signer)` — returns `readOnly` (JsonRpcProvider) and `writable` (signer-connected) contract instances

### Styling

Uses CSS custom properties matching the Citrate GUI design system:
- `--color-*` tokens for colors
- `--space-*` tokens for spacing (4px base)
- `--radius-*` tokens for border-radius
- `--font-body` / `--font-mono` for typography

All styles are inline `CSSProperties` objects — no CSS modules, no Tailwind.
