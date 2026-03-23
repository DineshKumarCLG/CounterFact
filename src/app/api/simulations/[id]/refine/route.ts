import { loadSimulationState, saveSimulationState } from "@/lib/storage/filesystem";
import { invokeLLM } from "@/lib/llm/bedrock-client";
import { sanitizeScenarioInput } from "@/lib/safety/sanitize";
import type { ConversationMessage } from "@/lib/engine/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const state = loadSimulationState(id);

  if (!state) {
    return Response.json({ error: "Simulation not found" }, { status: 404 });
  }

  if (!state.synthesis) {
    return Response.json({ error: "Simulation not yet complete" }, { status: 400 });
  }

  const body = await request.json();
  const rawQuestion = body.question as string | undefined;

  if (!rawQuestion?.trim()) {
    return Response.json({ error: "No question provided" }, { status: 400 });
  }

  const question = sanitizeScenarioInput(rawQuestion);

  const systemPrompt = [
    "You are a follow-up analyst for the Counterfact geopolitical simulation engine.",
    "The user ran a counterfactual scenario and now wants to drill deeper.",
    "Answer based on the simulation results provided. Be specific, cite domain findings where relevant.",
    "If the question goes beyond what the simulation covered, say so honestly.",
    "",
    `SCENARIO: ${state.scenario}`,
    `DEPARTURE POINT: ${state.departurePoint}`,
    "",
    "UNIFIED ANALYSIS:",
    state.synthesis.unifiedAnalysis,
  ].join("\n");

  // Build conversation context as a single user message
  const priorTurns = (state.conversation ?? [])
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n\n");

  const userMessage = priorTurns
    ? `${priorTurns}\n\nUSER: ${question}`
    : question;

  try {
    const { content, inputTokens, outputTokens } = await invokeLLM(userMessage, {
      systemPrompt,
    });

    const userMsg: ConversationMessage = {
      role: "user",
      content: question,
      timestamp: new Date().toISOString(),
    };
    const assistantMsg: ConversationMessage = {
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
    };

    state.conversation = [...(state.conversation ?? []), userMsg, assistantMsg];
    state.costTracking.totalInputTokens += inputTokens;
    state.costTracking.totalOutputTokens += outputTokens;
    state.updatedAt = new Date().toISOString();

    saveSimulationState(state);

    return Response.json({ answer: content, inputTokens, outputTokens });
  } catch (err) {
    return Response.json(
      { error: `Refinement failed: ${err instanceof Error ? err.message : "Unknown"}` },
      { status: 500 }
    );
  }
}
