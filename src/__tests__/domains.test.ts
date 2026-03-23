import { describe, it, expect } from "vitest";
import { getActiveDomains, DOMAIN_METADATA } from "@/lib/engine/domains";
import { DOMAINS } from "@/lib/engine/types";

describe("getActiveDomains", () => {
  it("returns domains above the weight threshold", () => {
    const weights = { ECONOMIC: 0.9, POLITICAL: 0.5, MILITARY: 0.2 };
    const active = getActiveDomains(weights);
    expect(active).toContain("ECONOMIC");
    expect(active).toContain("POLITICAL");
    expect(active).not.toContain("MILITARY");
  });

  it("returns empty array for no weights", () => {
    expect(getActiveDomains({})).toEqual([]);
  });

  it("sorts by weight descending", () => {
    const weights = { POLITICAL: 0.5, ECONOMIC: 0.9, SOCIAL: 0.7 };
    const active = getActiveDomains(weights);
    expect(active[0]).toBe("ECONOMIC");
    expect(active[1]).toBe("SOCIAL");
    expect(active[2]).toBe("POLITICAL");
  });
});

describe("DOMAIN_METADATA", () => {
  it("has metadata for every domain", () => {
    for (const domain of DOMAINS) {
      expect(DOMAIN_METADATA[domain]).toBeDefined();
      expect(DOMAIN_METADATA[domain].label).toBeTruthy();
      expect(DOMAIN_METADATA[domain].emoji).toBeTruthy();
    }
  });
});
