import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function loadTimeline() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-timeline-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [timeline, { sqlite }] = await Promise.all([
    import("@/src/lib/session-timeline"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...timeline, sqlite };
}

function seedTimeline(sqlite: BetterSqliteDatabase) {
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
  sqlite.prepare("INSERT INTO projects (id, name, path) VALUES ('project-1', 'Project', '/tmp/project')").run();
  sqlite
    .prepare(
      `INSERT INTO sessions
        (id, source_id, tool_id, project_id, started_at, ended_at, title, source_file)
       VALUES ('session-1', 'source-1', 'codex-cli', 'project-1', 1800000000000, 1800000005000, 'Implement feature', '/tmp/codex.jsonl')`
    )
    .run();
  sqlite.prepare("INSERT INTO models (id, provider_id, name) VALUES ('gpt-5', 'openai', 'gpt-5.5')").run();
  sqlite.prepare("INSERT INTO models (id, provider_id, name) VALUES ('gpt-5-mini', 'openai', 'gpt-5.4-mini')").run();
  sqlite
    .prepare(
      `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported)
       VALUES ('scan-1', 1800000006000, 1800000007000, 1, 3)`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO scan_files
        (id, scan_run_id, path, parser, status, records_imported, raw_metadata)
       VALUES ('file-1', 'scan-1', '/tmp/codex.jsonl', 'codex-cli', 'imported', 3, '{"confidence":0.96,"reason":"Codex JSONL"}')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO interactions
        (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens,
         cache_read_tokens, cache_write_tokens, reasoning_tokens, total_tokens, token_confidence,
         cost, cost_estimated, raw_text_preview, raw_text)
       VALUES
        ('i1', 'i1', 'session-1', 1800000000000, 'user', 'gpt-5', 100, 0, 0, 0, 0, 100, 'exact', 0.01, 0, 'preview one', 'secret prompt one'),
        ('i2', 'i2', 'session-1', 1800000001000, 'assistant', 'gpt-5-mini', 50, 500, 900, 0, 100, 1550, 'exact', 0.20, 0, 'preview two', 'secret prompt two'),
        ('i3', 'i3', 'session-1', 1800000002000, 'assistant', 'gpt-5-mini', 20, 40, 0, 0, 0, 60, 'high-confidence estimate', NULL, 0, 'preview three', 'secret prompt three')`
    )
    .run();
  sqlite
    .prepare(
      `INSERT INTO tool_calls (id, interaction_id, name, status, duration_ms)
       VALUES ('tool-1', 'i2', 'shell.exec', 'success', 320)`
    )
    .run();
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("session timeline", () => {
  it("builds ordered usage events with model, spike, cache, cost, parser, and tool-call markers", async () => {
    const { buildSessionTimeline, sqlite } = await loadTimeline();
    seedTimeline(sqlite);

    const timeline = buildSessionTimeline("session-1");

    expect(timeline?.session).toMatchObject({
      id: "session-1",
      title: "Implement feature",
      tool: "Codex CLI",
      provider: "OpenAI",
      project: "Project",
      sourceFile: "/tmp/codex.jsonl"
    });
    expect(timeline?.summary).toMatchObject({
      interactions: 3,
      totalTokens: 1710,
      cachedTokens: 900,
      cost: 0.21,
      parserConfidence: 0.96
    });
    expect(timeline?.events.map((event) => event.kind)).toEqual([
      "interaction",
      "model-change",
      "interaction",
      "token-spike",
      "cache",
      "tool-call",
      "interaction",
      "unknown-cost"
    ]);
    expect(timeline?.events.find((event) => event.kind === "interaction")?.rawTextHidden).toBe(true);
    expect(JSON.stringify(timeline)).not.toContain("secret prompt");
  });

  it("summarizes session confidence and repairable unknown-cost causes", async () => {
    const { buildSessionTimeline, sqlite } = await loadTimeline();
    seedTimeline(sqlite);

    const timeline = buildSessionTimeline("session-1");

    expect(timeline?.confidence).toMatchObject({
      grade: "medium",
      exactTokenInteractions: 2,
      tokenizerEstimateInteractions: 0,
      pricedCostInteractions: 2,
      unknownCostInteractions: 1
    });
    expect(timeline?.repair).toMatchObject({
      unknownCostCause: "missing pricing",
      repairHref: expect.stringContaining("/repair?key=")
    });
    expect(timeline?.spikes[0]).toMatchObject({
      interactionId: "i2",
      reason: expect.stringContaining("above this session")
    });
  });

  it("returns null for missing sessions", async () => {
    const { buildSessionTimeline } = await loadTimeline();

    expect(buildSessionTimeline("missing")).toBeNull();
  });
});
