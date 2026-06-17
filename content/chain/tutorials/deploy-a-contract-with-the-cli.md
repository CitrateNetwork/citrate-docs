---
title: Deploy a Contract with the Citrate CLI
codex_slug: /chain/tutorials/deploy-a-contract-with-the-cli
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain (cli/src/commands/contract.rs)
surfaces: [CHAIN-cli-citrate, CHAIN-cli-wallet]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Deploy a Contract with the Citrate CLI

> End-to-end: build the `citrate` CLI, create an account, fund it from the faucet, deploy
> compiled EVM bytecode, then read and call the contract. Runnable against a local node or
> the Citrate testnet (chainId **40204**).

## Prerequisites

- A clone of `citrate-chain` and a working Rust toolchain.
- A reachable Citrate JSON-RPC endpoint (local node on `http://localhost:8545`, or a testnet RPC).
- Compiled contract bytecode (a hex file, or a `.wasm` file). This tutorial assumes a hex
  bytecode file `MyToken.bin`. (Use `forge build` / `solc --bin` to produce it.)

## 1. Build the CLI

```bash
cargo build --release -p citrate-cli
# binary at target/release/citrate
export PATH="$PWD/target/release:$PATH"
```

## 2. Initialize config

```bash
citrate init
```

Defaults (from `cli/src/config.rs`): RPC `http://localhost:8545`, chainId `40204`,
keystore `~/.citrate/keystore`, gas price 1 gwei, gas limit 3,000,000. Override the RPC
per-command with `--rpc <URL>` or the `CITRATE_RPC` env var.

## 3. Create an account

```bash
citrate account create
# Enter a keystore password when prompted.
# Prints: Address: 0x…   (note this — it's your deployer)
```

List it back any time:

```bash
citrate account list
```

## 4. Fund the account (testnet)

If you are on a network with a faucet, request test SALT for your new address:

```bash
curl -X POST http://localhost:3002/faucet \
  -H 'Content-Type: application/json' \
  -d '{"address":"0xYOUR_ADDRESS"}'
```

Confirm the balance landed:

```bash
citrate account balance 0xYOUR_ADDRESS
```

## 5. Deploy the contract

```bash
citrate contract deploy ./MyToken.bin \
  --account 0xYOUR_ADDRESS \
  --value 0
```

The CLI submits `eth_sendTransaction`, waits for the receipt, and prints the new
**Contract Address**. Save it:

```bash
export CONTRACT=0xDEPLOYED_CONTRACT_ADDRESS
```

> `.bin` (and any non-`.wasm`) file is read as hex bytecode; a `.wasm` file is read as raw
> bytes. Constructor args go in `--args '<JSON array>'`.

## 6. Read contract state (no transaction)

`contract read` uses `eth_call`, so it costs nothing and needs no account:

```bash
citrate contract read "$CONTRACT" "totalSupply()"
```

For a method with arguments, pass a JSON array via `--args`:

```bash
citrate contract read "$CONTRACT" "balanceOf(address)" \
  --args '["0xYOUR_ADDRESS"]'
```

> ABI encoding supports `address`, `bool`, `bytes32`, and `uint{8..256}` only
> (`encode_method_call` in `cli/src/commands/contract.rs`). Dynamic `string`/`bytes`
> arguments are not yet supported by the CLI encoder.

## 7. Call a state-changing method

```bash
citrate contract call "$CONTRACT" "transfer(address,uint256)" \
  --args '["0x1111111111111111111111111111111111111111", "1000"]' \
  --account 0xYOUR_ADDRESS
```

The CLI sends the transaction, waits for the receipt, reports gas used and any emitted
event topics.

## 8. Inspect the result

```bash
# Fetch the deployed bytecode
citrate contract code "$CONTRACT"

# Look at the deploy/call transaction
citrate network transaction 0xTX_HASH

# Check overall network status
citrate network status
```

## Optional: deploy via the wallet instead

`citrate-wallet` is the standalone signer if you prefer to manage keys there:

```bash
cargo build --release -p citrate-wallet
citrate-wallet --rpc http://localhost:8545 new --alias deployer
citrate-wallet --rpc http://localhost:8545 send \
  --from 0 --to 0xRECIPIENT --amount 1.0
```

(`citrate-wallet` uses `--rpc`, not `--rpc-url`.)

## Verify (optional)

If your node supports source verification:

```bash
citrate contract verify "$CONTRACT" ./MyToken.sol \
  --compiler v0.8.19 --optimized
citrate contract verify-get "$CONTRACT"
```

## Source & verification

- **Source repo:** `citrate-chain`
- **Paths:** `cli/src/commands/contract.rs`, `cli/src/config.rs`, `cli/src/commands/account.rs`, `wallet/src/main.rs`
- **Audited against SHA:** `03d7851`
- **Status:** draft / pre-audit. Commands and flags shown exist at this SHA; the contract
  ABI encoder is a static-types-only subset.
