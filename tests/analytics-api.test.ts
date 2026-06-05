import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadRoute() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-analytics-api-"));
  tempDirs.push(dir);
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [route, { sqlite }] = await Promise.all([
    import("@/app/api/analytics/route"),
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
  const recentAt = Date.now() - 60_000;
  const oldAt = Date.UTC(2020, 0, 15);
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
      `INSERT INTO sessions (id, source_id, tool_id, started_at, ended_at, title, source_file) VALUES
        ('session-recent', 'source-recent', 'claude-code', ?, ?, 'Recent session', '/tmp/claude/recent.jsonl'),
        ('session-old', 'source-old', 'claude-code', ?, ?, 'Old session', '/tmp/claude/old.jsonl')`
    )
    .run(recentAt, recentAt + 30_000, oldAt, oldAt + 30_000);
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
       VALUES
        ('i-recent', 'i-recent-source', 'session-recent', ?, 'assistant', 'sonnet', 100, 50, 150, 'exact', 0.5),
        ('i-old', 'i-old-source', 'session-old', ?, 'assistant', 'sonnet', 200, 100, 300, 'exact', 1.0)`
    )
    .run(recentAt + 1_000, oldAt + 1_000);
}

function analyticsRequest(query = "") {
  return new Request(`http://localhost/api/analytics${query}`, { method: "GET" });
}

describe("/api/analytics", () => {
  it("GET returns analytics built from imported usage", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(analyticsRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      totalTokens: 450,
      inputTokens: 300,
      outputTokens: 150,
      sessions: 2,
      interactions: 2,
      mostUsedTool: "Claude Code",
      mostUsedModel: "claude-sonnet-4-5"
    });
    expect(body.summary.totalCost).toBeCloseTo(1.5, 5);
    expect(body.models).toHaveLength(1);
    expect(body.models[0]).toMatchObject({ model: "claude-sonnet-4-5", totalTokens: 450 });
    expect(body.sessions).toHaveLength(2);
    expect(body.dataConfidence.score).toBeGreaterThan(0);
  });

  it("GET applies the requested date range filter", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(analyticsRequest("?range=7d"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({
      totalTokens: 150,
      interactions: 1,
      sessions: 1
    });
    const sessionIds = body.sessions.map((session: { id: string }) => session.id);
    expect(sessionIds).toEqual(["session-recent"]);
  });

  it("GET treats unknown range keys as all time", async () => {
    const { GET, sqlite } = await loadRoute();
    seedUsage(sqlite);

    const response = await GET(analyticsRequest("?range=bogus"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary.totalTokens).toBe(450);
    expect(body.summary.interactions).toBe(2);
  });

  it("GET returns empty analytics on a fresh database", async () => {
    const { GET } = await loadRoute();

    const response = await GET(analyticsRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.summary).toMatchObject({ totalTokens: 0, sessions: 0, interactions: 0 });
    expect(body.sessions).toEqual([]);
    expect(body.models).toEqual([]);
  });
});
