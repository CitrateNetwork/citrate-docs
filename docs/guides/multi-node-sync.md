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

## What You'll Need

- **Two computers** running Citrate (can be in different locations)
- **Internet connection** on both
- **About 15 minutes**

Each person follows this guide on their own computer. You'll exchange one piece of information with each other (your "peer address").

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

## Step 3: Find Your Peer Address

Your peer address is how other nodes find you on the internet. It looks like this:

```
noise_9bed2de5cbf2de947e104d8784b53ef7a534338acb08f71855ec1334f027570a@73.162.45.89:30304
```

It has three parts:
- `noise_` followed by a long string of letters and numbers (your node's identity)
- `@` followed by your IP address
- `:30304` (the port your node listens on)

### How to find your node identity:

**Option A: From the app logs (easiest)**

When Citrate starts, it prints a line like this in the terminal or log:
```
Noise identity: 9bed2de5cbf2de94... (peer_id=noise_9bed2de5cbf2de94...)
```

If you launched from a terminal, scroll up to find this line.

If you launched from the app menu, check the log file:
- **Linux:** `~/.local/share/citrate/citrate.log` (or check system logs)
- **macOS:** `~/Library/Logs/Citrate/citrate.log`
- **Windows:** `%APPDATA%\Citrate\logs\citrate.log`

**Option B: From the Settings panel**

1. Click **Settings** in the sidebar
2. Look for **Node Control** section
3. Your peer ID may be displayed there

### How to find your public IP address:

1. Open a web browser
2. Go to: **https://whatismyipaddress.com**
3. Write down the number shown under "IPv4" (example: `73.162.45.89`)

### Put them together:

Your full peer address is:
```
noise_YOUR_PEER_ID@YOUR_IP_ADDRESS:30304
```

**Example:**
```
noise_9bed2de5cbf2de947e104d8784b53ef7a534338acb08f71855ec1334f027570a@73.162.45.89:30304
```

**Send this address to the person you're syncing with.** Text message, email, Slack — whatever works. They will send you theirs.

---

## Step 4: Open Your Network Port

Your computer's firewall blocks incoming connections by default. You need to open port 30304 so the other node can reach you.

### Linux (Ubuntu/Debian):

Open a terminal and run:
```bash
sudo ufw allow 30304/tcp
```

If it says "Rules updated" — you're done.

### macOS:

macOS doesn't block incoming connections by default in most cases. If you have a firewall enabled:
1. Open **System Preferences** → **Security & Privacy** → **Firewall**
2. Click **Firewall Options**
3. Make sure "Block all incoming connections" is **unchecked**

### Windows:

1. Open **Windows Defender Firewall** (search for it in the Start menu)
2. Click **Advanced settings** on the left
3. Click **Inbound Rules** → **New Rule**
4. Select **Port** → Next
5. Select **TCP** and enter **30304** → Next
6. Select **Allow the connection** → Next
7. Check all three boxes (Domain, Private, Public) → Next
8. Name it "Citrate P2P" → Finish

### Router port forwarding (if you're behind a home router):

If both computers are behind home routers (most people are), you also need to forward port 30304 on your router:

1. Open your router's admin page (usually `192.168.1.1` or `192.168.0.1` in a browser)
2. Find "Port Forwarding" (might be under "Advanced" or "NAT")
3. Add a rule:
   - **External port:** 30304
   - **Internal port:** 30304
   - **Protocol:** TCP
   - **Internal IP:** Your computer's local IP (find it with `hostname -I` on Linux or `ipconfig` on Windows)
4. Save

**If this is confusing**, don't worry — port forwarding is the hardest part. If you get stuck, try having one person add the other as a peer (instead of both adding each other). Sometimes one direction works even without port forwarding.

---

## Step 5: Add the Other Node as a Peer

Now you have the other person's peer address. Time to connect.

1. **Open Citrate** (it should already be running)
2. Click **Settings** in the sidebar
3. Scroll down to **Peer Connections**
4. In the text field, paste the other person's peer address:
   ```
   noise_THEIR_PEER_ID@THEIR_IP:30304
   ```
5. Click **Add**
6. You should see the address appear in the list below

**The other person does the same thing with YOUR peer address.**

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
- The other person hasn't added your address yet → Ask them to check
- Port 30304 is blocked → Re-check the firewall/router steps
- IP address is wrong → Re-check at whatismyipaddress.com
- Your router hasn't forwarded the port → Check router admin page

**Try this:** Have only ONE person add the other as a peer (not both). If the connection works one-way, the issue is with the other person's port forwarding.

### "Block heights are very different"

If one node shows height 500 and the other shows height 50, the sync might be slow. Wait a few minutes. The sync processes blocks one at a time to avoid overwhelming your computer.

### "Connection drops after a few minutes"

The P2P connection may be unstable. This can happen with NAT traversal issues. Try:
- Both people restart Citrate
- Re-add each other as peers
- If you're on the same local network, use the local IP (like 192.168.1.x) instead of the public IP

### "Genesis hash mismatch"

If you see this error in the logs:
```
Rejecting peer: genesis hash mismatch (different chain)
```

It means the two nodes started from different genesis blocks. This happens if one node was created with a different version of the software. Solution: both people need to:
1. Close Citrate
2. Delete chain data:
   - Linux: `rm -rf ~/.local/share/citrate-gui/chain/`
   - macOS: `rm -rf ~/Library/Application Support/citrate-gui/chain/`
   - Windows: Delete `%APPDATA%\citrate-gui\chain\`
3. Reopen Citrate (it will create a fresh genesis)
4. Re-add each other as peers

### "I can't find my peer ID"

Run Citrate from a terminal to see the logs:
- **Linux:** Open terminal, run `citrate-core`
- **macOS:** Open Terminal, run `/Applications/Citrate.app/Contents/MacOS/Citrate`
- **Windows:** Open Command Prompt, run `"C:\Program Files\Citrate\Citrate.exe"`

Look for the line starting with `Noise identity:`.

### "My IP address starts with 192.168 or 10.0"

That's your **local** IP, not your **public** IP. Go to https://whatismyipaddress.com to find your public IP. You need the public IP if the other person is on a different network.

If you're both on the same WiFi network, you CAN use the 192.168.x.x address — it'll be faster too.

---

## Quick Reference

| What | Where |
|------|-------|
| Your peer ID | Logs at startup: `Noise identity: ...` |
| Your public IP | https://whatismyipaddress.com |
| P2P port | 30304 (TCP) |
| Peer address format | `noise_<id>@<ip>:30304` |
| Add a peer | Settings → Peer Connections → paste → Add |
| Check connection | Dashboard → Peers count |
| Chain data location (Linux) | `~/.local/share/citrate-gui/chain/` |
| Chain data location (macOS) | `~/Library/Application Support/citrate-gui/chain/` |
| Chain data location (Windows) | `%APPDATA%\citrate-gui\chain\` |

---

*This guide was written for the Citrate testnet (chain ID 40204). The same steps apply to mainnet when it launches, but the chain data directories and ports may be different.*
