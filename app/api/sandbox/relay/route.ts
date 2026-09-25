/** S5 - gasless EIP-2771 relay demo. The docs app custodies no keys and submits
 *  no transactions on its own (by design), so it cannot sign a meta-transaction.
 *  Instead it probes the configured relayer for liveness and readiness: a live,
 *  configured relayer answers a keyless request with "missing request or
 *  signature" (it validates before it would ever sponsor), which is exactly the
 *  signal we surface. Fail-closed when no relayer is configured. */
import { enforceRateLimitShared } from "@/lib/security/rate-limit";

const PATTERN =
  "user signs an EIP-712 ForwardRequest -> POST it to the relayer -> " +
  "CitrateForwarder.verify checks the signature on-chain -> the relayer submits execute() and pays the gas";

export async function POST(req: Request) {
  const limited = await enforceRateLimitShared(req, "sandbox:relay", { limit: 10 }); // DOC-B-007
  if (limited) return limited;

  const relay = process.env.CITRATE_RELAY_URL;
  if (!relay) {
    return Response.json(
      {
        ok: false,
        error:
          "relay endpoint not configured - fail-closed. The gasless EIP-2771 demo forwards a user-signed " +
          "meta-transaction to the Citrate relayer; the docs app holds no keys and submits nothing itself.",
        pattern: PATTERN,
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }

  try {
    const forwarded = (await req.text()) || "{}";
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(relay, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: forwarded,
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const data = (await res.json().catch(() => ({}))) as { receipt?: unknown; error?: string };

    // A real signed meta-transaction was forwarded and sponsored.
    if (res.ok && data?.receipt) {
      return Response.json({ ok: true, receipt: data.receipt }, { headers: { "cache-control": "no-store" } });
    }

    // Keyless liveness probe: the relayer rejecting an unsigned body with
    // "missing request or signature" proves it is up and validating.
    const msg = String(data?.error ?? "");
    const live = res.status === 400 && /request or signature/i.test(msg);
    if (live) {
      return Response.json(
        {
          ok: true,
          receipt: {
            status: "relayer live and ready to sponsor",
            endpoint: relay,
            pattern: PATTERN,
            note:
              "This sandbox is read-only and holds no keys, so it confirms the relayer is live rather than " +
              "submitting a transaction. Send a signed ForwardRequest with the SDK to have gas sponsored.",
          },
        },
        { headers: { "cache-control": "no-store" } }
      );
    }

    const notConfigured = res.status === 503 || /forwarder not configured/i.test(msg);
    return Response.json(
      {
        ok: false,
        error: notConfigured
          ? "relayer reachable but its forwarder is not configured"
          : msg || `relay HTTP ${res.status}`,
      },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json(
      { ok: false, error: "relay unavailable (fail-closed)" },
      { status: 502, headers: { "cache-control": "no-store" } }
    );
  }
}
