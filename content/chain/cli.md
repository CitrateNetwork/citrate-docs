---
title: Citrate Chain CLI Tools
codex_slug: /chain/cli
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-chain (cli/, wallet/, faucet/)
surfaces: [CHAIN-cli-citrate, CHAIN-cli-advanced, CHAIN-cli-wallet, CHAIN-cli-faucet]
audited_against_sha: 03d7851
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Chain CLI Tools

> The command-line tooling that ships with `citrate-chain`: the `citrate` CLI for
> accounts, models, contracts, network ops and governance; the `citrate-wallet`
> key/transaction wallet; and the `citrate-faucet` testnet token service. For
> developers and node operators building on Citrate (chainId **40204**).

## Overview

`citrate-chain` builds three operator-facing binaries:

| Binary | Crate | What it does | Tier |
|---|---|---|---|
| `citrate` | `cli/` | Accounts, model deploy/inference, contract deploy/call, network queries, governance, advanced introspection, interactive wizards. | public (advanced introspection: academic) |
| `citrate-wallet` | `wallet/` | Ed25519 key management + transaction signing/submission via JSON-RPC. | public |
| `citrate-faucet` | `faucet/` | HTTP service that drips test **SALT** to addresses with rate limiting + CAPTCHA. | public |

This page is **transcluded**: the truth lives in the source crates at the pinned
SHA (`03d7851`). Each command below cites the Rust symbol it is audited against;
if a flag is not listed here, it does not exist in the binary at this SHA.

### Build

```bash
# From the citrate-chain workspace root
cargo build --release -p citrate-cli      # produces `citrate`
cargo build --release -p citrate-wallet   # produces `citrate-wallet`
cargo build --release -p citrate-faucet   # produces `citrate-faucet`
```

---

## `citrate` (main CLI)

Source: `cli/src/main.rs` → `Cli` / `Commands`.

### Global flags

Audited against `cli/src/main.rs` (`struct Cli`). These apply to every subcommand:

| Flag | Env | Meaning |
|---|---|---|
| `-c, --config <PATH>` | `CITRATE_CONFIG` | Config file path. |
| `-r, --rpc <URL>` | `CITRATE_RPC` | RPC endpoint override. |
| `-v, --verbose` |, | Verbosity (repeatable: `-v` warn … `-vvvv` trace). |

Defaults come from `cli/src/config.rs` (`Config::default`): RPC `http://localhost:8545`,
`chain_id 40204`, keystore `~/.citrate/keystore`, gas price 1 gwei, gas limit 3,000,000.

### `citrate init`

Audited against `cli/src/main.rs` (`Commands::Init`). Initializes a config file.

| Flag | Meaning |
|---|---|
| `-f, --force` | Overwrite an existing config. |

### `citrate account`

Source: `cli/src/commands/account.rs` → `AccountCommands`. Ed25519 accounts; addresses
are derived to be EVM-compatible (`derive_address`).

| Subcommand | Args / flags | Notes |
|---|---|---|
| `account create` | `-p, --password <PW>`, `-o, --output <PATH>` | Generates a new ed25519 keypair; prompts for password if omitted. |
| `account list` |, | Lists keystore `*.json` files. |
| `account balance <ADDRESS>` |, | `eth_getBalance`. |
| `account import` | `--key-stdin` \| `--key-file <PATH>` \| `--insecure-key-from-arg <HEX>`; `-p, --password` | One key source is **required at runtime**. See Security & access. |
| `account export <ADDRESS>` | `--out <PATH>` \| `--confirm-stdout`; `-p, --password` | Refuses to print to stdout unless `--out` is given or `--confirm-stdout` is set; `--out` writes mode `0600` on Unix. |

> Secure-input note (`RM-K / WP-K1.6`): the legacy `--key` flag was removed, > `account import --key …` no longer parses. Use `--key-stdin` (recommended),
> `--key-file`, or the loud-warning `--insecure-key-from-arg`.

### `citrate model`

Source: `cli/src/commands/model.rs` → `ModelCommands`. On-chain model lifecycle plus
HuggingFace Hub helpers.

