import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-reports-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, { sqlite }] = await Promise.all([
    import("@/app/api/reports/route"),
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
    .prepare(
      `INSERT INTO sessions (id, source_id, tool_id, started_at, ended_at, title, source_file)
       VALUES ('session-1', 'source-session-1', 'claude-code', ?, ?, 'Seeded session', '/tmp/claude/a.jsonl')`
    )
    .run(startedAt, startedAt + 30_000);
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
       VALUES ('i1', 'i1-source', 'session-1', ?, 'assistant', 'sonnet', 100, 50, 150, 'exact', 0.5)`
    )
    .run(startedAt + 1_000);
}

function reportRequest(query = "") {
  return new Request(`http://localhost/api/reports${query}`, { method: "GET" });
}

describe("/api/reports", () => {
  it("GET defaults to the weekly usage report as JSON", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(reportRequest());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    const body = await response.json();
    expect(body).toMatchObject({
      schemaVersion: "tokentrace.saved-report.v1",
      definitionId: "weekly-usage",
      rawContentIncluded: false
    });
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.length).toBeGreaterThan(0);
  });

  it("GET renders CSV with download headers for csv format", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(reportRequest("?type=high-cost-sessions&format=csv"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-high-cost-sessions.csv"'
    );
    const csv = await response.text();
    expect(csv.split("\n").length).toBeGreaterThanOrEqual(2);
  });

  it("GET renders markdown with download headers for markdown format", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(reportRequest("?type=weekly-usage&format=markdown"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      'attachment; filename="tokentrace-weekly-usage.md"'
    );
    expect(await response.text()).toContain("Weekly Usage Report");
  });

  it("GET returns 400 for unknown report types", async () => {
    const { GET } = await loadRoute();

    const response = await GET(reportRequest("?type=bogus-report"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unknown report type." });
  });

  it("GET returns 400 for unsupported report formats", async () => {
    const { GET } = await loadRoute();

    const response = await GET(reportRequest("?type=weekly-usage&format=xml"));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Unsupported report format." });
  });
});
