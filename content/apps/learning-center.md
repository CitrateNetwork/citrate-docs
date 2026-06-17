---
title: Citrate Learning Center
codex_slug: /apps/learning-center
tier: academic
org_scope: ~
source_kind: authored
source: citrate-learning-center/{README.md, gui/, cli-school-bootstrap/, Cargo.toml}
surfaces: [APP-learning]
audited_against_sha: c74d371
status: Implemented
created: 2026-06-17T00:00:00Z
author: Citrate team
---

Citrate Learning Center is the classroom application for school pilots: students do their coursework,
teachers run their classrooms, and administrators provision and oversee the school. It is a native desktop
application, and it is built around one rule, student and guardian data stays on the school's own hardware,
on Citrate Ground, and never leaves it for the public Citrate Network.

## What it is

Learning Center is a desktop client written in Rust with a Slint interface, so it runs as a native window
backed by a local service layer rather than a web page. A school installs it; it is not picked up ad hoc by
individuals. The data it works with, rosters, corrections, classroom membership, lives encrypted on the
machine it runs on. The public Citrate Network is consulted only for what genuinely belongs there: a
participant's role is read from chain 40204 through a gateway, never asserted by the client, and students
appear on chain only as pseudonymous identifiers, never by name.

The application is one of three crates in a Cargo workspace (`Cargo.toml`):

- `gui/citrate_learning_center`, the desktop window and every classroom and administration screen.
- `gui/citrate_edu_app`, the education backend: encryption, identity, roles, the roster, classroom,
  budget, and institutional services, and the encrypted local store.
- `cli-school-bootstrap`, a command-line tool that provisions a school before staff ever open the desktop
  application.

It is role-aware. The same window shows a different left sidebar depending on whether you sign in as a
student, a teaching assistant, a teacher, an administrator, an IT director, or a charter-management
operator. The role itself comes from an on-chain query, not from the interface, so hiding a sidebar item is
never what keeps a user out of an action.

## How to use it

A school is brought online in a deliberate order. An operator provisions it first, then hands the desktop
application to staff.

1. An operator runs `cli-school-bootstrap init` to stand up the school, choosing a charter-management
   organization, a standalone district, or a school under an existing CMO. Version 0.4 supports self-host
   mode only; the `--hosted` path reports that it is not yet available (`cli-school-bootstrap/src/cli.rs`).
2. The bootstrap can run a Docusign Connect receiver (`daemon`) so consent and agreement envelopes update
   the bootstrap state as signers complete them, which can take days and survives restarts idempotently.
3. The operator generates per-guardian setup packets from an imported roster and distributes them
   (`generate-guardian-packets`). Guardian PII appears only inside that guardian's own packet; logs use
   pseudonymous identifiers.
4. Build and run the desktop application:

   ```bash
   cargo build --release -p citrate-learning-center
   cargo run --release -p citrate-learning-center
   ```

5. Staff and students sign in. A password gate unlocks the local store, the backend decrypts the data on
   the machine, and the role-appropriate screens appear.

## Reference

The screens are Slint views under `gui/citrate_learning_center/ui/`; the sidebar groups and labels below
are quoted from `ui/shell/sidebar.slint` and are gated by the on-chain role.

| Role | Sidebar groups and items |
|---|---|
| Student, TA | Home, Assignments, Progress |
| Teacher | CLASSROOM: Home, Students, Assignments. FINANCE: Budget |
| Admin, SuperAdmin | INSTITUTION: Overview, Classrooms, Staff. FINANCE: Budget, Approvals |
| IT | ACCOUNTS: User Accounts, Bulk Import. DEVICES: Fleet. INFRASTRUCTURE: Node Status, Security |
| CMOSuperAdmin | CMO: Dashboard, Tenancy, Compliance, plus the admin views |
| No role | Getting Started |

Settings is always present, and the shell adds onboarding and a password-gated lock screen.

The backend services that stand behind those screens (`gui/citrate_edu_app/src/services/`):

| Service | What it does |
|---|---|
| `roster.rs` | Bulk import from SIS exports (Infinite Campus, PowerSchool), as CSV, TSV, or XLSX. |
| `classroom.rs` | Classrooms, devices, and assignments. |
| `budget.rs` | Budget allocation and cashout requests. |
| `institutional.rs` | Vault status and the cashout approval lifecycle. |
| `cmo_portal.rs` | Cross-school administration for charter-management operators. |

