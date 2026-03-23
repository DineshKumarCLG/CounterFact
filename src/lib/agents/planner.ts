import { invokeLLMJson } from "../llm/bedrock-client";
import { PlannerOutputSchema } from "../engine/types";
import type { PlannerOutput } from "../engine/types";
import { loadPrompt } from "./prompt-loader";

/**
 * Planner Agent: Decomposes a scenario into domain weights and active agents
 */
export async function runPlanner(
  scenario: string
): Promise<{ output: PlannerOutput; inputTokens: number; outputTokens: number }> {
  const systemPrompt = loadPrompt("planner");

  const userMessage = `## Scenario\n\n${scenario}\n\nAnalyse this scenario and return your research plan as JSON.`;

  const { data, inputTokens, outputTokens } = await invokeLLMJson<PlannerOutput>(
    userMessage,
    {
      systemPrompt,
      maxTokens: 2048,
      temperature: 0.2,
    }
  );

  // Validate with Zod
  const validated = PlannerOutputSchema.parse(data);

  return { output: validated, inputTokens, outputTokens };
}
