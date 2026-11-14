import { NextResponse } from "next/server";
import { after } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { runSimulation } from "@/lib/engine/pipeline";
import { saveSimulationState, loadSimulationState } from "@/lib/storage/filesystem";
import { saveSimulationMeta } from "@/lib/storage/db";
import { sanitizeScenarioInput } from "@/lib/safety/sanitize";
import * as llmClient from "@/lib/llm/llm-client";
import type { SimulationState } from "@/lib/engine/types";

export const maxDuration = 300;

const DEFAULT_VALID_PROVIDERS = [
  "bedrock",
  "gemini",
  "openai",
  "anthropic",
  "nvidia",
  "openrouter",
] as const;

function safeExtractBYOK(request?: Request, body?: Record<string, unknown>) {
  if (typeof llmClient.extractBYOKConfig === "function") {
    return llmClient.extractBYOKConfig(request, body);
  }
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
    provider: rawProvider ? (rawProvider.toLowerCase() as llmClient.Provider) : undefined,
    apiKey: rawApiKey || undefined,
    modelId: rawModelId || undefined,
    baseUrl: rawBaseUrl || undefined,
  };
}

function safeGetEnvKey(provider: string): string | undefined {
  if (typeof llmClient.getEnvKeyForProvider === "function") {
    return llmClient.getEnvKeyForProvider(provider as llmClient.Provider);
  }
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
    default:
      return undefined;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const scenario = body?.scenario;

    if (!scenario) {
      return NextResponse.json({ error: "No scenario provided" }, { status: 400 });
    }

    const sanitizedScenario = sanitizeScenarioInput(scenario);

    if (!sanitizedScenario) {
      return NextResponse.json({ error: "Scenario is empty after sanitisation" }, { status: 400 });
    }

    const byok = safeExtractBYOK(request, body);
    const validProviders = llmClient.VALID_PROVIDERS ?? DEFAULT_VALID_PROVIDERS;

    if (byok?.provider) {
      if (!validProviders.includes(byok.provider as llmClient.Provider)) {
        return NextResponse.json(
          { error: `Invalid provider: ${byok.provider}` },
          { status: 400 }
        );
      }

      if (byok.provider !== "bedrock" && !byok.apiKey && !safeGetEnvKey(byok.provider)) {
        return NextResponse.json(
          { error: `API key required for provider ${byok.provider}` },
          { status: 400 }
        );
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const initialState: SimulationState = {
      id,
      scenario: sanitizedScenario,
      departurePoint: "",
      baselineData: [],
      domainWeights: {},
      activeAgents: [],
      agentOutputs: {},
      agentStatus: {},
      guardResults: {},
      synthesis: null,
      safetyResult: { status: "ALLOWED", reason: "Pending check", disclaimers: [] },
      cascades: null,
      stakeholderDebate: null,
      generatedImages: [],
      costTracking: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        inputCostUsd: 0,
        outputCostUsd: 0,
        searchCalls: 0,
        totalCostUsd: 0,
      },
      conversation: [],
      version: 1,
      promptVersion: "v1.0",
      createdAt: now,
      updatedAt: now,
      status: "PENDING",
      ...(byok ? { byok: { provider: byok.provider, modelId: byok.modelId } } : {}),
    };

    saveSimulationState(initialState);

    // Use Next.js after() to run the simulation without blocking the response
    after(async () => {
      try {
        const finalState = await runSimulation(sanitizedScenario, {
          onSafetyCheck: (status, reason) =>
            mutateState(id, (s) => {
              s.safetyResult = { status, reason, disclaimers: [] };
              if (status === "BLOCKED") {
                s.status = "BLOCKED";
              }
            }),
          onPlannerComplete: (domains, weights) =>
            mutateState(id, (s) => {
              s.status = "RUNNING";
              s.activeAgents = domains;
              s.domainWeights = weights;
              s.agentStatus = domains.reduce(
                (acc, d) => ({ ...acc, [d]: "PENDING" }),
                {}
              );
            }),
          onAgentStart: (domain) =>
            mutateState(id, (s) => {
              s.agentStatus[domain] = "ACTIVE";
            }),
          onAgentComplete: (domain) =>
            mutateState(id, (s) => {
              s.agentStatus[domain] = "COMPLETE";
            }),
          onAgentFailed: (domain) =>
            mutateState(id, (s) => {
              s.agentStatus[domain] = "FAILED";
            }),
          onGuardResult: (domain, passed, issues) =>
            mutateState(id, (s) => {
              s.guardResults[domain] = { domain, passed, issues, sanitised: false };
            }),
          onSynthesisStart: () =>
            mutateState(id, () => {}),
          onSynthesisComplete: () =>
            mutateState(id, () => {}),
          onCascadeStart: () =>
            mutateState(id, () => {}),
          onCascadeComplete: () =>
            mutateState(id, () => {}),
          onStakeholderStart: () =>
            mutateState(id, () => {}),
          onStakeholderComplete: () =>
            mutateState(id, () => {}),
          onCostUpdate: (cost) =>
            mutateState(id, (s) => {
              s.costTracking = cost;
            }),
        }, id, byok);

        finalState.status = finalState.synthesis ? "COMPLETE" : "PARTIAL";
        if (byok) {
          (finalState as SimulationState & { byok?: { provider?: string; modelId?: string } }).byok = {
            provider: byok.provider,
            modelId: byok.modelId,
          };
        }
        saveSimulationState(finalState);
        try {
          saveSimulationMeta({
            id: finalState.id,
            scenario: finalState.scenario,
            departurePoint: finalState.departurePoint,
            status: finalState.status,
            agentCount: finalState.activeAgents.length,
            domains: finalState.activeAgents.join(","),
            costCents: Math.round(finalState.costTracking.totalCostUsd * 100),
            promptVersion: finalState.promptVersion,
            createdAt: finalState.createdAt,
            updatedAt: finalState.updatedAt,
          });
        } catch (metaErr) {
          console.warn("Failed to save simulation metadata to DB:", metaErr);
        }
      } catch (err) {
        console.error("Simulation failed:", err);
        mutateState(id, (s) => {
          s.status = "FAILED";
          s.safetyResult = {
            status: "BLOCKED",
            reason: `Simulation error: ${err instanceof Error ? err.message : "Unknown error"}`,
            disclaimers: [],
          };
        });
      }
    });

    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }
}

function mutateState(id: string, mutator: (state: SimulationState) => void) {
  try {
    const state = loadSimulationState(id);
    if (state) {
      mutator(state);
      state.updatedAt = new Date().toISOString();
      saveSimulationState(state);
    }
  } catch (e) {
    console.error("Failed to mutate state:", e);
  }
}