The provisioning CLI subcommands (`cli-school-bootstrap/src/cli.rs`):

| Command | What it does |
|---|---|
| `init` | Start a bootstrap workflow; `--config` skips prompts for scripted runs. |
| `status` | Show which steps are complete, in progress, or next. |
| `resume` | Resume from the last checkpoint, idempotently. |
| `reset` | Delete the local state directory. Does not void already-sent Docusign envelopes. |
| `daemon` | Run the Docusign Connect receiver (default `127.0.0.1:8091`, behind a TLS-terminating proxy). |
| `generate-guardian-packets` | Produce and distribute per-guardian setup packets from a roster. |
| `revoke-guardian-packet` | Revoke a guardian's packet for a right-to-erasure request. |

Global flags include `--state-dir` and `--hosted` (reserved for a later release). Guardian delivery over
SMTP (`--smtp`) and as PDF (`--print-pdf`) are reserved for v1.1; the filesystem channel is the v1 default.

## Design rationale

A school's most sensitive asset is its students' records, and the regulation around them is unforgiving.
So Learning Center keeps that data where it already is, on the school's hardware, and treats the public
network as a place for roles and proofs, not for names. Identity is pseudonymous on chain: a student
becomes a keyed hash of their provider identifier, derived with an institution-held secret, so the chain
can route and reward learning without ever holding a name. The role a user holds is read from chain and
checked in the backend, which is why the sidebar is a convenience and not a control. The provisioning step
is a separate CLI rather than a button in the application because standing up a school, with consent
envelopes and guardian packets, is operator work that can take days and must be auditable.

## Failure modes

This application handles K-12 student and guardian data, so its boundaries fail closed.

- Local data is encrypted at rest with AES-256-GCM through `citrate-security`, with the associated data
  bound into the GCM tag, so a swapped ciphertext fails verification rather than decrypting
  (`src/encryption.rs`, `src/local_store.rs`). No plaintext correction lands on disk.
- Role separation is enforced in the backend (`src/role.rs`, `src/it_elevation.rs`), not by hiding
  sidebar items. A locked account resolves to no role. Privileged actions carry dedicated coverage tests
  (`tests/k1_4_privileged_actions_coverage.rs`).
- Privileged actions require a fresh password reauthentication within a 60-second window
  (`tests/rem_g_02_fresh_password_gate.rs`). The IT-elevation bridge that lets a small-district
  administrator act as IT is time-bounded, audited on entry and exit, and gated on the same reauth.
- `reset` is destructive and does not cancel sent Docusign envelopes; those must be voided in the Docusign
  tenant separately.

## Access and canon

Tier: academic. This is education and institutional material tied to school pilots, not a public consumer
surface.

US K-12 public schools have free Citrate access in perpetuity, and Learning Center is the classroom that
access opens onto. The school runs it on its own hardware as part of Citrate Ground; student and guardian
data, rosters, corrections, and identity mappings, stay there, encrypted at rest, and never reach the
public Citrate Network. Students appear on chain only as pseudonymous identifiers. The compliance floor for
schools is FERPA, COPPA, and CIPA; the right-to-erasure path for guardian records is built into the
provisioning CLI. No secrets are reproduced here: the institution's org secret is loaded from its
encrypted keystore in production, and Docusign credentials are operator configuration. See
[enterprise compliance](/enterprise) for the FERPA, COPPA, and CIPA model and [Citrate Schools](/contracts/edu)
for the program.

## Source and verification

- Source repo: `citrate-learning-center`, audited against SHA `c74d371`.
- Key paths: `README.md`, `Cargo.toml`, `gui/citrate_learning_center/ui/shell/sidebar.slint`,
  `gui/citrate_edu_app/src/` (`role.rs`, `identity.rs`, `it_elevation.rs`, `encryption.rs`,
  `local_store.rs`, `key_rotation.rs`, `services/`), `cli-school-bootstrap/src/cli.rs`,
  `gui/citrate_learning_center/tests/`.
- Status: Implemented (pre-audit), pre-1.0 at version 0.4.0. Version 1 is self-host only; the hosted
  parent portal (`--hosted`) and the SMTP and PDF guardian-delivery channels are reserved for later
  releases. The repo carries planning directories (`gui/citrate_edu_native/`, `cli-edu/`) that have no
  `Cargo.toml` and are excluded from the workspace; build only the three real crates. Tier 1 audit applies:
  no stable release ships without a written external attestation against an exact SHA.
