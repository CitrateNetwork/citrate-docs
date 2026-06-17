import "server-only";
import type { Chunk } from "./corpus";

/**
 * S4 — inference provider for Ask Codex. OpenAI-compatible (citrate-inference-gateway / DGX local-proxy)
 * when CITRATE_GATEWAY_URL is set; otherwise a deterministic extractive fallback so the prototype answers
 * offline. Either path is grounded ONLY in the tier-filtered `chunks` the caller may read.
 */
export const SYSTEM_PROMPT =
  "You are Ask Codex, the documentation assistant for the Citrate Network. Answer ONLY from the provided " +
  "documentation excerpts — they are scoped to what the reader is allowed to access. Cite the source slug " +
  "in brackets, e.g. [/chain/rpc]. If the answer is not in the excerpts, say you don't have it in the docs " +
  "available to them. Never invent facts, addresses, keys, or endpoints. Be concise and plainspoken.";

export async function answer(query: string, chunks: Chunk[]): Promise<{ text: string; backend: "gateway" | "extractive" }> {
  if (!chunks.length) {
    return { text: "I couldn't find anything on that in the documentation you can access.", backend: "extractive" };
  }
  const context = chunks.map((c) => `### ${c.title} (${c.slug})\n${c.text.slice(0, 1200)}`).join("\n\n");

  const url = process.env.CITRATE_GATEWAY_URL;
  const key = process.env.CITRATE_GATEWAY_API_KEY;
  const model = process.env.CITRATE_MODEL_NAME || "gemma-4-E4B-it-Q4_K_M";
  if (url) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(key ? { authorization: `Bearer ${key}` } : {}) },
        body: JSON.stringify({
          model, max_tokens: 512, stream: false,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: `Question: ${query}\n\nExcerpts:\n${context}` },
          ],
        }),
      });
      if (res.ok) {
        const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
        const t = j.choices?.[0]?.message?.content;
        if (t) return { text: t, backend: "gateway" };
      }
    } catch {
      /* fall through to extractive */
    }
  }

  // Extractive fallback (no gateway configured / unreachable): quote the top readable chunk.
  const top = chunks[0];
  const para = top.text.split("\n\n").find((p) => p.trim() && !p.trim().startsWith("#")) ?? top.text.slice(0, 400);
  return {
    text:
      `From **${top.title}** [${top.slug}]: ${para.trim()}\n\n` +
      `_Extractive answer — the inference gateway isn't configured here. The sources below are all within your access tier._`,
    backend: "extractive",
  };
}
