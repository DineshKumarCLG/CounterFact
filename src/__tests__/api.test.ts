import { describe, it, expect, vi } from "vitest";

// Mock next/server's after() for unit test environment
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn(),
  };
});

import { GET as healthGet } from "@/app/api/health/route";
import { POST as simulatePost } from "@/app/api/simulate/route";
import { GET as exportGet } from "@/app/api/simulations/[id]/export/route";
import * as filesystem from "@/lib/storage/filesystem";

describe("API Endpoints", () => {
  describe("GET /api/health", () => {
    it("returns 200 with ok status and runtime info", async () => {
      const res = await healthGet();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.version).toBeDefined();
      expect(json.provider).toBeDefined();
      expect(json.model).toBeDefined();
    });
  });

  describe("POST /api/simulate", () => {
    it("returns 400 when scenario is missing", async () => {
      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("No scenario provided");
    });

    it("returns 400 when scenario is only whitespace or stripped characters", async () => {
      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "   ```javascript ```  " }),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("Scenario is empty after sanitisation");
    });

    it("returns 200 with generated simulation ID for valid input", async () => {
      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: "What if Rome never fell?" }),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBeDefined();
      expect(typeof json.id).toBe("string");
      expect(json.id.length).toBeGreaterThan(10);
    });
  });

  describe("GET /api/simulations/[id]/export", () => {
    it("returns 404 when simulation does not exist", async () => {
      vi.spyOn(filesystem, "loadSimulationState").mockReturnValueOnce(null);

      const req = new Request("http://localhost:3000/api/simulations/missing-id/export");
      const res = await exportGet(req, { params: Promise.resolve({ id: "missing-id" }) });
      expect(res.status).toBe(404);
      const json = await res.json();
      expect(json.error).toBe("Simulation not found");
    });

    it("exports markdown report with proper headers", async () => {
      vi.spyOn(filesystem, "loadSimulationState").mockReturnValueOnce({
        id: "test-export-id",
        scenario: "What if the internet was invented in 1950?",
        departurePoint: "1950",
        baselineData: [],
        domainWeights: {},
        activeAgents: [],
        agentOutputs: {},
        agentStatus: {},
        guardResults: {},
        synthesis: {
          overallConfidence: "HIGH",
          unifiedAnalysis: "Early computing networks expanded quickly.",
          contradictions: [],
        },
        safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
        cascades: null,
        stakeholderDebate: null,
        generatedImages: [],
        costTracking: {
          totalInputTokens: 500,
          totalOutputTokens: 200,
          inputCostUsd: 0.0015,
          outputCostUsd: 0.003,
          searchCalls: 1,
          totalCostUsd: 0.0045,
        },
        conversation: [],
        version: 1,
        promptVersion: "v1.0",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      });

      const req = new Request("http://localhost:3000/api/simulations/test-export-id/export?format=markdown");
      const res = await exportGet(req, { params: Promise.resolve({ id: "test-export-id" }) });
      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toContain("text/markdown");
      expect(res.headers.get("Content-Disposition")).toContain("counterfact-test-exp.md");

      const text = await res.text();
      expect(text).toContain("# Counterfact Simulation Report");
      expect(text).toContain("What if the internet was invented in 1950?");
      expect(text).toContain("Early computing networks expanded quickly.");
    });
  });
});
