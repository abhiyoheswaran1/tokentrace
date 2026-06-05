import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-export-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, { sqlite }] = await Promise.all([
    import("@/app/api/export/route"),
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

function seedUsage(sqlite: BetterSqliteDatabase) {
  const startedAt = Date.now() - 60_000;
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
      `INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, ended_at, title, source_file)
       VALUES ('session-1', 'source-session-1', 'claude-code', 'project-1', ?, ?, 'Seeded session', '/tmp/claude/a.jsonl')`
    )
    .run(startedAt, startedAt + 30_000);
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
       VALUES ('i1', 'i1-source', 'session-1', ?, 'assistant', 'sonnet', 100, 50, 150, 'exact', 0.5)`
    )
    .run(startedAt + 1_000);
  sqlite
    .prepare(
      `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
       VALUES ('scan-1', ?, ?, 1, 1, '[]', '[]')`
    )
    .run(startedAt, startedAt + 5_000);
  sqlite
    .prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES ('file-1', 'scan-1', '/tmp/claude/a.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{"confidence":0.96}')`
    )
    .run();
}

function exportRequest(type?: string) {
  const url = type
    ? `http://localhost/api/export?type=${encodeURIComponent(type)}`
    : "http://localhost/api/export";
  return new Request(url, { method: "GET" });
}

describe("/api/export", () => {
  it("GET exports each data set as CSV with download headers", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const expectations: Array<{ type: string; header: string; cell: string }> = [
      { type: "sessions", header: "sourceFile", cell: "/tmp/claude/a.jsonl" },
      { type: "models", header: "model", cell: "claude-sonnet-4-5" },
      { type: "projects", header: "project", cell: "TokenTrace" },
      { type: "tools", header: "tool", cell: "Claude Code" },
      { type: "scan-files", header: "scanRunId", cell: "/tmp/claude/a.jsonl" },
      { type: "scan-runs", header: "filesScanned", cell: "scan-1" }
    ];

    for (const { type, header, cell } of expectations) {
      const response = await GET(exportRequest(type));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
      expect(response.headers.get("content-disposition")).toBe(
        `attachment; filename="tokentrace-${type}.csv"`
      );
      const csv = await response.text();
      const lines = csv.split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2);
      expect(lines[0]).toContain(header);
      expect(csv).toContain(cell);
    }
  });

  it("GET defaults to the sessions export when no type is given", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(exportRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-sessions.csv"'
    );
    expect(await response.text()).toContain("/tmp/claude/a.jsonl");
  });

  it("GET falls back to sessions data for unknown types", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(exportRequest("bogus"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-bogus.csv"'
    );
    expect(await response.text()).toContain("/tmp/claude/a.jsonl");
  });

  it("GET returns an empty CSV body when no data is imported", async () => {
    const { GET } = await loadRoute();

    const response = await GET(exportRequest("sessions"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(await response.text()).toBe("");
  });
});
