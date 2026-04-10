# Platform-Agnostic Requirements

If Citrate is going to work for government, it cannot assume one operating system,
one cloud, one identity vendor, or one class of hardware.

This is the platform-neutral requirements list that should shape future product work.

## Operating environments

The system should support:

- Windows desktops and laptops
- macOS where agencies already use it
- Linux desktops and enclave appliances
- Chromebook or thin-client patterns where applicable
- GPU and CPU-only fleets
- connected, restricted, and fully air-gapped environments

## Identity and access

The system should not depend on one login model.

It should be able to work with:

- local offline accounts
- SAML and OIDC enterprise identity
- Entra ID, Okta, and agency IdPs
- PIV, CAC, and hardware-backed authentication for higher-assurance environments
- service-to-service mTLS and device certificates

## Data portability

Every institutional workflow should have a neutral export path:

- CSV for tabular operations
- PDF for human review and records packages
- JSON for machine integration
- signed event logs for audit and compliance review

## Network and transport

The product should be able to speak more than one operational language:

- direct RPC for trusted internal use
- queue- or file-based workflows for low-connectivity environments
- signed offline bundles for air-gapped transfer
- bandwidth-aware synchronization for rural and field environments

## Accessibility and language

Government software cannot assume a single user profile.

Baseline requirements should include:

- Section 508 and WCAG-aligned accessibility work
- keyboard-only flows
- screen-reader compatibility
- plain-language labels
- multilingual content support where agencies need it

## Records and governance

Platform neutrality also means governance neutrality:

- retention policies should be configurable
- public records exports should be first-class
- audit logging should be tamper-evident and easy to export
- workflows should support human appeal and override

## Concrete items Citrate should fix or add

- remove hidden assumptions that a public RPC is always available
- make packaging first-class across Windows, macOS, Linux, and appliance builds
- add identity adapters instead of one hard-coded auth pattern
- formalize offline update bundles and signature verification
- standardize policy configuration files instead of per-deployment patching
- expose stable APIs and schemas for integration
- add accessibility verification to CI for public-facing interfaces
- produce SBOMs and signed release metadata by default
- make audit export and retention settings part of the product, not a sidecar script

## Economic framing

The most useful nonpartisan framing is this:

- use existing public assets better before asking for new spending
- give agencies an option to earn value from approved institutional workloads
- keep controls local enough that elected officials, IT, unions, auditors, and the public
  can all understand who is doing what and why

