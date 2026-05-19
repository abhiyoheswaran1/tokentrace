import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRunScan() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-sqlite-adapter-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  const scanDir = path.join(tempDir, "scan-root");
  await fs.mkdir(scanDir);
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ runScan }, { sqlite }] = await Promise.all([
    import("@/src/ingestion/scan"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { runScan, scanDir, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("SQLite history adapter", () => {
  it("imports usage-shaped local SQLite history tables", async () => {
    const { runScan, scanDir, sqlite } = await loadRunScan();
    const historyPath = path.join(scanDir, "ai-history.sqlite");
    const history = new Database(historyPath);
    history.exec(`
      CREATE TABLE ai_usage_events (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        timestamp INTEGER,
        provider TEXT,
        tool TEXT,
        project_path TEXT,
        role TEXT,
        model TEXT,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_read_tokens INTEGER,
        cache_write_tokens INTEGER,
        reasoning_tokens INTEGER,
        total_tokens INTEGER,
        cost REAL
      );
    `);
    history
      .prepare(
        `INSERT INTO ai_usage_events
         VALUES ('event-1', 'session-a', 1800000000000, 'OpenAI', 'Local Wrapper', ?, 'assistant', 'gpt-5.4', 100, 80, 20, 0, 5, 205, 0.42)`
      )
      .run(scanDir);
    history.close();

    const result = await runScan({ folders: [historyPath], includeDefaults: false });
    const interactions = sqlite.prepare("SELECT total_tokens AS totalTokens, token_confidence AS tokenConfidence, cost FROM interactions").all() as Array<{
      totalTokens: number;
      tokenConfidence: string;
      cost: number | null;
    }>;
    const scanFile = sqlite.prepare("SELECT parser, raw_metadata AS rawMetadata FROM scan_files WHERE path = ?").get(historyPath) as {
      parser: string;
      rawMetadata: string;
    };

    expect(result.recordsImported).toBe(1);
    expect(interactions).toEqual([{ totalTokens: 205, tokenConfidence: "exact", cost: expect.any(Number) }]);
    expect(scanFile.parser).toBe("sqlite-history");
    expect(JSON.parse(scanFile.rawMetadata)).toMatchObject({
      parser: { id: "sqlite-history" },
      importProfile: { id: "sqlite-history" }
    });
  });
});
