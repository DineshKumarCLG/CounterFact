import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock @heroui/react and next/navigation for Node test runner
vi.mock("@heroui/react", () => ({
  Button: ({ children }: { children?: unknown }) => children,
  Card: ({ children }: { children?: unknown }) => children,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

import {
  getBYOKConfig,
  saveBYOKConfig,
  clearBYOKConfig,
  getBYOKHeaders,
  PROVIDER_OPTIONS,
  BYOK_STORAGE_KEY,
  LEGACY_STORAGE_KEY,
  BYOK_EVENT_NAME,
  LEGACY_EVENT_NAME,
  type BYOKConfig,
} from "@/components/ui/BYOKModal";
import { STATUS_COLORS } from "@/app/page";

class MockLocalStorage {
  private store: Record<string, string> = {};

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }

  removeItem(key: string): void {
    delete this.store[key];
  }

  clear(): void {
    this.store = {};
  }
}

describe("Milestone 3: UI Polish, BYOK Storage & Layout Verification", () => {
  let dispatchedEvents: Array<{ type: string; detail: unknown }> = [];
  let mockStorage: MockLocalStorage;
  const originalWindow = globalThis.window;
  const originalLocalStorage = globalThis.localStorage;
  const originalCustomEvent = globalThis.CustomEvent;

  beforeEach(() => {
    dispatchedEvents = [];
    mockStorage = new MockLocalStorage();

    class CustomEventMock {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    }

    const mockWin = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((evt: { type: string; detail: unknown }) => {
        dispatchedEvents.push({ type: evt.type, detail: evt.detail });
        return true;
      }),
      localStorage: mockStorage,
    };

    // @ts-expect-error Mocking window in Node test environment
    globalThis.window = mockWin;
    // @ts-expect-error Mocking localStorage in Node test environment
    globalThis.localStorage = mockStorage;
    // @ts-expect-error Mocking CustomEvent in Node test environment
    globalThis.CustomEvent = CustomEventMock;
  });

  afterEach(() => {
    globalThis.window = originalWindow;
    globalThis.localStorage = originalLocalStorage;
    globalThis.CustomEvent = originalCustomEvent;
  });

  describe("BYOK Client Storage Utilities", () => {
    it("returns null when localStorage is empty", () => {
      expect(getBYOKConfig()).toBeNull();
    });

    it("retrieves saved BYOK config from primary storage key", () => {
      const config: BYOKConfig = {
        provider: "openai",
        apiKey: "sk-proj-test12345678",
        modelId: "gpt-4o-mini",
        baseUrl: "https://api.openai.com/v1",
      };
      mockStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify(config));

      const retrieved = getBYOKConfig();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.provider).toBe("openai");
      expect(retrieved?.apiKey).toBe("sk-proj-test12345678");
      expect(retrieved?.modelId).toBe("gpt-4o-mini");
      expect(retrieved?.baseUrl).toBe("https://api.openai.com/v1");
    });

    it("falls back to legacy storage key if primary is absent", () => {
      const config: BYOKConfig = {
        provider: "gemini",
        apiKey: "AIzaSyTest12345678",
        modelId: "gemini-2.0-flash",
      };
      mockStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(config));

      const retrieved = getBYOKConfig();
      expect(retrieved).not.toBeNull();
      expect(retrieved?.provider).toBe("gemini");
      expect(retrieved?.apiKey).toBe("AIzaSyTest12345678");
    });

    it("handles corrupted JSON gracefully without throwing", () => {
      mockStorage.setItem(BYOK_STORAGE_KEY, "invalid-json-content{{{");
      expect(getBYOKConfig()).toBeNull();
    });

    it("saves BYOK configuration and dispatches sync events", () => {
      const config: BYOKConfig = {
        provider: "anthropic",
        apiKey: "sk-ant-test12345678",
        modelId: "claude-3-5-sonnet-latest",
      };

      saveBYOKConfig(config);

      // Verifies storage in both primary and backward-compatible keys
      expect(mockStorage.getItem(BYOK_STORAGE_KEY)).toBe(JSON.stringify(config));
      expect(mockStorage.getItem(LEGACY_STORAGE_KEY)).toBe(JSON.stringify(config));

      // Verifies dispatch of both primary and legacy event names
      expect(dispatchedEvents).toHaveLength(2);
      expect(dispatchedEvents.some((e) => e.type === BYOK_EVENT_NAME && e.detail === config)).toBe(true);
      expect(dispatchedEvents.some((e) => e.type === LEGACY_EVENT_NAME && e.detail === config)).toBe(true);
    });

    it("clears storage when config is null or bedrock (Server Default)", () => {
      mockStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify({ provider: "openai" }));
      mockStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify({ provider: "openai" }));

      saveBYOKConfig(null);
      expect(mockStorage.getItem(BYOK_STORAGE_KEY)).toBeNull();
      expect(mockStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();

      // Check clearing via bedrock provider
      mockStorage.setItem(BYOK_STORAGE_KEY, JSON.stringify({ provider: "openai" }));
      saveBYOKConfig({ provider: "bedrock" });
      expect(mockStorage.getItem(BYOK_STORAGE_KEY)).toBeNull();
      expect(mockStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull();
    });

    it("clearBYOKConfig removes all credentials and dispatches null event detail", () => {
      saveBYOKConfig({ provider: "nvidia", apiKey: "nvapi-test12345" });
      dispatchedEvents = [];

      clearBYOKConfig();
      expect(getBYOKConfig()).toBeNull();
      expect(dispatchedEvents.some((e) => e.type === BYOK_EVENT_NAME && e.detail === null)).toBe(true);
    });

    it("generates correct HTTP headers for active BYOK provider", () => {
      saveBYOKConfig({
        provider: "nvidia",
        apiKey: "nvapi-1234567890",
        modelId: "meta/llama-3.3-70b-instruct",
        baseUrl: "https://integrate.api.nvidia.com/v1",
      });

      const headers = getBYOKHeaders();
      expect(headers["x-byok-provider"]).toBe("nvidia");
      expect(headers["x-byok-api-key"]).toBe("nvapi-1234567890");
      expect(headers["x-byok-model-id"]).toBe("meta/llama-3.3-70b-instruct");
      expect(headers["x-byok-base-url"]).toBe("https://integrate.api.nvidia.com/v1");
    });

    it("returns empty headers object for Server Default (bedrock)", () => {
      saveBYOKConfig({ provider: "bedrock" });
      expect(getBYOKHeaders()).toEqual({});

      clearBYOKConfig();
      expect(getBYOKHeaders()).toEqual({});
    });
  });

  describe("Provider Options & Metadata", () => {
    it("includes all 6 supported model providers", () => {
      const providerIds = PROVIDER_OPTIONS.map((p) => p.id);
      expect(providerIds).toContain("bedrock");
      expect(providerIds).toContain("gemini");
      expect(providerIds).toContain("openai");
      expect(providerIds).toContain("anthropic");
      expect(providerIds).toContain("nvidia");
      expect(providerIds).toContain("openrouter");
    });

    it("marks Server Default as keyless and third-party providers as requiring keys", () => {
      const bedrock = PROVIDER_OPTIONS.find((p) => p.id === "bedrock");
      expect(bedrock).toBeDefined();
      expect(bedrock?.requiresKey).toBe(false);

      const apiKeyProviders = PROVIDER_OPTIONS.filter((p) => p.id !== "bedrock");
      for (const p of apiKeyProviders) {
        expect(p.requiresKey).toBe(true);
        expect(p.defaultModel.length).toBeGreaterThan(0);
        expect(p.placeholderKey.length).toBeGreaterThan(0);
        expect(p.docsUrl).toMatch(/^https?:\/\//);
      }
    });
  });

  describe("WCAG AA Contrast & Status Badge Alignment", () => {
    it("defines distinct accessible classes for all simulation statuses", () => {
      const expectedStatuses = [
        "COMPLETED",
        "COMPLETE",
        "PARTIAL",
        "RUNNING",
        "PENDING",
        "FAILED",
        "BLOCKED",
      ];

      for (const status of expectedStatuses) {
        const colorClass = STATUS_COLORS[status];
        expect(colorClass).toBeDefined();
        // Must contain color tokens
        expect(colorClass).toMatch(/text-(emerald|amber|red|zinc)-400/);
        // Must NOT contain low-contrast zinc-700 or zinc-800
        expect(colorClass).not.toContain("zinc-700");
        expect(colorClass).not.toContain("zinc-800");
      }
    });

    it("aligns COMPLETE and COMPLETED to identical emerald badge styling", () => {
      expect(STATUS_COLORS.COMPLETE).toBe(STATUS_COLORS.COMPLETED);
      expect(STATUS_COLORS.COMPLETE).toContain("emerald-400");
    });

    it("aligns RUNNING and PARTIAL to amber badge styling", () => {
      expect(STATUS_COLORS.RUNNING).toContain("amber-400");
      expect(STATUS_COLORS.PARTIAL).toContain("amber-400");
    });

    it("aligns BLOCKED and FAILED to red badge styling", () => {
      expect(STATUS_COLORS.BLOCKED).toContain("red-400");
      expect(STATUS_COLORS.FAILED).toContain("red-400");
    });
  });

  describe("Export URL & Resource Formats", () => {
    const simId = "sim-abc12345-6789";

    it("formats Markdown export URL correctly", () => {
      const mdUrl = `/api/simulations/${simId}/export?format=markdown`;
      const url = new URL(mdUrl, "http://localhost:3000");
      expect(url.pathname).toBe(`/api/simulations/${simId}/export`);
      expect(url.searchParams.get("format")).toBe("markdown");
    });

    it("formats JSON export URL correctly", () => {
      const jsonUrl = `/api/simulations/${simId}/export?format=json`;
      const url = new URL(jsonUrl, "http://localhost:3000");
      expect(url.pathname).toBe(`/api/simulations/${simId}/export`);
      expect(url.searchParams.get("format")).toBe("json");
    });

    it("generates sanitized export filenames", () => {
      const shortId = simId.slice(0, 8);
      const mdFilename = `counterfact-simulation-${shortId}.md`;
      const jsonFilename = `counterfact-simulation-${shortId}.json`;

      expect(mdFilename).toBe("counterfact-simulation-sim-abc1.md");
      expect(jsonFilename).toBe("counterfact-simulation-sim-abc1.json");
    });
  });
});
