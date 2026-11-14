import { describe, it, expect, vi, beforeEach } from "vitest";
import { invokeLLMJson } from "@/lib/llm/llm-client";
import { invokeLLM } from "@/lib/llm/bedrock-client";

vi.mock("@/lib/llm/bedrock-client", () => ({
  invokeLLM: vi.fn(),
}));

describe("LLM Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  it("extracts and parses JSON wrapped in markdown code fences", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      content: "Here is your plan:\n```json\n{\n  \"status\": \"ALLOWED\",\n  \"score\": 0.95\n}\n```\nHope this helps!",
      inputTokens: 100,
      outputTokens: 50,
    });

    process.env.LLM_PROVIDER = "bedrock";
    const res = await invokeLLMJson<{ status: string; score: number }>("test message");
    expect(res.data).toEqual({ status: "ALLOWED", score: 0.95 });
    expect(res.inputTokens).toBe(100);
    expect(res.outputTokens).toBe(50);
  });

  it("extracts and parses JSON without code fences", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      content: "Result: {\"scenario\": \"AI sentient in 1995\", \"valid\": true}",
      inputTokens: 80,
      outputTokens: 40,
    });

    const res = await invokeLLMJson<{ scenario: string; valid: boolean }>("test message");
    expect(res.data).toEqual({ scenario: "AI sentient in 1995", valid: true });
  });

  it("throws clear error when LLM response contains invalid JSON", async () => {
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      content: "This is completely unstructured non-JSON text.",
      inputTokens: 50,
      outputTokens: 20,
    });

    await expect(invokeLLMJson("test")).rejects.toThrowError(
      /Failed to parse LLM response as JSON/
    );
  });
});