| Subcommand | Args / flags |
|---|---|
| `model deploy <MODEL>` | `-m, --metadata <PATH>`, `-n, --name <NAME>`, `-v, --version <VER>`, `-a, --account <ADDR>`, `--access-policy <public\|private\|restricted\|payPerUse>` (default `public`), `--price <WEI>`. RPC: `citrate_deployModel`. |
| `model inference` | `--model-id <HEX>`, `-i, --input <PATH>`, `-o, --output <PATH>`, `--with-proof`. RPC: `citrate_runInference`. |
| `model list` | `-o, --owner <ADDR>`, `-m, --model-type <T>`, `-l, --limit <N>` (default 10). RPC: `citrate_listModels`. |
| `model info <MODEL_ID>` |, RPC: `citrate_getModel`. |
| `model update <MODEL_ID> <METADATA>` | `-a, --account <ADDR>`, `--model <PATH>`, `--cid <CID>`. RPC: `citrate_updateModel`. |
| `model verify <PROOF>` | `--output-hash <HASH>`. RPC: `citrate_verifyProof`. |
| `model search <QUERY>` | `-l, --limit <N>` (default 10), `--gguf <bool>` (default true). HuggingFace search. |
| `model download <REPO_ID>` | `-f, --file <NAME>`, `-o, --output-dir <PATH>` (default `~/.citrate/models`), `--token <HF_TOKEN>` (env `HF_TOKEN`). Lists GGUF files if `--file` omitted; auto-pins to a local IPFS daemon if one is running on `127.0.0.1:5001`. |

### `citrate contract`

Source: `cli/src/commands/contract.rs` → `ContractCommands`. The CLI's ABI encoder
(`encode_method_call`) supports `address`, `bool`, `bytes32`, and `uint{8..256}` only, dynamic `string`/`bytes` are not yet supported.

| Subcommand | Args / flags |
|---|---|
| `contract deploy <CONTRACT>` | `-a, --args <JSON>`, `--account <ADDR>`, `-v, --value <WEI>` (default 0). `.wasm` files are read as bytes; otherwise treated as hex. RPC: `eth_sendTransaction`. |
| `contract call <ADDRESS> <METHOD>` | `-a, --args <JSON>`, `--account <ADDR>`, `-v, --value <WEI>`. RPC: `eth_sendTransaction`. |
| `contract read <ADDRESS> <METHOD>` | `-a, --args <JSON>`. RPC: `eth_call` (no tx). |
| `contract code <ADDRESS>` | `-o, --output <PATH>`. RPC: `eth_getCode`. |
| `contract verify <ADDRESS> <SOURCE>` | `-c, --compiler <VER>`, `-o, --optimized`, `--runtime-bytecode <HEX>`, `--runtime-bytecode-file <PATH>`, `--get <ADDR>`. RPC: `citrate_verifyContract`. |
| `contract verify-get <ADDRESS>` | RPC: `citrate_getVerification`. |
| `contract verify-list` | RPC: `citrate_listVerifications`. |

### `citrate network`

Source: `cli/src/commands/network.rs` → `NetworkCommands`. Read-only chain/network
queries (plus a standalone bootnode reachability check).

| Subcommand | Args / flags | RPC |
|---|---|---|
| `network status` |, | `net_version`, `eth_blockNumber`, `eth_syncing` |
| `network block [BLOCK]` | positional `block` (default `latest`) | `eth_getBlockByNumber` (shows GhostDAG merge-parents / blue score when present) |
| `network transaction <TX_HASH>` |, | `eth_getTransactionByHash` (+ receipt) |
| `network gas-price` |, | `eth_gasPrice` |
| `network peers` |, | `net_peerCount`, `admin_peers` |
| `network sync` |, | `eth_syncing` |
| `network dag-stats` |, | `citrate_getDagStats` |
| `network bootnodes` | `--bootnodes <CSV>` (or env `CITRATE_BOOTNODES`), `--timeout-ms <MS>` (default 3000) | Standalone TCP ping; no local node required. |

