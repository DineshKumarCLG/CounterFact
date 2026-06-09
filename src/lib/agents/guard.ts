import { invokeLLMJson } from "../llm/llm-client";
import { GuardResultSchema } from "../engine/types";
import type { AgentOutput, Domain, GuardResult } from "../engine/types";
import { loadPrompt } from "./prompt-loader";

/**
 * Guard Agent: Validates an agent output for quality and safety
 */
export async function runGuard(
  agentOutput: AgentOutput
): Promise<{
  result: GuardResult;
  inputTokens: number;
  outputTokens: number;
}> {
  const systemPrompt = loadPrompt("guard");

  const userMessage = `## Agent Output to Review

Domain: ${agentOutput.domain}

\`\`\`json
${JSON.stringify(agentOutput, null, 2)}
\`\`\`

Review this output and return your assessment as JSON.`;

  const { data, inputTokens, outputTokens } =
    await invokeLLMJson<GuardResult>(userMessage, {
      systemPrompt,
      maxTokens: 1024,
      temperature: 0.1,
    });

  const validated = GuardResultSchema.parse({
    ...data,
    domain: agentOutput.domain,
  });

  return { result: validated, inputTokens, outputTokens };
}
