---
title: Python quickstart
codex_slug: /sdks/python/tutorials/python-quickstart
tier: public
org_scope: ~
source_kind: authored
source: citrate-sdk-python/examples/basic_usage.py
surfaces: [SDK-PY-client]
audited_against_sha: 0b5c642
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Install the Python SDK, connect to a Citrate node, read account state, then deploy a model and run inference,
in a few minutes. For Python developers meeting Citrate for the first time. Every call below exists in
`citrate_sdk/client.py` at `0b5c642`, and the flow mirrors `examples/basic_usage.py`, which you can run
as-is from the repo.

## What it is

A copy-paste tour of the working Python surface. The read steps need no key. The write steps, deploy and
inference, need a funded account. The Python SDK is non-canonical and Pre-Alpha; the canonical SDK is the
[JavaScript SDK](/sdks/js). The `citrate` console script is declared but not implemented, so this tutorial
uses the `CitrateClient` API directly and does not invoke a CLI.

## How to use it

You will need Python 3.10 or newer (`pyproject.toml` sets `requires-python = ">=3.10"`), a reachable Citrate
RPC endpoint, and, for the write steps, a funded account's private key supplied through the environment.

### Step 1, install

```bash
python -m venv .venv && source .venv/bin/activate
pip install citrate-ai-sdk
```

The distribution is `citrate-ai-sdk`; the import name is `citrate_sdk`.

### Step 2, set the environment

```bash
export CITRATE_RPC_URL="https://rpc.example"     # your node's RPC endpoint
export CITRATE_PRIVATE_KEY="0x..."               # only needed for writes
```

Keep any key out of version control. If you have none yet, Step 3 generates one for local experimentation.

### Step 3, connect

```python
import os
from citrate_sdk import CitrateClient
from citrate_sdk.crypto import KeyManager

rpc_url = os.getenv("CITRATE_RPC_URL", "http://localhost:8545")
private_key = os.getenv("CITRATE_PRIVATE_KEY")

# No key yet? Generate one for local experimentation, then store it securely.
if not private_key:
    km = KeyManager()
    private_key = km.get_private_key()
    print("Generated address:", km.get_address())

client = CitrateClient(rpc_url=rpc_url, private_key=private_key)
print("Connected to chain id:", client.get_chain_id())
```

`CitrateClient` warns if you point it at a remote `http://` endpoint, since a signed transaction would cross
the wire in the clear. Use `https://`, or pass `allow_insecure_http=True` only when you mean it.

### Step 4, read account state

```python
address = client.key_manager.get_address()
balance_wei = client.get_balance(address)
nonce = client.get_nonce(address)

print(f"Address: {address}")
print(f"Balance: {balance_wei / 10**18:.4f} (native units)")
print(f"Nonce:   {nonce}")
```

These three calls, `get_balance`, `get_nonce`, and `get_chain_id`, are read-only and work without a key.

### Step 5, deploy a model

```python
import json
from pathlib import Path
from citrate_sdk import ModelConfig, ModelType, AccessType

# A small stand-in model file for the demo.
model_path = Path("demo_model.json")
model_path.write_text(json.dumps({"type": "demo", "version": "1.0"}))

config = ModelConfig(
    name="Demo Classifier",
    description="A simple demo classifier model",
    model_type=ModelType.CUSTOM,
    access_type=AccessType.PUBLIC,
    encrypted=False,
)

deployment = client.deploy_model(model_path, config)
print("Model ID:", deployment.model_id)
print("Tx hash: ", deployment.tx_hash)
print("IPFS CID:", deployment.ipfs_hash)
```

`deploy_model` hashes the file, uploads it to IPFS (failing closed if the upload fails, no fabricated CID),
then deploys through the model-deployment precompile. It requires a key.

### Step 6, run inference

```python
result = client.inference(
    model_id=deployment.model_id,
    input_data={"data": [0.5] * 10, "format": "array"},
)
print("Output:  ", result.output_data)
print("Gas used:", result.gas_used)
```

For encrypted inference, set `encrypted=True` and pass `recipient_public_key=...`. Without it the call fails
closed rather than shipping a symmetric key in cleartext on public calldata.

### Step 7, discover models

```python
for m in client.list_models(limit=5):
    print(m.get("name", "Unnamed"), "->", m.get("model_id"))
```

### Step 8, use a manager (optional)

The economic and education surfaces are separate classes. Construct one with the client's `_rpc_call`
callable, your account, and the addresses it acts on:

```python
from citrate_sdk import StakingManager

staking = StakingManager(
    client._rpc_call,
    default_account=address,
    staking_address="0xStakingContract",
)
print("Staking info:", staking.get_info(address))
```

Read methods such as `get_info` and `preview_deposit` need no account; writes such as `deposit` and
`withdraw` require `default_account`, or they raise `ConfigurationError`.

### Step 9, clean up

```python
model_path.unlink(missing_ok=True)
```

## Reference

The calls used above, with their source in `citrate-sdk-python`:

| Call | What it does | Source |
|---|---|---|
| `CitrateClient(...)` | bind to an RPC endpoint, optionally a key | `citrate_sdk/client.py:31` |
| `get_chain_id()` | confirm the network | `citrate_sdk/client.py:103` |
| `get_balance` / `get_nonce` | read account state | `citrate_sdk/client.py:107`, `:112` |
| `deploy_model` | hash, IPFS-upload, deploy | `citrate_sdk/client.py:117` |
| `inference` | run a model call | `citrate_sdk/client.py:192` |
| `list_models` | list deployed models | `citrate_sdk/client.py:277` |
| `KeyManager` | generate or load a key | `citrate_sdk/crypto.py` |
| `StakingManager` | a representative manager | `citrate_sdk/learning.py:461` |

## Failure modes

- A remote `http://` endpoint warns about plaintext transport. Use `https://`, or set
  `allow_insecure_http=True` deliberately.
- Encrypted inference without `recipient_public_key` fails closed.
- An IPFS upload failure during `deploy_model` propagates; no fallback CID is invented.
- A manager write without `default_account` raises `ConfigurationError`.
- The `citrate` console script is not implemented; do not invoke it.

## Access and canon

Public. The write steps touch state and need a funded account; the read steps do not. No keys appear here:
they come from `CITRATE_PRIVATE_KEY` at runtime, or from a locally generated `KeyManager`. Every machine on
the public network is identity-checked through CLEAR before it takes part.

## Source and verification

- Source repo: `citrate-sdk-python`.
- Mirrors `examples/basic_usage.py`; APIs in `citrate_sdk/client.py`, `citrate_sdk/crypto.py`,
  `citrate_sdk/learning.py`.
- Audited against SHA: `0b5c642`.
- Status: Implemented, pre-audit, non-canonical (the canonical SDK is the [JavaScript SDK](/sdks/js)). See
  the full surface on the [Python SDK](/sdks/python) reference.
