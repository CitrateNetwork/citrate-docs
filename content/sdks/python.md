---
title: Python SDK
codex_slug: /sdks/python
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-python/citrate_sdk/
surfaces: [SDK-PY-client, SDK-PY-managers, SDK-PY-cli]
audited_against_sha: 0b5c642
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

The Python client for Citrate, for data and ML teams who already live in Python. It reads account state,
deploys models, runs inference, and drives the economic and education managers against a Citrate node. It
is a secondary client. The canonical, fullest SDK is the JavaScript one at [JavaScript SDK](/sdks/js); read
this page when Python is where your work already is, and expect it to lag.

## What it is

`citrate-ai-sdk` is a thin Python layer over a Citrate node's JSON-RPC. You create one `CitrateClient`,
bound to an RPC endpoint and, for writes, a private key. The client speaks JSON-RPC to the node and exposes
the model, inference, and account methods directly. The economic and education surfaces, learning, staking,
classroom, compute, treasury, and farming, are separate manager classes you construct yourself, passing the
client's RPC callable and the relevant contract addresses.

Two facts about maturity belong up front, because the package states them about itself. The SDK is
non-canonical: its own `pyproject.toml` description and its `NON_CANONICAL.md` say the canonical SDK is the
JavaScript `@citratenetwork/sdk`, that features land there first, and that Python may lag by an unbounded amount. And
it is early: the `pyproject.toml` classifier is `Development Status :: 2 - Pre-Alpha`. Treat every surface
here as pre-audit and subject to change. New work should start on the [JavaScript SDK](/sdks/js); reach for
Python when a Python codebase is the reason you are here.

## How to use it

1. Install the package. The distribution is `citrate-ai-sdk`; the import name is `citrate_sdk`.

   ```bash
   pip install citrate-ai-sdk
   ```

2. Point the client at a node. Without a private key the client is read-only, which is all you need for
   balances, nonces, and model listings.

   ```python
   from citrate_sdk import CitrateClient

   client = CitrateClient(rpc_url="https://rpc.example")
   print("chain id:", client.get_chain_id())
   ```

3. Supply a key for writes. Pass it through the environment, never in source. A remote `http://` endpoint
   raises a cleartext-transport warning, because a signed transaction would cross the wire in the clear;
   `localhost` http is allowed silently. Pass `allow_insecure_http=True` only when you mean plaintext to a
   remote host.

   ```python
   import os
   from citrate_sdk import CitrateClient

   client = CitrateClient(
       rpc_url=os.environ["CITRATE_RPC_URL"],
       private_key=os.environ["CITRATE_PRIVATE_KEY"],
   )
   ```

4. Use a manager when you need an economic or education surface. Managers are not attributes of the client;
   you construct them with the client's `_rpc_call` callable and the addresses they act on.

   ```python
   from citrate_sdk import FarmingManager

   farming = FarmingManager(
       client._rpc_call,
       contract_addresses={"farming": "0xFarmingContract"},
   )
   for row in farming.get_leaderboard(count=10):
       print(row)
   ```

The full install-to-inference walkthrough is in [Python quickstart](/sdks/python/tutorials/python-quickstart).

## Reference

The surface below is verified against `citrate-sdk-python` at `0b5c642`. Distribution name `citrate-ai-sdk`,
version `0.5.0`, `requires-python >= 3.10`. Runtime dependencies, from `pyproject.toml`: `requests~=2.33`,
`cryptography~=46.0`, `eth-account~=0.9`, `web3~=7.15`, `numpy~=2.0`, `typing-extensions~=4.0`. Optional
extras: `dev`, `docs`. Configuration reads `CITRATE_RPC_URL`, `CITRATE_CHAIN_ID`, and `CITRATE_PRIVATE_KEY`
in the examples and tests.

### CitrateClient

Source: `citrate_sdk/client.py` (class `CitrateClient`), exported from `citrate_sdk/__init__.py`.

