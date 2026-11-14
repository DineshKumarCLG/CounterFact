/**
 * Client-side BYOK (Bring-Your-Own-Key) management.
 * Stores provider settings and credentials securely in browser localStorage.
 * Dispatches a 'cf-byok-changed' window event so all UI components stay in sync.
 */

export type BYOKProvider =
  | "bedrock"
  | "gemini"
  | "openai"
  | "anthropic"
  | "nvidia"
  | "openrouter";

export interface ClientBYOKConfig {
  provider: BYOKProvider;
  apiKey?: string;
  modelId?: string;
  baseUrl?: string;
}

export const PROVIDER_OPTIONS: Array<{
  id: BYOKProvider;
  name: string;
  badge: string;
  defaultModel: string;
  description: string;
  requiresKey: boolean;
}> = [
  {
    id: "bedrock",
    name: "AWS Bedrock",
    badge: "Default",
    defaultModel: "anthropic.claude-3-5-sonnet",
    description: "Server-managed foundation models (default fallback)",
    requiresKey: false,
  },
  {
    id: "gemini",
    name: "Google Gemini",
    badge: "BYOK",
    defaultModel: "gemini-2.0-flash",
    description: "Google AI Gemini 2.0 Flash & Pro models",
    requiresKey: true,
  },
  {
    id: "openai",
    name: "OpenAI",
    badge: "BYOK",
    defaultModel: "gpt-4o-mini",
    description: "GPT-4o, GPT-4o-mini, and OpenAI models",
    requiresKey: true,
  },
  {
    id: "anthropic",
    name: "Anthropic",
    badge: "BYOK",
    defaultModel: "claude-3-5-sonnet-latest",
    description: "Claude 3.5 Sonnet & Claude 3.5 Haiku",
    requiresKey: true,
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    badge: "BYOK",
    defaultModel: "meta/llama-3.3-70b-instruct",
    description: "High-throughput accelerated models on integrate.api.nvidia.com",
    requiresKey: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    badge: "BYOK",
    defaultModel: "anthropic/claude-3.5-sonnet",
    description: "Unified access to 300+ models via openrouter.ai",
    requiresKey: true,
  },
];

const STORAGE_KEY = "cf_byok_config";

export function getClientBYOK(): ClientBYOKConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.provider === "string") {
      return parsed as ClientBYOKConfig;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

export function saveClientBYOK(config: ClientBYOKConfig | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!config || config.provider === "bedrock") {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    }
    window.dispatchEvent(new CustomEvent("cf-byok-changed", { detail: config }));
  } catch (err) {
    console.error("Failed to save BYOK config:", err);
  }
}

export function getBYOKHeaders(): Record<string, string> {
  const byok = getClientBYOK();
  if (!byok || byok.provider === "bedrock") return {};

  const headers: Record<string, string> = {};
  if (byok.provider) headers["x-byok-provider"] = byok.provider;
  if (byok.apiKey) headers["x-byok-api-key"] = byok.apiKey;
  if (byok.modelId) headers["x-byok-model-id"] = byok.modelId;
  if (byok.baseUrl) headers["x-byok-base-url"] = byok.baseUrl;

  return headers;
}
