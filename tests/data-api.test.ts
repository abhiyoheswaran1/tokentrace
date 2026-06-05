import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-data-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, { sqlite }] = await Promise.all([
    import("@/app/api/data/route"),
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

function count(sqlite: BetterSqliteDatabase, table: string) {
  const row = sqlite.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

describe("/api/data", () => {
  it("DELETE clears imported usage data while preserving providers and model rates", async () => {
    const { DELETE, sqlite } = await loadRoute();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite
      .prepare(
        `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency)
         VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')`
      )
      .run();
    sqlite
      .prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/tmp/projects/tokentrace')")
      .run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file)
         VALUES ('session-1', 'source-session-1', 'claude-code', 'project-1', 10, 'Seeded session', '/tmp/claude/a.jsonl')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES ('i1', 'i1-source', 'session-1', 'assistant', 'sonnet', 100, 50, 150, 'exact', 0.5)`
      )
      .run();
    sqlite
      .prepare("INSERT INTO tool_calls (id, interaction_id, name, status) VALUES ('tc1', 'i1', 'Edit', 'ok')")
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
         VALUES ('scan-1', 1, 2, 1, 1, '[]', '[]')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors)
         VALUES ('file-1', 'scan-1', '/tmp/claude/a.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]')`
      )
      .run();

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    for (const table of ["tool_calls", "interactions", "sessions", "projects", "scan_files", "scan_runs"]) {
      expect(count(sqlite, table)).toBe(0);
    }
    expect(count(sqlite, "providers")).toBe(1);
    expect(count(sqlite, "models")).toBe(1);
    expect(count(sqlite, "tools")).toBe(1);
  });

  it("DELETE succeeds on an already-empty database", async () => {
    const { DELETE } = await loadRoute();

    const response = await DELETE();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });
});
