/** S5 — gasless EIP-2771 relay demo. Wired for a configured relay; fail-closed otherwise (the docs app
 *  custodies no keys and submits no transactions on its own — by design). */
export async function POST(req: Request) {
  const relay = process.env.CITRATE_RELAY_URL;
  if (!relay) {
    return Response.json(
      {
        ok: false,
        error:
          "relay endpoint not configured — fail-closed. The gasless EIP-2771 demo forwards a user-signed " +
          "meta-transaction to the Citrate relayer; the docs app holds no keys and submits nothing itself.",
        pattern: "user signs EIP-712 → POST to CitrateForwarder relayer → relayer pays gas → receipt",
      },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
  try {
    const body = await req.text();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    const res = await fetch(relay, { method: "POST", headers: { "content-type": "application/json" }, body, signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return Response.json({ ok: false, error: `relay HTTP ${res.status}` }, { status: 502 });
    return Response.json({ ok: true, receipt: await res.json() }, { headers: { "cache-control": "no-store" } });
  } catch {
    return Response.json({ ok: false, error: "relay unavailable (fail-closed)" }, { status: 502 });
  }
}
