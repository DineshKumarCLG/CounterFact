import { z } from "zod";

// ─── Domain Definitions ─────────────────────────────────────────
export const DOMAINS = [
  "HISTORICAL",
  "ECONOMIC",
  "POLITICAL",
  "MILITARY",
  "DIPLOMATIC",
  "SOCIAL",
  "TECHNOLOGICAL",
  "ENVIRONMENTAL",
  "CULTURAL",
  "LEGAL",
  "DEMOGRAPHIC",
  "URBAN_PLANNING",
] as const;

export type Domain = (typeof DOMAINS)[number];

// ─── Agent Status ────────────────────────────────────────────────
export const AgentStatusEnum = z.enum([
  "PENDING",
  "DISPATCHED",
  "ACTIVE",
  "COMPLETE",
  "FAILED",
  "SKIPPED",
]);
export type AgentStatus = z.infer<typeof AgentStatusEnum>;

// ─── Confidence Level ────────────────────────────────────────────
export const ConfidenceLevel = z.string().transform((s) => {
  const upper = s.toUpperCase();
  if (upper === "HIGH" || upper === "MODERATE" || upper === "SPECULATIVE") return upper;
  if (upper === "LOW" || upper === "MEDIUM") return "SPECULATIVE";
  return "MODERATE";
}) as z.ZodType<"HIGH" | "MODERATE" | "SPECULATIVE">;
export type ConfidenceLevel = "HIGH" | "MODERATE" | "SPECULATIVE";

// ─── Source Quality Tiers ────────────────────────────────────────
// 1 = academic/govt, 2 = established media, 3 = blog/social
// LLMs return this in various formats — accept any string→number map
export const SourceTier = z.coerce.number();

// ─── Data Point ──────────────────────────────────────────────────
export const DataPointSchema = z.object({
  fact: z.string(),
  source: z.string(),
  sourceTier: z.coerce.number().optional(),
  year: z.number().optional(),
}).passthrough();
export type DataPoint = z.infer<typeof DataPointSchema>;


// ─── Visual Prompt ───────────────────────────────────────────────
export const VisualPromptSchema = z.union([
  z.object({
    type: z.enum(["map", "chart", "image", "diagram"]),
    description: z.string(),
    altText: z.string(),
    data: z.record(z.string(), z.unknown()).optional(),
  }),
  // LLMs sometimes return plain strings — coerce to object
  z.string().transform((s) => ({
    type: "image" as const,
    description: s,
    altText: s,
  })),
]);
export type VisualPrompt = z.infer<typeof VisualPromptSchema>;

// ─── Self Critique ───────────────────────────────────────────────
export const SelfCritiqueSchema = z.object({
  sourcesVerified: z.coerce.boolean().default(false),
  projectionsLabelled: z.coerce.boolean().default(false),
  confidenceHonest: z.coerce.boolean().default(false),
  notes: z.string().optional(),
}).passthrough();
export type SelfCritiqueResult = z.infer<typeof SelfCritiqueSchema>;

// ─── Agent Output ────────────────────────────────────────────────
export const AgentOutputSchema = z.object({
  domain: z.enum(DOMAINS),
  findings: z.string(),
  keyDatapoints: z.array(DataPointSchema).default([]),
  confidence: ConfidenceLevel,
  sourceTiers: z.record(z.string(), z.unknown()).default({}),
  contradictions: z.array(
    z.union([
      z.string(),
      z.object({ description: z.string() }).transform((o) => o.description),
    ])
  ).default([]),
  cascadeSeeds: z.array(z.string()).default([]),
  visualPrompts: z.array(VisualPromptSchema).default([]),
  selfCritique: SelfCritiqueSchema.optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
}).passthrough();
export type AgentOutput = z.infer<typeof AgentOutputSchema>;

// ─── Planner Output ──────────────────────────────────────────────
export const PlannerOutputSchema = z.object({
  scenarioSummary: z.string(),
  departurePoint: z.string(),
  domainWeights: z.record(z.string(), z.number()),
  activeAgents: z.array(z.enum(DOMAINS)),
  baselineDataRequired: z.array(z.string()),
  clarificationQuestions: z.array(z.string()).default([]),
});
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;

