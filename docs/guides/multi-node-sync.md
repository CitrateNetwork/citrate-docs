# Multi-Node Sync Guide

**How to connect two Citrate nodes so they share the same blockchain.**

This guide assumes you've never done this before. Every step is explained. If something doesn't work, check the troubleshooting section at the bottom.

---

## What You're Doing (and Why)

Right now, your Citrate app runs a blockchain all by itself. It produces blocks, earns SALT, and keeps all the data on your machine. Nobody else can see your blocks.

To make this a real network, we need to connect your node to someone else's node. When two nodes are connected:
- They share blocks with each other
- They agree on the same transaction history
- They form a real peer-to-peer network

This is called **syncing**. After sync, both nodes see the same blockchain.

---

## How It Works (The Simple Version)

All Citrate nodes connect to a **bootnode** — a public relay server that everybody can reach. You don't connect directly to other people's computers. You connect to the bootnode, and the bootnode shares blocks between everyone.

```
[Your Computer] ──connects out──> [Bootnode] <──connects out── [Partner's Computer]
```

Both sides connect **outbound** (like opening a website). No special router configuration. No port forwarding. It just works, the same way your browser connects to Google without any setup.

## What You'll Need

- **Two computers** running Citrate (can be in different locations)
- **Internet connection** on both
- **A bootnode address** (provided by the Citrate team, or you run your own on a $5/month VPS)
- **About 10 minutes**

---

## Step 1: Install Citrate

### If you have the .deb installer (Linux):

1. Open your file manager
2. Find the file called `Citrate_0.1.0_arm64.deb` (or similar)
3. Double-click it
4. Click "Install"
5. Wait for it to finish

### If you're building from source:

1. Open a terminal (on Mac: search for "Terminal" in Spotlight)
2. Navigate to the citrate folder
3. Run: `./scripts/build-gui.sh`
4. Wait for it to finish (5-10 minutes, downloads a 1.1GB AI model on first run)
5. Install the output (the script tells you how)

### Verify it installed:

Open your applications menu and look for "Citrate." If you see it, you're good.

---

## Step 2: Launch Citrate and Wait for It to Start

1. **Click the Citrate icon** in your applications menu
2. **Wait about 10 seconds.** You'll see a window appear with a dashboard
3. **Look at the dashboard.** You should see:
   - "Node Status: Running" (with a green dot)
   - "Block Height: 1" (or a small number — it goes up every 5 seconds)
   - Your wallet balance increasing slowly (0.01 SALT per block)

**If you see "Node Status: Stopped"** — wait 15 more seconds. The node takes a moment to start.

**If the block height isn't going up** — the node might not have started. Try closing and reopening the app.

---

## Step 3: Get the Bootnode Address

The Citrate team runs public bootnodes that everyone connects to. You'll be given an address that looks like this:

```
noise_a1b2c3d4e5f6...@boot1.citrate.ai:30303
```

**If you're on the Citrate team** and setting up the first bootnode, see the "Running Your Own Bootnode" section at the bottom.

**If you're a regular user**, the bootnode address will be provided to you (in Discord, documentation, or pre-configured in the app).

---

## Step 4: Add the Bootnode

1. **Open Citrate** (it should already be running from Step 2)
2. Click **Settings** in the sidebar
3. Scroll down to **Peer Connections**
4. Paste the bootnode address in the text field:
   ```
   noise_a1b2c3d4e5f6...@boot1.citrate.ai:30303
   ```
5. Click **Add**
6. You should see the address appear in the list below

**That's it.** No port forwarding. No router configuration. No firewall changes. Your computer connects outbound to the bootnode (just like opening a website), and the bootnode shares blocks with everyone.

**Both people add the SAME bootnode address.** You don't need to exchange addresses with each other.

---

## Step 6: Verify the Connection

After both of you have added each other:

1. **Wait 10-15 seconds** for the nodes to discover each other
2. Look at your **Dashboard**:
   - "Peers" should show **1** (or more)
   - Block height should continue increasing

3. **Check the logs** for sync messages:
   ```
   SYNC: Received 5 blocks from peer (heights 10-14)
   Synced block a3f2b1c7 added to DAG at height 12
   ```

4. **Compare block heights** — after syncing, both nodes should show similar block heights. They might not be identical (each node produces its own blocks too), but they should be close.

---

## Step 7: Verify You're on the Same Chain

The most important check: are both nodes agreeing on the same blockchain?

1. Both people check their **Dashboard → Block Height**
2. The heights should be similar (within 5-10 blocks of each other)
3. Both people should see their **Peers count** as 1 or higher

If both nodes show peers and similar heights — **congratulations, you're running a real peer-to-peer blockchain network!**

---

## What's Happening Under the Hood

When two nodes connect, here's what happens:

1. **Noise handshake** — The nodes establish an encrypted connection using the Noise protocol. This is like a secret handshake that proves both nodes are who they claim to be.

2. **Genesis check** — Both nodes compare their genesis block hash. If they don't match, the connection is rejected. This prevents connecting to a different blockchain by accident.

3. **Block sync** — Each node asks the other: "What blocks do you have that I don't?" The response is a list of blocks. Each received block is validated, stored, and added to the GhostDAG (the block graph).

4. **Ongoing sharing** — After the initial sync, nodes share new blocks as they're produced. When your node produces a block, it sends it to all connected peers. When a peer produces a block, they send it to you.

5. **Fork resolution** — If both nodes produced different blocks at the same height, the GhostDAG handles it. Both blocks are valid. The protocol uses "blue score" (a measure of how many other blocks agree with it) to determine the canonical ordering. Neither block is lost — both contribute to the DAG.

---

## Troubleshooting

### "Peers shows 0"

