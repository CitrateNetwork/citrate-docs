---
created: 2026-11-04
branch: docs/prelaunch-economics-status
author: Codex
status: active
---
Scope: remove launch economics claims from the served documentation corpus, retain existing URLs as status notices, and clarify that technical testnet examples are not launch terms. Preserve historical research and audit evidence outside the served corpus.
Acceptance: economics/rewards URLs contain TBD notice, upcoming announcements and support@citrate.ai; no fixed supply or reward schedules in generated public content; search/MCP use regenerated corpus.
Risk: content accuracy and legal interpretation; no auth or authorization changes. Disclaimer cannot rescind agreements or establish legal immunity.
Checks: content generation, content lint, typecheck, Vitest, production build and bundle/auth gates; verify deployed URLs if deployment succeeds.

Validation (2026-11-04): Node 22.21.1; source baseline b2ec3784789b2f33a8e3d5edd2837de362574fc6. 127 tests passed, 4 existing tests skipped. Typecheck and whitespace checks passed. Explicit truth-lint invocation passed with address-book drift check unavailable in isolated checkout. Content vocabulary gate passed. Default Turbopack build failed because this environment prohibits its port binding; Next webpack production build and all verify:bundle confidentiality/auth/access-clock/MCP-key checks passed.

Runtime dependency audit initially found high-severity advisories in undici and zod. Compatible lockfile updates applied; npm audit --omit=dev now reports zero known vulnerabilities. Two moderate development-tool advisories remain outside this content change.

Historical research files, audit records, and Git history remain intact and are not served as docs pages or static downloads. Research index now links the current notice. Technical testnet API examples remain explicitly identified as experimental, not launch terms. Search and MCP regenerate from the same current content; assistant prompt prioritizes the current status over historical memory. Third-party caches and external announcements cannot be retracted by editing this site. Legal counsel review of specific past commitments remains advised.
