import { v4 as uuidv4 } from "uuid";
import { validateScenario } from "../safety/validator";
import { runPlanner } from "../agents/planner";
import { runSpecialistAgent } from "../agents/specialists/runner";
import { runGuard } from "../agents/guard";
import { runSynthesis } from "../agents/synthesis";
import { runCascade } from "../agents/cascade";
import { runStakeholderDebate } from "../agents/stakeholder";
import { generateVisualPromptImages } from "../llm/runware";
import { searchWeb } from "../llm/search";
import { getActiveDomains } from "../engine/domains";
import { calculateCost, CONFIG } from "../engine/config";
import type {
  SimulationState,
  AgentOutput,
  AgentStatus,
  Domain,
  CostRecord,
  GeneratedImage,
  GuardResult,
  CascadeOutput,
  StakeholderDebate,
} from "../engine/types";
import { DOMAINS } from "../engine/types";

export interface PipelineCallbacks {
  onSafetyCheck?: (status: string, reason: string) => void;
  onPlannerComplete?: (domains: Domain[], weights: Record<string, number>) => void;
  onAgentStart?: (domain: Domain) => void;
  onAgentComplete?: (domain: Domain, confidence: string) => void;
  onAgentFailed?: (domain: Domain, error: string) => void;
  onGuardResult?: (domain: Domain, passed: boolean, issues: string[]) => void;
  onSynthesisStart?: () => void;
  onSynthesisComplete?: () => void;
  onCascadeStart?: () => void;
  onCascadeComplete?: () => void;
  onStakeholderStart?: () => void;
  onStakeholderComplete?: () => void;
  onCostUpdate?: (cost: CostRecord) => void;
}

/**
 * Run the full simulation pipeline
 */
