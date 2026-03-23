import { NextResponse } from "next/server";
import { after } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { runSimulation } from "@/lib/engine/pipeline";
import { saveSimulationState } from "@/lib/storage/filesystem";
import { saveSimulationMeta } from "@/lib/storage/db";
import { sanitizeScenarioInput } from "@/lib/safety/sanitize";
import type { SimulationState } from "@/lib/engine/types";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const { scenario } = await request.json();

    if (!scenario) {
      return NextResponse.json({ error: "No scenario provided" }, { status: 400 });
    }

    const sanitizedScenario = sanitizeScenarioInput(scenario);

    if (!sanitizedScenario) {
      return NextResponse.json({ error: "Scenario is empty after sanitisation" }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    const initialState: SimulationState = {
      id,
      scenario: sanitizedScenario,
      departurePoint: "",
      baselineData: [],
      domainWeights: {},
      activeAgents: [],
      agentOutputs: {},
      agentStatus: {},
      guardResults: {},
      synthesis: null,
      safetyResult: { status: "ALLOWED", reason: "Pending check", disclaimers: [] },
      cascades: null,
      stakeholderDebate: null,
      generatedImages: [],
      costTracking: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        inputCostUsd: 0,
        outputCostUsd: 0,
        searchCalls: 0,
        totalCostUsd: 0,
      },
      conversation: [],
      version: 1,
      promptVersion: "v1.0",
      createdAt: now,
      updatedAt: now,
    };

    saveSimulationState(initialState);

    // Use Next.js after() to run the simulation without blocking the response
    after(async () => {
      try {
        const finalState = await runSimulation(sanitizedScenario, {
          onSafetyCheck: (status, reason) =>
            mutateState(id, (s) => {
              s.safetyResult = { status, reason, disclaimers: [] };
            }),
          onPlannerComplete: (domains, weights) =>
            mutateState(id, (s) => {
              s.activeAgents = domains;
              s.domainWeights = weights;
              s.agentStatus = domains.reduce(
                (acc, d) => ({ ...acc, [d]: "PENDING" }),
                {}
              );
            }),
          onAgentStart: (domain) =>
            mutateState(id, (s) => {
              s.agentStatus[domain] = "ACTIVE";
            }),
          onAgentComplete: (domain, confidence) =>
            mutateState(id, (s) => {
              s.agentStatus[domain] = "COMPLETE";
            }),
          onAgentFailed: (domain) =>
            mutateState(id, (s) => {
              s.agentStatus[domain] = "FAILED";
            }),
        }, id);

        saveSimulationState(finalState);
        saveSimulationMeta({
          id: finalState.id,
          scenario: finalState.scenario,
          departurePoint: finalState.departurePoint,
          status: finalState.synthesis ? "COMPLETE" : "PARTIAL",
          agentCount: finalState.activeAgents.length,
          domains: finalState.activeAgents.join(","),
          costCents: Math.round(finalState.costTracking.totalCostUsd * 100),
          promptVersion: finalState.promptVersion,
          createdAt: finalState.createdAt,
          updatedAt: finalState.updatedAt,
        });
      } catch (err) {
        console.error("Simulation failed:", err);
        mutateState(id, (s) => {
          s.safetyResult = {
            status: "BLOCKED",
            reason: `Simulation error: ${err instanceof Error ? err.message : "Unknown error"}`,
            disclaimers: [],
          };
        });
      }
    });

    return NextResponse.json({ id });
  } catch {
    return NextResponse.json({ error: "Failed to start" }, { status: 500 });
  }
}

function mutateState(id: string, mutator: (state: Record<string, any>) => void) {
  const fs = require("fs");
  const path = require("path");
  const statePath = path.join("./data", "simulations", id, "state.json");

  try {
    if (fs.existsSync(statePath)) {
      const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
      mutator(state);
      state.updatedAt = new Date().toISOString();
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
    }
  } catch (e) {
    console.error("Failed to mutate state:", e);
  }
}
