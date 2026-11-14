/**
 * Unified LLM client — routes to Bedrock, Gemini, OpenAI, Anthropic, NVIDIA NIM,
 * or OpenRouter with per-request BYOK overrides.
 *
 * All agents call invokeLLM / invokeLLMJson from this module.
 * Zero agent code changes needed when switching providers.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { ZodType } from "zod";
import type { InvokeOptions as BedrockInvokeOptions, LLMResponse } from "./bedrock-client";
import { invokeLLM as bedrockInvoke } from "./bedrock-client";

export const VALID_PROVIDERS = [
  "bedrock",
  "gemini",
  "openai",
  "anthropic",
  "nvidia",
  "openrouter",
] as const;

export type Provider = (typeof VALID_PROVIDERS)[number];

export interface InvokeOptions {
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  schema?: ZodType<unknown>;
  provider?: Provider;
  apiKey?: string;
  modelId?: string;
  baseUrl?: string;
}

export type { LLMResponse };

export interface BYOKConfig {
  provider?: Provider;
  apiKey?: string;
  modelId?: string;
  baseUrl?: string;
}

export const byokStorage = new AsyncLocalStorage<BYOKConfig | undefined>();

export function withBYOKContext<T>(byok: BYOKConfig | undefined, fn: () => Promise<T>): Promise<T> {
  if (!byok) {
    return fn();
  }
  return byokStorage.run(byok, fn);
}

export function getBYOKContext(): BYOKConfig | undefined {
  return byokStorage.getStore();
}

export function getEnvKeyForProvider(provider: Provider): string | undefined {
  switch (provider) {
    case "gemini":
      return process.env.GEMINI_API_KEY;
    case "openai":
      return process.env.OPENAI_API_KEY;
    case "anthropic":
      return process.env.ANTHROPIC_API_KEY;
    case "nvidia":
      return process.env.NVIDIA_API_KEY;
    case "openrouter":
      return process.env.OPENROUTER_API_KEY;
    case "bedrock":
      return undefined;
  }
}

export function maskApiKey(key?: string): string {
  if (!key) return "";
  if (key.length <= 8) return "********";
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

export function extractBYOKConfig(
  request?: Request,
  body?: Record<string, unknown>
): BYOKConfig | undefined {
  let headerProvider: string | undefined;
  let headerApiKey: string | undefined;
  let headerModelId: string | undefined;
  let headerBaseUrl: string | undefined;

  if (request?.headers) {
    headerProvider = request.headers.get("x-byok-provider")?.trim();
    headerApiKey = request.headers.get("x-byok-api-key")?.trim();
    headerModelId = request.headers.get("x-byok-model-id")?.trim();
    headerBaseUrl = request.headers.get("x-byok-base-url")?.trim();
  }

  const bodyByok = body?.byok as Record<string, string> | undefined;

  const rawProvider = (headerProvider || bodyByok?.provider || "").trim();
  const rawApiKey = (headerApiKey || bodyByok?.apiKey || "").trim();
  const rawModelId = (headerModelId || bodyByok?.modelId || "").trim();
  const rawBaseUrl = (headerBaseUrl || bodyByok?.baseUrl || "").trim();

  if (!rawProvider && !rawApiKey && !rawModelId && !rawBaseUrl) {
    return undefined;
  }

  const provider = rawProvider ? (rawProvider.toLowerCase() as Provider) : undefined;
  const apiKey = rawApiKey || undefined;
  const modelId = rawModelId || undefined;
  const baseUrl = rawBaseUrl || undefined;

  return {
    provider,
    apiKey,
    modelId,
    baseUrl,
  };
}

export function getProvider(options?: InvokeOptions): Provider {
  if (options?.provider) {
    const p = options.provider.toLowerCase();
    if (VALID_PROVIDERS.includes(p as Provider)) {
      return p as Provider;
    }
    throw new Error(`Invalid provider: ${options.provider}`);
  }
  const envProvider = (process.env.LLM_PROVIDER ?? "bedrock").toLowerCase();
  if (VALID_PROVIDERS.includes(envProvider as Provider)) {
    return envProvider as Provider;
  }
  return "bedrock";
}

/* ─────────────────────────────────────────────────────────────────────────
   GEMINI
   ───────────────────────────────────────────────────────────────────────── */
