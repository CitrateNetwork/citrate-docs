---
title: Citrate Learning Center, School Desktop App
codex_slug: /apps/learning-center
tier: academic
org_scope: ~
source_kind: transcluded
source: citrate-learning-center/README.md
surfaces: [APP-learning]
audited_against_sha: c74d371
status: draft
created: 2026-06-14T00:00:00Z
author: Claude Opus 4.8 (1M context)
---

# Citrate Learning Center, School Desktop App

> A Slint-native desktop application for school pilots on the Citrate Network:
> students do coursework, teachers run classrooms, and institutional admins
> provision and oversee an entire school or charter organization. For schools,
> districts, and charter/management organizations (CMOs) running the Citrate
> education stack.

## Overview

Citrate Learning Center is the education-focused desktop client. Like
[Citrate Native](/apps/native) it is built with [Slint](https://slint.dev), so
it runs as a native desktop window backed by a local service layer.

The repo is a Cargo workspace with three crates
(`citrate-learning-center/README.md`):

- `gui/citrate_learning_center` (`citrate-learning-center`), the school-pilot
  desktop app (the window and all classroom/admin screens).
- `gui/citrate_edu_app` (`citrate-edu-app`), the EDU backend: encryption,
  AEAD, identity, roles, roster/classroom/budget/institutional services, and the
  encrypted local store.
- `cli-school-bootstrap` (`citrate-school-bootstrap`), a CLI for **provisioning
  a school environment** before the desktop app is handed to staff.

The app is **role-aware**: the left sidebar (`ui/shell/sidebar.slint`) shows
different groups depending on whether you sign in as a student, a teacher, or an
institutional admin. Identity and roles are managed by `citrate-edu-app`
(`src/role.rs`, `src/identity.rs`, `src/it_elevation.rs`).

## Who it's for

- **Students**, see their own Home, Assignments, and Progress.
- **Teachers**, manage a classroom: students, assignments, and a classroom
  home.
- **Institutional admins / IT**, provision and run the school: institution
  overview, classrooms, staff, finance (budget + approvals), user accounts and
  bulk import, device fleet, and infrastructure (node status, security, getting
  started).
- **Charter / Management Organization (CMO) operators**, the cross-school
  administration surfaces (the CMO dashboard/tenancy/compliance panels live in
  the [Citrate Native](/apps/native) app for CMOSuperAdmins; Learning Center is
  the per-school operator and end-user surface).

## Institutional context

Learning Center is meant to be deployed by an institution, not installed ad hoc
by individuals. The intended lifecycle:

1. An operator runs **`cli-school-bootstrap`** to stand up the school: choose
   whether you're setting up a CMO, a standalone district, or a school under an
   existing CMO (`cli-school-bootstrap/src/cli.rs`, `init` command). v1 supports
   **self-host mode only** (`--hosted` errors with "not yet available").
2. The bootstrap can run a **Docusign Connect webhook receiver** (`daemon`
   command) so consent/agreement envelopes update bootstrap state as signers
   complete them (can take days; idempotent across restarts). Configuration is
   via `DOCUSIGN_*` env vars.
3. The operator generates **per-guardian setup packets** from an imported roster
   and distributes them (`distribute` command; filesystem channel is the v1
   default; `--smtp` / `--print-pdf` are reserved for v1.1).
4. Staff and students then sign in to the **desktop app**, which decrypts local
   data and presents the role-appropriate screens.

This is why the app is tiered **academic**: it is education/institutional
material tied to pilots, not a public consumer wallet.

## Install & run

Prerequisites (from `rust-toolchain.toml` and `README.md`):

- A stable Rust toolchain (rustup).
- Read access to `CitrateNetwork/citrate-chain`, three chain crates
  (`citrate-wallet-core`, `citrate-security`, `citrate-signing`) are pulled over
  SSH. Local builds use your personal GitHub SSH key.
- A C/C++ toolchain and platform libraries for Slint and `rocksdb`.

Build and run the desktop app (verbatim from `README.md` "Quick start"):

```bash
cargo build --release -p citrate-learning-center
cargo run --release -p citrate-learning-center
```

`citrate-learning-center` is the workspace `default-members` target. Drop
`--release` for a faster dev build.

> **Honest status (from `README.md`).** The original split plan listed
> `gui/citrate_edu_native/` and `cli-edu/` as members; neither has a `Cargo.toml`
> and both are excluded from the workspace (planning artifacts). Build only the
> three real crates above.

### Provisioning CLI (`cli-school-bootstrap`)

Run the bootstrap CLI from the same workspace. The verified subcommands
(`cli-school-bootstrap/src/cli.rs`) are:

| Command | What it does |
|---|---|
| `init` | Start a new bootstrap workflow (CMO / district / school-under-CMO). `--config <file>` skips prompts for scripted runs. |
| `status` | Show which steps are complete, in progress, or next. |
| `resume` | Resume from the last safe checkpoint (idempotent). |
| `reset` | Destructive: delete the local state directory. Does **not** void already-sent Docusign envelopes. |
| `daemon` | Run the Docusign Connect webhook receiver (default `127.0.0.1:8091`, localhost behind a TLS-terminating proxy). |
| `distribute` | Generate per-guardian setup packets from a roster and distribute them. |

Global flags: `--state-dir <path>` (default `$XDG_DATA_HOME/citrate-edu-bootstrap`
or platform equivalent) and `--self-host` (the only supported mode in v1).

## Key features & screens

Screens are the Slint views under `gui/citrate_learning_center/ui/`; sidebar
labels are quoted from `ui/shell/sidebar.slint`. Groups are role-gated.

### Student accounts

- **"Home"**, **"Assignments"**, **"Progress"**, the student's own dashboard,
  assigned work, and learning progress.

### Classroom management (teacher)

- **CLASSROOM** group: **"Home"**, **"Students"**, **"Assignments"**, the
  teacher's classroom view, roster, and assignment management.

### Institution & finance (admin)

- **INSTITUTION**: **"Overview"**, **"Classrooms"**, **"Staff"**.
- **FINANCE**: **"Budget"** (and at admin scope, **"Approvals"**), backed by the
  budget service (`citrate-edu-app/src/services/budget.rs`).

### Accounts & devices (admin / IT)

- **ACCOUNTS**: **"User Accounts"**, **"Bulk Import"**, create accounts
  individually or import a roster in bulk (roster service:
  `citrate-edu-app/src/services/roster.rs`; bulk import has dedicated fixtures
  in `gui/citrate_edu_app/tests/bulk_import_fixtures.rs`).
- **DEVICES**: **"Fleet"**, device fleet management.
- **INFRASTRUCTURE**: **"Node Status"**, **"Security"**, **"Getting Started"**.

### Shell

- **Onboarding** (`ui/onboarding/onboarding.slint`), a password-gated **lock
  screen** (`ui/shell/lock_screen.slint`), a **status bar**, and **"Settings"**.

The UI is built from a shared component kit (`ui/shared/`: cards, data tables,
forms, badges/role badges, modals, toasts, progress, skeletons, empty states).

## Tutorials

The runnable build tutorial for the native desktop apps is
[Run the desktop wallet](/apps/tutorials/run-the-desktop-wallet) (Citrate Native).
The Learning Center builds the same way, substitute
`-p citrate-learning-center` for the package flag.

## Security & access

- **Tier: academic.** This is education/institutional material for school pilots
  (per the schema's tier-3 rule for research/academic/institutional content), not
  a public consumer surface.
- **No secrets here.** No keys, passwords, org secrets, or Docusign credentials
  are reproduced. The bootstrap CLI's org secret can be supplied via
  `--org-secret-hex` or `CITRATE_ORG_SECRET_HEX`, but in production it is loaded
  from the school's **encrypted keystore**, do not hardcode it or paste it into
  shared docs. `DOCUSIGN_*` values are operator credentials, kept out of this
  page.
- **Local data is encrypted at rest** by `citrate-edu-app` (AEAD via
  `citrate-security`; `src/encryption.rs`, `src/local_store.rs`,
  `src/key_rotation.rs`). Student/guardian data is sensitive, follow your
  institution's data-handling policy.
- **Role separation is enforced in the backend** (`role.rs`, `it_elevation.rs`),
  not by hiding sidebar items. Privileged actions have dedicated coverage tests
  (`tests/k1_4_privileged_actions_coverage.rs`,
  `tests/rem_g_02_fresh_password_gate.rs`).
- **The `reset` command is destructive** and does not cancel sent Docusign
  envelopes, void those in the Docusign tenant separately.

## Source & verification

- **Source repo:** `citrate-learning-center` (truth lives here; transcluded
  reference, Rule 9).
- **Audited against SHA:** `c74d371`
  (`git -C citrate-learning-center rev-parse --short HEAD`).
- **Primary files audited:** `README.md`, `Cargo.toml`, `rust-toolchain.toml`,
  `gui/citrate_learning_center/ui/shell/sidebar.slint`, `ui/app.slint`,
  `ui/onboarding/onboarding.slint`, `cli-school-bootstrap/src/cli.rs`,
  `gui/citrate_edu_app/src/` (role, identity, encryption, local_store, services/).
- **Status:** pre-1.0 (`version = 0.4.0`); v1 is self-host only, several delivery
  channels (`--smtp`, `--print-pdf`) and `--hosted` mode are reserved for later
  releases. Not certified.
