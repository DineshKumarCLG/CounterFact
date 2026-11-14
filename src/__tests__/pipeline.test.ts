import { describe, it, expect, vi, beforeEach } from "vitest";
import { runSimulation } from "@/lib/engine/pipeline";
import * as validator from "@/lib/safety/validator";
import * as planner from "@/lib/agents/planner";
import * as search from "@/lib/llm/search";
import * as specialistRunner from "@/lib/agents/specialists/runner";
import * as guard from "@/lib/agents/guard";
import * as synthesis from "@/lib/agents/synthesis";
import * as cascade from "@/lib/agents/cascade";
import * as stakeholder from "@/lib/agents/stakeholder";

describe("Pipeline Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("stops immediately when Safety Gate marks scenario as BLOCKED", async () => {
    vi.spyOn(validator, "validateScenario").mockResolvedValueOnce({
      result: {
        status: "BLOCKED",
        reason: "Violates content policy",
        disclaimers: [],
      },
      inputTokens: 50,
      outputTokens: 20,
    });

    const plannerSpy = vi.spyOn(planner, "runPlanner");
    const onSafetyCheck = vi.fn();

    const result = await runSimulation(
      "Harmful violence scenario",
      { onSafetyCheck },
      "test-blocked-id"
    );

    expect(result.id).toBe("test-blocked-id");
    expect(result.safetyResult.status).toBe("BLOCKED");
    expect(onSafetyCheck).toHaveBeenCalledWith("BLOCKED", "Violates content policy");
    expect(plannerSpy).not.toHaveBeenCalled();
    expect(result.activeAgents).toHaveLength(0);
    expect(result.synthesis).toBeNull();
  });

  it("runs full pipeline when scenario is ALLOWED", async () => {
    vi.spyOn(validator, "validateScenario").mockResolvedValueOnce({
      result: { status: "ALLOWED", reason: "Safe speculative scenario", disclaimers: [] },
      inputTokens: 100,
      outputTokens: 50,
    });

    vi.spyOn(planner, "runPlanner").mockResolvedValueOnce({
      output: {
        scenarioSummary: "AI in 1995",
        departurePoint: "1995",
        domainWeights: { TECHNOLOGICAL: 0.9, ECONOMIC: 0.7, CULTURAL: 0.1 },
        activeAgents: ["TECHNOLOGICAL", "ECONOMIC"],
        baselineDataRequired: ["Internet 1995"],
        clarificationQuestions: [],
      },
      inputTokens: 200,
      outputTokens: 100,
    });

    vi.spyOn(search, "searchWeb").mockResolvedValue([]);
    vi.spyOn(search, "searchMultiple").mockResolvedValue([]);

    vi.spyOn(specialistRunner, "runSpecialistAgent").mockImplementation(async (domain) => ({
      output: {
        domain,
        findings: `${domain} analysis completed successfully.`,
        keyDatapoints: [{ fact: "Key point", source: "Historical record", sourceTier: 1 }],
        confidence: "HIGH",
        sourceTiers: {},
        contradictions: [],
        cascadeSeeds: ["Seed 1"],
        visualPrompts: [],
      },
      inputTokens: 300,
      outputTokens: 150,
    }));

    vi.spyOn(guard, "runGuard").mockImplementation(async (agentOutput) => ({
      result: {
        domain: agentOutput.domain,
        passed: true,
        issues: [],
        sanitised: false,
      },
      inputTokens: 150,
      outputTokens: 50,
    }));

    vi.spyOn(synthesis, "runSynthesis").mockResolvedValueOnce({
      output: {
        overallConfidence: "HIGH",
        unifiedAnalysis: "AI transformed early compute.",
        contradictions: [],
      },
      inputTokens: 400,
      outputTokens: 200,
    });

    vi.spyOn(cascade, "runCascade").mockResolvedValueOnce({
      output: {
        cascadeTree: { nodes: [], edges: [], feedbackLoops: [] },
        scenarioPaths: [
          {
            type: "BASE_CASE",
            label: "Base",
            summary: "Gradual automation",
            keyMilestones: [{ year: 2000, event: "Dotcom boom", domain: "TECHNOLOGICAL" }],
          },
        ],
      },
      inputTokens: 300,
      outputTokens: 150,
    });

    vi.spyOn(stakeholder, "runStakeholderDebate").mockResolvedValueOnce({
      output: {
        stakeholders: [
          {
            name: "Tech Pioneer",
            role: "Developer",
            perspective: "Great leap forward",
            keyArguments: ["Innovation"],
            tone: "SUPPORTIVE",
          },
        ],
        summary: "Debate was forward-looking.",
      },
      inputTokens: 250,
      outputTokens: 100,
    });

    const onAgentComplete = vi.fn();
    const onSynthesisComplete = vi.fn();

    const result = await runSimulation(
      "What if AI emerged in 1995?",
      { onAgentComplete, onSynthesisComplete },
      "test-allowed-id"
    );

    expect(result.id).toBe("test-allowed-id");
    expect(result.safetyResult.status).toBe("ALLOWED");
    expect(result.activeAgents).toContain("TECHNOLOGICAL");
    expect(result.activeAgents).toContain("ECONOMIC");
    expect(result.synthesis?.unifiedAnalysis).toBe("AI transformed early compute.");
    expect(result.cascades?.scenarioPaths).toHaveLength(1);
    expect(result.stakeholderDebate?.stakeholders).toHaveLength(1);
    expect(result.costTracking.totalInputTokens).toBeGreaterThan(0);
    expect(result.costTracking.totalOutputTokens).toBeGreaterThan(0);
    expect(onAgentComplete).toHaveBeenCalledTimes(2);
    expect(onSynthesisComplete).toHaveBeenCalledTimes(1);
  });
});
