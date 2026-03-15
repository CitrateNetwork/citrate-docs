/**
 * Inference service — calls citrate_chatCompletion via JSON-RPC.
 * Uses the GGUF chat completion engine for actual text generation.
 */

import type { ChatMessage } from './encryption.ts';
import { RPC_ENDPOINT } from '../config/network.ts';

interface InferenceResponse {
  output: string;
  gasUsed?: number;
  executionTimeMs?: number;
}

/**
 * Run chat completion on a deployed on-chain model.
 * Sends the full conversation history as context.
 */
export async function runInference(
  modelId: string,
  messages: ChatMessage[],
): Promise<InferenceResponse> {
  const chatMessages = messages.map(m => ({
    role: m.role,
    content: m.content,
  }));

  const body = {
    jsonrpc: '2.0',
    method: 'citrate_chatCompletion',
    params: [{
      model: modelId,
      messages: chatMessages,
      max_tokens: 512,
      temperature: 0.7,
    }],
    id: Date.now(),
  };

  const res = await fetch(RPC_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`RPC request failed: ${res.statusText}`);
  }

  const json = await res.json() as {
    result?: {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: { total_tokens?: number };
    };
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(json.error.message);
  }

  const content = json.result?.choices?.[0]?.message?.content ?? 'No response generated.';

  return {
    output: content,
    gasUsed: json.result?.usage?.total_tokens,
  };
}

/** List available GGUF models for chat completion. */
export async function listModels(): Promise<Array<{ id: string; name: string }>> {
  // Models available via citrate_chatCompletion (aliases from core/api/src/methods/ai.rs)
  return [
    { id: 'qwen2-0.5b', name: 'Qwen2 0.5B' },
  ];
}
