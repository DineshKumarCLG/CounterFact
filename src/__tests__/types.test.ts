import { describe, it, expect } from "vitest";
import {
  AgentOutputSchema,
  PlannerOutputSchema,
  SafetyResultSchema,
  CascadeOutputSchema,
  StakeholderDebateSchema,
} from "@/lib/engine/types";

describe("Zod schemas", () => {
  it("validates a valid AgentOutput", () => {
    const data = {
      domain: "ECONOMIC",
      findings: "GDP would shift significantly.",
      keyDatapoints: [{ fact: "GDP was $1T", source: "World Bank", sourceTier: 1 }],
      confidence: "HIGH",
      sourceTiers: {},
      contradictions: [],
      cascadeSeeds: [],
      visualPrompts: [],
    };
    expect(() => AgentOutputSchema.parse(data)).not.toThrow();
  });

  it("rejects AgentOutput with invalid domain", () => {
    const data = {
      domain: "INVALID_DOMAIN",
      findings: "test",
      confidence: "HIGH",
    };
    expect(() => AgentOutputSchema.parse(data)).toThrow();
  });

  it("validates a valid PlannerOutput", () => {
    const data = {
      scenarioSummary: "Test scenario",
      departurePoint: "1945",
      domainWeights: { ECONOMIC: 0.8, POLITICAL: 0.6 },
      activeAgents: ["ECONOMIC", "POLITICAL"],
      baselineDataRequired: ["GDP data"],
    };
    expect(() => PlannerOutputSchema.parse(data)).not.toThrow();
  });

  it("validates SafetyResult", () => {
    const allowed = { status: "ALLOWED", reason: "Safe", disclaimers: [] };
    const blocked = { status: "BLOCKED", reason: "Harmful", disclaimers: ["warn"] };
    expect(() => SafetyResultSchema.parse(allowed)).not.toThrow();
    expect(() => SafetyResultSchema.parse(blocked)).not.toThrow();
  });

  it("validates CascadeOutput", () => {
    const data = {
      cascadeTree: {
        nodes: [{ id: "n1", description: "Effect", domain: "ECONOMIC", confidence: 0.8, level: 0, type: "POSITIVE" }],
        edges: [{ from: "n1", to: "n2", confidence: 0.7, reasoning: "Because" }],
        feedbackLoops: [],
      },
      scenarioPaths: [
        {
          type: "BASE_CASE",
          label: "Most Likely",
          summary: "Things stay similar",
          keyMilestones: [{ year: 2030, event: "Stabilisation", domain: "ECONOMIC" }],
        },
      ],
    };
    expect(() => CascadeOutputSchema.parse(data)).not.toThrow();
  });

  it("validates StakeholderDebate", () => {
    const data = {
      stakeholders: [
        {
          name: "Trade Minister",
          role: "Government official",
          perspective: "We need to protect domestic industry.",
          keyArguments: ["Jobs", "GDP"],
          tone: "CAUTIOUS",
        },
      ],
      summary: "Debate was heated.",
    };
    expect(() => StakeholderDebateSchema.parse(data)).not.toThrow();
  });
});
