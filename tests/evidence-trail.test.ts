import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: { close: () => void } | null = null;
const tempDirs: string[] = [];

async function loadEvidence() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-evidence-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [evidence, { sqlite }] = await Promise.all([
    import("@/src/lib/evidence-trail"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...evidence, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("evidence trail", () => {
  it("validates route metric parameters before building evidence", async () => {
    const { parseEvidenceMetric } = await loadEvidence();

    expect(parseEvidenceMetric("cached-tokens")).toBe("cached-tokens");
    expect(parseEvidenceMetric("estimated-cost")).toBe("estimated-cost");
    expect(parseEvidenceMetric(["sessions"])).toBe("processed-tokens");
    expect(parseEvidenceMetric("../../../pricing")).toBe("processed-tokens");
    expect(parseEvidenceMetric(undefined)).toBe("processed-tokens");
  });

  it("builds metric evidence from sessions, source files, parser data, and pricing rows", async () => {
    const { buildEvidenceTrail, evidenceHref, sqlite } = await loadEvidence();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', 10, 'Refactor parser', '/tmp/claude.jsonl')"
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, cache_read_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'sonnet', 100, 50, 500, 650, 'exact', 0.01)`
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES ('scan-1', 1, 2, 1, 1, '[]', '[]')"
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES
          ('file-1', 'scan-1', '/tmp/claude.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{"confidence":0.95,"reason":"Claude project transcript"}')`
      )
      .run();

    const trail = buildEvidenceTrail({ metric: "processed-tokens" });

    expect(evidenceHref("processed-tokens")).toBe("/evidence?metric=processed-tokens");
    expect(evidenceHref("processed-tokens", { source: "/tmp/claude.jsonl" })).toBe(
      "/evidence?metric=processed-tokens&source=%2Ftmp%2Fclaude.jsonl"
    );
    expect(trail).toMatchObject({
      metric: "processed-tokens",
      title: "Processed tokens",
      totals: {
        tokens: 650,
        cost: 0.01,
        sessions: 1,
        interactions: 1,
        unknownCostInteractions: 0
      }
    });
    expect(trail.sessions[0]).toMatchObject({
      id: "session-1",
      title: "Refactor parser",
      tool: "Claude Code",
      provider: "Anthropic",
      project: "TokenTrace",
      model: "claude-sonnet-4-5",
      sourceFile: "/tmp/claude.jsonl",
      parser: "claude-code",
      parserStatus: "imported",
      parserConfidence: 0.95,
      tokenConfidence: "exact",
      totalTokens: 650,
      cost: 0.01,
      interactions: 1,
      sessionHref: "/sessions?source=%2Ftmp%2Fclaude.jsonl&evidence=processed-tokens",
      sourceHref: "/sessions?source=%2Ftmp%2Fclaude.jsonl&evidence=processed-tokens",
      parserHref: "/parser-debug?source=%2Ftmp%2Fclaude.jsonl",
      pricingHref: "/pricing?model=claude-sonnet-4-5"
    });
  });

  it("attributes filtered metric evidence to only the contributing interactions", async () => {
    const { buildEvidenceTrail, sqlite } = await loadEvidence();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
    sqlite
      .prepare(
        `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES
          ('priced', 'anthropic', 'claude-priced', 3, 15, 'USD'),
          ('unknown-cost', 'anthropic', 'claude-unpriced', NULL, NULL, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', 10, 'Mixed cost session', '/tmp/mixed.jsonl')"
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, cache_read_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('priced-interaction', 'priced-source', 'session-1', 'assistant', 'priced', 100, 50, 0, 1000, 'exact', 0.25),
          ('unknown-interaction', 'unknown-source', 'session-1', 'assistant', 'unknown-cost', 40, 10, 0, 50, 'exact', NULL)`
      )
      .run();

    const trail = buildEvidenceTrail({ metric: "unknown-cost" });

    expect(trail.totals).toMatchObject({
      tokens: 50,
      cost: 0,
      sessions: 1,
      interactions: 1,
      unknownCostInteractions: 1
    });
    expect(trail.sessions[0]).toMatchObject({
      id: "session-1",
      model: "claude-unpriced",
      totalTokens: 50,
      cost: null,
      interactions: 1,
      pricingHref: "/pricing?model=claude-unpriced"
    });
  });

  it("applies date filters and summarizes confidence and source files", async () => {
    const { buildEvidenceTrail, sqlite } = await loadEvidence();
    const includedAt = new Date(2026, 4, 2).getTime();
    const excludedAt = new Date(2026, 3, 2).getTime();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('gpt', 'openai', 'gpt-test', 1, 10, 'USD')"
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES
          ('included-session', 'included-source', 'codex', ?, 'Included', '/tmp/included.jsonl'),
          ('excluded-session', 'excluded-source', 'codex', ?, 'Excluded', '/tmp/excluded.jsonl')`
      )
      .run(includedAt, excludedAt);
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, timestamp, input_tokens, output_tokens, total_tokens, token_confidence, estimated_tokens, cost)
         VALUES
          ('included-exact', 'included-exact-source', 'included-session', 'assistant', 'gpt', ?, 100, 20, 120, 'exact', 0, 0.01),
          ('included-estimated', 'included-estimated-source', 'included-session', 'assistant', 'gpt', ?, 30, 10, 40, 'high-confidence estimate', 1, 0.02),
          ('excluded', 'excluded-source-i', 'excluded-session', 'assistant', 'gpt', ?, 500, 100, 600, 'exact', 0, 0.03)`
      )
      .run(includedAt, includedAt, excludedAt);

    const trail = buildEvidenceTrail({
      metric: "processed-tokens",
      filters: {
        from: new Date(2026, 4, 1).getTime(),
        to: new Date(2026, 4, 3).getTime()
      }
    });

    expect(trail.totals).toMatchObject({
      tokens: 160,
      cost: 0.03,
      sessions: 1,
      interactions: 2
    });
    expect(trail.confidence).toEqual({
      exact: 1,
      estimated: 1,
      unknown: 0
    });
    expect(trail.sourceFiles).toEqual([
      expect.objectContaining({
        sourceFile: "/tmp/included.jsonl",
        interactions: 2,
        tokens: 160,
        unknownCostInteractions: 0
      })
    ]);
  });

  it("uses metric-specific token totals for cached and non-cache evidence", async () => {
    const { buildEvidenceTrail, sqlite } = await loadEvidence();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', 10, 'Mixed token session', '/tmp/tokens.jsonl')"
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'sonnet', 100, 40, 300, 20, 10, 470, 'exact', 0.01)`
      )
      .run();

    const cachedTrail = buildEvidenceTrail({ metric: "cached-tokens" });
    const nonCacheTrail = buildEvidenceTrail({ metric: "non-cache-tokens" });

    expect(cachedTrail.totals.tokens).toBe(320);
    expect(cachedTrail.sessions[0]).toMatchObject({
      totalTokens: 320,
      interactions: 1
    });
    expect(nonCacheTrail.totals.tokens).toBe(150);
    expect(nonCacheTrail.sessions[0]).toMatchObject({
      totalTokens: 150,
      interactions: 1
    });
  });

  it("limits guardrail evidence to current-month usage", async () => {
    const { buildEvidenceTrail, sqlite } = await loadEvidence();
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 2).getTime();
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 2).getTime();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES ('session-current', 'source-current', 'claude-code', 'project-1', ?, 'Current month', '/tmp/current.jsonl')"
      )
      .run(currentMonth);
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES ('session-old', 'source-old', 'claude-code', 'project-1', ?, 'Previous month', '/tmp/old.jsonl')"
      )
      .run(previousMonth);
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('current-interaction', 'current-interaction-source', 'session-current', ?, 'assistant', 'sonnet', 100, 25, 125, 'exact', 0.03),
          ('old-interaction', 'old-interaction-source', 'session-old', ?, 'assistant', 'sonnet', 900, 100, 1000, 'exact', 0.50)`
      )
      .run(currentMonth, previousMonth);

    const trail = buildEvidenceTrail({ metric: "guardrails" });

    expect(trail.totals).toMatchObject({
      tokens: 125,
      cost: 0.03,
      sessions: 1,
      interactions: 1
    });
    expect(trail.sessions).toHaveLength(1);
    expect(trail.sessions[0]).toMatchObject({
      id: "session-current",
      totalTokens: 125
    });
  });

  it("totals the full metric set even when the session evidence preview is capped", async () => {
    const { buildEvidenceTrail, sqlite } = await loadEvidence();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')"
      )
      .run();

    const insertSession = sqlite.prepare(
      "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES (?, ?, 'claude-code', 'project-1', 10, ?, ?)"
    );
    const insertInteraction = sqlite.prepare(
      `INSERT INTO interactions
       (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
       VALUES
        (?, ?, ?, 'assistant', 'sonnet', 1, 0, 1, 'exact', 1)`
    );
    for (let index = 0; index < 101; index += 1) {
      const id = `session-${String(index).padStart(3, "0")}`;
      insertSession.run(id, `source-${index}`, `Session ${index}`, `/tmp/${id}.jsonl`);
      insertInteraction.run(`interaction-${index}`, `interaction-source-${index}`, id);
    }

    const trail = buildEvidenceTrail({ metric: "processed-tokens" });

    expect(trail.sessions).toHaveLength(100);
    expect(trail.totals).toMatchObject({
      tokens: 101,
      cost: 101,
      sessions: 101,
      interactions: 101,
      unknownCostInteractions: 0
    });
  });

  it("prefers useful imported parser metadata over a later duplicate scan row", async () => {
    const { buildEvidenceTrail, sqlite } = await loadEvidence();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'TokenTrace', '/repo/tokentrace')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('sonnet', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD')"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, project_id, started_at, title, source_file) VALUES ('session-1', 'source-1', 'claude-code', 'project-1', 10, 'Parser metadata', '/tmp/parser.jsonl')"
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'sonnet', 10, 5, 15, 'exact', 0.01)`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors) VALUES
          ('scan-imported', 1, 2, 1, 1, '[]', '[]'),
          ('scan-duplicate', 3, 4, 1, 0, '[]', '[]')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES
          ('file-imported', 'scan-imported', '/tmp/parser.jsonl', 100, 'claude-code', 'imported', 1, '[]', '[]', '{"confidence":0.95,"reason":"Claude transcript"}'),
          ('file-duplicate', 'scan-duplicate', '/tmp/parser.jsonl', 100, NULL, 'skipped_duplicate', 0, '[]', '[]', '{}')`
      )
      .run();

    const trail = buildEvidenceTrail({ metric: "processed-tokens" });

    expect(trail.sessions[0]).toMatchObject({
      parser: "claude-code",
      parserStatus: "imported",
      parserConfidence: 0.95
    });
  });
});