async function geminiInvoke(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const apiKey = (options.apiKey?.trim()) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set: API key required for provider gemini");
  }

  const geminiModule = await import("@google/generative-ai");
  const GoogleGenerativeAI =
    geminiModule.GoogleGenerativeAI ??
    (geminiModule as unknown as { default?: { GoogleGenerativeAI?: typeof geminiModule.GoogleGenerativeAI } }).default?.GoogleGenerativeAI;
  if (!GoogleGenerativeAI) {
    throw new Error("Failed to load GoogleGenerativeAI client");
  }

  const modelId =
    options.modelId || process.env.GEMINI_MODEL_ID || "gemini-2.0-flash";

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
  const text = typeof response.text === "function" ? response.text() : "";
  const usage = response.usageMetadata;

  return {
    content: text,
    inputTokens: usage?.promptTokenCount ?? 0,
    outputTokens: usage?.candidatesTokenCount ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   OPENAI
   ───────────────────────────────────────────────────────────────────────── */
async function openAIInvoke(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const apiKey = (options.apiKey?.trim()) || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set: API key required for provider openai");
  }

  const openaiModule = await import("openai");
  const OpenAI = openaiModule.default ?? openaiModule.OpenAI;

  const modelId =
    options.modelId || process.env.OPENAI_MODEL_ID || "gpt-4o-mini";

  const baseURL =
    options.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  const client = new OpenAI({
    apiKey,
    baseURL,
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

  const choice = completion.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   ANTHROPIC  (Direct API via fetch with x-api-key)
   ───────────────────────────────────────────────────────────────────────── */
async function anthropicInvoke(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const apiKey = (options.apiKey?.trim()) || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set: API key required for provider anthropic");
  }

  const modelId =
    options.modelId || process.env.ANTHROPIC_MODEL_ID || "claude-3-5-sonnet-latest";

  const rawBase = (options.baseUrl || "https://api.anthropic.com/v1").replace(/\/$/, "");
  const endpoint = rawBase.endsWith("/messages") ? rawBase : `${rawBase}/messages`;

  const bodyPayload: Record<string, unknown> = {
    model: modelId,
    max_tokens: options.maxTokens ?? 4096,
    temperature: options.temperature ?? 0.3,
    messages: [{ role: "user", content: userMessage }],
  };

  if (options.systemPrompt) {
    bodyPayload.system = options.systemPrompt;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(bodyPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }> | string;
    usage?: { input_tokens?: number; output_tokens?: number };
  };

  let text = "";
  if (Array.isArray(data.content)) {
    text = data.content
      .filter((block) => !block.type || block.type === "text")
      .map((block) => block.text ?? "")
      .join("");
  } else if (typeof data.content === "string") {
    text = data.content;
  }

  return {
    content: text,
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   NVIDIA NIM  (OpenAI-compatible)
   ───────────────────────────────────────────────────────────────────────── */
async function nvidiaInvoke(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const apiKey = (options.apiKey?.trim()) || process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_API_KEY is not set: API key required for provider nvidia");
  }

  const openaiModule = await import("openai");
  const OpenAI = openaiModule.default ?? openaiModule.OpenAI;

  const modelId =
    options.modelId || process.env.NVIDIA_MODEL_ID || "meta/llama-3.3-70b-instruct";

  const baseURL =
    options.baseUrl || process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

  const client = new OpenAI({
    apiKey,
    baseURL,
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

  const choice = completion.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
    inputTokens: completion.usage?.prompt_tokens ?? 0,
    outputTokens: completion.usage?.completion_tokens ?? 0,
  };
}

/* ─────────────────────────────────────────────────────────────────────────
   OPENROUTER  (OpenAI-compatible API)
   ───────────────────────────────────────────────────────────────────────── */
async function openRouterInvoke(
  userMessage: string,
  options: InvokeOptions = {}
): Promise<LLMResponse> {
  const apiKey = (options.apiKey?.trim()) || process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set: API key required for provider openrouter");
  }

  const openaiModule = await import("openai");
  const OpenAI = openaiModule.default ?? openaiModule.OpenAI;

  const modelId =
    options.modelId || process.env.OPENROUTER_MODEL_ID || "anthropic/claude-3.5-sonnet";

  const baseURL = options.baseUrl || "https://openrouter.ai/api/v1";

  const client = new OpenAI({
    baseURL,
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

  const choice = completion.choices?.[0];
  return {
    content: choice?.message?.content ?? "",
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
  const context = getBYOKContext();
  const mergedOptions: InvokeOptions = {
    ...context,
    ...options,
  };

  const provider = getProvider(mergedOptions);

  switch (provider) {
    case "gemini":
      return geminiInvoke(userMessage, mergedOptions);
    case "openai":
      return openAIInvoke(userMessage, mergedOptions);
    case "anthropic":
      return anthropicInvoke(userMessage, mergedOptions);
    case "nvidia":
      return nvidiaInvoke(userMessage, mergedOptions);
    case "openrouter":
      return openRouterInvoke(userMessage, mergedOptions);
    case "bedrock":
    default:
      return bedrockInvoke(userMessage, mergedOptions as BedrockInvokeOptions);
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   JSON helper — extracts and parses JSON with schema validation
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
    const context = getBYOKContext();
    const provider = getProvider({ ...context, ...options });
    throw new Error(
      `Failed to parse LLM response as JSON.\nProvider: ${provider}\nRaw: ${response.content.slice(0, 300)}`
    );
  }

  if (options.schema) {
    data = options.schema.parse(data) as T;
  }

  return { data, inputTokens: response.inputTokens, outputTokens: response.outputTokens };
}
