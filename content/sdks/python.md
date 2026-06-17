---
title: Python SDK (citrate-ai-sdk)
codex_slug: /sdks/python
tier: public
org_scope: ~
source_kind: transcluded
source: citrate-sdk-python/citrate_sdk/
surfaces: [SDK-PY-client, SDK-PY-managers, SDK-PY-cli]
audited_against_sha: 0b5c642
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Python SDK (`citrate-ai-sdk`)

> The Python client for the Citrate distributed-AI network — deploy models, run
> (optionally encrypted) inference, read balances/nonces, and drive the
> Learning / Staking / Classroom / Compute / Treasury / Farming managers. For
> Python developers and data/ML teams.

## Overview

`citrate-ai-sdk` is the **non-canonical** Python SDK for Citrate. The canonical
SDK is the TypeScript `citrate-js` SDK; the Python SDK is opt-in and may lag the
canonical one. This is stated in the package metadata itself
(`pyproject.toml` `description`, and `citrate-sdk-python/NON_CANONICAL.md`).

The package is in early development. Its `pyproject.toml` classifier is
`Development Status :: 2 - Pre-Alpha` — treat every surface here as
**experimental and pre-audit**.

Mental model: you create one `CitrateClient` bound to an RPC endpoint and
(optionally) a private key. The client talks JSON-RPC to a Citrate node and
exposes core model/inference/account methods directly. The economic and
education **managers** are separate classes that you construct yourself,
passing them the client's `_rpc_call` callable plus the relevant contract
addresses.

## Install / Setup

- **PyPI package name:** `citrate-ai-sdk` (import name is `citrate_sdk`)
- **Version (audited):** `0.5.0`
- **Python:** `>=3.10` (classifiers list 3.10 / 3.11 / 3.12)

```bash
pip install citrate-ai-sdk
```

> Source-of-truth: `citrate-sdk-python/pyproject.toml`
> (`[project] name`, `version`, `requires-python`, `classifiers`).

Runtime dependencies (from `pyproject.toml`): `requests~=2.33`,
`cryptography~=46.0`, `eth-account~=0.9`, `web3~=7.15`, `numpy~=2.0`,
`typing-extensions~=4.0`. Optional extras: `[dev]`, `[docs]`.

Configuration is via constructor args or environment variables used by the
examples/tests: `CITRATE_RPC_URL`, `CITRATE_CHAIN_ID`, `CITRATE_PRIVATE_KEY`.
**Never commit a private key** — pass it through the environment (see Security
& access below).

```python
from citrate_sdk import CitrateClient

client = CitrateClient(
    rpc_url="https://rpc.example",   # your node's RPC endpoint
    private_key=None,                 # read-only if omitted
)
```

A remote `http://` endpoint raises a cleartext-transport warning (SECREM-01
WEB-4); `localhost` http is allowed silently. Pass `allow_insecure_http=True`
only when you intend plaintext to a remote host
(`citrate_sdk/client.py:31`, `citrate_sdk/_url_security.py`).

## Reference

### SDK-PY-client — `CitrateClient`

Source: `citrate-sdk-python/citrate_sdk/client.py` (class `CitrateClient`).
Exported from `citrate_sdk/__init__.py`.

| Method | Signature | Notes |
|---|---|---|
| `__init__` | `(rpc_url="http://localhost:8545", private_key=None, allow_insecure_http=False)` | `client.py:31`. Read-only without a key. |
| `get_chain_id()` | `-> int` | `eth_chainId` (`client.py:103`). |
| `get_balance(address)` | `-> int` | wei; `eth_getBalance` (`client.py:107`). |
| `get_nonce(address)` | `-> int` | pending nonce; `eth_getTransactionCount` (`client.py:112`). |
| `deploy_model(model_path, config)` | `-> ModelDeployment` | requires a key; hashes + (optionally) encrypts + IPFS-uploads + deploys via precompile `0x…0100` (`client.py:117`). |
| `inference(model_id, input_data, encrypted=False, max_gas=1000000, recipient_public_key=None)` | `-> InferenceResult` | encrypted path **fails closed** without `recipient_public_key` (`client.py:192`). |
| `get_model_info(model_id)` | `-> Dict` | `citrate_getModel`; raises `ModelNotFoundError` (`client.py:267`). |
| `list_models(owner=None, limit=100)` | `-> List[Dict]` | `citrate_listModels` (`client.py:277`). |
| `purchase_model_access(model_id, payment_amount)` | `-> str` | requires a key; access-control precompile (`client.py:282`). |

Signing binds `chainId` (EIP-155, RM-G.4) so a signature cannot be replayed on
another network (`client.py:312` `_eip155_chain_id`, `client.py:341`). IPFS
upload **fails closed** rather than fabricating a fallback CID (`client.py:298`).

### SDK-PY-managers — economic & education managers

