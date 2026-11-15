import { CONFIG } from "@/lib/engine/config";
import { VALID_PROVIDERS, type Provider } from "@/lib/llm/llm-client";

export const SUPPORTED_PROVIDERS = [
  "gemini",
  "openai",
  "anthropic",
  "nvidia",
  "bedrock",
  "openrouter",
] as const;

export async function GET(request?: Request) {
  let reqProvider: string | undefined;
  let reqApiKey: string | undefined;
  let reqModelId: string | undefined;

  if (request?.headers) {
    reqProvider = request.headers.get("x-byok-provider")?.trim();
    reqApiKey = request.headers.get("x-byok-api-key")?.trim();
    reqModelId = request.headers.get("x-byok-model-id")?.trim();
  }

  if (request?.url) {
    try {
      const url = new URL(request.url);
      if (!reqProvider) reqProvider = url.searchParams.get("provider")?.trim();
      if (!reqApiKey) reqApiKey = url.searchParams.get("apiKey")?.trim();
      if (!reqModelId) reqModelId = url.searchParams.get("modelId")?.trim();
    } catch {
      // Ignore URL parsing errors
    }
  }

  const activeProvider = (reqProvider || process.env.LLM_PROVIDER || "bedrock").toLowerCase();

  if (reqProvider && !VALID_PROVIDERS.includes(activeProvider as Provider)) {
    return Response.json(
      {
        status: "error",
        error: `Invalid provider: ${reqProvider}`,
        supportedProviders: SUPPORTED_PROVIDERS,
      },
      { status: 400 }
    );
  }

  let model = CONFIG.bedrock.modelId;
  if (reqModelId) {
    model = reqModelId;
  } else if (activeProvider === "gemini") {
    model = process.env.GEMINI_MODEL_ID ?? "gemini-2.0-flash";
  } else if (activeProvider === "openai") {
    model = process.env.OPENAI_MODEL_ID ?? "gpt-4o-mini";
  } else if (activeProvider === "anthropic") {
    model = process.env.ANTHROPIC_MODEL_ID ?? "claude-3-5-sonnet-latest";
  } else if (activeProvider === "nvidia") {
    model = process.env.NVIDIA_MODEL_ID ?? "meta/llama-3.3-70b-instruct";
  } else if (activeProvider === "openrouter") {
    model = process.env.OPENROUTER_MODEL_ID ?? "anthropic/claude-3.5-sonnet";
  } else if (activeProvider === "apple") {
    model = process.env.APPLE_MODEL_ID ?? "apple/foundation-model-3b";
  }

  const responsePayload: Record<string, unknown> = {
    status: "ok",
    version: CONFIG.prompts.version,
    provider: activeProvider,
    supportedProviders: SUPPORTED_PROVIDERS,
    model,
    timestamp: new Date().toISOString(),
  };

  if (reqApiKey !== undefined) {
    const isValidKey = typeof reqApiKey === "string" && reqApiKey.trim().length >= 8;
    responsePayload.credentialsValid = isValidKey;
  }

  return Response.json(responsePayload);
}
