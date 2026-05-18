import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadAnalytics() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-trends-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ getAnalyticsData }, { sqlite }] = await Promise.all([
    import("@/src/lib/analytics"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { getAnalyticsData, sqlite };
}

function dayLocal(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getTime();
}

function seedBase(sqlite: SqliteDatabase) {
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
  sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
  sqlite
    .prepare("INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('gpt', 'openai', 'gpt-5.5', 1, 1, 'USD')")
    .run();
  sqlite
    .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('session-1', 'source-1', 'codex-cli', 'project-1', '/tmp/source.jsonl')")
    .run();
}

function seedSparseTrendDays(sqlite: SqliteDatabase) {
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
       VALUES
        ('i1', 'i1-source', 'session-1', ?, 'assistant', 'gpt', 100, 40, 60, 'exact', 0.10),
        ('i2', 'i2-source', 'session-1', ?, 'assistant', 'gpt', 300, 120, 180, 'exact', 0.30)`
    )
    .run(dayLocal(2026, 5, 1) + 12 * 60 * 60 * 1000, dayLocal(2026, 5, 3) + 12 * 60 * 60 * 1000);
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("trend series analytics", () => {
  it("fills missing calendar days with zero-value trend points", async () => {
    const { getAnalyticsData, sqlite } = await loadAnalytics();
    seedBase(sqlite);
    seedSparseTrendDays(sqlite);

    const data = getAnalyticsData({
      from: dayLocal(2026, 5, 1),
      to: dayLocal(2026, 5, 4)
    });

    expect(
      data.trends.map((point) => ({
        date: point.date,
        totalTokens: point.totalTokens,
        inputTokens: point.inputTokens,
        outputTokens: point.outputTokens,
        cachedTokens: point.cachedTokens,
        reasoningTokens: point.reasoningTokens,
        cost: point.cost
      }))
    ).toEqual([
      {
        date: "2026-05-01",
        totalTokens: 100,
        inputTokens: 40,
        outputTokens: 60,
        cachedTokens: 0,
        reasoningTokens: 0,
        cost: 0.1
      },
      {
        date: "2026-05-02",
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        reasoningTokens: 0,
        cost: 0
      },
      {
        date: "2026-05-03",
        totalTokens: 300,
        inputTokens: 120,
        outputTokens: 180,
        cachedTokens: 0,
        reasoningTokens: 0,
        cost: 0.3
      }
    ]);
  });

  it("fills all-time trend gaps between the first and last imported usage days", async () => {
    const { getAnalyticsData, sqlite } = await loadAnalytics();
    seedBase(sqlite);
    seedSparseTrendDays(sqlite);

    expect(getAnalyticsData().trends.map((point) => point.date)).toEqual([
      "2026-05-01",
      "2026-05-02",
      "2026-05-03"
    ]);
  });
});
