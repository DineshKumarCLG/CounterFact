import { mkdirSync, writeFileSync, readFileSync, existsSync } from "fs";
import { join } from "path";
import { CONFIG } from "../engine/config";
import type { SimulationState } from "../engine/types";

function getSimDir(simId: string): string {
  return join(CONFIG.storage.dataDir, "simulations", simId);
}

// In-memory cache for warm container fallback
const memoryCache = new Map<string, SimulationState>();

/**
 * Save full simulation state to filesystem and in-memory cache
 */
export function saveSimulationState(state: SimulationState): void {
  // Update in-memory cache for warm container access
  if (state?.id) {
    memoryCache.set(state.id, state);
  }

  const dir = getSimDir(state.id);
  mkdirSync(dir, { recursive: true });

  writeFileSync(
    join(dir, "state.json"),
    JSON.stringify(state, null, 2),
    "utf-8"
  );
}

/**
 * Load full simulation state from filesystem (with warm in-memory fallback)
 */
export function loadSimulationState(
  simId: string
): SimulationState | null {
  const filePath = join(getSimDir(simId), "state.json");

  if (existsSync(filePath)) {
    try {
      const raw = readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw) as SimulationState;
      if (parsed?.id) {
        memoryCache.set(simId, parsed);
      }
      return parsed;
    } catch (err) {
      console.error(`Failed to parse state for ${simId}:`, err);
    }
  }

  // Fallback to in-memory cache if file missing or parse failed (e.g. serverless container switch)
  const cached = memoryCache.get(simId);
  return cached ? { ...cached } : null;
}

/**
 * Clear or invalidate in-memory simulation cache
 */
export function clearSimulationCache(simId?: string): void {
  if (simId) {
    memoryCache.delete(simId);
  } else {
    memoryCache.clear();
  }
}

