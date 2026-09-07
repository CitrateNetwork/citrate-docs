import { resolveTier } from "@/prototype/fixtures";
import { resolveRequestSession } from "@/lib/auth/request-session";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { retrieve } from "@/lib/ai/corpus";
import { searchMemory } from "@/lib/ai/memory";
import { answer } from "@/lib/ai/provider";

// Gateway inference can be slow on a cold/CPU model (first token). Give it room (Vercel Fluid Compute).
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * S4 — Ask Codex. Tier-aware RAG: resolve the caller → retrieve docs they may read (filter-before-
 * retrieval) → ground an answer in those excerpts → return answer + citations + tool trace. Citations are
 * guaranteed ≤ caller tier ∧ org because retrieval already filtered (PLANSET/03 `AgentRespectsTier`).
 *
 * Live-memory extension: alongside the frozen docs, ground answers in the live
 * citrate-memories DAG via the mem-gateway MCP (`searchMemory`). It is tier-filtered
 * the same way — only repos the caller may read are queried — so confidential graph
 * content never reaches an unauthorized asker.
 */
export async function POST(req: Request) {
  // DOC-B-007: Ask Codex fans out to the paid gateway + up to 29 memory repos per call — throttle it.
  const limited = enforceRateLimit(req, "chat", { limit: 20 });
  if (limited) return limited;

  let query = "";
  try {
    const body = (await req.json()) as { query?: string; message?: string };
    query = (body.query || body.message || "").toString().slice(0, 2000);
  } catch {
    /* empty */
  }
  const session = await resolveRequestSession(req);
  const now = Date.now();
  const tier = resolveTier(session, now); // DOC-B-005: real clock, not FIXED_NOW

  // Frozen docs + live federation memory, both filtered to what this caller may read.
  const docChunks = retrieve(session, query, 5, now);
  const memChunks = await searchMemory(session, query, now);
  const grounded = [...docChunks, ...memChunks];
  const { text, backend } = await answer(query, grounded);

  return Response.json(
    {
      answer: text,
      tier,
      backend,
      citations: grounded.map((c) => ({ slug: c.slug, title: c.title, tier: c.tier })),
      tools: [
        { tool: "searchDocs", args: { query, tier }, backing: "DOCS" },
        ...(docChunks[0]
          ? [{ tool: "getSurface", args: { id: docChunks[0].slug }, backing: "DOCS" }]
          : []),
        ...(memChunks.length
          ? [{ tool: "searchMemory", args: { query, hits: memChunks.length }, backing: "MEMORY" }]
          : []),
      ],
    },
    { headers: { "cache-control": "no-store" } }
  );
}
