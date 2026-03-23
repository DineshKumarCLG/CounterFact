import { invokeLLMJson } from "../llm/bedrock-client";
import { loadPrompt } from "./prompt-loader";
import type { SynthesisOutput, StakeholderDebate } from "../engine/types";
import { StakeholderDebateSchema } from "../engine/types";

export async function runStakeholderDebate(
  scenario: string,
  departurePoint: string,
  synthesis: SynthesisOutput
): Promise<{
  output: StakeholderDebate;
  inputTokens: number;
  outputTokens: number;
}> {
  const systemPrompt = await loadPrompt("stakeholder");

  const userMessage = [
    `SCENARIO: ${scenario}`,
    `DEPARTURE POINT: ${departurePoint}`,
    "",
    "UNIFIED ANALYSIS:",
    synthesis.unifiedAnalysis,
    "",
    `OVERALL CONFIDENCE: ${synthesis.overallConfidence}`,
    "",
    synthesis.contradictions?.length
      ? "CONTRADICTIONS:\n" +
        synthesis.contradictions
          .map((c) => `- ${c.description}: ${c.resolution}`)
          .join("\n")
      : "",
    "",
    "Generate the stakeholder debate as JSON.",
  ].join("\n");

  const { data, inputTokens, outputTokens } = await invokeLLMJson<StakeholderDebate>(
    userMessage,
    { systemPrompt }
  );

  const parsed = StakeholderDebateSchema.parse(data);

  return { output: parsed, inputTokens, outputTokens };
}
