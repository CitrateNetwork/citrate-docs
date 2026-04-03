# Solana Source Chain Gateway

This program is the Solana source-chain gateway for Citrate cross-chain inference. It stores requests, enforces relayer quorum, and records inference outputs for Solana programs to consume.

## Build

```bash
cd Tutorials/CrossChainDataBridge/solana
cargo build-sbf
```

## Deploy

```bash
solana program deploy target/deploy/citrate_crosschain_gateway.so
```

## Tests

```bash
cd Tutorials/CrossChainDataBridge/solana
cargo test
```

## Initialize Config

Create the config PDA with the desired Citrate chain ID and relayer quorum. The initializer becomes the owner.

Program seeds:

- Config PDA: `"config"`
- Request PDA: `"request" + request_id`

## Request Lifecycle

1. Client invokes `RequestInference` to create a request account
2. Relayers submit `FinalizeInference` (or `MarkFailed`) with quorum signatures
3. Solana programs read the request account to access `output_data`

## Deterministic Request IDs

The helper script derives request IDs with:

```
keccak256(requester_pubkey || nonce || model_hash || input_hash || deadline || program_id)
```

Set `nonce` in `solana.request.json` to reproduce the same request ID.
The on-chain program accepts any 32-byte request ID; the format is client-side.

## Local Client Helpers

The tutorial ships lightweight Node scripts for submitting and reading requests:

```bash
cd Tutorials/CrossChainDataBridge/relayer
cp solana.request.example.json solana.request.json
node src/solana-request.js

cp solana.read.example.json solana.read.json
node src/solana-read.js
```

Combined request + read flow:

```bash
cd Tutorials/CrossChainDataBridge/relayer
cp solana.flow.example.json solana.flow.json
node src/solana-flow.js
```

## Limits

- Max input bytes: 1024
- Max output bytes: 2048
- Max relayers: 5

## Consumer Example

An on-chain consumer example that reads the request PDA and logs the output is
available in `Tutorials/CrossChainDataBridge/solana-consumer`.
