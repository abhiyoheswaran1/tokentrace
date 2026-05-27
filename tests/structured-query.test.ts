import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-structured-query-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ runStructuredQuery }, { sqlite }] = await Promise.all([
    import("@/src/lib/structured-query"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { runStructuredQuery, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function dayLocal(year: number, month: number, day: number) {
  return new Date(year, month - 1, day).getTime();
}

function seed(sqlite: SqliteDatabase) {
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
  sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('p-alpha', 'Alpha', '/tmp/alpha')").run();
  sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('p-beta', 'Beta', '/tmp/beta')").run();
  sqlite
    .prepare("INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('gpt-5', 'openai', 'gpt-5', 1, 2, 'USD')")
    .run();
  sqlite
    .prepare("INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('claude-opus', 'anthropic', 'claude-opus-4-7', 3, 15, 'USD')")
    .run();
  sqlite
    .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('s-1', 's-src-1', 'codex-cli', 'p-alpha', '/tmp/alpha/codex.jsonl')")
    .run();
  sqlite
    .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('s-2', 's-src-2', 'claude-code', 'p-beta', '/tmp/beta/claude.jsonl')")
    .run();

  const insert = sqlite.prepare(
    `INSERT INTO interactions
      (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
     VALUES (?, ?, ?, ?, 'assistant', ?, ?, ?, ?, 'exact', ?)`
  );

  const noon = (year: number, month: number, day: number) => dayLocal(year, month, day) + 12 * 60 * 60 * 1000;

  // 3 GPT interactions on day 1 in Alpha
  insert.run("i1", "i1-src", "s-1", noon(2026, 5, 1), "gpt-5", 1000, 600, 400, 1.6);
  insert.run("i2", "i2-src", "s-1", noon(2026, 5, 1), "gpt-5", 2000, 1200, 800, 3.2);
  insert.run("i3", "i3-src", "s-1", noon(2026, 5, 2), "gpt-5", 500, 300, 200, 0.8);

  // 2 Claude interactions on day 2 and 3 in Beta
  insert.run("i4", "i4-src", "s-2", noon(2026, 5, 2), "claude-opus", 4000, 2000, 2000, 36);
  insert.run("i5", "i5-src", "s-2", noon(2026, 5, 3), "claude-opus", 1000, 500, 500, 9);
}

describe("runStructuredQuery — validation", () => {
  it("rejects missing groupBy or metric", async () => {
    const { runStructuredQuery } = await loadModule();
    expect(() => runStructuredQuery({} as any)).toThrow();
  });

  it("rejects invalid groupBy", async () => {
    const { runStructuredQuery } = await loadModule();
    expect(() =>
      runStructuredQuery({ groupBy: "bogus" as any, metric: "cost" })
    ).toThrow("Unsupported groupBy");
  });

  it("rejects invalid metric", async () => {
    const { runStructuredQuery } = await loadModule();
    expect(() =>
      runStructuredQuery({ groupBy: "model", metric: "bogus" as any })
    ).toThrow("Unsupported metric");
  });

  it("rejects invalid sort", async () => {
    const { runStructuredQuery } = await loadModule();
    expect(() =>
      runStructuredQuery({ groupBy: "model", metric: "cost", sort: "wonky" as any })
    ).toThrow("Unsupported sort");
  });

  it("rejects invalid range.preset", async () => {
    const { runStructuredQuery } = await loadModule();
    expect(() =>
      runStructuredQuery({
        groupBy: "model",
        metric: "cost",
        range: { preset: "weird" as any }
      })
    ).toThrow("Unsupported range preset");
  });

  it("rejects from >= to", async () => {
    const { runStructuredQuery } = await loadModule();
    expect(() =>
      runStructuredQuery({
        groupBy: "model",
        metric: "cost",
        range: { from: "2026-05-10", to: "2026-05-05" }
      })
    ).toThrow("range.from must be before range.to");
  });

  it("clamps topN to [1, 200] and defaults to 20", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const def = runStructuredQuery({ groupBy: "model", metric: "cost" });
    expect(def.topN).toBe(20);

    expect(() => runStructuredQuery({ groupBy: "model", metric: "cost", topN: 0 })).toThrow();
    expect(() => runStructuredQuery({ groupBy: "model", metric: "cost", topN: 1000 })).toThrow();
  });
});

describe("runStructuredQuery — grouping", () => {
  it("groups by model with metric=cost", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({ groupBy: "model", metric: "cost" });
    const byGroup = Object.fromEntries(result.rows.map((row) => [row.group, row]));
    expect(byGroup["claude-opus-4-7"].value).toBeCloseTo(45, 5); // 36 + 9
    expect(byGroup["gpt-5"].value).toBeCloseTo(5.6, 5); // 1.6 + 3.2 + 0.8
    // Descending order by default.
    expect(result.rows[0].group).toBe("claude-opus-4-7");
  });

  it("groups by tool with metric=totalTokens", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({ groupBy: "tool", metric: "totalTokens" });
    const byGroup = Object.fromEntries(result.rows.map((row) => [row.group, row]));
    expect(byGroup["Codex CLI"].value).toBe(3500);
    expect(byGroup["Claude Code"].value).toBe(5000);
  });

  it("groups by project with metric=interactions", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({ groupBy: "project", metric: "interactions" });
    const byGroup = Object.fromEntries(result.rows.map((row) => [row.group, row]));
    expect(byGroup["Alpha"].value).toBe(3);
    expect(byGroup["Beta"].value).toBe(2);
  });

  it("groups by day with metric=totalTokens", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({ groupBy: "day", metric: "totalTokens" });
    const byGroup = Object.fromEntries(result.rows.map((row) => [row.group, row]));
    expect(byGroup["2026-05-01"].value).toBe(3000);
    expect(byGroup["2026-05-02"].value).toBe(4500);
    expect(byGroup["2026-05-03"].value).toBe(1000);
  });

  it("groups by session", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({ groupBy: "session", metric: "interactions" });
    expect(result.rows).toHaveLength(2);
    expect(result.rows.find((row) => row.group === "s-1")?.value).toBe(3);
    expect(result.rows.find((row) => row.group === "s-2")?.value).toBe(2);
  });

  it("applies filters.model exactly (case-insensitive)", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({
      groupBy: "day",
      metric: "totalTokens",
      filters: { model: "GPT-5" }
    });
    expect(result.rows.map((row) => row.group)).toEqual(["2026-05-01", "2026-05-02"]);
    expect(result.rows.find((row) => row.group === "2026-05-01")?.value).toBe(3000);
  });

  it("applies filters.tool", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({
      groupBy: "model",
      metric: "cost",
      filters: { tool: "Claude Code" }
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].group).toBe("claude-opus-4-7");
  });

  it("applies filters.project", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({
      groupBy: "tool",
      metric: "interactions",
      filters: { project: "Alpha" }
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].group).toBe("Codex CLI");
    expect(result.rows[0].value).toBe(3);
  });

  it("respects range.from / range.to", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({
      groupBy: "day",
      metric: "totalTokens",
      range: { from: "2026-05-02", to: "2026-05-03" }
    });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].group).toBe("2026-05-02");
  });

  it("supports range.preset values", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({
      groupBy: "model",
      metric: "cost",
      range: { preset: "all" }
    });
    expect(result.rows.length).toBeGreaterThan(0);
    expect(result.range.preset).toBe("all");
  });

  it("topN clamps result list and marks truncated", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({
      groupBy: "model",
      metric: "cost",
      topN: 1
    });
    expect(result.rows).toHaveLength(1);
    expect(result.truncated).toBe(true);
    expect(result.totalGroups).toBe(2);
  });

  it("returns sort=asc when requested", async () => {
    const { runStructuredQuery, sqlite } = await loadModule();
    seed(sqlite);
    const result = runStructuredQuery({
      groupBy: "model",
      metric: "cost",
      sort: "asc"
    });
    expect(result.rows[0].group).toBe("gpt-5");
  });
});
