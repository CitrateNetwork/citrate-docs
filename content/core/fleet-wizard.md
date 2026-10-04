---
title: Connect your machines (fleet wizard)
codex_slug: /core/fleet-wizard
tier: public
source_kind: authored
source: citrate-core/src-tauri/src/fleet*.rs, src/fleet, docs/FLEET_WIZARD_RUNBOOK.md
surfaces: [CORE-cluster]
audited_against_sha: 81ef7a0
status: Implemented (pre-audit), arrives with Citrate Core 0.5.0; two-machine run on member hardware pending
created: 2026-10-04T00:00:00Z
branch: hup/n7-docs-almanac-retro
author: Larry Klosowski + Claude Opus 5.5
nav_order: 12
---

The fleet wizard connects the machines you own that run Citrate Core, so they know about each other
and can work as one fleet. This page is for members with a second laptop, a desktop or a home server.
The technical runbook is
[FLEET_WIZARD_RUNBOOK.md](https://github.com/CitrateNetwork/citrate-core/blob/main/docs/FLEET_WIZARD_RUNBOOK.md)
in the core repo.

## What it is

The wizard lives on the **Cluster** surface. It checks this machine, can look for your other
machines on the local network if you allow it, pairs two machines with a one-time link or QR code,
and helps with Tailscale when the machines cannot reach each other. When both machines are linked to
you, the pairing also carries each machine's link code, so each one knows the other is yours.

## How to use it

1. On the machine that already runs Citrate Core, open **Cluster** and start the wizard. It shows
   this machine's tier (from the same local check as onboarding) and a suggested role. Rename the
   machine if you like; that name is what your other machines see.
2. Optional: tick **Find machines** to look for other Citrate Core machines on this network. It is
   off by default and turns itself off when the wizard closes.
3. Choose **Create pairing link**. The wizard shows a `citrate://pair` link and the same link as a
   QR code. It works once and expires after 10 minutes.
4. On the new machine, install Citrate Core if needed (the pair step shows the download link and a
   QR code for it). Paste the pairing link, choose **Check link**, then **Pair with this machine**.
   Opening the link from the system also works; nothing pairs until you press **Pair**.
5. If the machines cannot reach each other, the wizard reads Tailscale's status and tells you what
   to do next.
6. **Your machines** lists this machine, the ones you paired and the ones seen on the network, each
   with tier and role.

## Reference

| Property | Value |
|---|---|
| Pairing link lifetime | 10 minutes (a default pending owner sign-off) |
| Uses per link | one; a second use is refused as "already used" |
| Open links per machine | at most 8 |
| What discovery shares | a random per-run id, the machine name you typed, tier and role; never an account address or the computer's name |
| Roles | T0 light, T1 worker, T2 heavy (defaults pending owner sign-off) |
| Tailscale | read only: the wizard runs `tailscale status` and never signs you in or changes its settings |

## Design rationale

A pairing link is signed with a key that exists only in memory while the app runs. It is never the
key for your account and can sign nothing but pairing links, so pairing two machines cannot move
value. A short lifetime and a single use mean a link that leaks in a chat or a screenshot is soon
worthless. Discovery is opt-in and forgets your choice on restart, because announcing yourself on a
shared network should be a decision you make each time.

## Failure modes

- **macOS asks to accept incoming connections** when you create a link. Allow it, or pairing over
  the local network cannot reach this machine.
- **No other machines answered.** The other machine needs discovery on too, and some guest or office
  networks block it. Pairing by link does not need discovery.
- **The other machine could not be reached.** Check the firewall, or turn on Tailscale on both
  machines with the same account and create a new link.
- **"Already used" or "expired".** Create a new link on the first machine.
- **A machine that belongs to someone else.** If the pairing carries another member's link code,
  the machine is reported and not added as yours.

## Access and canon

The roster of your machines is a file in the app data folder on each machine. Nothing about the
fleet is published to the network by the wizard.

## Source and verification

Source: `citrate-core/src-tauri/src/fleet.rs`, `fleet_pairing.rs`, `fleet_mdns.rs`,
`fleet_tailscale.rs`, and `src/fleet/`. Audited against core `81ef7a0`. Status: **Implemented**,
pre-audit. Device links are **Verified** as a TLA+ model (`DeviceLink.tla` in `citrate-cluster`)
checked with TLC at small bounds. A recorded two-machine run on member hardware is still pending.
