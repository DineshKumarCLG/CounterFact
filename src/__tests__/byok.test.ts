import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST as simulatePost } from "@/app/api/simulate/route";
import { POST as refinePost } from "@/app/api/simulations/[id]/refine/route";
import { GET as healthGet } from "@/app/api/health/route";
import { loadSimulationState, saveSimulationState } from "@/lib/storage/filesystem";
import { CONFIG } from "@/lib/engine/config";
import * as llmClient from "@/lib/llm/llm-client";
import type { SimulationState } from "@/lib/engine/types";
import { readFileSync, rmSync, existsSync } from "fs";
import { join } from "path";

type StateWithBYOK = SimulationState & { byok?: { provider?: string; modelId?: string; apiKey?: string } };

// Mock next/server after()
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: vi.fn(),
  };
});

describe("Milestone 2: Bring-Your-Own-Key (BYOK) Multi-Provider Backend", () => {
  const testIds: string[] = [];
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    for (const id of testIds) {
      const dir = join(CONFIG.storage.dataDir, "simulations", id);
      if (existsSync(dir)) {
        try {
          rmSync(dir, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  });

  describe("POST /api/simulate — BYOK Ingestion & Validation", () => {
    it("rejects unsupported provider with HTTP 400 and clear error message", async () => {
      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-byok-provider": "unsupported_provider",
        },
        body: JSON.stringify({ scenario: "What if Rome never fell?" }),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid provider: unsupported_provider");
    });

    it("rejects provider missing API key when required (headers)", async () => {
      delete process.env.OPENAI_API_KEY;

      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-byok-provider": "openai",
        },
        body: JSON.stringify({ scenario: "What if Rome never fell?" }),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("API key required for provider openai");
    });

    it("rejects provider missing API key when required (body)", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "What if Rome never fell?",
          byok: {
            provider: "anthropic",
          },
        }),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("API key required for provider anthropic");
    });

    it("accepts valid BYOK via headers and returns HTTP 200 with simulation ID", async () => {
      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-byok-provider": "anthropic",
          "x-byok-api-key": "sk-ant-valid-test-key-12345",
          "x-byok-model-id": "claude-3-5-sonnet-latest",
        },
        body: JSON.stringify({ scenario: "What if the Industrial Revolution began in Song China?" }),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.id).toBeDefined();
      testIds.push(json.id);

      // Verify stored state has sanitized byok and NEVER leaks apiKey
      const savedState = loadSimulationState(json.id) as StateWithBYOK;
      expect(savedState).not.toBeNull();
      expect(savedState.byok).toBeDefined();
      expect(savedState.byok?.provider).toBe("anthropic");
      expect(savedState.byok?.modelId).toBe("claude-3-5-sonnet-latest");
      expect(savedState.byok?.apiKey).toBeUndefined();

      const rawJson = readFileSync(join(CONFIG.storage.dataDir, "simulations", json.id, "state.json"), "utf-8");
      expect(rawJson).not.toContain("sk-ant-valid-test-key-12345");
    });

    it("accepts valid BYOK via JSON body and sanitizes persisted state", async () => {
      const secretKey = "nvapi-secret-key-do-not-leak-998877";
      const req = new Request("http://localhost:3000/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "What if nuclear energy was harnessed in 1910?",
          byok: {
            provider: "nvidia",
            apiKey: secretKey,
            modelId: "meta/llama-3.3-70b-instruct",
          },
        }),
      });

      const res = await simulatePost(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      testIds.push(json.id);

      const savedState = loadSimulationState(json.id) as StateWithBYOK;
      expect(savedState.byok?.provider).toBe("nvidia");
      expect(savedState.byok?.modelId).toBe("meta/llama-3.3-70b-instruct");

      const rawJson = readFileSync(join(CONFIG.storage.dataDir, "simulations", json.id, "state.json"), "utf-8");
      expect(rawJson).not.toContain(secretKey);
    });
  });

  describe("POST /api/simulations/[id]/refine — BYOK Ingestion & Security", () => {
    function createCompletedState(id: string): SimulationState {
      return {
        id,
        scenario: "What if Rome never fell?",
        departurePoint: "AD 476",
        baselineData: [],
        domainWeights: {},
        activeAgents: ["HISTORICAL", "POLITICAL"],
        agentOutputs: {},
        agentStatus: {},
        guardResults: {},
        synthesis: {
          overallConfidence: "HIGH",
          unifiedAnalysis: "The Western Roman Empire centralized Mediterranean trade.",
          contradictions: [],
        },
        safetyResult: { status: "ALLOWED", reason: "Safe", disclaimers: [] },
        cascades: null,
        stakeholderDebate: null,
        generatedImages: [],
        costTracking: {
          totalInputTokens: 500,
          totalOutputTokens: 250,
          inputCostUsd: 0.001,
          outputCostUsd: 0.002,
          searchCalls: 0,
          totalCostUsd: 0.003,
        },
        conversation: [],
        version: 1,
        promptVersion: "v1.0",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: "COMPLETE",
      };
    }

    it("rejects invalid provider on refinement with HTTP 400", async () => {
      const simId = "byok-refine-inv-" + Date.now();
      testIds.push(simId);
      saveSimulationState(createCompletedState(simId));

      const req = new Request(`http://localhost:3000/api/simulations/${simId}/refine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-byok-provider": "invalid_llm",
        },
        body: JSON.stringify({ question: "How was the tax system organized?" }),
      });

      const res = await refinePost(req, { params: Promise.resolve({ id: simId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Invalid provider: invalid_llm");
    });

    it("rejects missing API key on refinement when provider requires one", async () => {
      delete process.env.GEMINI_API_KEY;
      const simId = "byok-refine-nokey-" + Date.now();
      testIds.push(simId);
      saveSimulationState(createCompletedState(simId));

      const req = new Request(`http://localhost:3000/api/simulations/${simId}/refine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-byok-provider": "gemini",
        },
        body: JSON.stringify({ question: "Tell me more about Roman roads." }),
      });

      const res = await refinePost(req, { params: Promise.resolve({ id: simId }) });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toBe("API key required for provider gemini");
    });

    it("processes refinement with BYOK credentials and ensures zero key leakage in state", async () => {
      const simId = "byok-refine-valid-" + Date.now();
      testIds.push(simId);
      saveSimulationState(createCompletedState(simId));

      const secretRefineKey = "sk-proj-refine-secret-key-123456789";

      vi.spyOn(llmClient, "invokeLLM").mockResolvedValueOnce({
        content: "Constantinople had approximately 50,000 to 100,000 citizens in 1453.",
        inputTokens: 150,
        outputTokens: 80,
      });

      const req = new Request(`http://localhost:3000/api/simulations/${simId}/refine`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-byok-provider": "openai",
          "x-byok-api-key": secretRefineKey,
          "x-byok-model-id": "gpt-4o-mini",
        },
        body: JSON.stringify({ question: "What was the population of Constantinople?" }),
      });

      const res = await refinePost(req, { params: Promise.resolve({ id: simId }) });
      expect(res.status).toBe(200);

      const rawJson = readFileSync(join(CONFIG.storage.dataDir, "simulations", simId, "state.json"), "utf-8");
      expect(rawJson).not.toContain(secretRefineKey);

      const updated = loadSimulationState(simId) as StateWithBYOK;
      expect(updated?.conversation.length).toBe(2);
      expect(updated?.byok?.provider).toBe("openai");
      expect(updated?.byok?.apiKey).toBeUndefined();
    });
  });

  describe("GET /api/health — Model Health, Supported Providers & Validation", () => {
    it("returns supported providers list covering all required cloud and local adapters", async () => {
      const res = await healthGet();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(Array.isArray(json.supportedProviders)).toBe(true);
      expect(json.supportedProviders).toEqual([
        "gemini",
        "openai",
        "anthropic",
        "nvidia",
        "bedrock",
        "openrouter",
      ]);
    });

    it("rejects unsupported provider header with HTTP 400", async () => {
      const req = new Request("http://localhost:3000/api/health", {
        headers: {
          "x-byok-provider": "unsupported_provider",
        },
      });

      const res = await healthGet(req);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.status).toBe("error");
      expect(json.error).toContain("Invalid provider: unsupported_provider");
    });

    it("validates credentials as true when provider and valid API key are supplied", async () => {
      const req = new Request("http://localhost:3000/api/health", {
        headers: {
          "x-byok-provider": "openai",
          "x-byok-api-key": "sk-proj-valid-api-key-12345",
          "x-byok-model-id": "gpt-4o",
        },
      });

      const res = await healthGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.provider).toBe("openai");
      expect(json.model).toBe("gpt-4o");
      expect(json.credentialsValid).toBe(true);
    });

    it("validates credentials as false when supplied API key is too short", async () => {
      const req = new Request("http://localhost:3000/api/health", {
        headers: {
          "x-byok-provider": "anthropic",
          "x-byok-api-key": "short",
        },
      });

      const res = await healthGet(req);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
      expect(json.provider).toBe("anthropic");
      expect(json.credentialsValid).toBe(false);
    });
  });
});
