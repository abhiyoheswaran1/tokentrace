import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: { close: () => void } | null = null;
const tempDirs: string[] = [];

async function loadLiveStatus() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-live-status-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

    const [{ getLiveStatusSnapshot, renderLiveStatusLine }, { sqlite }] = await Promise.all([
    import("@/src/lib/live-status"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { getLiveStatusSnapshot, renderLiveStatusLine, sqlite, tempDir };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("live status snapshots", () => {
  it("summarizes all imported CLI usage as JSON-ready local status", async () => {
    const { getLiveStatusSnapshot, sqlite } = await loadLiveStatus();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
    sqlite.prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', '/tmp/claude.jsonl')").run();
    sqlite.prepare("INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('model-1', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')").run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens,
           cache_read_tokens, cache_write_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'model-1', 100, 50, 900, 25, 1075, 'exact', 0.012),
          ('i2', 'i2-source', 'session-1', 'assistant', 'model-1', 10, 5, 0, 0, 15, 'exact', NULL)`
      )
      .run();

    const status = getLiveStatusSnapshot();

    expect(status.scope).toBe("all");
    expect(status.sessions).toBe(1);
    expect(status.interactions).toBe(2);
    expect(status.totalTokens).toBe(1090);
    expect(status.cachedTokens).toBe(925);
    expect(status.totalCost).toBe(0.012);
    expect(status.unknownCostInteractions).toBe(1);
    expect(status.mostUsedTool).toBe("Claude Code");
    expect(status.mostUsedModel).toBe("claude-sonnet-4-5");
  });

  it("renders compact and wide terminal lines from the same snapshot", async () => {
    const { renderLiveStatusLine, getLiveStatusSnapshot, sqlite } = await loadLiveStatus();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('session-1', 'source-1', 'claude-code', '/tmp/claude.jsonl')").run();
    sqlite.prepare("INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('model-1', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')").run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens,
           cache_read_tokens, cache_write_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'model-1', 100, 50, 900, 25, 1075, 'exact', NULL)`
      )
      .run();

    const status = getLiveStatusSnapshot();

    expect(renderLiveStatusLine(status, { mode: "compact" })).toBe("TT | all | 1.1K tok | $0.00 | 1 unk");
    expect(renderLiveStatusLine(status, { mode: "wide" })).toContain("input 100");
    expect(renderLiveStatusLine(status, { mode: "wide" })).toContain("cache read 900");
  });
});
