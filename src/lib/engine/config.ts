export const CONFIG = {
  // ─── AWS Bedrock ────────────────────────────────────────────────
  bedrock: {
    region: process.env.AWS_REGION || "ap-south-1",
    fallbackRegion: "us-east-1",
    modelId:
      process.env.BEDROCK_MODEL_ID ||
      "zai.glm-5",
    maxTokens: 4096,
    temperature: 0.3,
    retryAttempts: 3,
    retryBaseDelayMs: 2000,
  },

  // ─── Agent Dispatch ─────────────────────────────────────────────
  agents: {
    batchSize: 3, // concurrent Bedrock calls per batch
    maxAgents: 12,
    defaultAgents: 8,
    minDomainWeight: 0.3,
  },

  // ─── Cost Tracking (Claude Sonnet 4) ────────────────────────────
  costs: {
    inputTokenCostPerMillion: 3.0, // $3 per M input tokens
    outputTokenCostPerMillion: 15.0, // $15 per M output tokens
  },

  // ─── Search ─────────────────────────────────────────────────────
  search: {
    maxResultsPerQuery: 8,
    maxQueriesPerAgent: 3,
  },

  // ─── Prompts ────────────────────────────────────────────────────
  prompts: {
    version: "v1.0",
    basePath: "src/lib/prompts",
  },

  // ─── Storage ────────────────────────────────────────────────────
  storage: {
    dataDir: "./data",
    dbPath: process.env.DB_PATH || (process.platform === "win32"
      ? `${process.env.LOCALAPPDATA || process.env.TEMP || "."}/counterfact/counterfact.db`
      : "/tmp/counterfact/counterfact.db"),
  },
} as const;

/**
 * Calculate USD cost from token counts
 */
export function calculateCost(inputTokens: number, outputTokens: number) {
  const inputCost =
    (inputTokens / 1_000_000) * CONFIG.costs.inputTokenCostPerMillion;
  const outputCost =
    (outputTokens / 1_000_000) * CONFIG.costs.outputTokenCostPerMillion;
  return {
    inputCostUsd: Math.round(inputCost * 10000) / 10000,
    outputCostUsd: Math.round(outputCost * 10000) / 10000,
    totalCostUsd: Math.round((inputCost + outputCost) * 10000) / 10000,
  };
}
