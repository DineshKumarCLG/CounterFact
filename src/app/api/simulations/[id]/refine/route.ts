import { loadSimulationState, saveSimulationState } from "@/lib/storage/filesystem";
import { saveSimulationMeta } from "@/lib/storage/db";
import { calculateCost } from "@/lib/engine/config";
import { invokeLLM, type InvokeOptions } from "@/lib/llm/llm-client";
import { sanitizeScenarioInput } from "@/lib/safety/sanitize";
import type { ConversationMessage, SimulationState } from "@/lib/engine/types";

const VALID_PROVIDERS = [
  "bedrock",
  "gemini",
  "openai",
  "anthropic",
  "nvidia",
  "openrouter",
  "apple",
] as const;

type Provider = (typeof VALID_PROVIDERS)[number];

interface BYOKConfig {
  provider?: Provider;
  apiKey?: string;
  modelId?: string;
  baseUrl?: string;
}

function extractBYOKConfig(
  request?: Request,
  body?: Record<string, unknown>
): BYOKConfig | undefined {
  const headerProvider = request?.headers?.get("x-byok-provider")?.trim();
  const headerApiKey = request?.headers?.get("x-byok-api-key")?.trim();
  const headerModelId = request?.headers?.get("x-byok-model-id")?.trim();
  const headerBaseUrl = request?.headers?.get("x-byok-base-url")?.trim();

  const bodyByok = body?.byok as Record<string, string> | undefined;
  const rawProvider = (headerProvider || bodyByok?.provider || "").trim();
  const rawApiKey = (headerApiKey || bodyByok?.apiKey || "").trim();
  const rawModelId = (headerModelId || bodyByok?.modelId || "").trim();
  const rawBaseUrl = (headerBaseUrl || bodyByok?.baseUrl || "").trim();

  if (!rawProvider && !rawApiKey && !rawModelId && !rawBaseUrl) return undefined;
  return {
    provider: rawProvider ? (rawProvider.toLowerCase() as Provider) : undefined,
    apiKey: rawApiKey || undefined,
    modelId: rawModelId || undefined,
    baseUrl: rawBaseUrl || undefined,
  };
}

function getEnvKeyForProvider(provider: Provider): string | undefined {
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
    default:
      return undefined;
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = loadSimulationState(id);

  if (!state) {
    return Response.json({ error: "Simulation not found" }, { status: 404 });
  }

  if (!state.synthesis) {
    return Response.json({ error: "Simulation not yet complete" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const rawQuestion = (body.question ?? body.message) as string | undefined;

  if (!rawQuestion?.trim()) {
    return Response.json({ error: "No question provided" }, { status: 400 });
  }

  const byok = extractBYOKConfig(request, body);

  if (byok?.provider) {
    if (!VALID_PROVIDERS.includes(byok.provider as Provider)) {
      return Response.json(
        { error: `Invalid provider: ${byok.provider}` },
        { status: 400 }
      );
    }
    if (byok.provider !== "bedrock" && !byok.apiKey && !getEnvKeyForProvider(byok.provider)) {
      return Response.json(
        { error: `API key required for provider ${byok.provider}` },
        { status: 400 }
      );
    }
  }

  const question = sanitizeScenarioInput(rawQuestion);

  const systemPrompt = [
    "You are a follow-up analyst for the Counterfact geopolitical simulation engine.",
    "The user ran a counterfactual scenario and now wants to drill deeper.",
    "Answer based on the simulation results provided. Be specific, cite domain findings where relevant.",
    "If the question goes beyond what the simulation covered, say so honestly.",
    "",
    `SCENARIO: ${state.scenario}`,
    `DEPARTURE POINT: ${state.departurePoint}`,
    "",
    "UNIFIED ANALYSIS:",
    state.synthesis.unifiedAnalysis,
  ].join("\n");

  // Build conversation context as a single user message
  const priorTurns = (state.conversation ?? [])
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const userMessage = priorTurns
    ? `${priorTurns}\n\nUSER: ${question}`
    : question;

  try {
    const invokeOptions: InvokeOptions = {
      systemPrompt,
      ...(byok ?? {}),
    };

    const { content, inputTokens, outputTokens } = await invokeLLM(userMessage, invokeOptions);

    const userMsg: ConversationMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    const assistantMsg: ConversationMessage = {
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
    };

    state.conversation = [...(state.conversation ?? []), userMsg, assistantMsg];
    state.costTracking.totalInputTokens += inputTokens;
    state.costTracking.totalOutputTokens += outputTokens;
    const cost = calculateCost(
      state.costTracking.totalInputTokens,
      state.costTracking.totalOutputTokens
    );
    state.costTracking.inputCostUsd = cost.inputCostUsd;
    state.costTracking.outputCostUsd = cost.outputCostUsd;
    state.costTracking.totalCostUsd = cost.totalCostUsd;
    state.updatedAt = new Date().toISOString();

    if (byok?.provider || byok?.modelId) {
      const stateWithBYOK = state as SimulationState & { byok?: { provider?: string; modelId?: string } };
      stateWithBYOK.byok = {
        provider: byok.provider ?? stateWithBYOK.byok?.provider,
        modelId: byok.modelId ?? stateWithBYOK.byok?.modelId,
      };
    }

    saveSimulationState(state);
    try {
      saveSimulationMeta({
        id: state.id,
        scenario: state.scenario,
        departurePoint: state.departurePoint,
        status: state.status ?? (state.synthesis ? "COMPLETE" : "PARTIAL"),
        agentCount: state.activeAgents?.length ?? 0,
        domains: (state.activeAgents ?? []).join(","),
        costCents: Math.round(state.costTracking.totalCostUsd * 100),
        promptVersion: state.promptVersion,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt,
      });
    } catch {
      // Ignore meta save error
    }

    if (request.headers.get("accept")?.includes("text/event-stream")) {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ delta: content })}\n\n`));
          controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return Response.json({ answer: content, inputTokens, outputTokens });
  } catch (err) {
    return Response.json(
      { error: `Refinement failed: ${err instanceof Error ? err.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
