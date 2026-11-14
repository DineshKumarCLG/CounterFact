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

  it("resolves default dataDir when no environment variables are set", () => {
    const origDataDir = process.env.DATA_DIR;
    const origVercel = process.env.VERCEL;
    try {
      delete process.env.DATA_DIR;
      delete process.env.VERCEL;
      expect(CONFIG.storage.dataDir).toBe("./data");
    } finally {
      if (origDataDir !== undefined) process.env.DATA_DIR = origDataDir;
      if (origVercel !== undefined) process.env.VERCEL = origVercel;
    }
  });

  it("resolves /tmp/counterfact/data on Vercel serverless environments", () => {
    const origDataDir = process.env.DATA_DIR;
    const origVercel = process.env.VERCEL;
    try {
      delete process.env.DATA_DIR;
      process.env.VERCEL = "1";
      expect(CONFIG.storage.dataDir).toBe("/tmp/counterfact/data");
    } finally {
      if (origDataDir !== undefined) process.env.DATA_DIR = origDataDir;
      if (origVercel !== undefined) process.env.VERCEL = origVercel;
      else delete process.env.VERCEL;
    }
  });

  it("resolves custom DATA_DIR when explicitly provided", () => {
    const origDataDir = process.env.DATA_DIR;
    try {
      process.env.DATA_DIR = "/custom/data/path";
      expect(CONFIG.storage.dataDir).toBe("/custom/data/path");
    } finally {
      if (origDataDir !== undefined) process.env.DATA_DIR = origDataDir;
      else delete process.env.DATA_DIR;
    }
  });

  it("safely falls back when DATA_DIR is the literal string 'undefined' or empty/whitespace", () => {
    const origDataDir = process.env.DATA_DIR;
    const origVercel = process.env.VERCEL;
    try {
      delete process.env.VERCEL;

      process.env.DATA_DIR = "undefined";
      expect(CONFIG.storage.dataDir).toBe("./data");

      process.env.DATA_DIR = "   ";
      expect(CONFIG.storage.dataDir).toBe("./data");

      process.env.DATA_DIR = "";
      expect(CONFIG.storage.dataDir).toBe("./data");

      process.env.VERCEL = "1";
      process.env.DATA_DIR = "undefined";
      expect(CONFIG.storage.dataDir).toBe("/tmp/counterfact/data");
    } finally {
      if (origDataDir !== undefined) process.env.DATA_DIR = origDataDir;
      else delete process.env.DATA_DIR;
      if (origVercel !== undefined) process.env.VERCEL = origVercel;
      else delete process.env.VERCEL;
    }
  });
});
