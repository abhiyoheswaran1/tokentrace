import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadAnalytics() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-comparison-"));
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

function seedBase(sqlite: SqliteDatabase) {
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
  sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
  sqlite
    .prepare("INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('sonnet', 'anthropic', 'claude-sonnet', 3, 15, 'USD')")
    .run();
  sqlite
    .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, source_file) VALUES (?, ?, 'claude-code', 'project-1', ?, ?)")
    .run("session-previous", "source-previous", 1_000, "/tmp/previous.jsonl");
  sqlite
    .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, source_file) VALUES (?, ?, 'claude-code', 'project-1', ?, ?)")
    .run("session-current", "source-current", 11_000, "/tmp/current.jsonl");
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("usage comparison analytics", () => {
  it("compares a selected period with the immediately previous matching period", async () => {
    const { getAnalyticsData, sqlite } = await loadAnalytics();
    seedBase(sqlite);

    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
         VALUES
          ('previous-i1', 'previous-i1', 'session-previous', 2_000, 'assistant', 'sonnet', 100, 40, 60, 'exact', 0.50),
          ('current-i1', 'current-i1', 'session-current', 12_000, 'assistant', 'sonnet', 250, 100, 150, 'exact', 1.25),
          ('current-i2', 'current-i2', 'session-current', 13_000, 'assistant', 'sonnet', 150, 60, 90, 'exact', 0.75)`
      )
      .run();

    const data = getAnalyticsData({ from: 10_000, to: 20_000 });

    expect(data.comparison).toMatchObject({
      mode: "selected-period",
      label: "Previous matching period",
      current: {
        totalTokens: 400,
        totalCost: 2,
        sessions: 1,
        interactions: 2
      },
      previous: {
        totalTokens: 100,
        totalCost: 0.5,
        sessions: 1,
        interactions: 1
      },
      delta: {
        totalTokens: 300,
        totalCost: 1.5,
        sessions: 0,
        interactions: 1,
        totalTokensPercent: 300,
        totalCostPercent: 300
      }
    });
    expect(data.comparison.headline).toContain("300% more tokens");
  });

  it("uses the latest seven days when no bounded period is selected", async () => {
    const { getAnalyticsData, sqlite } = await loadAnalytics();
    seedBase(sqlite);
    const day = 24 * 60 * 60 * 1000;

    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
         VALUES
          ('previous-i1', 'previous-i1', 'session-previous', ?, 'assistant', 'sonnet', 50, 20, 30, 'exact', 0.25),
          ('current-i1', 'current-i1', 'session-current', ?, 'assistant', 'sonnet', 200, 80, 120, 'exact', 1.00)`
      )
      .run(day, day * 10);

    const data = getAnalyticsData();

    expect(data.comparison).toMatchObject({
      mode: "latest-seven-days",
      label: "Previous 7 days",
      current: expect.objectContaining({ totalTokens: 200 }),
      previous: expect.objectContaining({ totalTokens: 50 }),
      delta: expect.objectContaining({ totalTokens: 150 })
    });
  });

  it("suppresses extreme percentage deltas when the previous baseline is too small", async () => {
    const { getAnalyticsData, sqlite } = await loadAnalytics();
    seedBase(sqlite);

    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
         VALUES
          ('previous-i1', 'previous-i1', 'session-previous', 2_000, 'assistant', 'sonnet', 10, 4, 6, 'exact', 0.01),
          ('current-i1', 'current-i1', 'session-current', 12_000, 'assistant', 'sonnet', 1000000, 400000, 600000, 'exact', 10.00)`
      )
      .run();

    const data = getAnalyticsData({ from: 10_000, to: 20_000 });

    expect(data.comparison.delta.totalTokens).toBe(999990);
    expect(data.comparison.delta.totalTokensPercent).toBeNull();
    expect(data.comparison.headline).toBe("Higher tokens activity");
  });
});
