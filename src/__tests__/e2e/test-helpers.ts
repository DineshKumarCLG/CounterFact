/**
 * Opaque E2E Test Helpers for CounterFact Test Suites
 *
 * Provides reusable stream readers, browser storage emulation,
 * temporary serverless sandboxing, git branch queries, and standard pipeline mocks.
 */

import { rmSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { vi } from "vitest";
import type { SimulationState } from "@/lib/engine/types";
import { CONFIG } from "@/lib/engine/config";
import { deleteSimulation } from "@/lib/storage/db";
import * as llmClient from "@/lib/llm/llm-client";
import * as specialistsRunner from "@/lib/agents/specialists/runner";
import * as searchModule from "@/lib/llm/search";
import * as runwareClient from "@/lib/llm/runware";

/**
 * Consumes an SSE Response stream and parses frames into an array of { event, data, raw }.
 */
export async function readSSEFrames(
  response: Response,
  options: { maxFrames?: number; timeoutMs?: number } = {}
): Promise<Array<{ event?: string; data: unknown; raw: string }>> {
  const maxFrames = options.maxFrames ?? 10;
  const timeoutMs = options.timeoutMs ?? 5000;

  if (!response.body) {
    throw new Error("Response body is null, cannot read SSE stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const frames: Array<{ event?: string; data: unknown; raw: string }> = [];
  let buffer = "";

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      reader.cancel("SSE read timeout exceeded").catch(() => {});
      reject(new Error(`readSSEFrames timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    if (typeof timer.unref === "function") timer.unref();
  });

  const readLoop = async () => {
    try {
      while (frames.length < maxFrames) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;

          let eventName: string | undefined;
          let dataVal: unknown = null;

          const lines = part.split("\n");
          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.replace("event:", "").trim();
            } else if (line.startsWith("data:")) {
              const rawData = line.replace("data:", "").trim();
              try {
                dataVal = JSON.parse(rawData);
              } catch {
                dataVal = rawData;
              }
            }
          }

          frames.push({ event: eventName, data: dataVal, raw: part });
          if (frames.length >= maxFrames) break;
        }
      }
    } finally {
      reader.releaseLock();
    }
    return frames;
  };

  return Promise.race([readLoop(), timeoutPromise]);
}

/**
 * Emulates browser localStorage and window dispatch in Node.js test environment.
 */
export function setupMockBrowserStorage(): {
  store: Map<string, string>;
  cleanup: () => void;
} {
  const store = new Map<string, string>();

  const storageMock: Storage = {
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      store.set(key, String(value));
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    clear(): void {
      store.clear();
    },
    key(index: number): string | null {
      const keys = Array.from(store.keys());
      return keys[index] ?? null;
    },
    get length(): number {
      return store.size;
    },
  };

  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const originalLocalStorage = (globalThis as unknown as { localStorage?: Storage }).localStorage;

  const listeners = new Map<string, Array<(e: unknown) => void>>();
  const windowMock = {
    addEventListener(type: string, listener: (e: unknown) => void) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type)!.push(listener);
    },
    removeEventListener(type: string, listener: (e: unknown) => void) {
      const arr = listeners.get(type);
      if (arr) {
        const idx = arr.indexOf(listener);
        if (idx >= 0) arr.splice(idx, 1);
      }
    },
    dispatchEvent(event: { type: string; detail?: unknown }) {
      const arr = listeners.get(event.type);
      if (arr) {
        for (const l of arr) l(event);
      }
      return true;
    },
  };

  Object.defineProperty(globalThis, "localStorage", {
    value: storageMock,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(globalThis, "window", {
    value: windowMock,
    configurable: true,
    writable: true,
  });

  return {
    store,
    cleanup() {
      if (originalLocalStorage !== undefined) {
        Object.defineProperty(globalThis, "localStorage", {
          value: originalLocalStorage,
          configurable: true,
          writable: true,
        });
      } else {
        delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
      }
      if (originalWindow !== undefined) {
        Object.defineProperty(globalThis, "window", {
          value: originalWindow,
          configurable: true,
          writable: true,
        });
      } else {
        delete (globalThis as unknown as { window?: unknown }).window;
      }
    },
  };
}

/**
 * Sandboxes test execution in an isolated serverless /tmp directory.
 */
export async function withTempServerlessEnv<T>(
  fn: (ctx: { dataDir: string; dbPath: string }) => Promise<T>
): Promise<T> {
  const tempDir = join("/tmp", `cf-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(join(tempDir, "simulations"), { recursive: true });

  const origDataDir = process.env.DATA_DIR;
  const origDbPath = process.env.DB_PATH;
  const origVercel = process.env.VERCEL;

  process.env.DATA_DIR = tempDir;
  process.env.DB_PATH = join(tempDir, "counterfact.db");
  process.env.VERCEL = "1";

  try {
    return await fn({ dataDir: tempDir, dbPath: process.env.DB_PATH });
  } finally {
    if (origDataDir !== undefined) process.env.DATA_DIR = origDataDir;
    else delete process.env.DATA_DIR;

    if (origDbPath !== undefined) process.env.DB_PATH = origDbPath;
    else delete process.env.DB_PATH;

    if (origVercel !== undefined) process.env.VERCEL = origVercel;
    else delete process.env.VERCEL;

    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  }
}

/**
 * Creates a schema-compliant mock SimulationState object.
 */
export function createMockSimulationState(
  id: string,
  overrides?: Partial<SimulationState>
): SimulationState {
  const now = new Date().toISOString();
  return {
    id,
    scenario: "What if the Library of Alexandria survived intact?",
    departurePoint: "48 BC",
    status: "COMPLETE",
    activeAgents: ["HISTORICAL", "CULTURAL"],
    agentStates: {
      HISTORICAL: {
        domain: "HISTORICAL",
        status: "COMPLETE",
        output: {
          domain: "HISTORICAL",
          findings: "Ancient scrolls preserved classical knowledge uninterrupted.",
          keyDatapoints: [{ fact: "Scrolls cataloged", source: "Library Records" }],
          confidence: "HIGH",
          sourceTiers: { "Library Records": 1 },
          contradictions: [],
          cascadeSeeds: [],
          visualPrompts: [],
        },
        inputTokens: 120,
        outputTokens: 60,
      },
      CULTURAL: {
        domain: "CULTURAL",
        status: "COMPLETE",
        output: {
          domain: "CULTURAL",
          findings: "Hellenistic culture spread literature without a dark age decline.",
          keyDatapoints: [{ fact: "Literacy rates increased", source: "Academic History" }],
          confidence: "HIGH",
          sourceTiers: { "Academic History": 1 },
          contradictions: [],
          cascadeSeeds: [],
          visualPrompts: [],
        },
        inputTokens: 110,
        outputTokens: 55,
      },
    },
    synthesis: {
      overallConfidence: "HIGH",
      unifiedAnalysis: "The preservation of classical works propelled scientific progress centuries early.",
      contradictions: [],
    },
    cascades: {
      cascadeTree: { nodes: [], edges: [], feedbackLoops: [] },
      scenarioPaths: [{ type: "BASE_CASE", label: "Classical Enlightenment", summary: "Rapid scientific growth", keyMilestones: [] }],
      tippingPoints: [],
    },
    stakeholderDebate: {
      summary: "Scholars and rulers deliberated knowledge access.",
      stakeholders: [{ name: "Chief Librarian", role: "Keeper", tone: "SCHOLARLY", perspective: "Universal access", keyArguments: ["Preserve antiquity"] }],
    },
    costTracking: {
      totalTokens: 1200,
      costUsd: 0.015,
      inputTokens: 800,
      outputTokens: 400,
    },
    disclaimers: [],
    promptVersion: "v1.0",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Sets up standard deterministic spies for pipeline execution.
 */
export function setupStandardPipelineMocks() {
  vi.spyOn(searchModule, "searchWeb").mockResolvedValue([]);
  vi.spyOn(specialistsRunner, "runSpecialistAgent").mockResolvedValue({
    output: {
      domain: "MILITARY",
      findings: "Legions modernized.",
      keyDatapoints: [],
      confidence: "HIGH",
      sourceTiers: {},
      contradictions: [],
      cascadeSeeds: [],
      visualPrompts: [{ description: "Roman mechanized army", type: "image" }],
    },
    inputTokens: 100,
    outputTokens: 50,
  });
  vi.spyOn(runwareClient, "generateVisualPromptImages").mockResolvedValue(
    new Map([["Roman mechanized army", "https://images.example.com/roman-army.png"]])
  );
  vi.spyOn(llmClient, "invokeLLMJson").mockImplementation(async (prompt: string) => {
    if (prompt.includes("content safety") || prompt.includes("Classify this scenario")) {
      return { data: { status: "ALLOWED", reason: "Safe", disclaimers: [] }, inputTokens: 50, outputTokens: 20 };
    }
    if (prompt.includes("planner") || prompt.includes("departurePoint") || prompt.includes("Analyse this scenario")) {
      return {
        data: {
          scenarioSummary: "Summary",
          departurePoint: "AD 476",
          domainWeights: { MILITARY: 0.9 },
          activeAgents: ["MILITARY"],
          baselineDataRequired: [],
          clarificationQuestions: [],
        },
        inputTokens: 50,
        outputTokens: 20,
      };
    }
    if (prompt.includes("guard")) {
      return { data: { domain: "MILITARY", passed: true, issues: [] }, inputTokens: 50, outputTokens: 20 };
    }
    if (prompt.includes("cascade")) {
      return {
        data: {
          cascadeTree: { nodes: [], edges: [], feedbackLoops: [] },
          scenarioPaths: [{ type: "BASE_CASE", label: "Path A", summary: "Summary", keyMilestones: [] }],
          tippingPoints: [],
        },
        inputTokens: 50,
        outputTokens: 20,
      };
    }
    if (prompt.includes("stakeholder")) {
      return {
        data: {
          summary: "Debate",
          stakeholders: [{ name: "Senator", role: "Leader", tone: "CAUTIOUS", perspective: "View", keyArguments: [] }],
        },
        inputTokens: 50,
        outputTokens: 20,
      };
    }
    return { data: { overallConfidence: "HIGH", unifiedAnalysis: "Unified analysis.", contradictions: [] }, inputTokens: 50, outputTokens: 20 };
  });

  return {
    restore() {
      vi.restoreAllMocks();
    },
  };
}

/**
 * Standard cleanup removing simulation files from disk and SQLite.
 */
export function cleanSimulationArtifacts(id: string): void {
  const dir = join(CONFIG.storage.dataDir, "simulations", id);
  if (existsSync(dir)) {
    rmSync(dir, { recursive: true, force: true });
  }
  deleteSimulation(id);
}

/**
 * Checks whether a git branch exists in local or remote refs.
 * Returns boolean safely without throwing shell exceptions.
 */
export function branchExists(branchName: string): boolean {
  try {
    execSync(
      `git rev-parse --verify --quiet refs/heads/${branchName} || git rev-parse --verify --quiet refs/remotes/origin/${branchName}`,
      { stdio: ["ignore", "pipe", "ignore"], encoding: "utf-8" }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Retrieves the full tracked file list of a git branch.
 */
export function getBranchFileList(branchName: string): string[] {
  try {
    return execSync(`git ls-tree -r --name-only ${branchName}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    })
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Reads the content of a file on a specific branch without checking it out.
 */
export function getBranchFile(branchName: string, filePath: string): string {
  try {
    return execSync(`git show ${branchName}:${filePath}`, {
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf-8",
    });
  } catch {
    return "";
  }
}
