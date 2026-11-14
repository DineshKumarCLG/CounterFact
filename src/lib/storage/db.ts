import Database from "better-sqlite3";
import { mkdirSync, existsSync, readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { CONFIG } from "../engine/config";

let db: Database.Database | null = null;
let dbFailed = false;

function getDb(): Database.Database | null {
  if (dbFailed) return null;
  if (!db) {
    try {
      const dbDir = dirname(CONFIG.storage.dbPath);
      if (!existsSync(dbDir)) {
        mkdirSync(dbDir, { recursive: true });
      }

      db = new Database(CONFIG.storage.dbPath);
      db.pragma("journal_mode = WAL");
      initSchema(db);
    } catch (err) {
      console.warn("[Storage:DB] Failed to initialize SQLite database:", err);
      dbFailed = true;
      return null;
    }
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS simulations (
      id TEXT PRIMARY KEY,
      scenario TEXT NOT NULL,
      departure_point TEXT,
      status TEXT DEFAULT 'PENDING',
      agent_count INTEGER DEFAULT 0,
      domains TEXT,
      cost_cents INTEGER DEFAULT 0,
      prompt_version TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

export interface SimulationRecord {
  id: string;
  scenario: string;
  departurePoint: string;
  departure_point?: string;
  status: string;
  agentCount: number;
  agent_count?: number;
  domains: string;
  costCents: number;
  cost_cents?: number;
  promptVersion: string;
  prompt_version?: string;
  createdAt: string;
  created_at?: string;
  updatedAt: string;
  updated_at?: string;
}

export function saveSimulationMeta(record: SimulationRecord) {
  const database = getDb();
  if (!database) return;
  try {
    database.prepare(
      `INSERT OR REPLACE INTO simulations
        (id, scenario, departure_point, status, agent_count, domains, cost_cents, prompt_version, created_at, updated_at)
      VALUES
        (@id, @scenario, @departurePoint, @status, @agentCount, @domains, @costCents, @promptVersion, @createdAt, @updatedAt)`
    ).run(record);
  } catch (err) {
    console.warn("[Storage:DB] Failed to save simulation record to SQLite:", err);
  }
}

export function getSimulationMeta(id: string): SimulationRecord | undefined {
  const database = getDb();
  if (database) {
    try {
      const row = database
        .prepare(
          `SELECT
            id,
            scenario,
            departure_point,
            departure_point AS departurePoint,
            status,
            agent_count,
            agent_count AS agentCount,
            domains,
            cost_cents,
            cost_cents AS costCents,
            prompt_version,
            prompt_version AS promptVersion,
            created_at,
            created_at AS createdAt,
            updated_at,
            updated_at AS updatedAt
          FROM simulations WHERE id = ?`
        )
        .get(id) as SimulationRecord | undefined;
      if (row) return row;
    } catch {
      // Fall through to filesystem
    }
  }

  // Fallback to filesystem
  const simFile = join(CONFIG.storage.dataDir, "simulations", id, "state.json");
  if (existsSync(simFile)) {
    try {
      const state = JSON.parse(readFileSync(simFile, "utf-8"));
      return {
        id: state.id,
        scenario: state.scenario,
        departurePoint: state.departurePoint ?? "",
        departure_point: state.departurePoint ?? "",
        status: state.synthesis ? "COMPLETE" : "PARTIAL",
        agentCount: state.activeAgents?.length ?? 0,
        agent_count: state.activeAgents?.length ?? 0,
        domains: (state.activeAgents ?? []).join(","),
        costCents: Math.round((state.costTracking?.totalCostUsd ?? 0) * 100),
        cost_cents: Math.round((state.costTracking?.totalCostUsd ?? 0) * 100),
        promptVersion: state.promptVersion ?? "v1.0",
        prompt_version: state.promptVersion ?? "v1.0",
        createdAt: state.createdAt ?? new Date().toISOString(),
        created_at: state.createdAt ?? new Date().toISOString(),
        updatedAt: state.updatedAt ?? new Date().toISOString(),
        updated_at: state.updatedAt ?? new Date().toISOString(),
      };
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function listSimulations(
  limit = 20,
  offset = 0
): SimulationRecord[] {
  const database = getDb();
  if (database) {
    try {
      const rows = database
        .prepare(
          `SELECT
            id,
            scenario,
            departure_point,
            departure_point AS departurePoint,
            status,
            agent_count,
            agent_count AS agentCount,
            domains,
            cost_cents,
            cost_cents AS costCents,
            prompt_version,
            prompt_version AS promptVersion,
            created_at,
            created_at AS createdAt,
            updated_at,
            updated_at AS updatedAt
          FROM simulations ORDER BY created_at DESC LIMIT ? OFFSET ?`
        )
        .all(limit, offset) as SimulationRecord[];
      return rows;
    } catch (err) {
      console.warn("[Storage:DB] SQLite query failed, falling back to filesystem:", err);
    }
  }

  return listSimulationsFromFilesystem(limit, offset);
}

function listSimulationsFromFilesystem(
  limit: number,
  offset: number
): SimulationRecord[] {
  const simsDir = join(CONFIG.storage.dataDir, "simulations");
  if (!existsSync(simsDir)) return [];

  try {
    const entries = readdirSync(simsDir, { withFileTypes: true });
    const records: SimulationRecord[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const stateFile = join(simsDir, entry.name, "state.json");
        if (existsSync(stateFile)) {
          try {
            const state = JSON.parse(readFileSync(stateFile, "utf-8"));
            records.push({
              id: state.id ?? entry.name,
              scenario: state.scenario ?? "",
              departurePoint: state.departurePoint ?? "",
              departure_point: state.departurePoint ?? "",
              status: state.synthesis ? "COMPLETE" : "PARTIAL",
              agentCount: state.activeAgents?.length ?? 0,
              agent_count: state.activeAgents?.length ?? 0,
              domains: (state.activeAgents ?? []).join(","),
              costCents: Math.round((state.costTracking?.totalCostUsd ?? 0) * 100),
              cost_cents: Math.round((state.costTracking?.totalCostUsd ?? 0) * 100),
              promptVersion: state.promptVersion ?? "v1.0",
              prompt_version: state.promptVersion ?? "v1.0",
              createdAt: state.createdAt ?? new Date().toISOString(),
              created_at: state.createdAt ?? new Date().toISOString(),
              updatedAt: state.updatedAt ?? new Date().toISOString(),
              updated_at: state.updatedAt ?? new Date().toISOString(),
            });
          } catch {
            // Ignore broken file
          }
        }
      }
    }

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return records.slice(offset, offset + limit);
  } catch {
    return [];
  }
}
