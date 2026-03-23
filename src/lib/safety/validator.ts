import { invokeLLMJson } from "../llm/bedrock-client";
import type { SafetyResult } from "../engine/types";
import { SafetyResultSchema } from "../engine/types";

const SAFETY_SYSTEM_PROMPT = `You are a content safety classifier for a simulation engine that accepts ANY hypothetical "What If" scenario — geopolitical, technological, scientific, speculative, alternate history, or futuristic.

## Classification Rules

1. **ALLOWED** — The vast majority of scenarios. Any creative, speculative, scientific, technological, geopolitical, or alternate-history "what-if" question. Be extremely permissive. Examples: "What if AI became sentient in 1995?", "What if gravity was half as strong?", "What if Scotland was independent?", "What if humans colonised Mars in 1980?"

2. **RESTRICTED** — Sensitive but legitimate scenarios that require disclaimers. Examples: scenarios involving active real-world conflicts, recently deceased persons, or ongoing political crises. These proceed but with added disclaimers.

3. **BLOCKED** — ONLY block scenarios that are:
   - Explicitly glorifying real-world violence, genocide, or terrorism
   - Targeting specific living individuals with intent to harm
   - Clearly designed to generate actionable disinformation or propaganda

**IMPORTANT: Do NOT block scenarios just because they involve science fiction, fantasy, speculative technology, or non-geopolitical topics. The engine handles all "What If" questions.**

## Output Format

You MUST return ONLY valid JSON, no other text. Use this exact format:

\`\`\`json
{
  "status": "ALLOWED",
  "reason": "Brief reason",
  "disclaimers": []
}
\`\`\`

For RESTRICTED, add disclaimers:
\`\`\`json
{
  "status": "RESTRICTED",
  "reason": "Brief reason",
  "disclaimers": ["Disclaimer text here"]
}
\`\`\`

Return ONLY the JSON object. No preamble, no explanation.`;

/**
 * F00 — Scenario Safety Pipeline
 * Validates scenario before any agent dispatch
 */
export async function validateScenario(
  scenario: string
): Promise<{
  result: SafetyResult;
  inputTokens: number;
  outputTokens: number;
}> {
  const userMessage = `Classify this scenario:\n\n"${scenario}"`;

  const { data, inputTokens, outputTokens } =
    await invokeLLMJson<SafetyResult>(userMessage, {
      systemPrompt: SAFETY_SYSTEM_PROMPT,
      maxTokens: 512,
      temperature: 0.1,
    });

  const validated = SafetyResultSchema.parse(data);

  return { result: validated, inputTokens, outputTokens };
}
