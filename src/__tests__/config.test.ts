import { describe, it, expect } from "vitest";
import { calculateCost, CONFIG } from "@/lib/engine/config";

describe("calculateCost", () => {
  it("calculates zero cost for zero tokens", () => {
    const cost = calculateCost(0, 0);
    expect(cost.inputCostUsd).toBe(0);
    expect(cost.outputCostUsd).toBe(0);
    expect(cost.totalCostUsd).toBe(0);
  });

  it("calculates correct cost for 1M input tokens", () => {
    const cost = calculateCost(1_000_000, 0);
    expect(cost.inputCostUsd).toBe(CONFIG.costs.inputTokenCostPerMillion);
  });

  it("calculates correct cost for 1M output tokens", () => {
    const cost = calculateCost(0, 1_000_000);
    expect(cost.outputCostUsd).toBe(CONFIG.costs.outputTokenCostPerMillion);
  });

  it("sums input and output costs", () => {
    const cost = calculateCost(500_000, 100_000);
    expect(cost.totalCostUsd).toBe(cost.inputCostUsd + cost.outputCostUsd);
  });
});

describe("CONFIG", () => {
  it("has valid batch size", () => {
    expect(CONFIG.agents.batchSize).toBeGreaterThan(0);
    expect(CONFIG.agents.batchSize).toBeLessThanOrEqual(12);
  });

  it("has prompt version", () => {
    expect(CONFIG.prompts.version).toBeTruthy();
  });
});
