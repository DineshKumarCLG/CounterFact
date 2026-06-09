import { invokeLLMJson } from "../llm/llm-client";
import { CascadeOutputSchema } from "../engine/types";
import type { CascadeOutput, SynthesisOutput, AgentOutput } from "../engine/types";
import { loadPrompt } from "./prompt-loader";

/**
 * Cascade Engine: Models 2nd/3rd order effects and generates scenario paths
 */
export async function runCascade(
  scenario: string,
  departurePoint: string,
  synthesis: SynthesisOutput,
  agentOutputs: AgentOutput[]
): Promise<{
  output: CascadeOutput;
  inputTokens: number;
  outputTokens: number;
}> {
  const systemPrompt = loadPrompt("cascade");

  // Collect cascade seeds from all agent outputs
  const cascadeSeeds = agentOutputs
    .flatMap((ao) => ao.cascadeSeeds.map((seed) => `[${ao.domain}] ${seed}`))
    .join("\n");

  const userMessage = `## Scenario

${scenario}

## Departure Point

${departurePoint}

## Unified Analysis

${synthesis.unifiedAnalysis}

## Cascade Seeds from Domain Agents

${cascadeSeeds || "No explicit cascade seeds provided. Derive from the unified analysis."}

## Contradictions Detected

${synthesis.contradictions.map((c) => `- ${c.description} (${c.mode}): ${c.resolution}`).join("\n") || "None"}

---

Generate the cascade tree (3 levels deep) and three scenario paths. Return as JSON.`;

  const { data, inputTokens, outputTokens } =
    await invokeLLMJson<CascadeOutput>(userMessage, {
      systemPrompt,
      maxTokens: 6144,
      temperature: 0.4,
    });

  const validated = CascadeOutputSchema.parse(data);

  return { output: validated, inputTokens, outputTokens };
}
