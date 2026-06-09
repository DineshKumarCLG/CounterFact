/**
 * Unified LLM client — routes to Bedrock, Gemini, or OpenRouter
 * based on the LLM_PROVIDER environment variable.
 *
 * All agents call invokeLLM / invokeLLMJson from this module.
 * Zero agent code changes needed when switching providers.
 *
 * LLM_PROVIDER values:
 *   "bedrock"    (default) — AWS Bedrock (Claude, GLM, etc.)
 *   "gemini"               — Google Gemini via @google/generative-ai
 *   "openrouter"           — OpenRouter (OpenAI-compatible, 300+ models)
 */

import type { InvokeOptions, LLMResponse } from "./bedrock-client";
import { invokeLLM as bedrockInvoke } from "./bedrock-client";

export type { InvokeOptions, LLMResponse };

type Provider = "bedrock" | "gemini" | "openrouter";

function getProvider(): Provider {
  const p = (process.env.LLM_PROVIDER ?? "bedrock").toLowerCase();
  if (p === "gemini") return "gemini";
  if (p === "openrouter") return "openrouter";
  return "bedrock";
}

/* ─────────────────────────────────────────────────────────────────────────
   GEMINI
   ───────────────────────────────────────────────────────────────────────── */
async function geminiInvoke(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const { GoogleGenerativeAI } = await import("@google/generative-ai");

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const modelId =
    process.env.GEMINI_MODEL_ID ?? "gemini-2.0-flash";

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelId,
    ...(options.systemPrompt
      ? { systemInstruction: options.systemPrompt }
      : {}),
    generationConfig: {
      maxOutputTokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.3,
    },
  });

  const result = await model.generateContent(userMessage);
  const response = result.response;
  const text = response.text();
  const usage = response.usageMetadata;

  return {
    content: text,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   OPENROUTER  (OpenAI-compatible API)
   ───────────────────────────────────────────────────────────────────────── */
async function openRouterInvoke(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const { default: OpenAI } = await import("openai");

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const modelId =
    process.env.OPENROUTER_MODEL_ID ?? "anthropic/claude-3.5-sonnet";

  const client = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
    defaultHeaders: {
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL ?? "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_SITE_NAME ?? "Counterfact",
    },
  });

  type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
  const messages: ChatMessage[] = [];
  if (options.systemPrompt) {
    messages.push({ role: "system", content: options.systemPrompt });
  }
  messages.push({ role: "user", content: userMessage });

  const completion = await client.chat.completions.create({
    model: modelId,
    messages,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
  });

  const choice = completion.choices[0];
  return {
    content: choice.message.content ?? "",
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   ROUTER — single entry point for all agents
   ───────────────────────────────────────────────────────────────────────── */
export async function invokeLLM(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const provider = getProvider();

  switch (provider) {
    case "gemini":
      return geminiInvoke(userMessage, options);
    case "openrouter":
      return openRouterInvoke(userMessage, options);
    case "bedrock":
    default:
      return bedrockInvoke(userMessage, options);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   JSON helper — identical to bedrock-client version, works with any provider
   ───────────────────────────────────────────────────────────────────────── */
function extractJson(raw: string): string {
  const fenceMatch = raw.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
  if (fenceMatch) return fenceMatch[1].trim();
  const jsonMatch = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) return jsonMatch[1].trim();
  return raw.trim();
}

export async function invokeLLMJson<T = unknown>(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<{ data: T; inputTokens: number; outputTokens: number }> {
  const response = await invokeLLM(userMessage, options);
  const cleaned = extractJson(response.content);

  let data: T;
  try {
    data = JSON.parse(cleaned) as T;
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON.\nProvider: ${getProvider()}\nRaw: ${response.content.slice(0, 300)}`
    );
  }

  return { data, inputTokens: response.inputTokens, outputTokens: response.outputTokens };
}