export async function runSimulation(
  scenario: string,
  callbacks: PipelineCallbacks = {},
  simId?: string
): Promise<SimulationState> {
  const id = simId ?? uuidv4();
  const costTracking: CostRecord = {
    totalInputTokens: 0,
    totalOutputTokens: 0,
    inputCostUsd: 0,
    outputCostUsd: 0,
    searchCalls: 0,
    totalCostUsd: 0,
  };

  function trackTokens(input: number, output: number) {
    costTracking.totalInputTokens += input;
    costTracking.totalOutputTokens += output;
    const cost = calculateCost(
      costTracking.totalInputTokens,
      costTracking.totalOutputTokens
    );
    costTracking.inputCostUsd = cost.inputCostUsd;
    costTracking.outputCostUsd = cost.outputCostUsd;
    costTracking.totalCostUsd = cost.totalCostUsd;
  }

  // ── Stage 00: Safety Gate ──────────────────────────────────────
  const { result: safetyResult, inputTokens: safetyIn, outputTokens: safetyOut } =
    await validateScenario(scenario);
  trackTokens(safetyIn, safetyOut);
  callbacks.onSafetyCheck?.(safetyResult.status, safetyResult.reason);

  if (safetyResult.status === "BLOCKED") {
    return {
      id: id,
      scenario,
      departurePoint: "",
      baselineData: [],
      domainWeights: {},
      activeAgents: [],
      agentOutputs: {},
      agentStatus: {},
      guardResults: {},
      synthesis: null,
      safetyResult,
      cascades: null,
      stakeholderDebate: null,
      generatedImages: [],
      costTracking,
      conversation: [],
      version: 1,
      promptVersion: CONFIG.prompts.version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Stage 01: Planner ──────────────────────────────────────────
  const { output: plan, inputTokens: planIn, outputTokens: planOut } =
    await runPlanner(scenario);
  trackTokens(planIn, planOut);

  const activeAgents = getActiveDomains(plan.domainWeights);
  callbacks.onPlannerComplete?.(activeAgents, plan.domainWeights as Record<string, number>);

  // ── Stage 02: Baseline Fetch ───────────────────────────────────
  const baselineQueries = plan.baselineDataRequired.slice(0, 5);
  const baselineData: import("../engine/types").SearchResult[] = [];
  for (const query of baselineQueries) {
    const results = await searchWeb(query, 4);
    baselineData.push(...results);
    costTracking.searchCalls++;
  }

  // ── Stage 03-04: Agent Dispatch (batched) ──────────────────────
  const agentOutputs: Partial<Record<Domain, AgentOutput>> = {};
  const agentStatus: Partial<Record<Domain, AgentStatus>> = {};
  const guardResults: Partial<Record<Domain, GuardResult>> = {};

  // Initialise active as PENDING, mark inactive as SKIPPED
  for (const domain of DOMAINS) {
    if (activeAgents.includes(domain)) {
      agentStatus[domain] = "PENDING";
    } else {
      agentStatus[domain] = "SKIPPED";
    }
  }

  // Process in batches
  for (let i = 0; i < activeAgents.length; i += CONFIG.agents.batchSize) {
    const batch = activeAgents.slice(i, i + CONFIG.agents.batchSize);

    const batchResults = await Promise.allSettled(
      batch.map(async (domain) => {
        agentStatus[domain] = "DISPATCHED";
        callbacks.onAgentStart?.(domain);

        try {
          agentStatus[domain] = "ACTIVE";
          const { output, inputTokens, outputTokens } =
            await runSpecialistAgent(
              domain,
              scenario,
              plan.departurePoint,
              baselineData
            );
          trackTokens(inputTokens, outputTokens);
          return { domain, output };
        } catch (error) {
          throw { domain, error };
        }
      })
    );

    for (const result of batchResults) {
      if (result.status === "fulfilled") {
        const { domain, output } = result.value;
        agentOutputs[domain] = output;
        agentStatus[domain] = "COMPLETE";
        callbacks.onAgentComplete?.(domain, output.confidence);
      } else {
        const { domain, error } = result.reason as {
          domain: Domain;
          error: Error;
        };
        agentStatus[domain] = "FAILED";
        console.error(`[Agent:${domain}] FAILED:`, (error as Error).message ?? error);
        callbacks.onAgentFailed?.(domain, (error as Error).message);
      }
    }
  }

  // ── Stage 05: Guard Review ─────────────────────────────────────
  const completedOutputs = Object.values(agentOutputs).filter(
    Boolean
  ) as AgentOutput[];

  for (const output of completedOutputs) {
    try {
      const { result, inputTokens, outputTokens } = await runGuard(output);
      trackTokens(inputTokens, outputTokens);
      guardResults[output.domain] = result;
      callbacks.onGuardResult?.(output.domain, result.passed, result.issues);
    } catch {
      // Guard failure is non-blocking — log but continue
      guardResults[output.domain] = {
        domain: output.domain,
        passed: true,
        issues: ["Guard agent failed to review — passing by default"],
        sanitised: false,
      };
    }
  }

  // Filter to only outputs that passed guard
  const approvedOutputs = completedOutputs.filter(
    (o) => guardResults[o.domain]?.passed !== false
  );

  if (approvedOutputs.length === 0) {
    return {
      id: id,
      scenario,
      departurePoint: plan.departurePoint,
      baselineData,
      domainWeights: plan.domainWeights,
      activeAgents,
      agentOutputs,
      agentStatus,
      guardResults,
      synthesis: null,
      safetyResult,
      cascades: null,
      stakeholderDebate: null,
      generatedImages: [],
      costTracking,
      conversation: [],
      version: 1,
      promptVersion: CONFIG.prompts.version,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  // ── Stage 06: Synthesis ────────────────────────────────────────
  callbacks.onSynthesisStart?.();

  const { output: synthesis, inputTokens: synthIn, outputTokens: synthOut } =
    await runSynthesis(scenario, plan.departurePoint, approvedOutputs);
  trackTokens(synthIn, synthOut);

  callbacks.onSynthesisComplete?.();

  // ── Stage 07: Cascade Modelling ────────────────────────────────
  callbacks.onCascadeStart?.();

  let cascades: CascadeOutput | null = null;
  try {
    const { output: cascadeOutput, inputTokens: cascIn, outputTokens: cascOut } =
      await runCascade(scenario, plan.departurePoint, synthesis, approvedOutputs);
    trackTokens(cascIn, cascOut);
    cascades = cascadeOutput;
  } catch (err) {
    console.warn("[Cascade] Cascade generation failed, continuing without:", err);
  }

  callbacks.onCascadeComplete?.();

  // ── Stage 08: Stakeholder Debate ───────────────────────────────
  callbacks.onStakeholderStart?.();

  let stakeholderDebate: StakeholderDebate | null = null;
  try {
    const { output: debateOutput, inputTokens: debIn, outputTokens: debOut } =
      await runStakeholderDebate(scenario, plan.departurePoint, synthesis);
    trackTokens(debIn, debOut);
    stakeholderDebate = debateOutput;
  } catch (err) {
    console.warn("[Stakeholder] Debate generation failed, continuing without:", err);
  }

  callbacks.onStakeholderComplete?.();
  callbacks.onCostUpdate?.(costTracking);

  // ── Stage 09: Image Generation (Runware) ───────────────────────
  const generatedImages: GeneratedImage[] = [];
  try {
    // Collect visual prompts from all agent outputs
    const allVisualPrompts: { description: string; type?: string; altText?: string }[] = [];
    for (const output of approvedOutputs) {
      if (output.visualPrompts?.length) {
        for (const vp of output.visualPrompts) {
          if (typeof vp === "string") {
            allVisualPrompts.push({ description: vp, type: "image" });
          } else if (vp && typeof vp === "object" && "description" in vp) {
            allVisualPrompts.push(vp as { description: string; type?: string; altText?: string });
          }
        }
      }
    }

    // Also generate a hero image from the scenario itself
    allVisualPrompts.unshift({
      description: `${scenario} — ${synthesis.unifiedAnalysis.slice(0, 200)}`,
      type: "image",
      altText: scenario,
    });

    const imageMap = await generateVisualPromptImages(allVisualPrompts);
    for (const [desc, url] of imageMap) {
      const original = allVisualPrompts.find((p) => p.description === desc);
      generatedImages.push({
        description: desc,
        altText: original?.altText ?? desc,
        url,
        type: original?.type ?? "image",
      });
    }
  } catch (err) {
    console.warn("[Images] Image generation failed, continuing without:", err);
  }

  return {
    id: id,
    scenario,
    departurePoint: plan.departurePoint,
    baselineData,
    domainWeights: plan.domainWeights,
    activeAgents,
    agentOutputs,
    agentStatus,
    guardResults,
    synthesis,
    safetyResult,
    cascades,
    stakeholderDebate,
    generatedImages,
    costTracking,
    conversation: [],
    version: 1,
    promptVersion: CONFIG.prompts.version,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
