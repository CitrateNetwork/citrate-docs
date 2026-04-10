# Private Networks and Air Gaps

Government use will often live on a spectrum:

1. connected institutional network
2. restricted network with controlled egress
3. fully air-gapped enclave

Citrate needs to be credible across that spectrum.

## Connected institutional network

Good fit for:

- schools
- local government offices
- public health and benefits programs
- research and training environments

Current repo strengths:

- local-node orientation
- private-network friendliness
- existing docs for small networks and institutional forks

## Restricted network

Good fit for:

- county emergency operations
- state agencies with strict egress controls
- federal field offices
- sensitive but unclassified internal programs

Needs:

- mirrored package repositories
- explicit allowlists
- proxy-aware update workflows
- offline-capable logging and metrics export
- signed configuration packs

## Full air gap

Good fit for:

- defense enclaves
- highly sensitive justice workloads
- classified or quasi-classified research networks

Honest current posture:

- Citrate is air-gap friendly in concept
- Citrate is not yet a finished air-gap deployment product

What still needs to exist:

- reproducible offline builds
- signed offline release bundles
- removable-media transfer workflow with checksum and provenance verification
- offline certificate, key-rotation, and revocation procedure
- offline model import and evaluation pipeline
- enclave-safe patch and rollback procedure
- no hidden dependency on hosted auth, hosted telemetry, or internet-only package fetches

## Practical rule

If a deployment cannot survive loss of internet connectivity without becoming
operationally confusing, it is not yet air-gap ready.

## Why this matters

Air-gapped and private-network deployments let agencies:

- protect sensitive records
- run local inference without exporting raw data
- use underutilized hardware inside their own trust boundary
- collaborate selectively without collapsing into one shared cloud

