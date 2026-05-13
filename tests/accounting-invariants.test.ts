import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function loadAccounting() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-accounting-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [{ buildAccountingInvariants }, { sqlite }] = await Promise.all([
    import("@/src/lib/accounting-invariants"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { buildAccountingInvariants, sqlite, dir };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("accounting invariants", () => {
  it("separates processed, non-cache, cache, and dashboard-comparable tokens by provider", async () => {
    const { buildAccountingInvariants, sqlite } = await loadAccounting();
    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
    sqlite
      .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('session-1', 'source-1', 'codex-cli', 'project-1', '/tmp/codex.jsonl')")
      .run();
    sqlite.prepare("INSERT INTO models (id, provider_id, name) VALUES ('model-1', 'openai', 'gpt-5.5')").run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens,
           cache_read_tokens, cache_write_tokens, reasoning_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1', 'session-1', 1800000000000, 'assistant', 'model-1', 100, 20, 900, 10, 5, 1035, 'exact', 0.01),
          ('i2', 'i2', 'session-1', 1800000001000, 'assistant', 'model-1', 40, 60, 0, 0, 0, 100, 'exact', 0.02)`
      )
      .run();

    const report = buildAccountingInvariants();

    expect(report.processedTokens).toBe(1135);
    expect(report.nonCacheTokens).toBe(225);
    expect(report.cachedTokens).toBe(910);
    expect(report.balanceDeltaTokens).toBe(0);
    expect(report.status).toBe("ready");
    expect(report.definitions.map((item) => item.id)).toEqual([
      "processed",
      "non-cache",
      "cached",
      "provider-dashboard"
    ]);
    expect(report.providerRows).toEqual([
      expect.objectContaining({
        provider: "OpenAI",
        tool: "Codex CLI",
        processedTokens: 1135,
        nonCacheTokens: 225,
        cachedTokens: 910,
        dashboardComparableTokens: 1135,
        balanceDeltaTokens: 0
      })
    ]);
  });

  it("flags rows whose processed total no longer equals the visible token buckets", async () => {
    const { buildAccountingInvariants, sqlite } = await loadAccounting();
    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('session-1', 'source-1', 'claude-code', '/tmp/claude.jsonl')").run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens, total_tokens)
         VALUES ('i1', 'i1', 'session-1', 'assistant', 10, 20, 30, 0, 0, 80)`
      )
      .run();

    const report = buildAccountingInvariants();

    expect(report.status).toBe("review");
    expect(report.balanceDeltaTokens).toBe(20);
    expect(report.notes.join(" ")).toContain("20 tokens are outside the visible buckets");
  });
});
