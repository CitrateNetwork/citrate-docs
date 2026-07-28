---
title: Run a Citrate Node
codex_slug: /operators/run-a-node
tier: public
org_scope: ~
source_kind: authored
source: citrate-chain/README.md, citrate-chain/docs/OPERATIONS.md, citrate-chain/node-app/README.md, citrate-chain/docker-compose.yml, citrate-chain/config/
audited_against_sha: 03d7851
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

This is the operator's runbook for running a Citrate Node, the daemon that joins the Citrate Network and
keeps a copy of the ledger live. It is for anyone bringing up a node on their own hardware, from a single
local instance to a node on testnet, chain id 40204.

## What it is

A Citrate Node is built from the `citrate-node` binary in the `citrate-chain` workspace. It wires storage,
execution, a mempool, peer management, and the RPC service into one process: a RocksDB-backed state store,
an EVM-compatible executor, the GhostDAG consensus engine, and a JSON-RPC, WebSocket, and REST surface with
Prometheus metrics. You run it on your own machine, on-premise by default, and it talks to other nodes over
libp2p. Operators on the public network are identity-verified through VERI, Citrate's in-house verification; the node software itself is the
same whether you run a local instance or join testnet.

The node binds its RPC surface to loopback by default, so the read and write surface is something you expose
deliberately behind your own reverse proxy, not by accident. The settlement and reward side of operating,
how a node earns SALT for the work it performs, is covered in [rewards](/operators/rewards); selling that
capacity into the marketplace is covered in [sell compute](/operators/sell-compute).

Network parameters, verified against the chain README at SHA `03d7851`:

| Parameter | Value |
|---|---|
| Chain id | 40204 (testnet beta) |
| Token | SALT, one billion supply, 18 decimals |
| Consensus | GhostDAG, k = 18, max-parents 10 |
| Proposer election | ECVRF-P256-SHA256 (RFC 9381) |
| Finality | committee BFT checkpoints, 100 validators, 67 quorum, 50-block interval |
| Default JSON-RPC | `127.0.0.1:8545` |
| Default WebSocket | `127.0.0.1:8546` |
| Default REST | `127.0.0.1:3000` |
| Default metrics | `0.0.0.0:9100` |

## How to use it

Follow these steps to bring up a node and confirm it is healthy.

1. **Install the toolchain.** You need a Rust toolchain; the Docker build pins Rust 1.93.0. Clone the
   `citrate-chain` workspace.

2. **Build the binary.** From the workspace root:

   ```bash
   cargo build --release        # builds the citrate-node binary
   ```

3. **Choose how you run.** A local single node is the quickest path; testnet joins the public network at
   chain id 40204.

   ```bash
   # Local single node, block production on, fast blocks
   cargo run --bin citrate-node -- devnet

   # Join testnet
   cargo run --bin citrate-node -- --network testnet

   # Explicit config file and data directory
   cargo run --bin citrate-node -- --config /path/to/node.toml --data-dir /custom/path
   ```

4. **Or run a small local network.** The helper script brings up three local nodes:

   ```bash
   ./scripts/launch_local_testnet.sh            # preserve data
   ./scripts/launch_local_testnet.sh --clean    # fresh start
   ./scripts/launch_local_testnet.sh --status   # check status
   ```

5. **Or run in Docker.** Compose profiles cover a single local node, testnet, and a five-node cluster.

   ```bash
   docker compose -f docker-compose.yml --profile devnet  up --build
   docker compose -f docker-compose.yml --profile testnet up --build
   docker compose -f docker-compose.yml --profile cluster up --build   # 5-node
   ```

   Inside a container the RPC binds to `0.0.0.0`, and the host exposure is set by the compose port mappings:
   the local profile maps host `8545`, `8546`, `30303`, and `9100`; the testnet profile maps host `18545`,
   `18546`, `30304`, and `19100`.

6. **Confirm the node is answering.** Ask it for its current height:

   ```bash
   curl -s -X POST -H 'Content-Type: application/json' \
     --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
     http://127.0.0.1:8545
   ```

7. **Watch producer memory.** A producing node should sit near 1 GB of resident memory. Sample it and read
   the thresholds below before you leave it unattended.

   ```bash
   ps -o rss= -p "$(pgrep -f citrate-node | head -1)"   # resident memory, KiB
   ```

## Reference

### Configuration

The node reads its configuration from environment variables, verified in `node-app/README.md` and the
compose files. The defaults are deliberately conservative: the RPC binds to loopback, not all interfaces.

| Variable | Default | Purpose |
|---|---|---|
| `CITRATE_DATA_DIR` | `/data` (Docker) | RocksDB storage directory |
| `CITRATE_RPC_ADDR` | `127.0.0.1:8545` | JSON-RPC listen address |
| `CITRATE_METRICS_ADDR` | `0.0.0.0:9100` | Prometheus metrics endpoint |
| `CITRATE_METRICS` | `1` | metrics on |
| `RUST_LOG` | `info,citrate=info` | log filter |
| `CITRATE_OPERATOR_TOKEN` | unset | required for admin RPC on a non-loopback bind (fails closed) |

