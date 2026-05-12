import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadParserTrust() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-parser-trust-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [parserTrust, { sqlite }] = await Promise.all([
    import("@/src/lib/parser-trust"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...parserTrust, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("parser trust report", () => {
  it("groups latest scan files by parser, status, source family, and version", async () => {
    const { buildParserTrustReport, sqlite } = await loadParserTrust();

    sqlite.prepare(
      "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES ('scan-1', 1, 2, 3, 1, '[]', '[]')"
    ).run();
    sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES
        ('file-1', 'scan-1', '/home/demo/.claude/projects/a.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{"parser":{"name":"claude-code","version":"1"},"confidence":0.95,"reason":"Claude transcript"}'),
        ('file-2', 'scan-1', '/home/demo/.claude/cache/noise.json', 100, 'ignored', 'ignored_non_usage', 0, '[]', '[]', '{"ignoreReason":"Claude support cache"}'),
        ('file-3', 'scan-1', '/home/demo/.codex/session.jsonl', 100, 'codex-cli', 'skipped_unknown', 0, '[]', '[]', '{"reason":"Unrecognized Codex shape"}')`
    ).run();

    const report = buildParserTrustReport();

    expect(report.summary).toEqual({
      imported: 1,
      importedWithErrors: 0,
      ignored: 1,
      unsupported: 1,
      failed: 0,
      duplicate: 0
    });
    expect(report.parsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parser: "claude-code",
          version: "1",
          imported: 1,
          sourceFamily: "Claude"
        }),
        expect.objectContaining({
          parser: "ignored",
          ignored: 1,
          sourceFamily: "Claude"
        })
      ])
    );
  });

  it("keeps malformed raw metadata from crashing the report", async () => {
    const { buildParserTrustReport, sqlite } = await loadParserTrust();

    sqlite.prepare(
      "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES ('scan-1', 1, 2, 2, 0, '[]', '[]')"
    ).run();
    sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES
        ('file-1', 'scan-1', '/home/demo/.openai/logs/a.jsonl', 100, NULL, 'failed', 0, '[]', '["bad json"]', '{not-json'),
        ('file-2', 'scan-1', '/home/demo/project/usage.jsonl', 100, 'generic-jsonl', 'skipped_duplicate', 0, '[]', '[]', NULL)`
    ).run();

    const report = buildParserTrustReport();

    expect(report.summary.failed).toBe(1);
    expect(report.summary.duplicate).toBe(1);
    expect(report.parsers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parser: "none",
          version: "unknown",
          sourceFamily: "OpenAI",
          failed: 1,
          latestReason: ""
        }),
        expect.objectContaining({
          parser: "generic-jsonl",
          sourceFamily: "Unknown",
          duplicate: 1
        })
      ])
    );
  });

  it("selects the latest scan deterministically when timestamps tie", async () => {
    const { buildParserTrustReport, sqlite } = await loadParserTrust();

    sqlite.prepare(
      `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES
        ('scan-a', 10, 20, 1, 1, '[]', '[]'),
        ('scan-z', 10, 20, 1, 0, '[]', '[]')`
    ).run();
    sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES
        ('file-a', 'scan-a', '/home/demo/.claude/projects/a.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{"parser":{"version":"old"},"reason":"Older tied scan"}'),
        ('file-z', 'scan-z', '/home/demo/.codex/session.jsonl', 100, 'codex-cli', 'skipped_unknown', 0, '[]', '[]', '{"parser":{"version":"new"},"reason":"Newer tied scan"}')`
    ).run();

    const report = buildParserTrustReport();

    expect(report.summary).toMatchObject({
      imported: 0,
      unsupported: 1
    });
    expect(report.parsers).toEqual([
      expect.objectContaining({
        parser: "codex-cli",
        version: "new",
        sourceFamily: "Codex",
        latestReason: "Newer tied scan"
      })
    ]);
  });
});
