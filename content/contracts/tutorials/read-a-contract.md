---
title: Read a contract
codex_slug: /contracts/tutorials/read-a-contract
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/contracts/src (WrappedSALT.sol, LiquidStakingPool.sol)
surfaces: [SC-econ-wrappedSALT, SC-econ-staking]
audited_against_sha: 9d5959e
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Read a deployed contract's state on the Citrate Network without sending a transaction. You will confirm the contract exists with `eth_getCode`, then call a view function with `eth_call`, first by encoding the selector yourself and then with tooling that does it for you. Read-only, no account, no gas, about ten minutes.

## What it is

Reading a contract is a request, not a transaction. `eth_call` runs a function against the network's current state and hands back the return value; nothing is written, no fee is charged, and no signature is needed. The only inputs are the contract address and the function call data: a four-byte selector, the first four bytes of the keccak256 hash of the function signature, followed by any ABI-encoded arguments.

The examples below read two contracts in the network economics family: Wrapped SALT, an ERC-20 wrapper whose `symbol` and `decimals` are constants, and the liquid staking pool, whose share price is computed live. Both are described under [economics contracts](/contracts/economics).

## How to use it

You need a reachable Citrate JSON-RPC endpoint. The public one is `https://rpc.citrate.ai`. A local node serves `http://127.0.0.1:8545`. You will also want `curl`, and the `cast` command from [Foundry](https://book.getfoundry.sh/cast/) for the encode-free path.

Set up the same small helper used in [your first 10 minutes](/start/tutorials/your-first-10-minutes), so the steps stay short:

```bash
export RPC=https://rpc.citrate.ai

rpc () {
  curl -s "$RPC" -H 'content-type: application/json' \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"$1\",\"params\":${2:-[]}}"
}
```

Read the address you want from `contracts/addresses/40204.json`, the canonical record described on the [contracts reference](/contracts/reference). The examples here use the Wrapped SALT and liquid staking pool addresses from that file; always confirm an address with step 1 before trusting it, because the chain can be re-rolled.

### Step 1, confirm the contract exists

Ask the network for the code at the address. A non-empty result means a contract is deployed there. A bare `0x` means the address is empty or an account, in which case stop, you have the wrong address.

```bash
rpc eth_getCode '["<WrappedSALT-address>", "latest"]'
# {"jsonrpc":"2.0","id":1,"result":"0x6080604052..."}   # long hex, a contract is here
```

### Step 2, call a view function with raw eth_call

`WrappedSALT.symbol()` takes no arguments, so the call data is just its selector. The selector for `symbol()` is `0x95d89b41`. Put the address and the selector in an `eth_call`.

```bash
rpc eth_call '[{"to":"<WrappedSALT-address>","data":"0x95d89b41"},"latest"]'
```

The `result` is an ABI-encoded string. Decoding it gives `wSALT`, the symbol declared as a constant in the source. You can compute any selector yourself with `cast sig "symbol()"`, which returns `0x95d89b41`.

### Step 3, let cast encode and decode for you

Hand-encoding selectors is error-prone, so for everyday work let `cast` do it. You give it the human-readable signature and it handles both the encoding and the decoding.

```bash
cast call <WrappedSALT-address> "symbol()(string)"   --rpc-url $RPC   # wSALT
cast call <WrappedSALT-address> "decimals()(uint8)"  --rpc-url $RPC   # 18
```

### Step 4, read a value that is computed live

`LiquidStakingPool.getSharePrice()` returns SALT per staked-SALT share, scaled by 1e18, and returns exactly 1e18 when the pool is empty. It takes no arguments and reads live state.

```bash
cast call <LiquidStakingPool-address> "getSharePrice()(uint256)" --rpc-url $RPC
```

A function that takes an argument encodes that argument into the call data after the selector. `cast` does the encoding from the signature.

```bash
cast call <LiquidStakingPool-address> \
  "balanceOf(address)(uint256)" \
  0x0000000000000000000000000000000000000000 \
  --rpc-url $RPC
# 0   (the zero address holds no shares)
```

One caution. `LiquidStakingPool.balanceOf(address)` returns the SALT value of a staker's shares, not a raw token count, so the signature alone does not tell you the meaning. Read the contract's NatSpec before assuming what a function returns.

## Reference

The functions read above, with their source files.

| Contract | Function | Returns | Source |
|---|---|---|---|
| WrappedSALT | `symbol()` | `wSALT`, a constant | `contracts/src/WrappedSALT.sol` |
| WrappedSALT | `decimals()` | `18`, a constant | `contracts/src/WrappedSALT.sol` |
| LiquidStakingPool | `getSharePrice()` | SALT per share, 1e18-scaled | `contracts/src/LiquidStakingPool.sol` |
| LiquidStakingPool | `balanceOf(address)` | SALT value of a staker's shares | `contracts/src/LiquidStakingPool.sol` |

For the full read surface and patterns like reading events, see [interact read-only](/contracts/tutorials/interact-read-only). For the address and ABI sources, see the [contracts reference](/contracts/reference).

## Failure modes

- A `0x` result from `eth_getCode` means no contract is at the address. Re-read it from `contracts/addresses/40204.json`; the chain may have been re-rolled since you copied it.
- `-32601 Method not found` means the RPC method is misspelled or not served by the node.
- A call that reverts comes back as an error, not a value. Check that the function exists in the ABI and that any arguments are well-formed.
- A decoded value that looks wrong is often a signature mismatch. Confirm the return type against the source before reading meaning into it, as with `balanceOf` above.

## Access and canon

Public and read-only. Nothing here writes state, so you can run it against any Citrate endpoint you can reach without risk. No keys, no credentials, no gas. The public RPC hostname and the contract addresses are public values; re-verify any address with step 1 before trusting it.

## Source and verification

Functions verified against `citrate-chain` at SHA `9d5959e`: `contracts/src/WrappedSALT.sol` (`symbol`, `decimals`), `contracts/src/LiquidStakingPool.sol` (`getSharePrice`, `balanceOf`). Addresses live in `contracts/addresses/40204.json`, chain 40204, testnet beta. Status: Implemented, testnet beta, pre-audit.

See also [chain RPC](/chain/rpc) and the [chain CLI](/chain/cli).
