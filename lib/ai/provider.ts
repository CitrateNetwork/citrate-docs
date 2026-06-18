import "server-only";
import { generateText, type LanguageModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { Chunk } from "./corpus";

/**
 * Ask Atlas inference provider. Uses the SAME inference seam as citrate-explorer
 * (src/lib/ai/provider.ts): an OpenAI-compatible client (@ai-sdk/openai-compatible) pointed at the
 * citrate-inference-gateway, selectable by CITRATE_INFERENCE_MODE. Grounded ONLY in the tier-filtered
 * `chunks` the caller may read. If the gateway is unreachable, it falls back to a deterministic extractive
 * answer so the docs still respond.
 */
export const SYSTEM_PROMPT =
  "You are Ask Atlas, the documentation and project-history assistant for the Citrate Network. You answer " +
  "from two grounded sources, both scoped to what the reader may access: (1) DOCUMENTATION excerpts (slugs " +
  "like /chain/rpc), the canonical how-it-works; and (2) MEMORY items from the live federation knowledge " +
  "graph (slugs like mem:<repo>:<id>), each a commit, sprint decision, ADR, or document title across the " +
  "project's repositories. Use the documentation for how things work, and the memory items to speak to what " +
  "exists, what was decided, and the history and current state of the project across repos. Synthesize " +
  "across both. Cite the slug in brackets after a claim, e.g. [/chain/rpc] or [mem:citrate-chain:abc123]. " +
  "Memory items are short titles or pointers, not full text, so describe what they indicate (a decision, a " +
  "change, a document) rather than inventing their contents. If neither source covers it, say so plainly. " +
  "Never invent facts, addresses, keys, or endpoints. Be concise and plainspoken, and format the answer in " +
  "clean Markdown (short paragraphs, lists, tables, or fenced code where they help).";

type InferenceMode = "local" | "gateway" | "onchain";

function resolveMode(): InferenceMode {
  const m = (process.env.CITRATE_INFERENCE_MODE ?? "gateway").toLowerCase();
  if (m === "local" || m === "gateway" || m === "onchain") return m;
  throw new Error(`Invalid CITRATE_INFERENCE_MODE="${m}" (expected local | gateway | onchain)`);
}

/** Resolve the configured OpenAI-compatible model, mirroring the explorer's defaults. */
function languageModel(): LanguageModel {
  const mode = resolveMode();
  if (mode === "onchain") {
    throw new Error("CITRATE_INFERENCE_MODE=onchain is not wired yet. Use 'gateway' or 'local'.");
  }
  const baseURL =
    mode === "gateway"
      ? (process.env.CITRATE_GATEWAY_URL ?? "https://infer.citrate.ai/v1")
      : (process.env.CITRATE_INFERENCE_URL ?? "http://127.0.0.1:8080/v1");
  const apiKey = process.env.CITRATE_GATEWAY_API_KEY ?? process.env.CITRATE_INFERENCE_API_KEY ?? "not-needed";
  const modelId = process.env.CITRATE_MODEL_NAME ?? "gemma-4-E4B-it-Q4_K_M";
  const client = createOpenAICompatible({ name: "citrate", baseURL, apiKey });
  return client(modelId);
}

export async function answer(query: string, chunks: Chunk[]): Promise<{ text: string; backend: "gateway" | "extractive" }> {
  if (!chunks.length) {
    return { text: "I couldn't find anything on that in the documentation you can access.", backend: "extractive" };
  }
  const context = chunks.map((c) => `### ${c.title} (${c.slug})\n${c.text.slice(0, 1200)}`).join("\n\n");

  // Primary path: the inference gateway (OpenAI-compatible), the same seam the explorer uses.
  try {
    const { text } = await generateText({
      model: languageModel(),
      system: SYSTEM_PROMPT,
      prompt: `Question: ${query}\n\nExcerpts:\n${context}`,
      temperature: 0.3,
      maxOutputTokens: Number(process.env.CITRATE_MAX_OUTPUT_TOKENS ?? 896),
    });
    if (text && text.trim()) return { text: text.trim(), backend: "gateway" };
  } catch (err) {
    // Log the real reason server-side; never reflect gateway URLs/keys to the client.
    console.error("[ask] gateway inference unavailable, using extractive fallback:", err);
  }

  // Extractive fallback (gateway not configured / unreachable): quote the top readable chunk.
  const top = chunks[0];
  const para = top.text.split("\n\n").find((p) => p.trim() && !p.trim().startsWith("#")) ?? top.text.slice(0, 400);
  return {
    text:
      `From **${top.title}** [${top.slug}]:\n\n${para.trim()}\n\n` +
      `_Extractive answer: the inference gateway is not reachable from here yet. The sources below are all within your access tier._`,
    backend: "extractive",
  };
}
