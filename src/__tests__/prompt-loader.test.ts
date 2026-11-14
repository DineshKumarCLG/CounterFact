import { describe, it, expect } from "vitest";
import { loadPrompt } from "@/lib/agents/prompt-loader";
import { DOMAINS } from "@/lib/engine/types";

describe("Prompt Loader", () => {
  it("loads core engine prompts successfully", () => {
    const corePrompts = ["planner", "guard", "synthesis", "cascade", "stakeholder"];
    for (const promptName of corePrompts) {
      const content = loadPrompt(promptName);
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(50);
    }
  });

  it("loads all 12 domain specialist prompts successfully", () => {
    for (const domain of DOMAINS) {
      const promptName = domain.toLowerCase();
      const content = loadPrompt(promptName);
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(50);
    }
  });

  it("caches loaded prompts in memory", () => {
    const first = loadPrompt("planner");
    const second = loadPrompt("planner");
    expect(first).toBe(second);
  });

  it("throws error for non-existent prompt", () => {
    expect(() => loadPrompt("non_existent_prompt_xyz")).toThrowError(
      /Prompt file not found/
    );
  });
});