Network bootstrap peers are listed by network in `config/bootstrap-nodes.json`. Testnet ships four bootstrap
nodes across regions; the public RPC hostname is `https://rpc.citrate.ai`.

### Producer memory health

The runbook in `docs/OPERATIONS.md` is the canon for producer memory. A healthy producing node sits near
1.05 GB resident memory. The thresholds and the circuit-breaker below come from that runbook.

| Resident memory | Meaning | Action |
|---|---|---|
| up to ~1.2 GB | healthy steady state | none |
| 1.2 to 2 GB | elevated, watch | sample every 15 minutes, correlate with indexer or beacon load |
| over 2 GB | leak-class behavior | trip the circuit-breaker below before the OOM killer acts |
| over 3 GB | alert fires (`ProducerMemoryHigh`, critical) | trip the breaker immediately |

The memory-heavy startup path only runs when block production is on. The circuit-breaker is to turn it off:
set `[mining] enabled = false` in the node config and restart. The node then serves RPC reads near 1 GB
indefinitely, which is the safe degraded mode; only writes stop, the public read surface stays up.

```bash
# 1. Confirm you are in leak territory (resident memory, KiB):
ps -o rss= -p "$(pgrep -f citrate-node | head -1)"

# 2. Trip the breaker: turn block production off, then restart.
#    edit the [mining] section of your node config: enabled = false
systemctl restart citrate-node

# 3. Verify degraded but healthy: memory near 1 GB, RPC still answering.
curl -s -X POST -H 'Content-Type: application/json' \
  --data '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
  http://127.0.0.1:8545
```

Re-enable production only after the cause is identified, and watch memory for the first five minutes after
restart; the original leak fired during startup, within thirty seconds. Capture `ps` and `smaps` evidence
before any restart if you can, and keep the previous release binary so you can roll back.

### Monitoring

Three permanent guards protect the producer, verified in `docs/OPERATIONS.md`:

| Guard | Where | Trips when |
|---|---|---|
| `producer_steady_state` test | `core/sequencer/tests/producer_steady_state.rs` | a change re-materializes cumulative blue ancestry on the eager-load path (CI) |
| `ProducerMemoryHigh` alert | `node/monitoring/alerts/citrate-alerts.yml` | resident memory over 3 GB sustained two minutes |
| memory gauge sampler | `node/src/main.rs` (15s cadence) | feeds the alert |

The Docker monitoring profile brings up Prometheus and Grafana against the node's metrics endpoint.

## Design rationale

The node binds to loopback by default because the safe state is the closed one: exposing the RPC surface is
a step you take deliberately, behind your own TLS terminator and access controls, not the default a fresh
install hands you. Block production is gated behind a single flag so that the one memory-heavy path has a
clean off switch, and turning it off degrades the node to a read-only server rather than taking it down. The
trade is that an operator who wants a public, writable endpoint has to do the reverse-proxy and token work
themselves; the benefit is that an unconfigured node cannot leak its admin surface onto the network.

## Failure modes

This is where running a node is security relevant, so the defaults fail closed.

- **No transport security on the raw RPC.** The RPC ships with no TLS and no authentication, and on bare
  metal it binds to loopback. If you bind to `0.0.0.0`, you must set `CITRATE_OPERATOR_TOKEN` and front the
  endpoint with a TLS-terminating reverse proxy and an explicit CORS allow-list. The admin methods refuse to
  serve on a non-loopback bind without the operator token.
- **Memory leak under production load.** If resident memory climbs past 2 GB, trip the production circuit-
  breaker before the OOM killer acts; the node keeps serving reads.
- **Reused development keys.** The local coinbase account is a well-known public test key. Never use it on
  testnet or in production, and never reuse the example development keys.
- **Development-only switches left on.** The relaxed switches that disable signature checks or allow
  plaintext peer traffic must stay off outside local development.

## Access and canon

Public. Running a node is public-good operator material, and the front door of the network. On the public
network, operators are identity-verified through VERI, Citrate's in-house verification, and the node runs on hardware you control; Citrate
keeps the verification result, not the personal data behind it. No secrets, operator tokens, or private node
addresses appear here. The public RPC hostname `https://rpc.citrate.ai` is the only network endpoint named.
For genesis and the network layout, see [the network](/chain/network) and [genesis](/chain/genesis).

## Source and verification

- Source: `citrate-chain`. Network parameters in `README.md`; the operator runbook and producer-memory
  thresholds in `docs/OPERATIONS.md`; environment variables in `node-app/README.md`; run profiles and port
  mappings in `docker-compose.yml`; bootstrap peers and institutional parameters in `config/`.
- Audited against SHA: `03d7851`.
- Status: Implemented (testnet). The node, the run modes, the producer-memory guards, and the monitoring
  profile exist and run; the chain is live on testnet at chain id 40204 and has not had an external audit.
  Note: there is no `docs/PRIVATE_NETWORK.md` at this SHA; the canonical runbook is `docs/OPERATIONS.md`.
