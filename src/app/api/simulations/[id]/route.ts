import { NextResponse } from "next/server";
import { loadSimulationState } from "@/lib/storage/filesystem";
import { rmSync, existsSync } from "fs";
import { join } from "path";
import { CONFIG } from "@/lib/engine/config";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const state = loadSimulationState(id);
  
  if (!state) {
    return NextResponse.json({ error: "Simulation not found" }, { status: 404 });
  }

  return NextResponse.json(state);
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dir = join(CONFIG.storage.dataDir, "simulations", id);

  if (!existsSync(dir)) {
    return Response.json({ error: "Simulation not found" }, { status: 404 });
  }

  rmSync(dir, { recursive: true, force: true });
  return Response.json({ deleted: true });
}
