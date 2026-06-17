/**
 * User settings fixtures (DESIGN_BRIEF §11): appearance prefs, Ask prefs, notification subscriptions,
 * API keys (hashed/copy-once/tier-capped), and the user's own transparency/access log.
 */

import { AccessLogEntry, ApiKey, Prefs, Subscription } from "./types";
import { FIXED_NOW } from "./viewers";

const DAY = 86_400_000;

export const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  density: "comfortable",
  fontScale: 1.0,
  reduceMotion: false,
  askDrawerDefaultOpen: true,
  showToolTracesByDefault: false,
  askAffordances: true,
  threadRetentionDays: null,
};

export const SUBSCRIPTIONS: Subscription[] = [
  { id: "sub_chain", scope: "/chain", channel: ["in_app", "email"], types: ["doc_change"] },
  { id: "sub_compliance", scope: "/enterprise/compliance-full", channel: ["email"], types: ["embargo_release", "security_notice"] },
];

export const API_KEYS: ApiKey[] = [
  {
    id: "key_1", masked: "ck_live_…a91f", label: "My docs bot (MCP)", tierCap: "commercial",
    createdAt: FIXED_NOW - 14 * DAY, lastUsedAt: FIXED_NOW - 2 * 3_600_000, quotaUsed: 1840, quotaLimit: 10000,
  },
  {
    id: "key_2", masked: "ck_live_…3c7e", label: "CI link-checker", tierCap: "public",
    createdAt: FIXED_NOW - 60 * DAY, lastUsedAt: null, quotaUsed: 0, quotaLimit: 10000,
  },
];

/** Shown once at creation only — never recoverable. Use to demo the copy-once flow. */
export const NEWLY_CREATED_KEY = {
  id: "key_3",
  fullKeyShownOnce: "ck_live_8f2a4c9e1b7d3a05f6c8e0b2d4a6f8c0",
  masked: "ck_live_…f8c0",
  label: "New key",
  tierCap: "commercial" as const,
};

/** The signed-in user's own access log (Settings → Transparency). */
export const MY_ACCESS_LOG: AccessLogEntry[] = [
  { id: "al1", sub: "uuid:tob-auditor-21", docSlug: "/internal/audit", tier: "confidential", orgId: "audit:2026-06", disclosureAck: true, at: FIXED_NOW - 30 * 60_000 },
  { id: "al2", sub: "uuid:tob-auditor-21", docSlug: "/enterprise/compliance-full", tier: "confidential", orgId: "audit:2026-06", disclosureAck: true, at: FIXED_NOW - 25 * 60_000 },
];
