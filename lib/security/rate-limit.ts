/**
 * DOC-B-007 — a real in-memory fixed-window rate limiter for the unauthenticated server routes
 * (`/api/sandbox/*`, `/api/chat`, `/api/mcp`). These forward attacker-supplied prompts to the paid
 * federation gateway on the server's own credential, so without a limiter they are an open,
 * cost-amplifying proxy. The limiter is keyed on the caller's IP for anonymous callers (and can be
 * keyed on `sub` for authenticated ones), returns a `429` with `Retry-After`, and is process-local
 * (best-effort in serverless). PBA-L3c-030: routes call {@link enforceRateLimitShared}, which keeps the
 * window counter in Upstash Redis when `UPSTASH_REDIS_REST_URL`/`_TOKEN` are set (one budget across
 * every instance) and falls back to this in-process window otherwise or on a store error.
 */

export interface RateLimitOptions {
  /** Max requests per window. */
  limit?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets (for the `Retry-After` header). */
  retryAfter: number;
  resetAt: number;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const BUCKETS = new Map<string, Bucket>();

/** Pure fixed-window check. `now` is injectable for deterministic tests. */
export function checkRateLimit(key: string, opts: RateLimitOptions = {}, now: number = Date.now()): RateLimitResult {
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT);
  const windowMs = Math.max(1, opts.windowMs ?? DEFAULT_WINDOW_MS);

  let b = BUCKETS.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    BUCKETS.set(key, b);
  }
  b.count += 1;

  // Opportunistic cleanup so the map cannot grow unbounded across many distinct keys.
  if (BUCKETS.size > 10_000) {
    for (const [k, v] of BUCKETS) if (now >= v.resetAt) BUCKETS.delete(k);
  }

  const allowed = b.count <= limit;
  const retryAfter = Math.max(0, Math.ceil((b.resetAt - now) / 1000));
  return { allowed, limit, remaining: Math.max(0, limit - b.count), retryAfter, resetAt: b.resetAt };
}

/** For tests: forget all buckets. */
export function resetRateLimits(): void {
  BUCKETS.clear();
}

/**
 * The caller's IP for limiter bucketing (PBA-L3c-030).
 *
 * The LEFT side of `x-forwarded-for` is whatever the client sent, so keying on it let a caller
 * mint a fresh bucket per request. Trusted sources only, in order:
 *  1. `x-vercel-forwarded-for`, only when `DOCS_TRUST_VERCEL_FORWARDED=1` (set it on the Vercel
 *     deployment, where the edge overwrites it; off Vercel it is client-controlled).
 *  2. The hop the outermost trusted proxy appended: counting `DOCS_TRUSTED_PROXY_HOPS` (default 1)
 *     in from the RIGHT of `x-forwarded-for`.
 *  3. `x-real-ip` only when `DOCS_TRUST_X_REAL_IP=1` (a platform known to overwrite it).
 * Otherwise a single shared "unknown" bucket (fail closed for the limiter, never client-chosen).
 */
export function clientIp(req: Request): string {
  // Only on Vercel does the edge set (overwrite) this header; anywhere else it is client-supplied
  // and would let a caller mint a bucket per request. Opt-in: DOCS_TRUST_VERCEL_FORWARDED=1.
  if (process.env.DOCS_TRUST_VERCEL_FORWARDED === "1") {
    const vercel = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
    if (vercel) return vercel;
  }
  const hops = (req.headers.get("x-forwarded-for") ?? "").split(",").map((h) => h.trim()).filter(Boolean);
  const n = Number(process.env.DOCS_TRUSTED_PROXY_HOPS);
  const trusted = Number.isInteger(n) && n >= 1 ? n : 1;
  const idx = hops.length - trusted;
  if (idx >= 0 && hops[idx]) return hops[idx];
  if (process.env.DOCS_TRUST_X_REAL_IP === "1") {
    const real = req.headers.get("x-real-ip")?.trim();
    if (real) return real;
  }
  return "unknown";
}

function tooMany(limit: number, retryAfter: number): Response {
  return new Response(JSON.stringify({ ok: false, error: "rate_limited", retryAfter, limit }), {
    status: 429,
    headers: { "content-type": "application/json", "cache-control": "no-store", "retry-after": String(retryAfter) },
  });
}

/** Fixed window in Upstash (INCR + EXPIRE NX). Throws on any store error. */
async function sharedWindow(key: string, limit: number, windowMs: number, now: number): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const idx = Math.floor(now / 1000 / windowSec);
  const k = `docs-rl:${key}:${idx}`;
  const res = await fetch(`${url}/pipeline`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify([["INCR", k], ["EXPIRE", k, windowSec, "NX"]]),
    signal: AbortSignal.timeout(1500),
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const body = (await res.json()) as Array<{ result?: number }>;
  const count = body?.[0]?.result;
  if (typeof count !== "number") throw new Error("upstash malformed response");
  const resetAt = (idx + 1) * windowSec * 1000;
  return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), retryAfter: Math.max(1, Math.ceil((resetAt - now) / 1000)), resetAt };
}

/**
 * The route entry point (PBA-L3c-030): like {@link enforceRateLimit}, but the counter is shared across
 * instances through Upstash when configured. A store error degrades to the in-process window.
 */
export async function enforceRateLimitShared(
  req: Request,
  scope: string,
  opts: RateLimitOptions = {},
  subject?: string | null
): Promise<Response | null> {
  const id = subject ? `sub:${subject}` : `ip:${clientIp(req)}`;
  const limit = Math.max(1, opts.limit ?? DEFAULT_LIMIT);
  const windowMs = Math.max(1, opts.windowMs ?? DEFAULT_WINDOW_MS);
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const r = await sharedWindow(`${scope}:${id}`, limit, windowMs, Date.now());
      return r.allowed ? null : tooMany(r.limit, r.retryAfter);
    } catch {
      /* store unavailable: fall through to the in-process window */
    }
  }
  return enforceRateLimit(req, scope, opts, subject);
}

/**
 * Enforce a rate limit for `req` under `scope`. Returns a `429` Response when the caller is over the
 * limit, or `null` to let the handler proceed. Keyed on IP (anonymous). Callers with a known subject
 * may pass it to key per-principal instead.
 */
export function enforceRateLimit(
  req: Request,
  scope: string,
  opts: RateLimitOptions = {},
  subject?: string | null
): Response | null {
  const id = subject ? `sub:${subject}` : `ip:${clientIp(req)}`;
  const res = checkRateLimit(`${scope}:${id}`, opts);
  if (res.allowed) return null;
  return tooMany(res.limit, res.retryAfter);
}
