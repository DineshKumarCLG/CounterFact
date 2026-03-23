import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "fs";
import { dirname } from "path";
import { CONFIG } from "../engine/config";

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    const dbDir = dirname(CONFIG.storage.dbPath);
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true });
    }

    db = new Database(CONFIG.storage.dbPath);
    db.pragma("journal_mode = WAL");
    initSchema(db);
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
  status: string;
  agentCount: number;
  domains: string;
  costCents: number;
  promptVersion: string;
  createdAt: string;
  updatedAt: string;
}

export function saveSimulationMeta(record: SimulationRecord) {
  const db = getDb();
  db.prepare(
    `INSERT OR REPLACE INTO simulations
      (id, scenario, departure_point, status, agent_count, domains, cost_cents, prompt_version, created_at, updated_at)
    VALUES
      (@id, @scenario, @departurePoint, @status, @agentCount, @domains, @costCents, @promptVersion, @createdAt, @updatedAt)`
  ).run(record);
}

export function getSimulationMeta(id: string): SimulationRecord | undefined {
  const db = getDb();
  return db
    .prepare("SELECT * FROM simulations WHERE id = ?")
    .get(id) as SimulationRecord | undefined;
}

export function listSimulations(
  limit = 20,
  offset = 0
): SimulationRecord[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM simulations ORDER BY created_at DESC LIMIT ? OFFSET ?"
    )
    .all(limit, offset) as SimulationRecord[];
}
