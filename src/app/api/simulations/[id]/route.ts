import { NextResponse } from "next/server";
import { loadSimulationState, saveSimulationState, clearSimulationCache } from "@/lib/storage/filesystem";
import { deleteSimulation, getSimulationMeta } from "@/lib/storage/db";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import { CONFIG } from "@/lib/engine/config";
import type { SimulationState } from "@/lib/engine/types";

const SIMULATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !SIMULATION_ID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid simulation ID" }, { status: 400 });
  }
  
  let state = loadSimulationState(id);
  
  // If not found on filesystem or in-memory cache, check SQLite metadata fallback
  if (!state) {
    const meta = getSimulationMeta(id);
    if (meta) {
      state = {
        id: meta.id,
        scenario: meta.scenario,
        departurePoint: meta.departurePoint ?? "",
        baselineData: [],
        domainWeights: {},
        activeAgents: meta.domains ? meta.domains.split(",").filter(Boolean) : [],
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
          totalCostUsd: (meta.costCents ?? 0) / 100,
        },
        conversation: [],
        version: 1,
        promptVersion: meta.promptVersion ?? "v1.0",
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
        status: meta.status || "PENDING",
      } as SimulationState;
      // Warm up cache and filesystem with reconstructed state
      try {
        saveSimulationState(state);
      } catch {}
    }
  }

  if (!state) {
    return NextResponse.json(
      { error: "Simulation not found", id, pending: true },
      {
        status: 404,
        headers: {
          "Retry-After": "2",
          "Cache-Control": "no-store, no-cache",
        },
      }
    );
  }

  return NextResponse.json(state);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !SIMULATION_ID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid simulation ID" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const clientState = (body?.state || body) as SimulationState;
    if (!clientState || clientState.id !== id) {
      return NextResponse.json({ error: "Invalid simulation state" }, { status: 400 });
    }
    saveSimulationState(clientState);
    return NextResponse.json({ synced: true, id: clientState.id });
  } catch {
    return NextResponse.json({ error: "Failed to sync state" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !SIMULATION_ID_REGEX.test(id)) {
    return Response.json({ error: "Invalid simulation ID" }, { status: 400 });
  }

  const dir = join(CONFIG.storage.dataDir, "simulations", id);
  const dirExists = existsSync(dir);
  const meta = getSimulationMeta(id);

  if (!dirExists && !meta) {
    return Response.json({ error: "Simulation not found" }, { status: 404 });
  }

  if (dirExists) {
    rmSync(dir, { recursive: true, force: true });
  }
  clearSimulationCache(id);
  deleteSimulation(id);
  return Response.json({ deleted: true });
}
