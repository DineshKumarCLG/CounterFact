import { NextResponse } from "next/server";
import { loadSimulationState } from "@/lib/storage/filesystem";
import { deleteSimulation, getSimulationMeta } from "@/lib/storage/db";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import { CONFIG } from "@/lib/engine/config";

const SIMULATION_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id || !SIMULATION_ID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid simulation ID" }, { status: 400 });
  }
  
  const state = loadSimulationState(id);
  
  if (!state) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  return NextResponse.json(state);
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
  deleteSimulation(id);
  return Response.json({ deleted: true });
}
