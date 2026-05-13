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

  it("counts each unknown-cost interaction under exactly one primary cause", async () => {
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
          ('model-unknown', 'openai', 'unknown', NULL, NULL, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'model-unknown', 0, 'unknown', NULL)`
      )
      .run();

    const summary = getScanConfidenceSummary();
    const causeTotal = Object.values(summary.unknownCostCauses).reduce((total, value) => total + value, 0);

    expect(summary.unknownCostInteractions).toBe(1);
    expect(causeTotal).toBe(summary.unknownCostInteractions);
    expect(summary.unknownCostCauses).toEqual({
      missingModelName: 1,
      missingPricing: 0,
      missingTokenCount: 0,
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
      repairHref: "/pricing?model=gpt-later",
      sourceHref: "/sessions?source=%2Ftmp%2Fsource.jsonl",
      parserHref: "/parser-debug?source=%2Ftmp%2Fsource.jsonl"
    });
  });

  it("links sessions to parser provenance and pricing repair targets", async () => {
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
          ('model-priced', 'openai', 'gpt-4.1', 2, 8, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'model-priced', 100, 'exact', 0.001)`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_runs
          (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
         VALUES
          ('scan-1', 10, 20, 1, 1, '[]', '[]')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES
          ('file-1', 'scan-1', '/tmp/source.jsonl', 100, 'codex-cli', 'imported', 1, '[]', '[]', '{"confidence":0.95,"reason":"Codex CLI session artifact path"}')`
      )
      .run();

    const session = getAnalyticsData().sessions[0];

    expect(session).toMatchObject({
      sourceFile: "/tmp/source.jsonl",
      parser: "codex-cli",
      parserStatus: "imported",
      parserConfidence: 0.95,
      parserReason: "Codex CLI session artifact path",
      sourceHref: "/sessions?source=%2Ftmp%2Fsource.jsonl",
      parserHref: "/parser-debug?source=%2Ftmp%2Fsource.jsonl",
      pricingHref: "/pricing?model=gpt-4.1"
    });
  });

  it("suggests model alias repairs without blindly pricing synthetic rows", async () => {
    const { getAnalyticsData, sqlite } = await loadAnalytics();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
    sqlite
      .prepare("INSERT INTO sessions (id, source_id, tool_id, project_id, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', '/tmp/claude.jsonl')")
      .run();
    sqlite
      .prepare(
        `INSERT INTO models
          (id, provider_id, name, input_token_price, output_token_price, currency)
         VALUES
          ('priced-sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD'),
          ('dated-sonnet', 'anthropic', 'claude-sonnet-4-5-20260201', NULL, NULL, 'USD'),
          ('synthetic', 'anthropic', '<synthetic>', NULL, NULL, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'dated-sonnet', 100, 'exact', NULL),
          ('i2', 'i2-source', 'session-1', 'assistant', 'synthetic', 50, 'exact', NULL)`
      )
      .run();

    const suggestions = getAnalyticsData().modelAliasSuggestions;

    expect(suggestions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          model: "claude-sonnet-4-5-20260201",
          suggestedModel: "claude-sonnet-4-5",
          confidence: "high",
          repairHref: "/pricing?model=claude-sonnet-4-5-20260201"
        }),
        expect.objectContaining({
          model: "<synthetic>",
          suggestedModel: null,
          confidence: "medium",
          repairHref: "/parser-debug?source=%2Ftmp%2Fclaude.jsonl"
        })
      ])
    );
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

  it("orders tied scan runs deterministically for scan trust health", async () => {
    const { getScanTrustData, sqlite } = await loadAnalytics();

    sqlite
      .prepare(
        `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES
          ('scan-a', 10, 20, 1, 1, '[]', '[]'),
          ('scan-z', 10, 20, 1, 0, '[]', '[]')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES
          ('file-a', 'scan-a', '/tmp/older.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{}'),
          ('file-z', 'scan-z', '/tmp/newer.jsonl', 100, 'codex-cli', 'skipped_unknown', 0, '[]', '[]', '{}')`
      )
      .run();

    const trust = getScanTrustData();

    expect(trust.scanRuns[0].id).toBe("scan-z");
    expect(trust.health.latestRun?.id).toBe("scan-z");
    expect(trust.health.latestStatusCounts.skipped_unknown).toBe(1);
    expect(trust.health.latestStatusCounts.imported ?? 0).toBe(0);
  });
});
