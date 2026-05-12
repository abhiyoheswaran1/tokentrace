import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database, { type Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;
const tempDirs: string[] = [];

async function createTempDbPath() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-repair-"));
  tempDirs.push(tempDir);
  return path.join(tempDir, "tokentrace.db");
}

async function loadRepair(dbPath?: string) {
  dbPath ??= await createTempDbPath();
  activeSqlite?.close();
  activeSqlite = null;
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [repair, { sqlite }] = await Promise.all([
    import("@/src/lib/unknown-cost-repair"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...repair, sqlite, dbPath };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("unknown cost repair state", () => {
  it("builds grouped workbench rows with review state, links, and model alias suggestions", async () => {
    const { buildUnknownCostRepairWorkbench, saveUnknownCostReview, sqlite } = await loadRepair();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('anthropic', 'Anthropic', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('claude-code', 'anthropic', 'Claude Code')").run();
    sqlite
      .prepare(
        `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES
          ('sonnet-priced', 'anthropic', 'claude-sonnet-4-5', 3, 15, 'USD'),
          ('sonnet-snapshot', 'anthropic', 'claude-sonnet-4-5-20250929', NULL, NULL, 'USD'),
          ('unknown-model', 'anthropic', 'unknown', NULL, NULL, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES
          ('session-1', 'source-1', 'claude-code', 10, 'Snapshot pricing gap', '/tmp/claude/a.jsonl'),
          ('session-2', 'source-2', 'claude-code', 20, 'Parser model gap', '/tmp/claude/b.jsonl')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'sonnet-snapshot', 100, 50, 150, 'exact', NULL),
          ('i2', 'i2-source', 'session-1', 'assistant', 'sonnet-snapshot', 20, 30, 50, 'exact', NULL),
          ('i3', 'i3-source', 'session-2', 'assistant', 'unknown-model', 0, 0, 0, 'unknown', NULL)`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
         VALUES ('scan-1', 1, 2, 2, 3, '[]', '[]')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES
          ('file-1', 'scan-1', '/tmp/claude/a.jsonl', 100, 'claude-code', 'imported', 2, '[]', '[]', '{"confidence":0.96}'),
          ('file-2', 'scan-1', '/tmp/claude/b.jsonl', 100, 'claude-code', 'imported_with_errors', 1, '["missing model"]', '[]', '{"confidence":0.42}')`
      )
      .run();

    saveUnknownCostReview({
      key: "missing-pricing:Anthropic:claude-code:claude-sonnet-4-5-20250929:/tmp/claude/a.jsonl",
      status: "ignored",
      notes: "Waiting for provider price card."
    });

    const workbench = buildUnknownCostRepairWorkbench();

    expect(workbench.summary).toEqual({
      unresolved: 1,
      needsParserReview: 0,
      ignored: 1,
      resolved: 0,
      totalInteractions: 3
    });
    expect(workbench.groups).toHaveLength(2);
    expect(workbench.groups[0]).toMatchObject({
      key: "missing-pricing:Anthropic:claude-code:claude-sonnet-4-5-20250929:/tmp/claude/a.jsonl",
      cause: "missing pricing",
      sourceFile: "/tmp/claude/a.jsonl",
      provider: "Anthropic",
      model: "claude-sonnet-4-5-20250929",
      tool: "Claude Code",
      interactions: 2,
      totalTokens: 200,
      review: {
        status: "ignored",
        notes: "Waiting for provider price card."
      },
      suggestion: {
        suggestedModel: "claude-sonnet-4-5",
        confidence: "high"
      },
      pricingHref: "/pricing?model=claude-sonnet-4-5-20250929",
      sourceHref: "/sessions?source=%2Ftmp%2Fclaude%2Fa.jsonl&cost=unknown",
      parserHref: "/parser-debug?source=%2Ftmp%2Fclaude%2Fa.jsonl",
      sessionHref: "/sessions?source=%2Ftmp%2Fclaude%2Fa.jsonl&cost=unknown",
      repairHref: "/pricing?model=claude-sonnet-4-5-20250929"
    });
    expect(workbench.groups[1]).toMatchObject({
      key: "missing-model:Anthropic:claude-code:unknown:/tmp/claude/b.jsonl",
      cause: "missing model",
      sourceFile: "/tmp/claude/b.jsonl",
      interactions: 1,
      totalTokens: 0,
      review: {
        status: "unresolved",
        notes: ""
      },
      suggestion: {
        suggestedModel: null,
        confidence: "low"
      },
      repairHref: "/parser-debug?source=%2Ftmp%2Fclaude%2Fb.jsonl"
    });
  });

  it("persists source, model, cause, status, notes, and timestamps by stable repair key", async () => {
    const { dbPath, getUnknownCostReview, saveUnknownCostReview } = await loadRepair();

    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new")).toEqual({
      key: "missing-pricing:Anthropic:claude-new",
      sourceFile: "",
      model: "",
      cause: "",
      status: "unresolved",
      notes: "",
      createdAt: null,
      updatedAt: null
    });

    saveUnknownCostReview({
      key: "missing-pricing:Anthropic:claude-new",
      sourceFile: "/tmp/claude/transcript.jsonl",
      model: "claude-new",
      cause: "missing-pricing",
      status: "ignored",
      notes: "Internal experimental model, not priced yet."
    });

    const saved = getUnknownCostReview("missing-pricing:Anthropic:claude-new");
    expect(saved).toMatchObject({
      key: "missing-pricing:Anthropic:claude-new",
      sourceFile: "/tmp/claude/transcript.jsonl",
      model: "claude-new",
      cause: "missing-pricing",
      status: "ignored",
      notes: "Internal experimental model, not priced yet."
    });
    expect(saved.createdAt).toEqual(expect.any(Number));
    expect(saved.updatedAt).toEqual(expect.any(Number));

    const reloaded = await loadRepair(dbPath);
    expect(reloaded.getUnknownCostReview("missing-pricing:Anthropic:claude-new")).toMatchObject({
      key: "missing-pricing:Anthropic:claude-new",
      sourceFile: "/tmp/claude/transcript.jsonl",
      model: "claude-new",
      cause: "missing-pricing",
      status: "ignored",
      notes: "Internal experimental model, not priced yet."
    });
  });

  it("lists repair items and applies explicit state transitions", async () => {
    const {
      getUnknownCostReview,
      listUnknownCostRepairs,
      markUnknownCostRepairIgnored,
      markUnknownCostRepairResolved,
      saveUnknownCostReview
    } = await loadRepair();

    saveUnknownCostReview({
      key: "missing-pricing:Anthropic:claude-new",
      sourceFile: "/tmp/claude/transcript.jsonl",
      model: "claude-new",
      cause: "missing-pricing",
      status: "unresolved",
      notes: "Needs pricing."
    });
    saveUnknownCostReview({
      key: "parser-review:OpenAI:gpt-next",
      sourceFile: "/tmp/openai/response.jsonl",
      model: "gpt-next",
      cause: "parser-review",
      status: "needs-parser-review"
    });

    expect(listUnknownCostRepairs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "missing-pricing:Anthropic:claude-new",
          model: "claude-new",
          cause: "missing-pricing",
          status: "unresolved",
          notes: "Needs pricing."
        }),
        expect.objectContaining({
          key: "parser-review:OpenAI:gpt-next",
          model: "gpt-next",
          cause: "parser-review",
          status: "needs-parser-review",
          notes: ""
        })
      ])
    );

    markUnknownCostRepairResolved("missing-pricing:Anthropic:claude-new", "Added manifest pricing.");
    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-new")).toMatchObject({
      status: "resolved",
      notes: "Added manifest pricing."
    });

    markUnknownCostRepairIgnored("parser-review:OpenAI:gpt-next", "Known parser gap.");
    expect(getUnknownCostReview("parser-review:OpenAI:gpt-next")).toMatchObject({
      status: "ignored",
      notes: "Known parser gap."
    });
  });

  it("preserves long existing notes when marking resolved or ignored without new notes", async () => {
    const {
      getUnknownCostReview,
      markUnknownCostRepairIgnored,
      markUnknownCostRepairResolved,
      saveUnknownCostReview
    } = await loadRepair();
    const longNotes = "Long local review note. ".repeat(40);

    saveUnknownCostReview({
      key: "missing-pricing:Anthropic:claude-long-note",
      sourceFile: "/tmp/claude/long-note.jsonl",
      model: "claude-long-note",
      cause: "missing-pricing",
      status: "unresolved",
      notes: "Initial note."
    });
    activeSqlite
      ?.prepare("UPDATE unknown_cost_reviews SET notes = ? WHERE key = ?")
      .run(longNotes, "missing-pricing:Anthropic:claude-long-note");

    markUnknownCostRepairResolved("missing-pricing:Anthropic:claude-long-note");
    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-long-note")).toMatchObject({
      status: "resolved",
      notes: longNotes
    });

    markUnknownCostRepairIgnored("missing-pricing:Anthropic:claude-long-note");
    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-long-note")).toMatchObject({
      status: "ignored",
      notes: longNotes
    });
  });

  it("upgrades existing thin review tables without losing local decisions", async () => {
    const dbPath = await createTempDbPath();
    const sqlite = new Database(dbPath);
    sqlite.exec(`
      CREATE TABLE unknown_cost_reviews (
        key TEXT PRIMARY KEY,
        state TEXT NOT NULL DEFAULT 'unresolved',
        note TEXT NOT NULL DEFAULT '',
        updated_at INTEGER NOT NULL DEFAULT 1700000000000
      );
      INSERT INTO unknown_cost_reviews (key, state, note, updated_at)
      VALUES ('missing-pricing:Anthropic:claude-old', 'ignored', 'Already reviewed.', 1700000000000);
    `);
    sqlite.close();

    const { getUnknownCostReview, saveUnknownCostReview } = await loadRepair(dbPath);

    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-old")).toMatchObject({
      key: "missing-pricing:Anthropic:claude-old",
      sourceFile: "",
      model: "claude-old",
      cause: "missing-pricing",
      status: "ignored",
      notes: "Already reviewed."
    });

    saveUnknownCostReview({
      key: "missing-pricing:Anthropic:claude-old",
      sourceFile: "/tmp/claude/old.jsonl",
      model: "claude-old",
      cause: "missing-pricing",
      status: "resolved",
      notes: "Backfilled pricing."
    });

    expect(getUnknownCostReview("missing-pricing:Anthropic:claude-old")).toMatchObject({
      sourceFile: "/tmp/claude/old.jsonl",
      model: "claude-old",
      cause: "missing-pricing",
      status: "resolved",
      notes: "Backfilled pricing."
    });
  });
});
