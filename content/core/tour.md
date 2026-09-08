---
title: A tour of Citrate Core
codex_slug: /core/tour
tier: public
org_scope: ~
source_kind: authored
source: citrate-core/src/surfaces/, src/shell/Sidebar.tsx, docs/CITRATE_CORE_FEATURE_MAP_AND_SITEMAP.md
surfaces: [CORE-dashboard, CORE-wallet, CORE-node, CORE-models, CORE-storage, CORE-files, CORE-agent, CORE-groups, CORE-comms, CORE-cluster, CORE-train, CORE-journal, CORE-connections, CORE-community, CORE-commissary, CORE-settings, CORE-alf]
audited_against_sha: 2d88191
status: Implemented
created: 2026-09-07T00:00:00Z
author: Citrate team
nav_order: 3
---

This is the screen-by-screen tour of Citrate Core. Each surface is a page in the sidebar; the sidebar groups
them as **You**, **Your Groups**, **Your Node**, and **More**. The `Node` surface has its own page,
[run a node](/core/run-a-node).

## You

### Dashboard

The home surface. A strip of node vitals across the top (height, peers, finality, node state, staked
amount, and today's validating status), the on-device agent in the center, recent account activity on the
right, and a set of short tutorials.

![The dashboard: node vitals, the on-device agent, recent activity, and tutorials.](/core/app-dashboard.png)

### Account

Your Citrate Keyring account, under the `Wallet` label. Four tabs: **Overview**, **Staking**, **Activity**,
and **Identity**. Overview shows liquid SALT, staked SALT, and wrapped SALT, a paymaster meter for
sponsored actions, and the send and receive panels. The receive panel shows your smart account address,
which deploys lazily on its first outgoing action, so deposits are safe before the account has ever sent
anything.

![The account surface, Overview tab: balances, the paymaster meter, and send and receive.](/core/app-wallet.png)

### Storage

Your memory graph: a local, searchable knowledge store that agents and the app read from and write to.
Entries are yours, held on device, and can be anchored to the network when you choose.

![Storage: the local memory graph you and your agents read and write.](/core/app-storage.png)

### Files

Your files on the network storage layer. Pin, browse, and manage content addressed by hash.

![Files: content-addressed storage on the network.](/core/app-files.png)

### Models

Browse and manage AI models available to the app, including the local inference model the node can serve.

![Models: browse and manage the models available on device and on the network.](/core/app-models.png)

### Agent

A keyless agent workbench. The agent can act on your behalf, and every action it wants to sign is routed to
you for approval through the same ceremony the rest of the app uses. It never holds a key.

![Agent: a keyless workbench whose signatures route to you for approval.](/core/app-agent.png)

### Connections

The people and services your account is connected to across the federation.

![Connections: your links to people and services across the federation.](/core/app-connections.png)

### Journal

A running record of what your node and account have done, in plain language, useful for keeping a personal
log or handing context to an agent.

![Journal: a plain-language record of what your node and account have done.](/core/app-journal.png)

## Your Groups

### Groups

Create and join groups, assign roles, manage a roster, and send messages. Groups are the unit of shared
membership and access.

![Groups: create and join groups, assign roles, and manage a roster.](/core/app-groups.png)

### Comms

Messaging over the server-blind Citrate relay. The relay carries sealed messages without being able to read
them; see [Citrate Comms](/apps/comms) for the protocol.

![Comms: sealed messaging over the server-blind relay.](/core/app-comms.png)

### Cluster

Join a compute cluster and share files and capacity with its members.

![Cluster: join a compute cluster and share capacity with its members.](/core/app-cluster.png)

### Train

Take part in federated model training rounds from your own machine. Your data stays local; only the agreed
updates leave the device.

![Train: take part in federated training rounds with your data staying local.](/core/app-train.png)

### Community

The wider community surface: shared spaces and activity across the network.

![Community: shared spaces and activity across the network.](/core/app-community.png)

## More

### Commissary

Where memberships and entitlements are taken and managed. Checkout opens in your browser; the outcome
returns to the app.

![Commissary: take and manage memberships and entitlements.](/core/app-commissary.png)

### Settings

Application settings, grouped into sections for the account, the node, identity, models, storage, and the
app itself. This is where you manage the local configuration described in [keys and safety](/core/safety).

![Settings: application, account, node, and identity configuration.](/core/app-settings.png)

### ALF

The ALF learning surface: the education and mentorship programs on the network, reachable from inside the
app.

![ALF: the learning and mentorship surface inside the app.](/core/app-alf.png)

## Next

The one surface not shown above is `Node`, the operator console for the node this app runs. It has its own
page: [run a node](/core/run-a-node).
