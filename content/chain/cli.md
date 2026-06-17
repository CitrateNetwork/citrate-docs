---
title: The citrate command-line tool
codex_slug: /chain/cli
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/cli/src/{main.rs,config.rs,commands/}
surfaces: [CHAIN-cli-citrate, CHAIN-cli-advanced]
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The `citrate` command-line tool that ships with `citrate-chain`. It manages accounts, deploys and calls
models and contracts, queries the network, and submits governance changes, all against a Citrate Node over
JSON-RPC. This page is for developers and node operators. If you want to read the chain directly instead,
see the [JSON-RPC reference](/chain/rpc).

## What it is

One binary, `citrate`, with a handful of subcommands. Every subcommand talks to a Citrate Node through the
same JSON-RPC interface documented under [chain RPC](/chain/rpc), so the tool is a convenience over the
network, not a separate authority. Defaults come from `cli/src/config.rs`: the RPC endpoint is
`http://localhost:8545`, the chain id is 40204, and the keystore lives under `~/.citrate/keystore`. A global
`--rpc <URL>` flag (or `-r`) overrides the endpoint on any command, and `--config <PATH>` points at a
different config file.

The subcommands, each verified against `cli/src/main.rs`:

| Subcommand | What it does |
|---|---|
| `init` | Writes a starter config file. |
| `account` | Creates, lists, imports, and exports Citrate Keyring accounts; reads balances. |
| `model` | Deploys and inspects on-chain models, and runs inference against them. |
| `contract` | Deploys contracts, calls and reads methods, and submits source for verification. |
| `network` | Read-only chain and network queries: status, blocks, transactions, gas price, peers. |
| `governance` | Queues and executes governance parameter changes through the governance precompile. |
| `advanced` | Network monitoring, benchmarking, stress tests, and DAG and mempool introspection. |
| `wizard` | Interactive, terminal-guided setup and deployment flows. |

The testnet faucet is a separate service, not a subcommand. `citrate-faucet` is an HTTP server, configured
by environment variables, that drips test SALT to an address; you run it or call its endpoint, you do not
reach it through `citrate`.

## How to use it

Build the tool from the workspace root, then confirm it points where you expect:

```bash
cargo build --release -p citrate-cli   # produces the `citrate` binary
citrate init                            # writes a starter config
citrate network status                  # net_version, eth_blockNumber, eth_syncing
```

A typical first session creates an account, checks its balance, and reads a block:

```bash
citrate account create
citrate account balance 0x00000000000000000000000000000000000000a1
citrate network block latest
```

To point at a node other than the local default, pass `--rpc` on any command:

```bash
citrate --rpc https://rpc.example.invalid network status
```

To deploy a contract end to end, follow
[deploy a contract with the CLI](/chain/tutorials/deploy-a-contract-with-the-cli), which walks through
`contract deploy`, `contract call`, and `contract read` against a live node.

## Reference

Representative subcommands, verified against the files in `cli/src/commands/`. A flag not listed here does
not exist in the binary at this SHA.

### account (`cli/src/commands/account.rs`)

| Subcommand | Purpose |
|---|---|
| `account create` | Generates a new account, prompting for a password. |
| `account list` | Lists keystore files. |
| `account balance <ADDRESS>` | Reads a balance via `eth_getBalance`. |
| `account import` | Imports a key from `--key-stdin`, `--key-file`, or the loud `--insecure-key-from-arg`. |
| `account export <ADDRESS>` | Exports a key to a `0600` file with `--out`, or to stdout only with `--confirm-stdout`. |

### model (`cli/src/commands/model.rs`)

| Subcommand | Purpose |
|---|---|
| `model deploy <MODEL>` | Registers a model on-chain (`citrate_deployModel`). |
| `model inference` | Runs inference against a model id (`citrate_runInference`). |
| `model list` | Enumerates registered models (`citrate_listModels`). |
| `model info <MODEL_ID>` | Reads model detail (`citrate_getModel`). |

### contract (`cli/src/commands/contract.rs`)

| Subcommand | Purpose |
|---|---|
| `contract deploy <CONTRACT>` | Deploys a contract (`eth_sendTransaction`). |
| `contract call <ADDRESS> <METHOD>` | Sends a state-changing call. |
| `contract read <ADDRESS> <METHOD>` | Reads a method with no transaction (`eth_call`). |
| `contract verify <ADDRESS> <SOURCE>` | Submits source for runtime-bytecode verification. |

The built-in ABI encoder supports `address`, `bool`, `bytes32`, and `uint{8..256}` only; dynamic `string`
and `bytes` are not yet encoded.

### network (`cli/src/commands/network.rs`)

| Subcommand | Underlying call |
|---|---|
| `network status` | `net_version`, `eth_blockNumber`, `eth_syncing` |
| `network block [BLOCK]` | `eth_getBlockByNumber` |
| `network transaction <TX_HASH>` | `eth_getTransactionByHash` and receipt |
| `network gas-price` | `eth_gasPrice` |
| `network dag-stats` | `citrate_getDagStats` |

### governance (`cli/src/commands/governance.rs`)

Encodes ABI calls to the governance precompile at `0x0000000000000000000000000000000000001003`:
`set-admin`, `queue-param`, `execute-param`, and the read-only `get-param`.

### advanced (`cli/src/commands/advanced.rs`)

Monitoring and introspection: `advanced monitor` polls height, peers, and gas price (with `--dag` and
`--mempool` it adds DAG and mempool detail); `advanced benchmark` and `advanced stress-test` drive load;
`advanced topology` maps peers; `advanced tx-debug <TX_HASH>` traces a transaction; `advanced model-stats`
reads model usage.

## Failure modes

The tool fails closed at the points that touch keys and the network:

- Key input never defaults to the argument vector. The old `--key` flag was removed; `account import --key`
  no longer parses. Use `--key-stdin`, `--key-file`, or the explicit `--insecure-key-from-arg`, which warns.
- `account export` refuses to print a secret to the terminal unless you pass `--out <PATH>` or
  `--confirm-stdout`; the file it writes is mode `0600` on Unix.
- A call against an unreachable node surfaces a connection error rather than a partial result. Confirm the
  endpoint with `citrate network status` or override it with `--rpc`.
- The underlying RPC errors are standard JSON-RPC: `-32601` method not found, `-32602` invalid params,
  `-32600` invalid request.

## Access and canon

Public. This is the open command surface a developer needs. The tool generates or prompts for keys; nothing
sensitive is embedded, and no credentials appear on this page. Deeper interpretation of the `advanced`
introspection output is gated to the academic tier, since it exposes consensus and mempool internals; the
flag list above is public, the internals analysis is not.

## Source and verification

Verified against `citrate-chain` at `03d7851`. The subcommand set is read from `cli/src/main.rs`
(`enum Commands`); defaults from `cli/src/config.rs` (RPC `http://localhost:8545`, chain id 40204); each
subcommand group from `cli/src/commands/{account,model,contract,network,governance,advanced,wizard}.rs`. The
faucet is a separate HTTP service in `faucet/`, not a `citrate` subcommand. Status: Implemented (testnet,
pre-audit). The ABI encoder is intentionally a static-types-only subset.
