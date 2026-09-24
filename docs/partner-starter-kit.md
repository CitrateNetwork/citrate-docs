# Citrate Partner Starter Kit

One-page setup guide for pilot partners bringing up a
compute-marketplace node. This doc covers what an IT team needs
to do to get a machine serving inference or training requests on
Citrate testnet. For deeper ops, see the deployment runbooks in
`.agentile/launch/`.

## What this gets you

Following the steps below gives your machine all of:

- A funded wallet on Citrate testnet
- A running `citrate-pool-coordinator` daemon (if joining an
  InferencePool) **OR** a running `citrate-training-worker`
  daemon (if joining a training pool)
- A `/metrics` endpoint Prometheus can scrape
- An installed systemd unit that auto-restarts on failure

Total hands-on time: **~20 minutes per machine** after the
initial Week 0 discovery (see `PILOT_ONBOARDING_PLAYBOOK.md` §3).

---

## Prerequisites

- Linux machine (Ubuntu 22.04 LTS recommended; see
  `.agentile/launch/PILOT_ONBOARDING_PLAYBOOK.md` §6 for full
  hardware checklist)
- Internet access: outbound to `rpc.citrate.ai:443` + your pool's
  endpoints (see §5.1 of the playbook for the full port list)
- Sudo access to install a binary + systemd unit
- A partner-side IT contact who has already completed Week 0
  discovery with our team

---

## Step 1 — Install the binary

```bash
# Pick your role:
# - InferencePool coordinator daemon: citrate-pool-coordinator
# - Training pool worker: citrate-training-worker

# OPTION A: Build from source (current S0 path)
git clone https://github.com/CitrateNetwork/citrate-chain.git
cd citrate-chain
cargo build --release -p citrate-pool-coordinator       # or -p citrate-training-worker
sudo install target/release/citrate-pool-coordinator /usr/local/bin/

# OPTION B: Release tarball (coming in S1 — see backlog item
# `release-binaries-via-release-yml` in S1_S2_BACKLOG.md)
# curl -L https://github.com/CitrateNetwork/citrate-chain/releases/latest/\
#   download/citrate-pool-coordinator-linux-x86_64.tar.gz | tar xz
# sudo install citrate-pool-coordinator /usr/local/bin/
```

Verify:

```bash
citrate-pool-coordinator --help 2>&1 | head -5
```

---

## Step 2 — Provision a wallet

**Recommended (production):** Web3 SSv3 keystore + passphrase.

```bash
# Generate a keystore via the in-repo wallet tool (or any
# Ethereum-compatible wallet that emits Web3 SSv3 v3 format).
# The JS SDK's CitrateWallet can export one you generated in
# the browser.
citrate-wallet new --format ssv3 --out ~/.citrate/keystore.json
# Prompts for a passphrase; writes the encrypted keystore.

# Verify the derived address:
citrate-wallet show ~/.citrate/keystore.json
# → Address: 0x...
```

**Testnet-only shortcut:** raw hex private key.

```bash
# Generate a new key (you can also paste an existing one):
openssl rand -hex 32 > ~/.citrate/private_key.hex
# The derived address is printed when the daemon starts.
```

Per our [pilot playbook §5.3](../.agentile/launch/PILOT_ONBOARDING_PLAYBOOK.md),
raw hex is **testnet only** — rotate to the keystore path
before any production deployment.

---

## Step 3 — Get testnet SALT for gas

Each operator wallet needs SALT to pay tx gas. The daemon spends
~50k gas per `recordDispatch` or `completeJob` (cents per
dispatch on testnet).

```bash
# Faucet request (adjust URL to current testnet faucet):
curl "https://faucet.citrate.ai/claim?address=0xYOURADDRESS"
# Typical drip: 100 SALT, enough for thousands of ops.
```

Verify balance:

```bash
cast balance 0xYOURADDRESS --rpc-url https://rpc.citrate.ai
# → some-salt-amount in wei (1 SALT = 10^18 wei)
```

---

## Step 4 — Configure environment

Create `/etc/citrate/pool-coordinator.env`:

```bash
sudo mkdir -p /etc/citrate
sudo tee /etc/citrate/pool-coordinator.env > /dev/null <<'EOF'
# Wallet (pick one):
CITRATE_POOL_KEYSTORE_PATH=/home/citrate/.citrate/keystore.json
CITRATE_POOL_KEYSTORE_PASSPHRASE=<from partner operator>
# OR (testnet only):
# CITRATE_POOL_PRIVATE_KEY_HEX=<64 hex chars>

# Identity
CITRATE_POOL_WALLET_ADDRESS=0x...  # must match derived from the key

# Chain
CITRATE_POOL_CHAIN_ID=40204
CITRATE_POOL_RPC_URL=https://rpc.citrate.ai
CITRATE_POOL_CONTRACT=0x...        # ComputePool deploy address (we provide)

# Pool
CITRATE_POOL_MEMBER_ENDPOINTS=0xaaa...=https://m1.example.com/pool-infer,...

# Operations
CITRATE_POOL_METRICS_ADDR=127.0.0.1:9091
CITRATE_POOL_POLL_INTERVAL_SECS=3
CITRATE_POOL_CONFIRMATIONS_BUFFER=12

# Logging
LOG_FORMAT=json
RUST_LOG=info,citrate_pool_coordinator=debug
EOF

sudo chmod 600 /etc/citrate/pool-coordinator.env
```

