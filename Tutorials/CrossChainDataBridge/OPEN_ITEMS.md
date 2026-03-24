# Cross-Chain Data Bridge Open Items

This list captures remaining work to complete the end-to-end flow.

## Blocking

- Identify a valid `modelHash` on Citrate testnet (or correct ModelRegistry address)
- Obtain funded testnet EVM key for Ethereum source-chain deployment
- Decide Ethereum testnet (e.g., Sepolia) and provide RPC URL

## EVM Source Chain

- Deploy `SourceChainInferenceGateway` to Ethereum testnet
- Register relayer address on the gateway
- Submit a real inference request and verify callback path

## Relayer Configuration

- Set relayer config for Ethereum source chain (RPC, gateway address)
- Set Citrate RPC + InferenceRouter address
- Use env vars for private keys (do not write keys to disk)

## Solana Source Chain (Parallel Track)

- Build and deploy Solana gateway program
- Initialize config PDA with relayer set + quorum
- Run Solana relayer and submit a request

## Documentation

- Update `RPC-Details.md` if ModelRegistry address is corrected
- Add a verified end-to-end walkthrough once model hash is known
