/**
 * DOC-B-007 — a real in-memory fixed-window rate limiter for the unauthenticated server routes
 * (`/api/sandbox/*`, `/api/chat`, `/api/mcp`). These forward attacker-supplied prompts to the paid
 * federation gateway on the server's own credential, so without a limiter they are an open,
 * cost-amplifying proxy. The limiter is keyed on the caller's IP for anonymous callers (and can be
 * keyed on `sub` for authenticated ones), returns a `429` with `Retry-After`, and is process-local
 * (best-effort in serverless; a shared store — Upstash/Vercel KV — is the production upgrade).
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

/** Best-effort client IP from the standard proxy headers (Vercel sets `x-forwarded-for`). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip")?.trim() || "unknown";
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
  return new Response(
    JSON.stringify({ ok: false, error: "rate_limited", retryAfter: res.retryAfter, limit: res.limit }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
        "retry-after": String(res.retryAfter),
      },
    }
  );
}
