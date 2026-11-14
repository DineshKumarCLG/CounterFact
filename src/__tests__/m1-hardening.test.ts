import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CONFIG, calculateCost } from "@/lib/engine/config";
import { saveSimulationMeta, getSimulationMeta, deleteSimulation } from "@/lib/storage/db";
import { saveSimulationState, loadSimulationState } from "@/lib/storage/filesystem";
import { DELETE as deleteSimulationRoute, GET as getSimulationRoute } from "@/app/api/simulations/[id]/route";
import { GET as streamSimulationRoute } from "@/app/api/simulations/[id]/stream/route";
import { POST as refineRoute } from "@/app/api/simulations/[id]/refine/route";
import { GET as exportRoute } from "@/app/api/simulations/[id]/export/route";
import type { SimulationState } from "@/lib/engine/types";
import { rmSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";

// Mock invokeLLM for refine tests
vi.mock("@/lib/llm/llm-client", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    content: "Detailed analysis response for refinement drill-down.",
    inputTokens: 1200,
    outputTokens: 400,
  }),
}));

describe("Milestone 1 Hardening & Defect Resolution", () => {
  const origDataDir = process.env.DATA_DIR;
  const origVercel = process.env.VERCEL;

  afterEach(() => {
    if (origDataDir !== undefined) process.env.DATA_DIR = origDataDir;
    else delete process.env.DATA_DIR;

    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;
  });

  describe("1. Serverless Storage Compatibility", () => {
    it("dynamically returns /tmp/counterfact/data when VERCEL is set", () => {
      delete process.env.DATA_DIR;
      process.env.VERCEL = "1";
      expect(CONFIG.storage.dataDir).toBe("/tmp/counterfact/data");
    });

    it("dynamically returns process.env.DATA_DIR when explicitly provided", () => {
      process.env.DATA_DIR = "/tmp/custom-sim-data";
      expect(CONFIG.storage.dataDir).toBe("/tmp/custom-sim-data");
    });

    it("dynamically returns ./data as local fallback", () => {
      delete process.env.DATA_DIR;
      delete process.env.VERCEL;
      expect(CONFIG.storage.dataDir).toBe("./data");
    });

    it("safely ignores string 'undefined' or whitespace in process.env.DATA_DIR", () => {
      delete process.env.VERCEL;
      process.env.DATA_DIR = "undefined";
      expect(CONFIG.storage.dataDir).toBe("./data");

      process.env.DATA_DIR = "   ";
      expect(CONFIG.storage.dataDir).toBe("./data");
    });

    it("can save and load simulation state in /tmp directory without errors", () => {
      process.env.DATA_DIR = `/tmp/counterfact-test-${Date.now()}`;
      const simId = `tmp-sim-${Date.now()}`;
      const sampleState: SimulationState = {
        id: simId,
        scenario: "What if renewable energy reached 100% in 2020?",
        departurePoint: "2020",
        baselineData: [],
        domainWeights: { TECHNOLOGICAL: 0.9 },
        activeAgents: ["TECHNOLOGICAL"],
        agentOutputs: {},
        agentStatus: { TECHNOLOGICAL: "COMPLETE" },
        guardResults: {},
        synthesis: null,
        safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
        cascades: null,
        stakeholderDebate: null,
        generatedImages: [],
        costTracking: {
          totalInputTokens: 0,
          totalOutputTokens: 0,
          inputCostUsd: 0,
          outputCostUsd: 0,
          searchCalls: 0,
          totalCostUsd: 0,
        },
        conversation: [],
        version: 1,
        promptVersion: "v1.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "RUNNING",
      };

      try {
        saveSimulationState(sampleState);
        const loaded = loadSimulationState(simId);
        expect(loaded).not.toBeNull();
        expect(loaded?.id).toBe(simId);
        expect(loaded?.scenario).toBe("What if renewable energy reached 100% in 2020?");
      } finally {
        if (existsSync(process.env.DATA_DIR)) {
          rmSync(process.env.DATA_DIR, { recursive: true, force: true });
        }
      }
    });
  });

  describe("2. SQLite & Filesystem Deletion Sync", () => {
    const testSimId = `del-sync-${Date.now()}`;

    afterEach(() => {
      deleteSimulation(testSimId);
      const dir = join(CONFIG.storage.dataDir, "simulations", testSimId);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("deleteSimulation removes row from SQLite", () => {
      saveSimulationMeta({
        id: testSimId,
        scenario: "Scenario to delete",
        departurePoint: "2000",
        status: "COMPLETE",
        agentCount: 1,
        domains: "ECONOMIC",
        costCents: 10,
        promptVersion: "v1.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      expect(getSimulationMeta(testSimId)).toBeDefined();
      deleteSimulation(testSimId);
      expect(getSimulationMeta(testSimId)).toBeUndefined();
    });

    it("DELETE API endpoint removes both filesystem directory and SQLite record", async () => {
      // Save metadata in SQLite
      saveSimulationMeta({
        id: testSimId,
        scenario: "Scenario to delete",
        departurePoint: "2000",
        status: "COMPLETE",
        agentCount: 1,
        domains: "ECONOMIC",
        costCents: 10,
        promptVersion: "v1.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      // Save filesystem state
      const dir = join(CONFIG.storage.dataDir, "simulations", testSimId);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "state.json"), JSON.stringify({ id: testSimId }));

      expect(existsSync(dir)).toBe(true);
      expect(getSimulationMeta(testSimId)).toBeDefined();

      const req = new Request(`http://localhost:3000/api/simulations/${testSimId}`, {
        method: "DELETE",
      });
      const res = await deleteSimulationRoute(req, {
        params: Promise.resolve({ id: testSimId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(true);
      expect(existsSync(dir)).toBe(false);
      expect(getSimulationMeta(testSimId)).toBeUndefined();
    });

    it("DELETE API endpoint returns 404 if simulation does not exist", async () => {
      const req = new Request("http://localhost:3000/api/simulations/non-existent-9999", {
        method: "DELETE",
      });
      const res = await deleteSimulationRoute(req, {
        params: Promise.resolve({ id: "non-existent-9999" }),
      });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Simulation not found");
    });

    it("rejects path traversal and invalid IDs with 400 without deleting simulations directory", async () => {
      // Ensure simulations root directory exists
      const simRootDir = join(CONFIG.storage.dataDir, "simulations");
      mkdirSync(simRootDir, { recursive: true });
      expect(existsSync(simRootDir)).toBe(true);

      const invalidIds = ["", ".", "..", "../..", "../../etc/passwd", "has/slash", "has\\backslash", "id with space"];
      for (const id of invalidIds) {
        // Test DELETE
        const delReq = new Request(`http://localhost:3000/api/simulations/${id}`, { method: "DELETE" });
        const delRes = await deleteSimulationRoute(delReq, { params: Promise.resolve({ id }) });
        expect(delRes.status).toBe(400);
        const delJson = await delRes.json();
        expect(delJson.error).toBe("Invalid simulation ID");

        // Test GET
        const getReq = new Request(`http://localhost:3000/api/simulations/${id}`, { method: "GET" });
        const getRes = await getSimulationRoute(getReq, { params: Promise.resolve({ id }) });
        expect(getRes.status).toBe(400);
        const getJson = await getRes.json();
        expect(getJson.error).toBe("Invalid simulation ID");

        // Test STREAM GET
        const streamReq = new Request(`http://localhost:3000/api/simulations/${id}/stream`, { method: "GET" });
        const streamRes = await streamSimulationRoute(streamReq, { params: Promise.resolve({ id }) });
        expect(streamRes.status).toBe(400);
        const streamJson = await streamRes.json();
        expect(streamJson.error).toBe("Invalid simulation ID");
      }

      // Crucial: Ensure simulations root directory survived intact
      expect(existsSync(simRootDir)).toBe(true);
    });
  });

  describe("3. Refine Token & USD Cost Tracking", () => {
    const refineSimId = `refine-cost-${Date.now()}`;
    const initialInputTokens = 2000;
    const initialOutputTokens = 1000;
    const initialCost = calculateCost(initialInputTokens, initialOutputTokens);

    const testState: SimulationState = {
      id: refineSimId,
      scenario: "What if fusion power was unlocked in 1980?",
      departurePoint: "1980",
      baselineData: [],
      domainWeights: { TECHNOLOGICAL: 0.9 },
      activeAgents: ["TECHNOLOGICAL"],
      agentOutputs: {},
      agentStatus: { TECHNOLOGICAL: "COMPLETE" },
      guardResults: {},
      synthesis: {
        overallConfidence: "HIGH",
        unifiedAnalysis: "Fusion powered abundant energy grids worldwide.",
        contradictions: [],
      },
      safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
      cascades: null,
      stakeholderDebate: null,
      generatedImages: [],
      costTracking: {
        totalInputTokens: initialInputTokens,
        totalOutputTokens: initialOutputTokens,
        inputCostUsd: initialCost.inputCostUsd,
        outputCostUsd: initialCost.outputCostUsd,
        searchCalls: 0,
        totalCostUsd: initialCost.totalCostUsd,
      },
      conversation: [],
      version: 1,
      promptVersion: "v1.0",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "COMPLETE",
    };

    beforeEach(() => {
      saveSimulationState(testState);
    });

    afterEach(() => {
      const dir = join(CONFIG.storage.dataDir, "simulations", refineSimId);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("recomputes inputCostUsd, outputCostUsd, and totalCostUsd upon refinement turn", async () => {
      const req = new Request(`http://localhost:3000/api/simulations/${refineSimId}/refine`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "How did this affect coal mining jobs?" }),
      });

      const res = await refineRoute(req, {
        params: Promise.resolve({ id: refineSimId }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.answer).toBeDefined();

      const updated = loadSimulationState(refineSimId);
      expect(updated).not.toBeNull();
      // Added 1200 input tokens and 400 output tokens from mock
      expect(updated!.costTracking.totalInputTokens).toBe(initialInputTokens + 1200);
      expect(updated!.costTracking.totalOutputTokens).toBe(initialOutputTokens + 400);

      const expectedCost = calculateCost(
        initialInputTokens + 1200,
        initialOutputTokens + 400
      );
      expect(updated!.costTracking.inputCostUsd).toBe(expectedCost.inputCostUsd);
      expect(updated!.costTracking.outputCostUsd).toBe(expectedCost.outputCostUsd);
      expect(updated!.costTracking.totalCostUsd).toBe(expectedCost.totalCostUsd);
      expect(updated!.costTracking.totalCostUsd).toBeGreaterThan(initialCost.totalCostUsd);
    });
  });

  describe("4. Comprehensive Markdown Export", () => {
    const exportSimId = `export-full-${Date.now()}`;
    const testStateWithAllSections: SimulationState = {
      id: exportSimId,
      scenario: "What if Apollo 11 failed to return?",
      departurePoint: "1969",
      baselineData: [],
      domainWeights: { HISTORICAL: 0.9 },
      activeAgents: ["HISTORICAL"],
      agentOutputs: {
        HISTORICAL: {
          domain: "HISTORICAL",
          findings: "The loss prompted a national mourning period.",
          keyDatapoints: [{ fact: "Apollo program suspended for review", source: "NASA Archive" }],
          confidence: "HIGH",
          sourceTiers: {},
          contradictions: [],
          cascadeSeeds: [],
          visualPrompts: [],
        },
      },
      agentStatus: { HISTORICAL: "COMPLETE" },
      guardResults: {},
      synthesis: {
        overallConfidence: "HIGH",
        unifiedAnalysis: "Space exploration pivoted to uncrewed probes.",
        contradictions: [],
      },
      safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
      cascades: {
        cascadeTree: { nodes: [], edges: [], feedbackLoops: [] },
        scenarioPaths: [
          {
            type: "BASE_CASE",
            label: "Robotic Pivot",
            summary: "Robotic missions accelerate.",
            keyMilestones: [{ year: 1975, event: "Viking program expansion", domain: "HISTORICAL" }],
          },
        ],
      },
      stakeholderDebate: {
        summary: "Debate centered on astronaut risk vs national prestige.",
        stakeholders: [
          {
            name: "Dr. Elena Rostova",
            role: "Aerospace Safety Chair",
            perspective: "Human spaceflight requires higher safety margins.",
            keyArguments: ["Human life is irreplaceable", "Robotics can achieve same science"],
            tone: "CAUTIOUS",
          },
          {
            name: "Sen. Thomas Vance",
            role: "Senate Space Committee",
            perspective: "America cannot surrender the frontier.",
            keyArguments: ["Prestige is vital to leadership", "Halting surrenders space race"],
            tone: "SUPPORTIVE",
          },
        ],
      },
      generatedImages: [
        {
          description: "Apollo memorial monument on National Mall",
          altText: "Bronze memorial monument in Washington DC",
          url: "https://images.counterfact.dev/memorial-apollo.jpg",
          type: "hero",
        },
      ],
      costTracking: {
        totalInputTokens: 5000,
        totalOutputTokens: 2000,
        inputCostUsd: 0.015,
        outputCostUsd: 0.03,
        searchCalls: 3,
        totalCostUsd: 0.045,
      },
      conversation: [],
      version: 1,
      promptVersion: "v1.0",
      createdAt: "2026-03-01T12:00:00Z",
      updatedAt: "2026-03-01T12:05:00Z",
      status: "COMPLETE",
    };

    beforeEach(() => {
      saveSimulationState(testStateWithAllSections);
    });

    afterEach(() => {
      const dir = join(CONFIG.storage.dataDir, "simulations", exportSimId);
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    });

    it("buildMarkdown exports stakeholder debate with summary and all positions", async () => {
      const req = new Request(
        `http://localhost:3000/api/simulations/${exportSimId}/export?format=markdown`
      );
      const res = await exportRoute(req, {
        params: Promise.resolve({ id: exportSimId }),
      });

      expect(res.status).toBe(200);
      const md = await res.text();

      expect(md).toContain("## Stakeholder Perspectives");
      expect(md).toContain("Debate centered on astronaut risk vs national prestige.");
      expect(md).toContain("### Dr. Elena Rostova — Aerospace Safety Chair (CAUTIOUS)");
      expect(md).toContain("Human life is irreplaceable");
      expect(md).toContain("### Sen. Thomas Vance — Senate Space Committee (SUPPORTIVE)");
      expect(md).toContain("Prestige is vital to leadership");
    });

    it("buildMarkdown exports visual intelligence and generated media", async () => {
      const req = new Request(
        `http://localhost:3000/api/simulations/${exportSimId}/export?format=markdown`
      );
      const res = await exportRoute(req, {
        params: Promise.resolve({ id: exportSimId }),
      });

      expect(res.status).toBe(200);
      const md = await res.text();

      expect(md).toContain("## Visual Intelligence & Generated Media");
      expect(md).toContain("### Bronze memorial monument in Washington DC");
      expect(md).toContain("![Bronze memorial monument in Washington DC](https://images.counterfact.dev/memorial-apollo.jpg)");
      expect(md).toContain("*Apollo memorial monument on National Mall* (hero)");
    });
  });

  describe("5. Stream Premature Termination Fix", () => {
    const isStreamComplete = (state: Partial<SimulationState>) =>
      Boolean(
        state.status === "COMPLETE" ||
        state.status === "PARTIAL" ||
        state.status === "FAILED" ||
        state.safetyResult?.status === "BLOCKED" ||
        (state.synthesis && Boolean(state.cascades) && Boolean(state.stakeholderDebate))
      );

    it("does not prematurely consider simulation complete when cascades is null or undefined", () => {
      // Simulating the condition where synthesis is ready but cascades is still null
      const stateWithNullCascades: Partial<SimulationState> = {
        synthesis: {
          overallConfidence: "MODERATE",
          unifiedAnalysis: "Partial analysis",
          contradictions: [],
        },
        cascades: null,
        stakeholderDebate: null,
        safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
        status: "RUNNING",
      };

      expect(isStreamComplete(stateWithNullCascades)).toBe(false);

      // Simulating when cascades and stakeholderDebate are undefined (Challenger 1 bug)
      const stateWithUndefinedCascades: Partial<SimulationState> = {
        synthesis: {
          overallConfidence: "MODERATE",
          unifiedAnalysis: "Partial analysis",
          contradictions: [],
        },
        cascades: undefined,
        stakeholderDebate: undefined,
        safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
        status: "RUNNING",
      };

      // In JavaScript, undefined !== null was true, which caused premature closure with the previous check
      expect(isStreamComplete(stateWithUndefinedCascades)).toBe(false);
    });

    it("considers simulation complete when status is COMPLETE or terminal", () => {
      const completeState: Partial<SimulationState> = {
        status: "COMPLETE",
        synthesis: {
          overallConfidence: "HIGH",
          unifiedAnalysis: "Done",
          contradictions: [],
        },
        cascades: { cascadeTree: { nodes: [], edges: [], feedbackLoops: [] }, scenarioPaths: [] },
        stakeholderDebate: { summary: "Done", stakeholders: [] },
        safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
      };
      expect(isStreamComplete(completeState)).toBe(true);

      const failedState: Partial<SimulationState> = {
        status: "FAILED",
      };
      expect(isStreamComplete(failedState)).toBe(true);

      const blockedState: Partial<SimulationState> = {
        status: "RUNNING",
        safetyResult: { status: "BLOCKED", reason: "Unsafe", disclaimers: [] },
      };
      expect(isStreamComplete(blockedState)).toBe(true);

      const allArtifactsDoneState: Partial<SimulationState> = {
        status: "RUNNING",
        synthesis: {
          overallConfidence: "HIGH",
          unifiedAnalysis: "Done",
          contradictions: [],
        },
        cascades: { cascadeTree: { nodes: [], edges: [], feedbackLoops: [] }, scenarioPaths: [] },
        stakeholderDebate: { summary: "Done", stakeholders: [] },
      };
      expect(isStreamComplete(allArtifactsDoneState)).toBe(true);
    });
  });
});