**Possible causes:**
- The bootnode isn't running → Ask the team to verify
- The bootnode address was typed wrong → Double-check it in Settings
- Your internet is blocking the connection → Try a different network (phone hotspot)

**Try this:** Close Citrate, reopen it, and check Peers again after 15 seconds.

### "Block heights are very different"

If one node shows height 500 and the other shows height 50, the sync is catching up. Wait a few minutes. The sync processes blocks one at a time.

### "Genesis hash mismatch"

If you see this in the logs:
```
Rejecting peer: genesis hash mismatch (different chain)
```

Both people are running different versions. Solution:
1. **Everyone** installs the same version of Citrate
2. **Everyone** deletes their old chain data:
   - Linux: `rm -rf ~/.local/share/citrate-gui/chain/`
   - macOS: `rm -rf ~/Library/Application Support/citrate-gui/chain/`
   - Windows: Delete `%APPDATA%\citrate-gui\chain\`
3. Reopen Citrate (it creates a fresh genesis)
4. Re-add the bootnode

---

## Quick Reference

| What | Where |
|------|-------|
| P2P port | 30303 (TCP, outbound only — no firewall changes needed) |
| Bootnode format | `noise_<id>@<hostname>:30303` |
| Add a bootnode | Settings → Peer Connections → paste → Add |
| Check connection | Dashboard → Peers count |
| Chain data (Linux) | `~/.local/share/citrate-gui/chain/` |
| Chain data (macOS) | `~/Library/Application Support/citrate-gui/chain/` |
| Chain data (Windows) | `%APPDATA%\citrate-gui\chain\` |

---

## Running Your Own Bootnode (Team/Advanced)

If you're setting up the network's first bootnode, you need a VPS (virtual private server) with a public IP. This is the only machine that needs to be publicly reachable. Everyone else just connects out to it.

### Step 1: Get a VPS

Any Linux VPS works. Cheapest options:
- **Hetzner Cloud**: $5/month (CX22, 2 vCPU, 4GB RAM)
- **DigitalOcean**: $6/month (Basic Droplet, 1GB RAM)
- **Vultr**: $5/month (Cloud Compute)

Pick Ubuntu 22.04 or newer.

### Step 2: Build or copy the node binary

**Option A: Copy from your machine** (if same architecture):
```bash
scp target/release/citrate user@YOUR_VPS_IP:/usr/local/bin/citrate
```

**Option B: Build on the VPS:**
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# Install build deps
sudo apt update && sudo apt install -y build-essential libssl-dev pkg-config libclang-dev cmake

# Clone and build
git clone YOUR_REPO_URL
cd citrate/citrate_v0.01.1
cargo build --release -p citrate-node
sudo cp target/release/citrate /usr/local/bin/
```

### Step 3: Start the bootnode

```bash
# Create data directory
sudo mkdir -p /var/lib/citrate
sudo chown $USER /var/lib/citrate

# Start the bootnode (relay-only, no mining)
citrate \
  --bootstrap \
  --data-dir /var/lib/citrate \
  --chain-id 40204 \
  --max-peers 500
```

Look for this line in the output:
```
Noise identity: a1b2c3d4... (peer_id=noise_a1b2c3d4e5f6...)
```

### Step 4: Note your bootnode address

Your bootnode address is:
```
noise_YOUR_PEER_ID@YOUR_VPS_IP:30303
```

Example:
```
noise_a1b2c3d4e5f6789012345678abcdef0123456789abcdef0123456789abcdef01@143.198.45.67:30303
```

**Share this address with your team.** Everyone adds it in Settings → Peer Connections.

### Step 5: Keep it running

To keep the bootnode running after you disconnect from SSH:

```bash
# Option A: Use screen
screen -S citrate
citrate --bootstrap --data-dir /var/lib/citrate --chain-id 40204 --max-peers 500
# Press Ctrl+A, then D to detach. Reconnect with: screen -r citrate

# Option B: Use systemd (production)
sudo tee /etc/systemd/system/citrate-bootnode.service > /dev/null << 'UNIT'
[Unit]
Description=Citrate Bootnode
After=network-online.target

[Service]
ExecStart=/usr/local/bin/citrate --bootstrap --data-dir /var/lib/citrate --chain-id 40204 --max-peers 500
Restart=always
RestartSec=10
User=root
Environment="RUST_LOG=info"

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable citrate-bootnode
sudo systemctl start citrate-bootnode

# Check logs:
sudo journalctl -u citrate-bootnode -f
```

### Step 6: Verify it works

From any other machine:
```bash
# The bootnode should be listening
nc -zv YOUR_VPS_IP 30303
# Should show: Connection to YOUR_VPS_IP 30303 port [tcp/*] succeeded!
```

Then open Citrate on your desktop, add the bootnode address, and check that Peers shows 1.

---

## Why No Port Forwarding?

You might wonder: how does this work without opening ports on my home router?

**Outbound connections go through NAT without configuration.** When your Citrate app connects to the bootnode, it's an outbound connection — exactly like your browser connecting to Google. Your router allows this automatically.

The bootnode is on a VPS with a public IP address. VPS machines don't have NAT — they're directly on the internet. So the bootnode doesn't need port forwarding either.

The only scenario where port forwarding matters is if you want your home computer to accept incoming connections directly from other home computers (without a bootnode). That's the hard way. The bootnode is the easy way.

**Think of the bootnode like a phone operator.** You call the operator (outbound, no setup needed). Your friend calls the operator (outbound, no setup needed). The operator connects your calls. Neither of you needed to install a phone line — you just used the one you already have.

---

*This guide was written for the Citrate testnet (chain ID 40204). The same steps apply to mainnet when it launches, but the chain data directories and ports may be different.*
