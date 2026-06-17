---
title: Python SDK Quickstart
codex_slug: /sdks/python/tutorials/python-quickstart
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-python/examples/basic_usage.py
surfaces: [SDK-PY-client]
audited_against_sha: 0b5c642
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Python SDK Quickstart

> Install `citrate-ai-sdk`, connect to a Citrate node, read account state, and
> deploy + run inference on a model, in a few minutes. For Python developers
> new to Citrate.

This tutorial mirrors `citrate-sdk-python/examples/basic_usage.py`, which you
can run as-is from the repo. Every API call below exists in
`citrate_sdk/client.py` at SHA `0b5c642`.

> Heads up: the SDK is Pre-Alpha and non-canonical (the canonical SDK is
> `citrate-js`). The `citrate` console script is declared but not yet
> implemented, so this tutorial uses the `CitrateClient` API directly.

## Prerequisites

- Python **3.10+** (`pyproject.toml` `requires-python = ">=3.10"`)
- A reachable Citrate RPC endpoint (your own node, or a network RPC URL)
- For writes (deploy/inference/purchase): a funded account's private key,
  supplied via environment variable, never hardcoded

## Step 1, Install

```bash
python -m venv .venv && source .venv/bin/activate
pip install citrate-ai-sdk
```

The import name is `citrate_sdk` (the distribution name is `citrate-ai-sdk`).

## Step 2, Set environment variables

```bash
export CITRATE_RPC_URL="https://rpc.example"     # your node's RPC endpoint
export CITRATE_PRIVATE_KEY="0x..."               # only if you need to write
```

If you have no key yet, the SDK can generate one for you (Step 3). Keep any
generated key safe and out of version control.

## Step 3, Connect

```python
import os
from citrate_sdk import CitrateClient
from citrate_sdk.crypto import KeyManager

rpc_url = os.getenv("CITRATE_RPC_URL", "http://localhost:8545")
private_key = os.getenv("CITRATE_PRIVATE_KEY")

# No key? Generate one for local experimentation (store it securely).
if not private_key:
    km = KeyManager()
    private_key = km.get_private_key()
    print("Generated address:", km.get_address())

client = CitrateClient(rpc_url=rpc_url, private_key=private_key)
print("Connected to chain id:", client.get_chain_id())
```

`CitrateClient` warns if you point it at a remote `http://` endpoint (signed
transactions over plaintext). Use `https://`, or pass
`allow_insecure_http=True` only if you really mean it.

## Step 4, Read account state (no writes)

```python
address = client.key_manager.get_address()
balance_wei = client.get_balance(address)
nonce = client.get_nonce(address)

print(f"Address: {address}")
print(f"Balance: {balance_wei / 10**18:.4f} (native units)")
print(f"Nonce:   {nonce}")
```

These three calls (`get_balance`, `get_nonce`, `get_chain_id`) are read-only
and work even without a private key.

## Step 5, Deploy a model

```python
import json
from pathlib import Path
from citrate_sdk import ModelConfig, ModelType, AccessType

# A tiny stand-in model file for the demo.
model_path = Path("demo_model.json")
model_path.write_text(json.dumps({"type": "demo", "version": "1.0"}))

config = ModelConfig(
    name="Demo Classifier",
    description="A simple demo classifier model",
    model_type=ModelType.CUSTOM,
    access_type=AccessType.PUBLIC,
    encrypted=False)

deployment = client.deploy_model(model_path, config)
print("Model ID:", deployment.model_id)
print("Tx hash: ", deployment.tx_hash)
print("IPFS CID:", deployment.ipfs_hash)
```

`deploy_model` hashes the file, uploads it to IPFS (failing closed if the
upload fails, no fake CID), then deploys via the model-deployment precompile.
It requires a private key.

## Step 6, Run inference

```python
result = client.inference(
    model_id=deployment.model_id,
    input_data={"data": [0.5] * 10, "format": "array"})
print("Output:  ", result.output_data)
print("Gas used:", result.gas_used)
```

For **encrypted** inference, set `encrypted=True` and **you must** pass
`recipient_public_key=...`. Without it the call fails closed rather than
shipping a symmetric key in cleartext on public calldata.

## Step 7, Discover models

```python
for m in client.list_models(limit=5):
    print(m.get("name", "Unnamed"), "→", m.get("model_id"))
```

## Step 8, (Optional) use a manager

Managers (Learning / Staking / Classroom / Compute / Treasury / Farming) are
separate classes. Construct one with the client's `_rpc_call` callable, your
account, and the relevant contract addresses:

```python
from citrate_sdk import StakingManager

staking = StakingManager(
    client._rpc_call,
    default_account=address,
    contract_addresses={"liquidStaking": "0xStakingContract"})
print("Staking info:", staking.get_info(address))
```

Read methods (e.g. `get_info`, `preview_deposit`) need no account; writes
(e.g. `deposit`, `withdraw`) require `default_account`.

## Cleanup

```python
model_path.unlink(missing_ok=True)
```

## Where to go next

- [Python SDK reference](/sdks/python), full method tables + manager surface
- Repo examples: `citrate-sdk-python/examples/encrypted_inference.py`,
  `citrate-sdk-python/examples/marketplace_demo.py`

## Source & verification

- **Source repo:** `citrate-sdk-python`
- **Mirrors:** `examples/basic_usage.py`; APIs in `citrate_sdk/client.py`
- **Audited against SHA:** `0b5c642`
- **No secrets:** keys come from `CITRATE_PRIVATE_KEY` at runtime; none are
  embedded here.
