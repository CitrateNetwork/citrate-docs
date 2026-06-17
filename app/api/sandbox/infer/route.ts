/** S5 — inference-gateway call (OpenAI-compatible). Fail-closed without a configured gateway + key. */
export async function POST(req: Request) {
  let prompt = "Say hello from Citrate.";
  try {
    const b = (await req.json()) as { prompt?: string };
    if (b.prompt) prompt = b.prompt.slice(0, 1000);
  } catch {
    /* default */
  }
  const url = process.env.CITRATE_GATEWAY_URL || "https://infer.citrate.ai/v1";
  const key = process.env.CITRATE_GATEWAY_API_KEY;
  const model = process.env.CITRATE_MODEL_NAME || "gemma-4-E4B-it-Q4_K_M";
  if (!key) {
    return Response.json(
      { ok: false, error: "inference gateway API key not configured — fail-closed (no key custody in the docs app)." },
      { status: 503, headers: { "cache-control": "no-store" } }
    );
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(`${url.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, max_tokens: 256, stream: false, messages: [{ role: "user", content: prompt }] }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return Response.json({ ok: false, error: `gateway HTTP ${res.status}` }, { status: 502 });
    const j = (await res.json()) as { choices?: { message?: { content?: string } }[]; usage?: unknown };
    return Response.json(
      { ok: true, text: j.choices?.[0]?.message?.content ?? "", usage: j.usage },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return Response.json({ ok: false, error: "gateway unavailable (fail-closed)" }, { status: 502 });
  }
}