// ─── Guard Result ────────────────────────────────────────────────
export const GuardResultSchema = z.object({
  domain: z.enum(DOMAINS),
  passed: z.boolean(),
  issues: z.array(z.string()).default([]),
  sanitised: z.boolean().default(false),
});
export type GuardResult = z.infer<typeof GuardResultSchema>;

// ─── Synthesis Output ────────────────────────────────────────────
const ContradictionModeEnum = z.preprocess((val) => {
  if (typeof val === "string") {
    const upper = val.toUpperCase().trim();
    if (upper === "RESOLVED" || upper === "NUANCED" || upper === "UNRESOLVED_TENSION") {
      return upper;
    }
    if (upper.includes("NUANCE")) return "NUANCED";
    if (upper.includes("TENSION") || upper.includes("UNRESOLV")) return "UNRESOLVED_TENSION";
  }
  return "RESOLVED";
}, z.enum(["RESOLVED", "NUANCED", "UNRESOLVED_TENSION"]));

export const ContradictionResolutionSchema = z.preprocess((val) => {
  if (typeof val === "string") {
    return {
      description: val,
      mode: "RESOLVED",
      resolution: val,
    };
  }
  if (val && typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const description =
      typeof obj.description === "string" && obj.description
        ? obj.description
        : typeof obj.issue === "string"
        ? obj.issue
        : typeof obj.pattern === "string"
        ? obj.pattern
        : typeof obj.title === "string"
        ? obj.title
        : JSON.stringify(val);

    const resolution =
      typeof obj.resolution === "string" && obj.resolution
        ? obj.resolution
        : typeof obj.explanation === "string"
        ? obj.explanation
        : typeof obj.notes === "string"
        ? obj.notes
        : typeof obj.description === "string"
        ? obj.description
        : description;

    return {
      description,
      mode: obj.mode || "RESOLVED",
      resolution,
    };
  }
  return {
    description: "Contradiction identified during cross-domain analysis",
    mode: "RESOLVED",
    resolution: "Resolved via cross-domain synthesis",
  };
}, z.object({
  description: z.string(),
  mode: ContradictionModeEnum,
  resolution: z.string(),
}));

export const SynthesisOutputSchema = z.object({
  unifiedAnalysis: z.string(),
  contradictions: z.array(ContradictionResolutionSchema).default([]),
  overallConfidence: ConfidenceLevel,
  domainSummaries: z.record(z.string(), z.string()).optional(),
  tokenUsage: z
    .object({
      input: z.number(),
      output: z.number(),
    })
    .optional(),
});
export type SynthesisOutput = z.infer<typeof SynthesisOutputSchema>;

// ─── Safety Validation ──────────────────────────────────────────
export const SafetyStatus = z.enum(["ALLOWED", "RESTRICTED", "BLOCKED"]);
export type SafetyStatus = z.infer<typeof SafetyStatus>;

export const SafetyResultSchema = z.object({
  status: SafetyStatus,
  reason: z.string(),
  disclaimers: z.array(z.string()).default([]),
});
export type SafetyResult = z.infer<typeof SafetyResultSchema>;

// ─── Cost Record ─────────────────────────────────────────────────
export interface CostRecord {
  totalInputTokens: number;
  totalOutputTokens: number;
  inputCostUsd: number;
  outputCostUsd: number;
  searchCalls: number;
  totalCostUsd: number;
}

// ─── Conversation Message ─────────────────────────────────────────
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  agentsReRun?: Domain[];
}

// ─── Generated Image ─────────────────────────────────────────────
export interface GeneratedImage {
  description: string;
  altText: string;
  url: string;
  type: string;
}

// ─── Simulation State ────────────────────────────────────────────
export interface SimulationState {
  id: string;
  userId?: string;
  scenario: string;
  departurePoint: string;
  baselineData: SearchResult[];
  domainWeights: Partial<Record<Domain, number>>;
  activeAgents: Domain[];
  agentOutputs: Partial<Record<Domain, AgentOutput>>;
  agentStatus: Partial<Record<Domain, AgentStatus>>;
  guardResults: Partial<Record<Domain, GuardResult>>;
  synthesis: SynthesisOutput | null;
  safetyResult: SafetyResult;
  cascades: CascadeOutput | null;
  stakeholderDebate: StakeholderDebate | null;
  generatedImages: GeneratedImage[];
  costTracking: CostRecord;
  conversation: ConversationMessage[];
  version: number;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
  status?: string;
}

