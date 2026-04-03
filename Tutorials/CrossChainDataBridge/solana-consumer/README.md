# Solana Consumer Example

This program demonstrates how a Solana on-chain consumer can read a Citrate
cross-chain request PDA and consume the output data. It mirrors the EVM
`InferenceConsumer` example by validating that the request is finalized and
logging the output payload.

## Build

```bash
cd Tutorials/CrossChainDataBridge/solana-consumer
cargo build-sbf
```

## Deploy

```bash
solana program deploy target/deploy/citrate_crosschain_consumer.so
```

## Invoke

Invoke the consumer program with the request PDA as the first account.
The instruction data can be empty.

Example (pseudo):

```text
Instruction:
  program_id: <consumer_program_id>
  accounts:
    - request_pda (read-only)
  data: []
```

The program logs the request ID, output hash, and output bytes.
