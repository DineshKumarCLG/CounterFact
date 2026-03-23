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
  contradictions: z.array(z.string()).default([]),
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
export const ContradictionResolutionSchema = z.object({
  description: z.string(),
  mode: z.enum(["RESOLVED", "NUANCED", "UNRESOLVED_TENSION"]),
  resolution: z.string(),
});

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
}

// ─── Stakeholder Debate ──────────────────────────────────────────
export const StakeholderPositionSchema = z.object({
  name: z.string(),
  role: z.string(),
  perspective: z.string(),
  keyArguments: z.array(z.string()),
  tone: z.enum(["SUPPORTIVE", "OPPOSED", "CAUTIOUS", "NEUTRAL", "PRAGMATIC"]),
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
  domain: z.enum(DOMAINS),
  confidence: z.number().min(0).max(1),
  level: z.number().int().min(0),
  type: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
});
export type CascadeNode = z.infer<typeof CascadeNodeSchema>;

export const CascadeEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});
export type CascadeEdge = z.infer<typeof CascadeEdgeSchema>;

export const FeedbackLoopSchema = z.object({
  nodes: z.array(z.string()),
  description: z.string(),
  breakpoint: z.string(),
});
export type FeedbackLoop = z.infer<typeof FeedbackLoopSchema>;

export const CascadeTreeSchema = z.object({
  nodes: z.array(CascadeNodeSchema),
  edges: z.array(CascadeEdgeSchema),
  feedbackLoops: z.array(FeedbackLoopSchema).default([]),
});
export type CascadeTree = z.infer<typeof CascadeTreeSchema>;

export const ScenarioPathSchema = z.object({
  type: z.enum(["OPTIMISTIC", "BASE_CASE", "PESSIMISTIC"]),
  label: z.string(),
  summary: z.string(),
  keyMilestones: z.array(
    z.object({
      year: z.number(),
      event: z.string(),
      domain: z.enum(DOMAINS),
    })
  ),
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