For training workers, replace `CITRATE_POOL_*` with
`CITRATE_TRAINING_*` env vars per the training-worker deployment
runbook (coming in `S1_S2_BACKLOG.md` item `training-worker-bin`).

---

## Step 5 — Install systemd unit

```bash
sudo tee /etc/systemd/system/citrate-pool-coordinator.service > /dev/null <<'EOF'
[Unit]
Description=Citrate pool-coordinator daemon
After=network.target

[Service]
Type=simple
User=citrate
EnvironmentFile=/etc/citrate/pool-coordinator.env
ExecStart=/usr/local/bin/citrate-pool-coordinator
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create the citrate user (no shell, no home — principle of
# least privilege for the daemon process).
sudo useradd --system --no-create-home --shell /usr/sbin/nologin citrate 2>/dev/null || true

sudo systemctl daemon-reload
sudo systemctl enable --now citrate-pool-coordinator
```

---

## Step 6 — Verify it's running

```bash
# Status
sudo systemctl status citrate-pool-coordinator

# Live log tail
sudo journalctl -u citrate-pool-coordinator -f

# Look for (daemon is healthy when you see):
#   INFO  wallet=0x... configured_members=N "pool-coordinator starting"
#   INFO  rpc_url=... chain_id=40204 pool_contract=... "daemon configured"
#   INFO  starting_block=... "event polling starts here"
```

---

## Step 7 — Verify metrics endpoint

```bash
curl http://127.0.0.1:9091/metrics | head -30
```

Expect Prometheus-format output including:

```
# HELP pool_coord_events_observed_total ComputeRequested events decoded...
# TYPE pool_coord_events_observed_total counter
pool_coord_events_observed_total 0

# HELP pool_coord_events_dispatched_total handle_event terminal states...
...
```

Scrape config for Prometheus (add to `prometheus.yml`):

```yaml
- job_name: 'citrate-pool-coordinator'
  static_configs:
    - targets: ['127.0.0.1:9091']
```

---

## Step 8 — Smoke test

Have a buyer submit one `ComputeRequested` tx (either via the
`/jobs/new` webapp, or `cast send` directly). Watch the logs:

```
INFO ... pool=1 job=42 "event handled"        # we were coordinator
DEBUG ... pool=1 job=42 "skipped (not coordinator)"  # another peer was coordinator
```

Either line confirms the daemon is correctly tracking events.
Sustained success requires VRF rotation to elect this wallet as
coordinator periodically (every ~100 blocks per the
`InferencePoolLifecycle.tla` spec).

---

## What's next

- **Join the pool's monitoring channel** — partner IT gets a
  shared dashboard URL + an on-call escalation path. Details at
  `.agentile/launch/PILOT_ONBOARDING_PLAYBOOK.md` §4.
- **Weekly sync with our tech lead** — reviews metrics, plans
  upgrades, surfaces incidents early.
- **Scale up** — once the daemon is stable for 24+ hours on one
  machine, repeat these steps for additional machines.
  `scripts/partner-bootstrap.sh` (coming in S1 — backlog item
  `partner-starter-kit`) will automate steps 1–5 for common
  configurations.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `wallet load failed` | Re-check `CITRATE_POOL_KEYSTORE_PATH` / passphrase, or switch to raw hex for a 5-min debug. |
| `wallet key/address mismatch` | Your `CITRATE_POOL_WALLET_ADDRESS` doesn't match the key. Fix the env var or regenerate. |
| `eth_gasPrice decode: ...` | RPC endpoint isn't responding to Ethereum-compat calls. Check URL + auth. |
| `not the coordinator for this epoch` on every event | Normal — VRF rotation picks one coordinator per pool per epoch. Track over several epochs (100+ blocks each) to confirm rotation is reaching your wallet. |
| `handle_event failed: provider failed: ...` | Pool member endpoint is unreachable. Check DNS + TLS + the member's own health. |
| No events observed in 30+ minutes | Pool may be idle. Verify with a test submit from a buyer. |

For deeper troubleshooting, see
`.agentile/launch/PILOT_ONBOARDING_PLAYBOOK.md` §9 (incident
response playbook).

---

## References

- Pilot playbook: `.agentile/launch/PILOT_ONBOARDING_PLAYBOOK.md`
- Pool-coordinator runbook: `.agentile/launch/POOL_COORDINATOR_DEPLOYMENT_RUNBOOK.md`
- Backlog (what's still being built):
  `.agentile/launch/S1_S2_BACKLOG.md`
- CM-07 training contract deployment:
  `.agentile/launch/COMPUTEPOOLTRAINING_DEPLOYMENT_RUNBOOK.md`
