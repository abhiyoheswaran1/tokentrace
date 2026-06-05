import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-files-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, { sqlite }] = await Promise.all([
    import("@/app/api/files/route"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...route, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("/api/files", () => {
  it("GET returns empty scan debug data on a fresh database", async () => {
    const { GET } = await loadRoute();

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ scanRuns: [], scanFiles: [] });
  });

  it("GET returns scan runs and scan files with parsed JSON columns", async () => {
    const { GET, sqlite } = await loadRoute();

    sqlite
      .prepare(
        `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
         VALUES ('scan-1', 100, 200, 2, 5, '["slow parse"]', '[]')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES ('file-1', 'scan-1', '/tmp/claude/a.jsonl', 123, 'claude-code', 'imported', 5, '[]', '[]', '{"confidence":0.96}')`
      )
      .run();

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.scanRuns).toHaveLength(1);
    expect(body.scanRuns[0]).toMatchObject({
      id: "scan-1",
      startedAt: 100,
      completedAt: 200,
      filesScanned: 2,
      recordsImported: 5,
      warnings: ["slow parse"],
      errors: []
    });
    expect(body.scanFiles).toHaveLength(1);
    expect(body.scanFiles[0]).toMatchObject({
      id: "file-1",
      scanRunId: "scan-1",
      path: "/tmp/claude/a.jsonl",
      sizeBytes: 123,
      parser: "claude-code",
      status: "imported",
      recordsImported: 5,
      warnings: [],
      errors: [],
      rawMetadata: { confidence: 0.96 },
      scanStartedAt: 100
    });
  });
});
