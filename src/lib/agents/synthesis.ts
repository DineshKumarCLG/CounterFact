import { invokeLLMJson } from "../llm/llm-client";
import { SynthesisOutputSchema } from "../engine/types";
import type { AgentOutput, SynthesisOutput } from "../engine/types";
import { loadPrompt } from "./prompt-loader";

/**
 * Synthesis Agent: Combines all agent outputs into a unified analysis
 */
export async function runSynthesis(
  scenario: string,
  departurePoint: string,
  agentOutputs: AgentOutput[]
): Promise<{
  output: SynthesisOutput;
  inputTokens: number;
  outputTokens: number;
}> {
  const systemPrompt = loadPrompt("synthesis");

  const agentSummaries = agentOutputs
    .map(
      (ao) =>
        `### ${ao.domain} Agent (Confidence: ${ao.confidence})\n\n${ao.findings}\n\nKey data: ${ao.keyDatapoints.map((d) => d.fact).join("; ")}\n\nContradictions flagged: ${ao.contradictions.join("; ") || "None"}`
    )
    .join("\n\n---\n\n");

  const userMessage = `## Scenario

${scenario}

## Departure Point

${departurePoint}

## Agent Reports

${agentSummaries}

---

Synthesise these reports into a unified analysis. Detect and resolve contradictions. Return as JSON.`;

  const { data, inputTokens, outputTokens } =
    await invokeLLMJson<SynthesisOutput>(userMessage, {
      systemPrompt,
      maxTokens: 6144,
      temperature: 0.3,
    });

  const validated = SynthesisOutputSchema.parse({
    ...data,
    tokenUsage: { input: inputTokens, output: outputTokens },
  });

  return { output: validated, inputTokens, outputTokens };
}
