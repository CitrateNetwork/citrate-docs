import { enforceRateLimit } from "@/lib/security/rate-limit";

/** S5 — x402 walkthrough: request a metered resource and surface the HTTP 402 challenge. Fail-closed
 *  when no x402 endpoint is reachable. Read-only: it captures the challenge, it does not settle/pay. */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "sandbox:x402", { limit: 20 }); // DOC-B-007
  if (limited) return limited;

  const url = process.env.CITRATE_X402_URL || `${(process.env.CITRATE_GATEWAY_URL || "https://infer.citrate.ai/v1").replace(/\/$/, "")}/chat/completions`;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    // Deliberately unauthenticated → expect a 402 (payment required) with the challenge in headers/body.
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ model: "probe", messages: [{ role: "user", content: "x402 probe" }] }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const wwwAuth = res.headers.get("www-authenticate");
    const payment = res.headers.get("x-payment") || res.headers.get("payment-required");
    const bodyText = await res.text();
    if (res.status === 402) {
      return Response.json(
        { ok: true, status: 402, challenge: { wwwAuth, payment, body: safeJson(bodyText) }, note: "402 challenge captured — next step is sign + settle (not performed here)." },
        { headers: { "cache-control": "no-store" } }
      );
    }
    return Response.json(
      { ok: false, status: res.status, note: "endpoint did not return a 402 challenge (needs an x402-gated route).", body: safeJson(bodyText) },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json({ ok: false, error: "x402 endpoint unavailable (fail-closed)" }, { status: 502 });
  }
}

function safeJson(s: string): unknown {
  try { return JSON.parse(s); } catch { return s.slice(0, 300); }
}