### `citrate governance`

Source: `cli/src/commands/governance.rs` → `GovernanceCommands`. Encodes ABI calls to the
governance precompile at `0x0000000000000000000000000000000000001003`.

| Subcommand | Args | Precompile call |
|---|---|---|
| `governance set-admin <ADDRESS>` |, | `setAdmin(address)` (tx) |
| `governance queue-param <KEY> <VALUE> <ETA>` | `eta` is a `u64` timelock | `queueSetParam(bytes32,bytes,uint64)` (tx) |
| `governance execute-param <KEY>` |, | `executeSetParam(bytes32)` (tx) |
| `governance get-param <KEY>` |, | `getParam(bytes32)` (`eth_call`) |

### `citrate advanced`, academic-tier

See **Security & access** below. Source: `cli/src/commands/advanced.rs` → `AdvancedCommands`.
These are network monitoring, benchmarking, stress-test and introspection tools.

| Subcommand | Args / flags |
|---|---|
| `advanced monitor` | `-i, --interval <S>` (5), `-c, --count <N>` (0 = infinite), `--dag`, `--mempool`. Polls `eth_blockNumber`/`net_peerCount`/`eth_gasPrice`; with flags also `citrate_getDAGInfo` / `citrate_getMempoolInfo`. |
| `advanced benchmark` | `-t, --txs <N>` (100), `-c, --concurrency <N>` (10), `--size <BYTES>` (256). |
| `advanced topology` | `--peers`, `--export <dot\|json>`. Uses `citrate_getPeers` / `citrate_getNetworkInfo`. |
| `advanced stress-test` | `-d, --duration <S>` (60), `-t, --tps <N>` (100), `-w, --workers <N>` (4). |
| `advanced tx-debug <TX_HASH>` | `--trace` (adds `debug_traceTransaction` callTracer). |
| `advanced model-stats [MODEL_ID]` | `-r, --range <24h\|7d\|30d>` (24h), `--csv <PATH>`. Uses `citrate_getModelStats`. |

### `citrate wizard`

Source: `cli/src/commands/wizard.rs` → `WizardCommands`. Interactive (TTY) wizards.

| Subcommand | Purpose |
|---|---|
| `wizard model-deploy` | Guided model deployment (`citrate_deployModel`). |
| `wizard dev-setup` | Scaffolds a project (contract / Python / frontend / Rust / fullstack). |
| `wizard contract` | Generates a Solidity contract template. |
| `wizard network` | Selects/tests an RPC endpoint. |

---

## `citrate-wallet`

Source: `wallet/src/main.rs` → `Cli` / `Commands`. Standalone ed25519 wallet; balances and
amounts are denominated in **SALT** (18 decimals).

### Global flags

| Flag | Default | Meaning |
|---|---|---|
| `-k, --keystore <PATH>` | (wallet default) | Keystore path. |
| `-r, --rpc <URL>` | `http://localhost:8545` | RPC URL. |
| `-c, --chain-id <ID>` | `40204` | Chain ID. |

> Note: the binary flag is `--rpc` (the crate README's `--rpc-url` example is stale at
> this SHA). Documented from `wallet/src/main.rs` (`struct Cli`).

### Subcommands

| Subcommand | Args / flags |
|---|---|
| `new` | `-a, --alias <NAME>`. Creates an account (prompts for password). |
| `import` | `-k, --key <HEX>`, `-a, --alias <NAME>`. Prompts for the key (no echo) if `--key` omitted. |
| `list` |, Lists accounts; optionally unlocks to show balances. |
| `balance [ACCOUNT]` | Account index or `0x` address; omit for all. |
| `send` | `-f, --from <INDEX>`, `-t, --to <ADDR>`, `-a, --amount <SALT>`, `-g, --gas-price <GWEI>`, `-l, --gas-limit <N>`. |
| `export <INDEX>` | Prints the decrypted private key after unlock (warns). |
| `info` | Shows keystore path, RPC, chain ID, block, gas price. |
| `interactive` | Menu-driven mode. |

---

