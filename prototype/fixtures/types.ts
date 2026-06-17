/**
 * Citrate Codex — prototype fixture types.
 *
 * These types are the design/engineering contract. They mirror the "Data shape" column of
 * DESIGN_BRIEF.md §14 (the wiring map). The fixtures in this folder are typed against them so that
 * swapping mocks for the real `/api/*` routes is a drop-in: keep the shapes, replace the source.
 *
 * Source of truth: DESIGN_BRIEF.md §14, PLANSET/02_ARCHITECTURE.md §4/§8, PLANSET/06_INFORMATION_ARCHITECTURE.md.
 */

/* ────────────────────────────────────────────────────────────────────────── Access / identity */

export type Tier = "public" | "commercial" | "academic" | "confidential";

/** Total order used by canRead(): public < commercial < academic < confidential. */
export const TIER_RANK: Record<Tier, number> = {
  public: 0,
  commercial: 1,
  academic: 2,
  confidential: 3,
};

/** Resolved entitlement claim (minted by citrate-identity, cached by Codex). */
export interface Entitlement {
  tier: Tier;
  /** Per-company / per-sector scope. null = no org restriction (general-tier content). */
  orgId: string | null;
  /** Named operational role for admins/auditors; undefined for normal users. */
  citrateRole?: "admin" | "exec" | "auditor_tob" | "auditor_coalfire" | "auditor_c3pao" | string;
  /** Contract/engagement milestone, if any. */
  milestone?: string;
  /** epoch-ms; access past this instant collapses to Public (EntitlementExpiry). */
  expiresAt: number | null;
}

/** Normalized session — the single object the whole app reads (DESIGN_BRIEF §14). */
export interface AuthSession {
  required: boolean;
  authenticated: boolean;
  sub?: string;
  walletAddress?: string;
  email?: string;
  kycStatus: "none" | "pending" | "verified" | "revoked";
  entitlement?: Entitlement;
}

/** A demo viewer = a session plus a label for the dev-mode tier switcher. */
export interface Viewer {
  id: string;
  label: string;
  description: string;
  session: AuthSession;
}

/* ───────────────────────────────────────────────────────────────────────────── Navigation */

export type NodeVisibility = "visible" | "locked" | "hidden";

/** A sidebar/IA node. `tier` + optional `orgId` drive canRead/visibility. */
export interface NavNode {
  id: string;
  title: string;
  slug?: string; // doc route; absent for pure groups
  tier: Tier;
  orgId?: string | null;
  icon?: string;
  /** "tutorials" marks the per-section Tutorials subsection. */
  kind?: "group" | "doc" | "tutorials" | "sandbox";
  children?: NavNode[];
}

/* ──────────────────────────────────────────────────────────────────────────────── Content */

export type DocSourceKind = "authored" | "transcluded" | "linked" | "gated";

export interface TocItem {
  depth: number;
  text: string;
  anchor: string;
}

export interface Doc {
  slug: string;
  title: string;
  tier: Tier;
  orgId?: string | null;
  sourceKind: DocSourceKind;
  /** repo/path the content comes from (transcluded/gated/linked); "codex" for authored. */
  source: string;
  /** pinned manifest SHA for transcluded content. */
  syncedSha?: string;
  syncedAt?: number;
  readingTimeMin?: number;
  toc: TocItem[];
  /** Markdown/MDX body. For `gated`+denied this is null (never sent to the client). */
  body: string | null;
  /** Confidential doc requiring a disclosure acknowledgement before render. */
  disclosureRequired?: boolean;
  disclosureId?: string;
  /** Embargo — body withheld until this instant. */
  embargoUntil?: number | null;
  /** Server marks Confidential reads as logged. */
  accessLogged?: boolean;
  /** Version selector support. */
  versions?: string[];
  currentVersion?: string;
}

/** What the reader gets when a node is locked (visible-locked) — never the body. */
export interface GateCard {
  locked: true;
  slug: string;
  title: string;
  summary: string;
  requiredTier: Tier;
  cta: { label: string; action: "kyc" | "request_seat" | "apply_research" | "contact_admin" };
}

export type DocResponse =
  | { kind: "doc"; doc: Doc }
  | { kind: "gate"; gate: GateCard }
  | { kind: "embargo"; until: number; title: string }
  | { kind: "disclosure_required"; disclosureId: string; doc: Pick<Doc, "slug" | "title" | "tier"> }
  | { kind: "not_found" }; // Confidential-to-unentitled returns this (404), never reveals existence

