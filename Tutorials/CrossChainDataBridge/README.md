# Cross-Chain Data Bridge Tutorial

This tutorial defines a protocol for cross-chain inference requests into the Citrate network. It focuses on a request lifecycle that lets smart contracts on external chains submit inference requests, wait for Citrate execution, and consume the result on the source chain in a deterministic way.

## What This Covers

- A protocol-level specification for cross-chain inference requests
- A working source-chain gateway + consumer contract example
- A relayer implementation that forwards requests into Citrate
- Message formats and required fields
- Trust and verification model for relayed results
- Reference Solidity interfaces (ABI signatures only)
- A minimal sequence diagram of the full lifecycle

## Key Files

- `Tutorials/CrossChainDataBridge/PROTOCOL.md` - Full protocol specification
- `Tutorials/CrossChainDataBridge/interfaces/ICitrateInferenceRouter.sol` - Citrate-side interface
- `Tutorials/CrossChainDataBridge/interfaces/ISourceChainInferenceGateway.sol` - Source-chain interface
- `Tutorials/CrossChainDataBridge/CONFLICTS.md` - Documented conflicting guidance or specs
- `Tutorials/CrossChainDataBridge/contracts/src/SourceChainInferenceGateway.sol` - Source gateway implementation
- `Tutorials/CrossChainDataBridge/contracts/src/InferenceConsumer.sol` - Example consumer contract
- `Tutorials/CrossChainDataBridge/relayer/src/index.js` - Relayer implementation
- `Tutorials/CrossChainDataBridge/solana/` - Solana source chain gateway program

## Roles

- Source Chain Contract: emits a request event and accepts finalized results
- Relayer Network: listens for requests, forwards to Citrate, and posts attestations
- Citrate Inference Router: accepts on-chain requests and stores outputs
- Source Chain Result Gateway: verifies attestations and releases results

## Citrate Data Sources

- `InferenceRouter.requestInference(modelHash, inputData, maxPrice)`
- `InferenceRouter.getRequest(requestId)`

These are defined in `citrate_v0.01.1/contracts/src/InferenceRouter.sol` and referenced in the interfaces here.

## Network Constants

- Citrate devnet chain ID: 1337
- Citrate testnet chain ID: 40204
- Token: SALT (18 decimals)

## Protocol Summary

1. Source chain contract emits `InferenceRequested` with request metadata
2. Relayers observe the event and submit a Citrate `requestInference` transaction
3. Compute providers execute inference and finalize on Citrate
4. Relayers attest the Citrate result and submit to the source chain gateway
5. Source chain contract verifies attestations and exposes the result

For the detailed lifecycle, message formats, and security requirements, see `Tutorials/CrossChainDataBridge/PROTOCOL.md`.

## Implementation Quickstart

### 1) Contracts (Foundry)

```bash
cd Tutorials/CrossChainDataBridge/contracts
forge test
```

### 2) Deploy Gateway + Consumer

```bash
cd Tutorials/CrossChainDataBridge/contracts
forge script script/Deploy.s.sol \
  --rpc-url http://localhost:8545 \
  --private-key <YOUR_PRIVATE_KEY> \
  --broadcast
```

The deploy script initializes the gateway with Citrate chain ID `40204` and quorum `1`. Override with `CITRATE_CHAIN_ID` and `QUORUM` env vars if needed.

### 3) Register Relayers

```bash
cast send <GATEWAY_ADDR> \
  "setRelayer(address,bool)" <RELAYER_ADDR> true \
  --private-key <OWNER_PRIVATE_KEY> \
  --rpc-url http://localhost:8545
```

### 4) Relayer

```bash
cd Tutorials/CrossChainDataBridge/relayer
npm install
cp config.example.json config.json
# Edit config.json with real RPCs, addresses, and private keys
node src/index.js
```

EVM combined request + read flow:

```bash
cd Tutorials/CrossChainDataBridge/relayer
cp evm.flow.example.json evm.flow.json
# Edit evm.flow.json with gateway address, requester key, model hash, and input data
node src/evm-flow.js
```

Solana relayer:

```bash
cd Tutorials/CrossChainDataBridge/relayer
npm install
cp solana.config.example.json solana.config.json
# Edit solana.config.json with program ID, relayer keypairs, and Citrate RPC
node src/solana.js
```

Initialize Solana gateway config:

```bash
cd Tutorials/CrossChainDataBridge/relayer
node src/solana-init.js
```

Create a Solana request:

```bash
cd Tutorials/CrossChainDataBridge/relayer
cp solana.request.example.json solana.request.json
# Edit solana.request.json with program ID, requester keypair, model hash, and input data
node src/solana-request.js
```

The request script can deterministically derive `requestId` using:

```
keccak256(requester_pubkey || nonce || model_hash || input_hash || deadline || program_id)
```

Provide `nonce` and set `deterministicRequestId: true` (default).

Read a Solana request PDA:

```bash
cd Tutorials/CrossChainDataBridge/relayer
cp solana.read.example.json solana.read.json
# Edit solana.read.json with program ID and requestId
node src/solana-read.js
```

Combined request + read flow:

```bash
cd Tutorials/CrossChainDataBridge/relayer
cp solana.flow.example.json solana.flow.json
# Edit solana.flow.json with program ID, requester keypair, model hash, and input data
node src/solana-flow.js
```

### 5) Solana Gateway (optional)

```bash
cd Tutorials/CrossChainDataBridge/solana
cargo build-sbf
solana program deploy target/deploy/citrate_crosschain_gateway.so
```

Windows tip: use `cargo build-sbf` and set `RUSTUP_LOG=error` to suppress rustup toolchain noise in the build output.

### 6) Solana Consumer (optional)

```bash
cd Tutorials/CrossChainDataBridge/solana-consumer
cargo build-sbf
solana program deploy target/deploy/citrate_crosschain_consumer.so
```

Windows tip: use `cargo build-sbf` and set `RUSTUP_LOG=error` to suppress rustup toolchain noise in the build output.

You can also pass keys via environment variables to avoid writing them to disk:

```bash
export RELAYER_PRIVATE_KEYS="0x..."
export CITRATE_PRIVATE_KEY="0x..."
node src/index.js
```
