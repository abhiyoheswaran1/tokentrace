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
});
