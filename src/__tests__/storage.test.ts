import { describe, it, expect, afterEach } from "vitest";
import { saveSimulationState, loadSimulationState } from "@/lib/storage/filesystem";
import { saveSimulationMeta, getSimulationMeta, listSimulations, deleteSimulation } from "@/lib/storage/db";
import type { SimulationState } from "@/lib/engine/types";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import { CONFIG } from "@/lib/engine/config";

describe("Storage Engine", () => {
  const testId = "test-sim-" + Date.now();
  const testDir = join(CONFIG.storage.dataDir, "simulations", testId);

  const mockState: SimulationState = {
    id: testId,
    scenario: "What if Rome never fell?",
    departurePoint: "AD 476",
    baselineData: [],
    domainWeights: { HISTORICAL: 0.9, MILITARY: 0.8 },
    activeAgents: ["HISTORICAL", "MILITARY"],
    agentOutputs: {},
    agentStatus: { HISTORICAL: "COMPLETE", MILITARY: "COMPLETE" },
    guardResults: {},
    synthesis: null,
    safetyResult: { status: "ALLOWED", reason: "Safe speculative scenario", disclaimers: [] },
    cascades: null,
    stakeholderDebate: null,
    generatedImages: [],
    costTracking: {
      totalInputTokens: 1000,
      totalOutputTokens: 500,
      inputCostUsd: 0.003,
      outputCostUsd: 0.0075,
      searchCalls: 2,
      totalCostUsd: 0.0105,
    },
    conversation: [],
    version: 1,
    promptVersion: "v1.0",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe("Filesystem Storage", () => {
    it("saves and retrieves simulation state accurately", () => {
      saveSimulationState(mockState);
      const loaded = loadSimulationState(testId);
      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(testId);
      expect(loaded?.scenario).toBe("What if Rome never fell?");
      expect(loaded?.departurePoint).toBe("AD 476");
      expect(loaded?.activeAgents).toEqual(["HISTORICAL", "MILITARY"]);
    });

    it("returns null for non-existent simulation ID", () => {
      const nonExistent = loadSimulationState("sim-does-not-exist-" + Date.now());
      expect(nonExistent).toBeNull();
    });
  });

  describe("Metadata DB Storage", () => {
    it("saves and retrieves metadata records", () => {
      saveSimulationMeta({
        id: testId,
        scenario: mockState.scenario,
        departurePoint: mockState.departurePoint,
        status: "COMPLETE",
        agentCount: 2,
        domains: "HISTORICAL,MILITARY",
        costCents: 1,
        promptVersion: "v1.0",
        createdAt: mockState.createdAt,
        updatedAt: mockState.updatedAt,
      });

      const meta = getSimulationMeta(testId);
      expect(meta).toBeDefined();
      expect(meta?.id).toBe(testId);
      expect(meta?.scenario).toBe(mockState.scenario);
      expect(meta?.status).toBe("COMPLETE");
    });

    it("lists simulations with limit and offset", () => {
      saveSimulationMeta({
        id: testId,
        scenario: mockState.scenario,
        departurePoint: mockState.departurePoint,
        status: "COMPLETE",
        agentCount: 2,
        domains: "HISTORICAL,MILITARY",
        costCents: 1,
        promptVersion: "v1.0",
        createdAt: mockState.createdAt,
        updatedAt: mockState.updatedAt,
      });

      const list = listSimulations(10, 0);
      expect(Array.isArray(list)).toBe(true);
      const found = list.find((s) => s.id === testId);
      expect(found).toBeDefined();
    });

    it("deletes simulation record from SQLite", () => {
      saveSimulationMeta({
        id: testId,
        scenario: mockState.scenario,
        departurePoint: mockState.departurePoint,
        status: "COMPLETE",
        agentCount: 2,
        domains: "HISTORICAL,MILITARY",
        costCents: 1,
        promptVersion: "v1.0",
        createdAt: mockState.createdAt,
        updatedAt: mockState.updatedAt,
      });

      expect(getSimulationMeta(testId)).toBeDefined();
      deleteSimulation(testId);
      expect(getSimulationMeta(testId)).toBeUndefined();
    });

    it("handles deleteSimulation for non-existent id gracefully", () => {
      expect(() => deleteSimulation("non-existent-" + Date.now())).not.toThrow();
    });
  });
});
