import { describe, it, expect } from "vitest";
import { sanitizeScenarioInput } from "@/lib/safety/sanitize";

describe("sanitizeScenarioInput", () => {
  it("strips fenced code blocks", () => {
    const input = "Hello ```const x = 1;``` world";
    expect(sanitizeScenarioInput(input)).toBe("Hello world");
  });

  it("strips inline code", () => {
    const input = "Run `npm install` first";
    expect(sanitizeScenarioInput(input)).toBe("Run first");
  });

  it("strips HTML tags", () => {
    const input = "<script>alert('xss')</script>What if Germany won?";
    expect(sanitizeScenarioInput(input)).toBe("alert('xss')What if Germany won?");
  });

  it("strips markdown headings", () => {
    const input = "## My Scenario\nWhat if the EU dissolved?";
    expect(sanitizeScenarioInput(input)).toBe("My Scenario\nWhat if the EU dissolved?");
  });

  it("strips bold/italic markers but keeps text", () => {
    const input = "What if **Napoleon** won at *Waterloo*?";
    expect(sanitizeScenarioInput(input)).toBe("What if Napoleon won at Waterloo?");
  });

  it("strips markdown links, keeps text", () => {
    const input = "See [this article](https://example.com) for details";
    expect(sanitizeScenarioInput(input)).toBe("See this article for details");
  });

  it("collapses excessive whitespace", () => {
    const input = "Hello\n\n\n\n\nworld   here";
    expect(sanitizeScenarioInput(input)).toBe("Hello\n\nworld here");
  });

  it("caps at 2000 characters", () => {
    const input = "a".repeat(3000);
    const result = sanitizeScenarioInput(input);
    expect(result.length).toBeLessThanOrEqual(2001); // 2000 + ellipsis
    expect(result.endsWith("…")).toBe(true);
  });

  it("trims whitespace", () => {
    const input = "   What if?   ";
    expect(sanitizeScenarioInput(input)).toBe("What if?");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeScenarioInput("")).toBe("");
  });
});
