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

  const [{ getAnalyticsData, getScanConfidenceSummary, getScanTrustData }, { sqlite }] = await Promise.all([
    import("@/src/lib/analytics"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { getAnalyticsData, getScanConfidenceSummary, getScanTrustData, sqlite };
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

  it("builds an unknown-cost repair queue from local interaction facts", async () => {
    const { getAnalyticsData, sqlite } = await loadAnalytics();

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
          ('model-unpriced', 'openai', 'gpt-later', NULL, NULL, 'USD'),
          ('model-priced', 'openai', 'gpt-priced', 1, 1, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'model-unpriced', 100, 'exact', NULL),
          ('i2', 'i2-source', 'session-1', 'assistant', 'model-priced', 0, 'unknown', NULL)`
      )
      .run();

    const data = getAnalyticsData();

    expect(data.unknownCosts.map((row) => row.cause)).toEqual([
      "missing pricing",
      "missing token count"
    ]);
    expect(data.unknownCosts[0]).toMatchObject({
      model: "gpt-later",
      provider: "OpenAI",
      tool: "Codex CLI",
      interactions: 1,
      repairHref: "/pricing"
    });
  });

  it("builds scan trust health from all latest scan files, not only the debug table limit", async () => {
    const { getScanTrustData, sqlite } = await loadAnalytics();

    sqlite
      .prepare(
        "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES ('scan-1', 1, 2, 501, 1, '[]', '[]')"
      )
      .run();

    const insert = sqlite.prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
       VALUES (?, 'scan-1', ?, 100, ?, ?, ?, '[]', '[]', '{}')`
    );
    for (let index = 0; index < 500; index += 1) {
      insert.run(`ignored-${index}`, `/tmp/ignored-${index}.json`, null, "ignored_non_usage", 0);
    }
    insert.run("imported-1", "/tmp/imported.jsonl", "claude-code", "imported", 1);

    const trust = getScanTrustData();

    expect(trust.health.latestStatusCounts.ignored_non_usage).toBe(500);
    expect(trust.health.latestStatusCounts.imported).toBe(1);
  });
});