// ─── Stakeholder Debate ──────────────────────────────────────────
export const StakeholderPositionSchema = z.object({
  name: z.string().default("Stakeholder"),
  role: z.string().default("Representative"),
  perspective: z.string().default("Perspective on scenario dynamics"),
  keyArguments: z.array(z.string()).default([]),
  tone: z.preprocess((val) => {
    if (typeof val === "string") {
      const u = val.toUpperCase().trim();
      if (["SUPPORTIVE", "OPPOSED", "CAUTIOUS", "NEUTRAL", "PRAGMATIC"].includes(u)) {
        return u;
      }
      if (u === "HAWKISH") return "OPPOSED";
      if (u === "DOVISH" || u === "FAVORABLE") return "SUPPORTIVE";
    }
    return "PRAGMATIC";
  }, z.enum(["SUPPORTIVE", "OPPOSED", "CAUTIOUS", "NEUTRAL", "PRAGMATIC"])),
});
export type StakeholderPosition = z.infer<typeof StakeholderPositionSchema>;

export const StakeholderDebateSchema = z.object({
  stakeholders: z.array(StakeholderPositionSchema),
  summary: z.string(),
});
export type StakeholderDebate = z.infer<typeof StakeholderDebateSchema>;

// ─── Cascade Engine ──────────────────────────────────────────────
export const CascadeNodeSchema = z.object({
  id: z.string(),
  description: z.string(),
  domain: z.preprocess((val) => {
    if (typeof val === "string") {
      const u = val.toUpperCase().trim();
      if (DOMAINS.includes(u as Domain)) return u;
    }
    return "TECHNOLOGICAL";
  }, z.enum(DOMAINS)),
  confidence: z.coerce.number().min(0).max(1).default(0.8),
  level: z.coerce.number().int().min(0).default(0),
  type: z.preprocess((val) => {
    if (typeof val === "string") {
      const u = val.toUpperCase().trim();
      if (u === "POSITIVE" || u === "NEGATIVE" || u === "NEUTRAL") return u;
    }
    return "NEUTRAL";
  }, z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"])),
});
export type CascadeNode = z.infer<typeof CascadeNodeSchema>;

export const CascadeEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  confidence: z.coerce.number().min(0).max(1).default(0.8),
  reasoning: z.string().default("Causal interaction"),
});
export type CascadeEdge = z.infer<typeof CascadeEdgeSchema>;

export const FeedbackLoopSchema = z.object({
  nodes: z.array(z.string()),
  description: z.string(),
  breakpoint: z.string().default("Dynamic stabilization"),
});
export type FeedbackLoop = z.infer<typeof FeedbackLoopSchema>;

export const CascadeTreeSchema = z.object({
  nodes: z.array(CascadeNodeSchema),
  edges: z.array(CascadeEdgeSchema),
  feedbackLoops: z.array(FeedbackLoopSchema).default([]),
});
export type CascadeTree = z.infer<typeof CascadeTreeSchema>;

export const ScenarioPathSchema = z.object({
  type: z.preprocess((val) => {
    if (typeof val === "string") {
      const u = val.toUpperCase().trim();
      if (u === "OPTIMISTIC" || u === "BASE_CASE" || u === "PESSIMISTIC") return u;
      if (u === "PRIMARY") return "BASE_CASE";
    }
    return "BASE_CASE";
  }, z.enum(["OPTIMISTIC", "BASE_CASE", "PESSIMISTIC"])),
  label: z.string().default("Projected Path"),
  summary: z.string().default("Projected development timeline"),
  keyMilestones: z.array(
    z.object({
      year: z.coerce.number().default(50),
      event: z.string(),
      domain: z.preprocess((val) => {
        if (typeof val === "string") {
          const u = val.toUpperCase().trim();
          if (DOMAINS.includes(u as Domain)) return u;
        }
        return "TECHNOLOGICAL";
      }, z.enum(DOMAINS)),
    })
  ).default([]),
});
export type ScenarioPath = z.infer<typeof ScenarioPathSchema>;

export const CascadeOutputSchema = z.object({
  cascadeTree: CascadeTreeSchema,
  scenarioPaths: z.array(ScenarioPathSchema),
});
export type CascadeOutput = z.infer<typeof CascadeOutputSchema>;

// ─── Search Result ───────────────────────────────────────────────
export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}