## `citrate-faucet`

Source: `faucet/src/main.rs`. The faucet is **not** a subcommand-style CLI, it is an HTTP
server with no positional commands. It is configured entirely by environment variables and
exposes HTTP routes. It drips a fixed **10 SALT** (`DRIP_AMOUNT = 10·10¹⁸ wei`) per request.

### Run

```bash
FAUCET_PRIVATE_KEY=<64-hex-chars> cargo run --release -p citrate-faucet
```

### Environment variables

Audited against `faucet/src/main.rs`:

| Var | Default | Meaning |
|---|---|---|
| `FAUCET_PRIVATE_KEY` | **required** | secp256k1 signing key (hex) for the genesis-funded faucet account. See Security & access. |
| `CITRATE_RPC_URL` | `http://localhost:8545` | Node RPC the faucet submits raw txns to. |
| `CITRATE_API_KEY` |, | Optional `X-API-Key` header for RPC calls. |
| `CITRATE_CHAIN_ID` | `40204` | EIP-155 chain ID for signing. |
| `FAUCET_PORT` | `3002` | Listen port. |
| `FAUCET_WHITELIST` |, | Comma-separated allowlist of addresses. |
| `FAUCET_COOLDOWN_FILE` |, (in-memory) | Path for persistent per-address/per-IP cooldowns. |
| `FAUCET_TURNSTILE_SECRET` |, (disabled) | Cloudflare Turnstile CAPTCHA secret. |
| `FAUCET_TRUSTED_PROXIES` |, (none trusted) | IPs whose `X-Forwarded-For`/`X-Real-IP` are honored. |

### HTTP routes

| Route | Method | Purpose |
|---|---|---|
| `/` | GET | Minimal HTML claim page. |
| `/faucet` | POST | `{"address":"0x…","turnstile_token":"…"}` → drips 10 SALT (`eth_sendRawTransaction`). |
| `/status` | GET | Service status JSON. |
| `/health` | GET | Liveness `{"status":"ok"}`. |

---

## Security & access

**Tiering.** `citrate`, `citrate-wallet`, and `citrate-faucet` reference is **public**, this is the open CLI/RPC surface a developer needs to build (tree §3 rule 6).

**Academic tier, `citrate advanced`.** The advanced DAG / consensus / mempool
introspection subcommands (`advanced monitor --dag --mempool`, `advanced topology`,
`advanced tx-debug --trace`, `advanced model-stats`, and the benchmark/stress harnesses)
expose deep operator/consensus internals (`citrate_getDAGInfo`, `citrate_getMempoolInfo`,
`citrate_getPeers`, `citrate_getNetworkInfo`, `debug_traceTransaction`). Detailed
interpretation of these surfaces is gated **academic** per the registry row
`CHAIN-cli-advanced` (`codex_slug /chain/cli#advanced`); the flag list above is public, the
internals analysis is not.

**No secrets here.** This page contains no keys, mnemonics, or credentials:

- The CLI/wallet **generate** or **prompt** for keys; nothing is embedded.
- `account import`/`export` is hardened (`RM-K / WP-K1.6`): secrets never default to argv,
  stdout export is refused unless explicitly acknowledged, file export is `0600`.
- The **faucet's genesis signing key is supplied only via `FAUCET_PRIVATE_KEY`** and is
  **deliberately not reproduced here**. The repo hardcodes no production key: the only
  deterministic-key fallback is gated behind the `unsafe-deterministic-key` cargo feature
  (OFF by default; local CI only) and a build without it refuses to start without the env
  var (audit `FAU-02`).

## Source & verification

- **Source repo:** `citrate-chain`
- **Paths:** `cli/src/main.rs`, `cli/src/config.rs`, `cli/src/commands/{account,model,contract,network,governance,advanced,wizard}.rs`, `wallet/src/main.rs`, `faucet/src/main.rs`
- **Audited against SHA:** `03d7851`
- **Status:** draft / pre-audit. Surfaces are functional but not yet certified; the
  contract ABI encoder is intentionally a static-types-only subset.
