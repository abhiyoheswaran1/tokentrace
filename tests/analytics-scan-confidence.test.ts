import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: { close: () => void } | null = null;
const tempDirs: string[] = [];

async function loadAnalytics() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-analytics-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ getScanConfidenceSummary }, { sqlite }] = await Promise.all([
    import("@/src/lib/analytics"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { getScanConfidenceSummary, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("scan confidence analytics", () => {
  it("breaks unknown cost down by missing model, missing pricing, and missing token counts", async () => {
    const { getScanConfidenceSummary, sqlite } = await loadAnalytics();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
    sqlite
      .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('session-1', 'source-1', 'codex-cli', 'project-1', '/tmp/source.jsonl')")
      .run();

    sqlite
      .prepare(
        `INSERT INTO models
          (id, provider_id, name, input_token_price, output_token_price, currency)
         VALUES
          ('model-unknown', 'openai', 'unknown', NULL, NULL, 'USD'),
          ('model-unpriced', 'openai', 'gpt-later', NULL, NULL, 'USD'),
          ('model-priced', 'openai', 'gpt-priced', 1, 1, 'USD')`
      )
      .run();

    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'model-unknown', 10, 'exact', NULL),
          ('i2', 'i2-source', 'session-1', 'assistant', 'model-unpriced', 10, 'exact', NULL),
          ('i3', 'i3-source', 'session-1', 'assistant', 'model-priced', 0, 'unknown', NULL)`
      )
      .run();

    const summary = getScanConfidenceSummary();

    expect(summary.unknownCostInteractions).toBe(3);
    expect(summary.unknownCostCauses).toEqual({
      missingModelName: 1,
      missingPricing: 1,
      missingTokenCount: 1,
      other: 0
    });
  });
});
