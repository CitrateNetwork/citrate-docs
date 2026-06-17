---
title: Deploy a contract with the CLI
codex_slug: /chain/tutorials/deploy-a-contract-with-the-cli
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain cli/src/commands/contract.rs
surfaces: [CHAIN-cli-citrate, CHAIN-cli-contract]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

A copy-paste walkthrough of deploying compiled bytecode with the `citrate` command-line tool. You will
confirm the chain id, point the tool at your endpoint, deploy a contract, then verify the deployment with a
read-only `eth_` call. The deploy step writes state, so it needs an account with a little SALT; the verify
step does not.

## What it is

`citrate` is the command-line tool built from `citrate-chain`. Its contract operations live under the
`contract` subcommand, which submits an `eth_sendTransaction` to your endpoint, waits for the receipt, and
prints the new address. Under the surface it speaks the same JSON-RPC you met in
[call the Citrate RPC](/chain/tutorials/call-citrate-rpc), so anything the tool does you could also do by
hand. For the wider command set, see the [CLI reference](/chain/cli).

## How to use it

You will need a clone of `citrate-chain` with a Rust toolchain, a reachable JSON-RPC endpoint (a local node
on `http://localhost:8545`, or a testnet endpoint), and a compiled contract artifact. This tutorial assumes a
hex bytecode file named `MyToken.bin`; produce one with your usual compiler, for example `solc --bin`.

### Step 1, build the tool

```bash
cargo build --release -p citrate-cli
# binary at target/release/citrate
export PATH="$PWD/target/release:$PATH"
```

### Step 2, initialize the config

```bash
citrate init
```

The defaults, from `cli/src/config.rs`, are RPC `http://localhost:8545`, chain id 40204, keystore
`~/.citrate/keystore`, gas price 1 gwei, and gas limit 3,000,000. Override the endpoint for any command with
the global `--rpc <URL>` flag or the `CITRATE_RPC` environment variable.

### Step 3, confirm the chain id

Before you write anything, confirm the endpoint is Citrate testnet. The tool stores chain id 40204 by
default; check the live endpoint agrees with the same RPC call as the other tutorials:

```bash
curl -s http://localhost:8545 -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'
# {"jsonrpc":"2.0","id":1,"result":"0x9d0c"}
printf '%d\n' 0x9d0c   # 40204
```

`0x9d0c` is 40204. Anything else means you are about to deploy to a different network.

### Step 4, prepare an account and the artifact

Create a deployer account and note the address it prints:

```bash
citrate account create
# Enter a keystore password when prompted.
# Prints: Address: 0x...

citrate account list
```

The deploy transaction spends gas, so the account needs a little SALT. On a network with a faucet, fund the
address through that network's faucet, then confirm the balance:

```bash
citrate account balance 0xYOUR_ADDRESS
```

The faucet is a network service, not a `citrate` subcommand, so its exact address and request shape vary by
deployment; check the endpoint operator's notes. The artifact itself is the `MyToken.bin` hex file from your
compiler. A file that does not end in `.wasm` is read as hex bytecode; a `.wasm` file is read as raw bytes.

### Step 5, deploy the contract

```bash
citrate contract deploy ./MyToken.bin \
  --account 0xYOUR_ADDRESS \
  --value 0
```

The tool submits `eth_sendTransaction`, waits for the receipt, and prints the new contract address. Save it:

```bash
export CONTRACT=0xDEPLOYED_CONTRACT_ADDRESS
```

Constructor arguments, if your contract takes any, go in `--args '<JSON array>'`. The tool's encoder is a
static-types subset: it handles `address`, `bool`, `bytes32`, and `uint8` through `uint256`. Dynamic `string`
and `bytes` arguments are not yet supported (`encode_method_call` in `cli/src/commands/contract.rs`).

### Step 6, verify the deployment with an eth_ call

Confirm the code actually landed at the address. `contract code` wraps `eth_getCode`, which is read-only and
needs no account:

```bash
citrate contract code "$CONTRACT"
# Contract code retrieved
# Size: ... bytes
```

You can confirm the same thing directly over RPC, which is the call the tool makes:

```bash
curl -s http://localhost:8545 -H 'content-type: application/json' \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_getCode\",\"params\":[\"$CONTRACT\",\"latest\"]}"
# a non-"0x" result means code is present
```

