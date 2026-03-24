# Cross-Chain Data Bridge — Conflicting Guidance

This file records conflicts or ambiguities found while aligning this tutorial with repository guidance. It is not a decision log; it highlights contradictions that should be resolved in authoritative docs.

## Conflicts Observed

1. Sprint system paths differ between docs:
   - `DOCUMENTATION.md` and `DOCUMENTATION_MATRIX.md` reference `.sprint/` and `.audit/` as the sprint and audit roots.
   - The active governance system in this repo is `.agentile/` (e.g., `.agentile/sprints/`, `.agentile/audits/`).
   - Impact: contributors could update the wrong sprint/audit location.

2. Chain ID for devnet differs across docs:
   - `.agentile/CONFIG.md` says devnet chain ID is `1337`.
   - The root `README.md` quickstart references Chain ID `40204` for a local devnet RPC example.
   - Impact: developers may configure wallets or clients with the wrong chain ID.

3. Token name mismatch in contracts:
   - `.agentile/CONFIG.md` defines token name and symbol as `SALT`.
   - `citrate_v0.01.1/contracts/src/InferenceRouter.sol` uses the comment `// 100 LATT` for provider stake.
   - Impact: inconsistent token naming in developer-facing docs and contracts.

## Notes

- This tutorial follows `.agentile/CONFIG.md` as the source of truth for chain ID and token naming.
- If these conflicts are resolved, this file should be updated to reflect the new authoritative sources.