export interface Disclosure {
  id: string;
  title: string;
  body: string;
}

export interface DisclosureAck {
  sub: string;
  disclosureId: string;
  acknowledgedAt: number;
}

/* ───────────────────────────────────────────────────────────────────────────────── Search */

export interface SearchResult {
  title: string;
  slug: string;
  tier: Tier;
  snippet: string;
  section: string;
}

/* ──────────────────────────────────────────────────────────────────────────── Ask Codex */

export interface Citation {
  slug: string;
  title: string;
  tier: Tier;
}

export interface ToolCall {
  tool: "searchDocs" | "getSurface" | "getChainStatus" | "exploreDag" | "listSandboxes" | string;
  args: Record<string, unknown>;
  /** "RPC" | "DOCS" | "synthesis" — provenance, surfaced in the trace. */
  backing: "RPC" | "DOCS" | "synthesis";
}

export interface AskMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  citations?: Citation[];
  createdAt: number;
}

export interface Thread {
  id: string;
  sub?: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: AskMessage[];
}

/* ───────────────────────────────────────────────────────────────────────────── Sandboxes */

export interface ChainStatus {
  chainId: 40204;
  height: number;
  blueScore: number;
  gasPrice: string;
  up: boolean;
}

export interface DagNode {
  id: string;
  blueScore: number;
  blue: boolean;
  finalized: boolean;
}

export interface DagEdge {
  from: string;
  to: string;
  kind: "selected" | "merge";
}

export interface DagSnapshot {
  tips: string[];
  nodes: DagNode[];
  edges: DagEdge[];
}

export interface RelayResult {
  txHash: string;
  sponsoredBy: string;
  receipt: { status: "success" | "reverted"; blockHeight: number; gasUsed: string };
}

export interface X402Result {
  challenge: { resource: string; amount: string; asset: "SALT"; nonce: string };
  settlement: { txHash: string; paid: string };
  unlocked: { status: 200; body: string };
}

export interface InferenceChunk {
  delta: string;
}

export interface InferenceUsage {
  promptTokens: number;
  completionTokens: number;
  costSalt: string;
}

export interface RpcCallResult {
  method: string;
  request: unknown;
  decoded: unknown;
  curl: string;
}

export interface SandboxState<T> {
  status: "ok" | "rate_limited" | "fail_closed";
  data?: T;
  retryAfter?: number;
  message?: string;
}

/* ───────────────────────────────────────────────────────────────────────────── Settings */

export interface Prefs {
  theme: "dark" | "light" | "system";
  density: "comfortable" | "compact";
  fontScale: number; // 0.9 .. 1.25
  reduceMotion: boolean;
  askDrawerDefaultOpen: boolean;
  showToolTracesByDefault: boolean;
  askAffordances: boolean;
  threadRetentionDays: number | null; // null = keep forever
}

export interface Subscription {
  id: string;
  scope: string; // a section/doc slug being watched
  channel: ("in_app" | "email")[];
  types: ("doc_change" | "embargo_release" | "security_notice")[];
}

export interface ApiKey {
  id: string;
  masked: string; // e.g. "ck_live_…a91f"
  label: string;
  tierCap: Tier; // can never exceed creator's entitlement
  createdAt: number;
  lastUsedAt: number | null;
  quotaUsed: number;
  quotaLimit: number;
}

export interface AccessLogEntry {
  id: string;
  sub: string;
  docSlug: string;
  tier: Tier;
  orgId?: string | null;
  disclosureAck: boolean;
  at: number;
}

/* ─────────────────────────────────────────────────────────────────────────────── Admin */

export interface Principal {
  sub: string;
  email: string;
  walletAddress?: string;
  kycStatus: AuthSession["kycStatus"];
  entitlement: Entitlement;
}

export interface Org {
  id: string;
  name: string;
  sector: "education" | "defense" | "research" | "enterprise";
  tierBand: Tier;
  kycRequired: boolean;
  seats: number;
  seatsUsed: number;
}

export interface SyncStatusRow {
  nodeId: string;
  title: string;
  sourceKind: DocSourceKind;
  source: string;
  pinnedSha?: string;
  lastSyncAt?: number;
  drift: boolean;
  tier: Tier;
}

export interface EmbargoRow {
  docSlug: string;
  title: string;
  embargoUntil: number;
  approver?: string; // Rule-13 sign-off capture
  released: boolean;
}

export interface SandboxConfig {
  id: string;
  title: string;
  enabled: boolean;
  rateLimitPerMin: number;
  endpointHealthy: boolean;
}