These are separate classes, **not** attributes of `CitrateClient`. Each takes
a `rpc_call` callable (pass `client._rpc_call`), an optional `default_account`
(required for writes), and a `contract_addresses` dict. Constructors share the
shape `(rpc_call, default_account=None, gas_limit=…, gas_price="0x3b9aca00",
contract_addresses=None)`.

| Manager | Source | Selected methods |
|---|---|---|
| `LearningManager` | `learning.py:176` | `list_pools`, `join_pool`, `leave_pool`, `create_pool`, `get_cycle_status`, `register_for_cycle`, `claim_cycle_reward`, `get_contributions`, `claim_contribution_rewards` |
| `StakingManager` | `learning.py:461` | `deposit`, `withdraw`, `claim_withdrawal`, `get_info`, `preview_deposit`, `preview_withdraw`, `get_withdrawal` |
| `ClassroomManager` | `learning.py:629` | `create`, `enroll`, `unenroll`, `deploy_model`, `remove_model`, `rotate_invite_code`, `get_classroom`, `can_student_access_model`, `get_student_teacher` |
| `ComputeManager` | `compute.py:72` | `post_job`, `bid_on_job`, `get_job`, `list_jobs`, `submit_result`, `register_provider`, `get_provider_info`, `heartbeat`, `create_pool`, `join_pool`, `leave_pool`, `get_pools`, `dispute_result`, `get_dispute` |
| `TreasuryManager` | `treasury.py:60` | `deposit_stablecoin`, `purchase_compute_credits`, `get_credit_balance`, `estimate_calls_remaining`, `get_treasury_value`, `get_epoch_revenue`, `get_current_epoch`, `get_stablecoin_balance`, `get_total_distributed`, `get_credit_price_usd` |
| `FarmingManager` | `farming.py:56` | `get_my_score`, `get_my_share`, `get_leaderboard`, `claim`, `has_claimed`, `get_distribution_info`, `is_in_snapshot`, `get_claimed_amount` |

All six classes are re-exported from `citrate_sdk/__init__.py` (`__all__`).
Shared data types (`LearningPool`, `CycleStatus`, `ComputeJob`,
`ProviderInfo`, `StakingInfo`, …) live in `citrate_sdk/types.py`.

Writes raise `ConfigurationError` when `default_account` is unset
(`learning.py:159`); read methods are `eth_call`-only and need no account.

### SDK-PY-cli — `citrate` console script

Source of declaration: `citrate-sdk-python/pyproject.toml`
`[project.scripts]` → `citrate = "citrate_sdk.cli:main"`.

> **Status: declared but not implemented (broken entry point).** As of the
> audited SHA there is **no `citrate_sdk/cli.py`** and **no `main()`** anywhere
> in the package (no `argparse`/`click` either). The console-script target
> `citrate_sdk.cli:main` therefore does not resolve — installing the package
> and running `citrate` raises `ModuleNotFoundError: No module named
> 'citrate_sdk.cli'`. This is recorded as a registry correction below. Until
> a CLI module lands, use the `CitrateClient` API directly (see the
> quickstart tutorial).

## Examples

Runnable examples ship in the repo: `citrate-sdk-python/examples/`
(`basic_usage.py`, `encrypted_inference.py`, `marketplace_demo.py`).

Read-only connect:

```python
from citrate_sdk import CitrateClient

client = CitrateClient(rpc_url="https://rpc.example")
print("chain:", client.get_chain_id())
print("balance (wei):", client.get_balance("0xYourAddress"))
```

Using a manager (Farming, read-only leaderboard):

```python
from citrate_sdk import CitrateClient, FarmingManager

client = CitrateClient(rpc_url="https://rpc.example")
farming = FarmingManager(
    client._rpc_call,
    contract_addresses={"farming": "0xFarmingContract"},
)
for row in farming.get_leaderboard(count=10):
    print(row)
```

See the full walkthrough in
[Python quickstart](/sdks/python/tutorials/python-quickstart).

## Tutorials

- [Python quickstart](/sdks/python/tutorials/python-quickstart) — install,
  connect, read account state, deploy + run inference.

## Security & access

**Tier: public.** This is open SDK reference a developer needs to build, so it
is public per the tier decision tree (§3.6 of the authoring rules).

**No secrets here.** No keys, mnemonics, or private endpoints appear on this
page. Private keys are supplied at runtime via `private_key=` or the
`CITRATE_PRIVATE_KEY` env var and must never be committed. Remote plaintext
`http://` RPC triggers a transport-security warning by design.

## Source & verification

- **Source repo:** `citrate-sdk-python`
- **Paths:** `citrate_sdk/client.py`, `citrate_sdk/learning.py`,
  `citrate_sdk/compute.py`, `citrate_sdk/treasury.py`,
  `citrate_sdk/farming.py`, `citrate_sdk/types.py`, `citrate_sdk/__init__.py`,
  `pyproject.toml`, `examples/`
- **Audited against SHA:** `0b5c642`
- **Honest status:** Pre-Alpha, pre-audit, non-canonical (canonical SDK is
  `citrate-js`). The `citrate` CLI surface is **declared but not implemented**.
