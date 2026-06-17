import { resolveTier } from "@/prototype/fixtures";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { retrieve } from "@/lib/ai/corpus";
import { answer } from "@/lib/ai/provider";

/**
 * S4 — Ask Codex. Tier-aware RAG: resolve the caller → retrieve docs they may read (filter-before-
 * retrieval) → ground an answer in those excerpts → return answer + citations + tool trace. Citations are
 * guaranteed ≤ caller tier ∧ org because retrieval already filtered (PLANSET/03 `AgentRespectsTier`).
 */
export async function POST(req: Request) {
  let query = "";
  try {
    const body = (await req.json()) as { query?: string; message?: string };
    query = (body.query || body.message || "").toString().slice(0, 2000);
  } catch {
    /* empty */
  }
  const session = await resolveRequestSession(req);
  const tier = resolveTier(session);
  const now = Date.now();

  const chunks = retrieve(session, query, 5, now);
  const { text, backend } = await answer(query, chunks);

  return Response.json(
    {
      answer: text,
      tier,
      backend,
      citations: chunks.map((c) => ({ slug: c.slug, title: c.title, tier: c.tier })),
      tools: [
        { tool: "searchDocs", args: { query, tier }, backing: "DOCS" },
        ...(chunks[0] ? [{ tool: "getSurface", args: { id: chunks[0].slug }, backing: "DOCS" }] : []),
      ],
    },
    { headers: { "cache-control": "no-store" } }
  );
}
