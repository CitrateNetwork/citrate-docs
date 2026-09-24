/**
 * Admin console fixtures (DESIGN_BRIEF §12): principals/entitlements, orgs, content-sync status,
 * embargoes (with Rule-13 sign-off capture), the global access log, and sandbox config.
 */

import { AccessLogEntry, EmbargoRow, Org, Principal, SandboxConfig, SyncStatusRow } from "./types";
import { FIXED_NOW } from "./viewers";

const DAY = 86_400_000;

export const PRINCIPALS: Principal[] = [
  {
    sub: "uuid:7f3c1a90-builder", email: "dev@example.com", walletAddress: "0xb1d4...a77c", kycStatus: "verified",
    entitlement: { tier: "commercial", orgId: null, expiresAt: null },
  },
  {
    sub: "uuid:enterprise-defense_prime-014", email: "architect@defense_prime.example", kycStatus: "verified",
    entitlement: { tier: "commercial", orgId: "defense_prime", milestone: "production", expiresAt: null },
  },
  {
    sub: "uuid:academic_partner-pi", email: "pi@academic_partner.example", kycStatus: "verified",
    entitlement: { tier: "academic", orgId: "academic_partner", milestone: "phase-1-lab", expiresAt: null },
  },
  {
    sub: "uuid:tob-auditor-21", email: "auditor@trailofbits.example", kycStatus: "verified",
    entitlement: { tier: "confidential", orgId: "audit:2026-06", citrateRole: "auditor_tob", expiresAt: FIXED_NOW + 30 * DAY },
  },
  {
    sub: "uuid:citrate-admin-saul", email: "saul@citrate.ai", walletAddress: "0x4250...00c6", kycStatus: "verified",
    entitlement: { tier: "confidential", orgId: null, citrateRole: "admin", expiresAt: null },
  },
];

export const ORGS: Org[] = [
  { id: "defense_prime", name: "defense_prime", sector: "defense", tierBand: "commercial", kycRequired: true, seats: 50, seatsUsed: 14 },
  { id: "academic_partner", name: "academic_partner", sector: "research", tierBand: "academic", kycRequired: true, seats: 25, seatsUsed: 6 },
  { id: "nj-district-07", name: "NJ School District 07", sector: "education", tierBand: "commercial", kycRequired: true, seats: 120, seatsUsed: 88 },
  { id: "audit:2026-06", name: "Audit engagement 2026-06 (Trail of Bits)", sector: "enterprise", tierBand: "confidential", kycRequired: true, seats: 4, seatsUsed: 2 },
];

export const SYNC_STATUS: SyncStatusRow[] = [
  { nodeId: "chain-rpc", title: "JSON-RPC reference", sourceKind: "transcluded", source: "citrate-chain/core/api/README.md", pinnedSha: "81a4156", lastSyncAt: FIXED_NOW - 2 * DAY, drift: false, tier: "public" },
  { nodeId: "sdk-js", title: "sdk-js", sourceKind: "transcluded", source: "citrate-sdk-js/README.md", pinnedSha: "a1b2c3d", lastSyncAt: FIXED_NOW - 5 * DAY, drift: true, tier: "public" },
  { nodeId: "research-papers", title: "Gradient Papers v3", sourceKind: "linked", source: "citrate-docs/gradient_papers_v3/", drift: false, tier: "academic" },
  { nodeId: "int-audit", title: "Audit reports & findings", sourceKind: "gated", source: "citrate-security/audits/", drift: false, tier: "confidential" },
  { nodeId: "start-what", title: "What Citrate is", sourceKind: "authored", source: "codex", drift: false, tier: "public" },
];

export const EMBARGOES: EmbargoRow[] = [
  { docSlug: "/enterprise/compliance-full", title: "Compliance posture (full)", embargoUntil: FIXED_NOW + 21 * DAY, approver: "federation-lead (pending Rule-13 sign-off)", released: false },
  { docSlug: "/research/atis-preprint", title: "ATIS preprint", embargoUntil: FIXED_NOW - 3 * DAY, approver: "federation-lead", released: true },
];

export const GLOBAL_ACCESS_LOG: AccessLogEntry[] = [
  { id: "g1", sub: "uuid:tob-auditor-21", docSlug: "/internal/audit", tier: "confidential", orgId: "audit:2026-06", disclosureAck: true, at: FIXED_NOW - 30 * 60_000 },
  { id: "g2", sub: "uuid:citrate-admin-saul", docSlug: "/internal/funding", tier: "confidential", orgId: null, disclosureAck: false, at: FIXED_NOW - 90 * 60_000 },
  { id: "g3", sub: "uuid:enterprise-defense_prime-014", docSlug: "/enterprise/defense_prime", tier: "commercial", orgId: "defense_prime", disclosureAck: false, at: FIXED_NOW - 4 * 3_600_000 },
];

export const SANDBOX_CONFIG: SandboxConfig[] = [
  { id: "sb-dag", title: "GhostDAG blue-score", enabled: true, rateLimitPerMin: 60, endpointHealthy: true },
  { id: "sb-relay", title: "Gasless relay", enabled: true, rateLimitPerMin: 10, endpointHealthy: true },
  { id: "sb-x402", title: "x402 payment", enabled: true, rateLimitPerMin: 10, endpointHealthy: true },
  { id: "sb-infer", title: "Inference gateway", enabled: true, rateLimitPerMin: 20, endpointHealthy: false },
  { id: "sb-rpc", title: "RPC explorer", enabled: true, rateLimitPerMin: 60, endpointHealthy: true },
];
