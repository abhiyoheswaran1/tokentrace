import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadScanDiff() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-scan-diff-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [scanDiff, { sqlite }] = await Promise.all([
    import("@/src/lib/scan-diff"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...scanDiff, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("scan history diff", () => {
  it("compares latest scan with the previous scan and explains zero imports", async () => {
    const { buildScanDiff, sqlite } = await loadScanDiff();

    sqlite.prepare(
      `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
       VALUES
        ('scan-old', 1, 2, 2, 2, '[]', '[]'),
        ('scan-new', 3, 4, 3, 0, '[]', '[]')`
    ).run();
    sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES
        ('old-1', 'scan-old', '/tmp/a.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{}'),
        ('old-2', 'scan-old', '/tmp/b.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{}'),
        ('new-1', 'scan-new', '/tmp/a.jsonl', 100, 'claude-code', 'skipped_duplicate', 0, '[]', '[]', '{}'),
        ('new-2', 'scan-new', '/tmp/b.jsonl', 100, 'claude-code', 'skipped_duplicate', 0, '[]', '[]', '{}'),
        ('new-3', 'scan-new', '/tmp/cache.json', 100, 'ignored', 'ignored_non_usage', 0, '[]', '[]', '{}')`
    ).run();

    expect(buildScanDiff()).toMatchObject({
      latestScanId: "scan-new",
      previousScanId: "scan-old",
      latestCompletedAt: 4,
      previousCompletedAt: 2,
      current: {
        filesScanned: 3,
        recordsImported: 0,
        duplicates: 2,
        ignored: 1
      },
      previous: {
        filesScanned: 2,
        recordsImported: 2,
        imported: 2
      },
      delta: {
        filesScanned: 1,
        recordsImported: -2,
        imported: -2,
        duplicates: 2,
        ignored: 1
      },
      explanation: "The latest scan imported nothing because files were already imported duplicates or known non-usage support files."
    });
  });

  it("selects latest and previous scans deterministically when timestamps tie", async () => {
    const { buildScanDiff, sqlite } = await loadScanDiff();

    sqlite.prepare(
      `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
       VALUES
        ('scan-a', 10, 20, 1, 1, '[]', '[]'),
        ('scan-b', 10, 21, 2, 2, '[]', '[]'),
        ('scan-z', 10, 21, 3, 3, '[]', '[]')`
    ).run();

    expect(buildScanDiff()).toMatchObject({
      latestScanId: "scan-z",
      previousScanId: "scan-b",
      current: {
        filesScanned: 3,
        recordsImported: 3
      },
      previous: {
        filesScanned: 2,
        recordsImported: 2
      }
    });
  });
});