| Method | Signature | Notes |
|---|---|---|
| `__init__` | `(rpc_url="http://localhost:8545", private_key=None, allow_insecure_http=False)` | `client.py:31`. Read-only without a key. |
| `get_chain_id()` | `-> int` | `eth_chainId`, `client.py:103`. |
| `get_balance(address)` | `-> int` | wei, `eth_getBalance`, `client.py:107`. |
| `get_nonce(address)` | `-> int` | pending nonce, `eth_getTransactionCount`, `client.py:112`. |
| `deploy_model(model_path, config)` | `-> ModelDeployment` | needs a key; hashes, optionally encrypts, uploads to IPFS, deploys via precompile `0x...0100`, `client.py:117`. |
| `inference(model_id, input_data, encrypted=False, max_gas=1000000, recipient_public_key=None)` | `-> InferenceResult` | precompile `0x...0101`; the encrypted path fails closed without `recipient_public_key`, `client.py:192`. |
| `get_model_info(model_id)` | `-> Dict` | `citrate_getModel`, raises `ModelNotFoundError`, `client.py:267`. |
| `list_models(owner=None, limit=100)` | `-> List[Dict]` | `citrate_listModels`, `client.py:277`. |
| `purchase_model_access(model_id, payment_amount)` | `-> str` | needs a key; access-control precompile `0x...0104`, `client.py:282`. |

Signing binds `chainId` under EIP-155 (`_eip155_chain_id`, `client.py:312`) so a signature cannot be replayed
on another network. IPFS upload fails closed rather than fabricating a fallback CID (`client.py:298`). A
private key creates a `KeyManager` on `client.key_manager` (`citrate_sdk/crypto.py`), which exposes
`get_address()`, `get_private_key()`, and the ECDH helpers used by encrypted inference.

### Economic and education managers

These are separate classes, not attributes of `CitrateClient`. Each takes the `_rpc_call` callable, an
optional `default_account` (required for writes), `gas_limit`, `gas_price`, and the addresses it acts on.
Most take a `contract_addresses` dict; `StakingManager` and `ClassroomManager` instead take a single
`staking_address` or `classroom_address`. Writes raise `ConfigurationError` when `default_account` is unset;
read methods are `eth_call`-only and need no account.

| Manager | Source | Selected methods |
|---|---|---|
| `LearningManager` | `learning.py:176` | `list_pools`, `join_pool`, `leave_pool`, `create_pool`, `get_cycle_status`, `register_for_cycle`, `claim_cycle_reward`, `get_contributions`, `claim_contribution_rewards` |
| `StakingManager` | `learning.py:461` | `deposit`, `withdraw`, `claim_withdrawal`, `get_info`, `preview_deposit`, `preview_withdraw`, `get_withdrawal` |
| `ClassroomManager` | `learning.py:629` | `create`, `enroll`, `unenroll`, `deploy_model`, `remove_model`, `rotate_invite_code`, `get_classroom`, `can_student_access_model`, `get_student_teacher` |
| `ComputeManager` | `compute.py:72` | `post_job`, `bid_on_job`, `get_job`, `list_jobs`, `submit_result`, `register_provider`, `get_provider_info`, `heartbeat`, `create_pool`, `join_pool`, `leave_pool`, `get_pools`, `dispute_result`, `get_dispute` |
| `TreasuryManager` | `treasury.py:60` | `deposit_stablecoin`, `purchase_compute_credits`, `get_credit_balance`, `estimate_calls_remaining`, `get_treasury_value`, `get_epoch_revenue`, `get_current_epoch`, `get_stablecoin_balance`, `get_total_distributed`, `get_credit_price_usd` |
| `FarmingManager` | `farming.py:56` | `get_my_score`, `get_my_share`, `get_leaderboard`, `claim`, `has_claimed`, `get_distribution_info`, `is_in_snapshot`, `get_claimed_amount` |

All six classes are re-exported from `citrate_sdk/__init__.py`. Shared data types (`LearningPool`,
`CycleStatus`, `ComputeJob`, `ProviderInfo`, `StakingInfo`, and the rest) live in `citrate_sdk/types.py`;
model types (`ModelConfig`, `ModelDeployment`, `InferenceResult`, `ModelType`, `AccessType`) live in
`citrate_sdk/models.py`.

### The citrate console script