To inspect the deploy transaction itself, fetch its receipt. The tool polls `eth_getTransactionReceipt`
internally while it waits; you can read the same receipt with `citrate network transaction 0xTX_HASH`.

### Step 7, read and call the contract

`contract read` uses `eth_call`, so it costs nothing and needs no account:

```bash
citrate contract read "$CONTRACT" "totalSupply()"

citrate contract read "$CONTRACT" "balanceOf(address)" \
  --args '["0xYOUR_ADDRESS"]'
```

`contract call` sends a state-changing transaction, waits for the receipt, and reports gas used and any
emitted event topics:

```bash
citrate contract call "$CONTRACT" "transfer(address,uint256)" \
  --args '["0x1111111111111111111111111111111111111111", "1000"]' \
  --account 0xYOUR_ADDRESS
```

### Step 8, pick your next page

| If you want to | Go to |
|---|---|
| The full CLI command set | [CLI reference](/chain/cli) |
| The RPC the tool speaks underneath | [call the Citrate RPC](/chain/tutorials/call-citrate-rpc) |
| Every RPC method, with params and shapes | [JSON-RPC reference](/chain/rpc) |
| The consensus your transaction commits to | [consensus, GhostDAG](/chain/consensus) |

## Reference

The commands used above, with their source in `citrate-chain`:

| Command | What it does | Source |
|---|---|---|
| `citrate init` | write the default config and keystore directory | `cli/src/config.rs` |
| `citrate account create` / `list` / `balance` | manage and read deployer accounts | `cli/src/commands/account.rs` |
| `citrate contract deploy <file> --account --value --args` | submit `eth_sendTransaction`, await receipt, print address | `cli/src/commands/contract.rs` |
| `citrate contract code <address>` | read code via `eth_getCode` | `cli/src/commands/contract.rs` |
| `citrate contract read <address> <sig> --args` | read state via `eth_call` | `cli/src/commands/contract.rs` |
| `citrate contract call <address> <sig> --account --args` | send a state-changing transaction | `cli/src/commands/contract.rs` |
| `citrate network transaction <hash>` | read a transaction receipt | `cli/src/commands/network.rs` |

The global `--rpc <URL>` flag and the `CITRATE_RPC` environment variable override the endpoint for any
command (`cli/src/main.rs`). Deploy and call both poll `eth_getTransactionReceipt` while they wait
(`wait_for_receipt` in `cli/src/commands/contract.rs`).

## Failure modes

- **`No account specified and no default account configured`** means you passed no `--account` and set no
  default. Pass `--account 0x...`.
- **`Transaction receipt not found after 60 seconds`** means the deploy or call transaction did not confirm
  in the poll window. Check the node is producing blocks and the account has SALT for gas.
- **`Contract deployment failed`** with no contract address means the transaction reverted or ran out of gas;
  the default gas limit is 3,000,000, raised through the config.
- **`dynamic types (string, bytes) are not supported`** comes from the CLI encoder. Use a contract method
  whose arguments are the supported static types, or encode the call data yourself and deploy raw.
- **`Connection refused`** means no node is listening on the endpoint. Point `--rpc` at a reachable one.

## Access and canon

Public. The read steps (`contract code`, `contract read`, `eth_getCode`) write nothing and need no account.
Deploying and calling write state and spend gas, so they need an account with SALT. Chain id 40204 is
testnet; confirm the live endpoint reports `0x9d0c` before you deploy anything you care about. Keys live in
the local keystore at `~/.citrate/keystore`; the Citrate Keyring, not a hosted service, holds them.

## Source and verification

Commands verified against `citrate-chain` at `03d7851`. Contract operations are in
`cli/src/commands/contract.rs`, with the subcommands `deploy`, `call`, `read`, `code`, `verify`, `verify-get`,
and `verify-list`. Config defaults are in `cli/src/config.rs`, the global `--rpc` flag and the top-level
subcommands are in `cli/src/main.rs`, account operations are in `cli/src/commands/account.rs`, and the
transaction lookup is in `cli/src/commands/network.rs`. The faucet is a network service and has no `citrate`
subcommand, so its address and request shape are described generically above. Status: Implemented (testnet
40204), pre external audit. The CLI ABI encoder is a static-types subset.
