import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  invokeLLM as unifiedInvokeLLM,
  invokeLLMJson,
  getProvider,
  maskApiKey,
  extractBYOKConfig,
  withBYOKContext,
  getBYOKContext,
  VALID_PROVIDERS,
} from "@/lib/llm/llm-client";
import { invokeLLM as bedrockInvoke } from "@/lib/llm/bedrock-client";
import { z } from "zod";

vi.mock("@/lib/llm/bedrock-client", () => ({
  invokeLLM: vi.fn(),
}));

describe("LLM Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  describe("JSON Extraction & Parsing", () => {
    it("extracts and parses JSON wrapped in markdown code fences", async () => {
      vi.mocked(bedrockInvoke).mockResolvedValueOnce({
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
      vi.mocked(bedrockInvoke).mockResolvedValueOnce({
        content: "Result: {\"scenario\": \"AI sentient in 1995\", \"valid\": true}",
        inputTokens: 80,
        outputTokens: 40,
      });

      const res = await invokeLLMJson<{ scenario: string; valid: boolean }>("test message");
      expect(res.data).toEqual({ scenario: "AI sentient in 1995", valid: true });
    });

    it("validates parsed JSON with a Zod schema when provided", async () => {
      vi.mocked(bedrockInvoke).mockResolvedValueOnce({
        content: "{\"name\": \"Counterfact\", \"confidence\": 0.99}",
        inputTokens: 50,
        outputTokens: 25,
      });

      const schema = z.object({
        name: z.string(),
        confidence: z.number().min(0).max(1),
      });

      const res = await invokeLLMJson<{ name: string; confidence: number }>("test message", { schema });
      expect(res.data.name).toBe("Counterfact");
      expect(res.data.confidence).toBe(0.99);
    });

    it("throws clear error when LLM response contains invalid JSON", async () => {
      vi.mocked(bedrockInvoke).mockResolvedValueOnce({
        content: "This is completely unstructured non-JSON text.",
        inputTokens: 50,
        outputTokens: 20,
      });

      await expect(invokeLLMJson("test")).rejects.toThrowError(
        /Failed to parse LLM response as JSON/
      );
    });
  });

  describe("Provider Selection & Validation", () => {
    it("recognizes all valid providers in VALID_PROVIDERS", () => {
      expect(VALID_PROVIDERS).toContain("bedrock");
      expect(VALID_PROVIDERS).toContain("gemini");
      expect(VALID_PROVIDERS).toContain("openai");
      expect(VALID_PROVIDERS).toContain("anthropic");
      expect(VALID_PROVIDERS).toContain("nvidia");
      expect(VALID_PROVIDERS).toContain("openrouter");
    });

    it("defaults to bedrock when no option or env is specified", () => {
      delete process.env.LLM_PROVIDER;
      expect(getProvider()).toBe("bedrock");
    });

    it("selects provider from options when provided", () => {
      expect(getProvider({ provider: "openai" })).toBe("openai");
      expect(getProvider({ provider: "anthropic" })).toBe("anthropic");
      expect(getProvider({ provider: "gemini" })).toBe("gemini");
      expect(getProvider({ provider: "nvidia" })).toBe("nvidia");
      expect(getProvider({ provider: "openrouter" })).toBe("openrouter");
      expect(getProvider({ provider: "bedrock" })).toBe("bedrock");
    });

    it("throws clear descriptive error for invalid provider in options", () => {
      expect(() => getProvider({ provider: "unknown_provider" as unknown as import("@/lib/llm/llm-client").Provider })).toThrowError(
        /Invalid provider: unknown_provider/
      );
    });

    it("falls back to bedrock when process.env.LLM_PROVIDER is invalid", () => {
      process.env.LLM_PROVIDER = "unsupported_llm";
      expect(getProvider()).toBe("bedrock");
    });
  });

  describe("Missing API Key Validation across Providers", () => {
    beforeEach(() => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.NVIDIA_API_KEY;
      delete process.env.OPENROUTER_API_KEY;
    });

    it("throws error requiring API key for gemini", async () => {
      await expect(unifiedInvokeLLM("hello", { provider: "gemini" })).rejects.toThrow(
        /API key required for provider gemini/
      );
    });

    it("throws error requiring API key for openai", async () => {
      await expect(unifiedInvokeLLM("hello", { provider: "openai" })).rejects.toThrow(
        /API key required for provider openai/
      );
    });

    it("throws error requiring API key for anthropic", async () => {
      await expect(unifiedInvokeLLM("hello", { provider: "anthropic" })).rejects.toThrow(
        /API key required for provider anthropic/
      );
    });

    it("throws error requiring API key for nvidia", async () => {
      await expect(unifiedInvokeLLM("hello", { provider: "nvidia" })).rejects.toThrow(
        /API key required for provider nvidia/
      );
    });

    it("throws error requiring API key for openrouter", async () => {
      await expect(unifiedInvokeLLM("hello", { provider: "openrouter" })).rejects.toThrow(
        /API key required for provider openrouter/
      );
    });
  });

  describe("API Key Masking & Security", () => {
    it("returns empty string for undefined or empty key", () => {
      expect(maskApiKey(undefined)).toBe("");
      expect(maskApiKey("")).toBe("");
    });

    it("returns asterisks for short keys (<= 8 chars)", () => {
      expect(maskApiKey("12345")).toBe("********");
      expect(maskApiKey("12345678")).toBe("********");
    });

    it("masks middle characters for standard keys (> 8 chars)", () => {
      const masked = maskApiKey("sk-proj-1234567890abcdef");
      expect(masked).toBe("sk-p...cdef");
      expect(masked).not.toContain("1234567890");
    });
  });

  describe("extractBYOKConfig helper", () => {
    it("returns undefined when neither headers nor body provide BYOK config", () => {
      const req = new Request("http://localhost:3000/api/simulate");
      expect(extractBYOKConfig(req, {})).toBeUndefined();
    });

    it("extracts config from request headers", () => {
      const req = new Request("http://localhost:3000/api/simulate", {
        headers: {
          "x-byok-provider": "anthropic",
          "x-byok-api-key": "sk-ant-test-123456",
          "x-byok-model-id": "claude-3-5-sonnet",
        },
      });

      const config = extractBYOKConfig(req);
      expect(config).toEqual({
        provider: "anthropic",
        apiKey: "sk-ant-test-123456",
        modelId: "claude-3-5-sonnet",
        baseUrl: undefined,
      });
    });

    it("extracts config from body payload", () => {
      const body = {
        byok: {
          provider: "openai",
          apiKey: "sk-proj-testkey",
          modelId: "gpt-4o",
        },
      };

      const config = extractBYOKConfig(undefined, body);
      expect(config).toEqual({
        provider: "openai",
        apiKey: "sk-proj-testkey",
        modelId: "gpt-4o",
        baseUrl: undefined,
      });
    });

    it("prioritizes headers over body payload", () => {
      const req = new Request("http://localhost:3000/api/simulate", {
        headers: {
          "x-byok-provider": "nvidia",
          "x-byok-api-key": "nvapi-header-key",
        },
      });
      const body = {
        byok: {
          provider: "gemini",
          apiKey: "gemini-body-key",
        },
      };

      const config = extractBYOKConfig(req, body);
      expect(config?.provider).toBe("nvidia");
      expect(config?.apiKey).toBe("nvapi-header-key");
    });
  });

  describe("withBYOKContext AsyncLocalStorage", () => {
    it("runs code within context and exposes it via getBYOKContext", async () => {
      expect(getBYOKContext()).toBeUndefined();

      const result = await withBYOKContext(
        { provider: "gemini", apiKey: "test-gemini-key", modelId: "gemini-2.0-flash" },
        async () => {
          const ctx = getBYOKContext();
          expect(ctx?.provider).toBe("gemini");
          expect(ctx?.apiKey).toBe("test-gemini-key");
          expect(ctx?.modelId).toBe("gemini-2.0-flash");
          return "ok";
        }
      );

      expect(result).toBe("ok");
      expect(getBYOKContext()).toBeUndefined();
    });
  });
});