`pyproject.toml` declares a console script under `[project.scripts]`, `citrate = "citrate_sdk.cli:main"`,
and it now resolves. `citrate_sdk/cli.py` implements `main()` over the standard-library `argparse`, with four
command groups, each reading the generated federation contract so addresses and endpoints are never hand-typed:

- `citrate contract [--section all|chain|aa|identity|gateway|entitlements]`, print the canonical table.
- `citrate wallet predict (--user-id 0x… | --uuid <uuid>) [--verify]`, the embedded smart-account address;
  `--verify` checks it against the on-chain factory.
- `citrate entitlement capabilities|normalize --tier <tier>`, the canonical capability set for a tier.
- `citrate gateway models|health|chat --model M --message TEXT [--api-key KEY]`, the inference gateway.

For example, `citrate wallet predict --user-id 0x4242…4242` prints the same address the on-chain factory
deploys. Status for this surface: Implemented.

## Identity, entitlements, and gateway

Beyond the on-chain client, the Python SDK ships the same identity spine, embedded Keyring account, entitlement
capabilities, and inference-gateway client as the JavaScript SDK, at full parity. `citrate_sdk.identity`
covers OIDC PKCE and SIWE sign-in, hardened ID-token verification, and smart-account address prediction that
matches the on-chain factory byte-for-byte; `citrate_sdk.entitlements` is the canonical `normalize_tier` and
capability map; `citrate_sdk.gateway` is an OpenAI-compatible client for `infer.citrate.ai`. These use only
existing dependencies (`cryptography`, `eth_utils`, `requests`). See [identity and the embedded Keyring account](/sdks/identity)
and [entitlements](/sdks/entitlements) for the shared reference; the examples there include Python.

## Design rationale

The managers are constructed separately, rather than hung off the client, because each binds to a contract
address that varies by deployment and that the client has no business knowing by default. Passing
`_rpc_call` keeps a single transport and a single signing path while letting a caller wire up only the
surfaces they use. The harder edges, EIP-155 chain binding on every signature and a fail-closed IPFS upload,
are there so a transaction signed for Citrate cannot be replayed elsewhere and so a deploy never reports a
fabricated content hash. The cost of being a secondary client is real: this SDK trails the JavaScript one,
and we say so rather than paper over it.

## Failure modes

- Encrypted inference without `recipient_public_key` fails closed (`client.py:208`). The symmetric key is
  ECDH-wrapped to the recipient and is never shipped in cleartext on public calldata.
- A signed transaction binds `chainId` via EIP-155, so it cannot be replayed on a different network.
- IPFS upload failures propagate; `deploy_model` never invents a fallback CID (`client.py:298`).
- A manager write without `default_account` raises `ConfigurationError`. Reads are `eth_call`-only and need
  no account.
- A remote `http://` RPC endpoint raises a cleartext-transport warning. Use `https://`, or set
  `allow_insecure_http=True` only when you intend plaintext to a remote host.
- Running the `citrate` console script raises `ModuleNotFoundError`; the CLI is not implemented.

## Access and canon

Public. This is open SDK reference a developer needs to build on Citrate, so no tier gate applies. No keys,
mnemonics, or private endpoints appear here; private keys are supplied at runtime through `private_key=` or
`CITRATE_PRIVATE_KEY` and must never be committed. Every node and machine on the public network is
identity-checked through CLEAR before it can take part; the SDK itself holds no such data.

## Source and verification

- Source repo: `citrate-sdk-python`.
- Paths: `citrate_sdk/client.py`, `citrate_sdk/learning.py`, `citrate_sdk/compute.py`,
  `citrate_sdk/treasury.py`, `citrate_sdk/farming.py`, `citrate_sdk/crypto.py`, `citrate_sdk/types.py`,
  `citrate_sdk/models.py`, `citrate_sdk/__init__.py`, `pyproject.toml`, `examples/`, `NON_CANONICAL.md`.
- Audited against SHA: `0b5c642`.
- Status: Implemented, pre-audit, non-canonical (the canonical SDK is the [JavaScript SDK](/sdks/js)). The
  `citrate` console script is Specified, not Implemented.
