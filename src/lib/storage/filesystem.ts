import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { CONFIG } from "../engine/config";
import type { SimulationState } from "../engine/types";

function getSimDir(simId: string): string {
  return join(CONFIG.storage.dataDir, "simulations", simId);
}

/**
 * Save full simulation state to filesystem
 */
export function saveSimulationState(state: SimulationState): void {
  const dir = getSimDir(state.id);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, "state.json"),
    JSON.stringify(state, null, 2),
    "utf-8"
  );
}

/**
 * Load full simulation state from filesystem
 */
export function loadSimulationState(
  simId: string
): SimulationState | null {
  const filePath = join(getSimDir(simId), "state.json");

  if (!existsSync(filePath)) {
    return null;
  }

  const raw = readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as SimulationState;
}
