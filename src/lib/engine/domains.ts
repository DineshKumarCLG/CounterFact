import type { Domain } from "./types";

export const MIN_DOMAIN_WEIGHT = 0.3;

export interface DomainMeta {
  code: string;
  label: string;
  description: string;
  emoji: string;
}

export const DOMAIN_METADATA: Record<Domain, DomainMeta> = {
  HISTORICAL: {
    code: "HIST",
    label: "Historical Analysis",
    description:
      "How the departure point changes the historical trajectory and precedent",
    emoji: "📜",
  },
  ECONOMIC: {
    code: "ECON",
    label: "Economic Impact",
    description: "GDP, trade, fiscal policy, markets, and economic structure",
    emoji: "📊",
  },
  POLITICAL: {
    code: "POL",
    label: "Political Dynamics",
    description:
      "Governance, political parties, elections, and power structures",
    emoji: "🏛️",
  },
  MILITARY: {
    code: "MIL",
    label: "Military & Security",
    description: "Defence forces, security apparatus, and military strategy",
    emoji: "🛡️",
  },
  DIPLOMATIC: {
    code: "DIPL",
    label: "Diplomatic Relations",
    description:
      "International relations, treaties, alliances, and foreign policy",
    emoji: "🤝",
  },
  SOCIAL: {
    code: "SOC",
    label: "Social Impact",
    description:
      "Social cohesion, inequality, migration, and community dynamics",
    emoji: "👥",
  },
  TECHNOLOGICAL: {
    code: "TECH",
    label: "Technology & Innovation",
    description:
      "Tech infrastructure, R&D, digital economy, and innovation ecosystem",
    emoji: "💻",
  },
  ENVIRONMENTAL: {
    code: "ENV",
    label: "Environmental",
    description:
      "Climate impact, natural resources, sustainability, and geography",
    emoji: "🌍",
  },
  CULTURAL: {
    code: "CULT",
    label: "Cultural Identity",
    description:
      "Language, religion, arts, media, national identity, and heritage",
    emoji: "🎭",
  },
  LEGAL: {
    code: "LEG",
    label: "Legal & Constitutional",
    description:
      "Constitution, legal framework, judiciary, and regulatory systems",
    emoji: "⚖️",
  },
  DEMOGRAPHIC: {
    code: "DEMO",
    label: "Demographics",
    description:
      "Population statistics, age distribution, urbanisation, and migration",
    emoji: "📈",
  },
  URBAN_PLANNING: {
    code: "URB",
    label: "Urban Planning",
    description:
      "Infrastructure, cities, transportation, housing, and spatial planning",
    emoji: "🏗️",
  },
};

/**
 * Get the list of active domains based on weight thresholds
 */
export function getActiveDomains(
  weights: Partial<Record<Domain, number>>
): Domain[] {
  return (Object.entries(weights) as [Domain, number][])
    .filter(([, weight]) => weight >= MIN_DOMAIN_WEIGHT)
    .sort(([, a], [, b]) => b - a)
    .map(([domain]) => domain);
}
