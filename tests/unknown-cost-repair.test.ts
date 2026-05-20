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
  it("uses unambiguous workbench keys and preserves metadata on API-style saves", async () => {
    const { buildUnknownCostRepairWorkbench, getUnknownCostReview, saveUnknownCostReview, sqlite } = await loadRepair();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('p-colon', 'Provider:A', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('p-underscore', 'Provider_A', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('tool-colon', 'p-colon', 'Repair Tool')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('tool-underscore', 'p-underscore', 'Repair Tool')").run();
    sqlite
      .prepare(
        `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES
          ('model-colon', 'p-colon', 'model:alpha', NULL, NULL, 'USD'),
          ('model-underscore', 'p-underscore', 'model_alpha', NULL, NULL, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES
          ('session-colon', 'source-colon', 'tool-colon', 10, 'Colon source', '/tmp/source:one.jsonl'),
          ('session-underscore', 'source-underscore', 'tool-underscore', 20, 'Underscore source', '/tmp/source:one.jsonl')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i-colon', 'i-colon-source', 'session-colon', 'assistant', 'model-colon', 10, 5, 15, 'exact', NULL),
          ('i-underscore', 'i-underscore-source', 'session-underscore', 'assistant', 'model-underscore', 8, 7, 15, 'exact', NULL)`
      )
      .run();

    const groups = buildUnknownCostRepairWorkbench().groups;
    const colonGroup = groups.find((group) => group.provider === "Provider:A");
    const underscoreGroup = groups.find((group) => group.provider === "Provider_A");

    expect(colonGroup).toBeDefined();
    expect(underscoreGroup).toBeDefined();
    expect(colonGroup?.key).not.toBe(underscoreGroup?.key);
    expect(colonGroup?.key).toMatch(/^repair:v1:/);

    saveUnknownCostReview({
      key: colonGroup!.key,
      status: "needs-parser-review",
      notes: "API-style update with only key, state, and note."
    });

    expect(getUnknownCostReview(colonGroup!.key)).toMatchObject({
      key: colonGroup!.key,
      sourceFile: "/tmp/source:one.jsonl",
      model: "model:alpha",
      cause: "missing pricing",
      status: "needs-parser-review",
      notes: "API-style update with only key, state, and note."
    });

    saveUnknownCostReview({
      key: underscoreGroup!.key,
      sourceFile: "/tmp/wrong.jsonl",
      model: "wrong-model",
      cause: "wrong-cause",
      status: "ignored",
      notes: "Attempted metadata override."
    });

    expect(getUnknownCostReview(underscoreGroup!.key)).toMatchObject({
      key: underscoreGroup!.key,
      sourceFile: "/tmp/source:one.jsonl",
      model: "model_alpha",
      cause: "missing pricing",
      status: "ignored",
      notes: "Attempted metadata override."
    });
  });

  it("rejects API updates for unknown repair keys with spoofed metadata", async () => {
    const { getUnknownCostReview } = await loadRepair();
    const { PUT } = await import("@/app/api/repair-items/route");

    const response = await PUT(new Request("http://localhost/api/repair-items", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        key: "repair:v1:missing%20pricing:Fake:Tool:fake-model:%2Ftmp%2Fspoofed.jsonl",
        status: "ignored",
        notes: "Should not persist.",
        sourceFile: "/tmp/spoofed.jsonl",
        model: "fake-model",
        cause: "missing pricing"
      })
    }));

    expect(response.status).toBe(404);
    expect(getUnknownCostReview("repair:v1:missing%20pricing:Fake:Tool:fake-model:%2Ftmp%2Fspoofed.jsonl")).toMatchObject({
      sourceFile: "",
      model: "",
      cause: "",
      status: "unresolved",
      notes: "",
      updatedAt: null
    });
  });

  it("returns a clean validation error for malformed repair update JSON", async () => {
    await loadRepair();
    const { PUT } = await import("@/app/api/repair-items/route");

    const response = await PUT(new Request("http://localhost/api/repair-items", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: "{not-json"
    }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "request body must be valid JSON" });
  });

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
      key: expect.stringMatching(/^repair:v1:/),
      cause: "missing pricing",
      sourceFile: "/tmp/claude/a.jsonl",
      provider: "Anthropic",
      model: "claude-sonnet-4-5-20250929",
      tool: "Claude Code",
      state: "ignored",
      note: "Waiting for provider price card.",
      suggestedModel: "claude-sonnet-4-5",
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
      primaryAction: {
        kind: "set-model-rate",
        label: "Set model rate",
        href: "/pricing?model=claude-sonnet-4-5-20250929",
        expectedChange: "These interactions can move from unknown cost into priced or estimated cost totals."
      },
      secondaryActions: expect.arrayContaining([
        expect.objectContaining({ kind: "view-evidence", href: "/sessions?source=%2Ftmp%2Fclaude%2Fa.jsonl&cost=unknown" }),
        expect.objectContaining({ kind: "review-parser", href: "/parser-debug?source=%2Ftmp%2Fclaude%2Fa.jsonl" })
      ]),
      impact: "After setting the model rate and recalculating, these interactions can move from unknown cost into priced or estimated cost totals.",
      resolvedStateLabel: "Resolved after local pricing recalculation",
      itemHref: expect.stringMatching(/^\/repair\?key=repair%3Av1%3A/),
      sourceHref: "/sessions?source=%2Ftmp%2Fclaude%2Fa.jsonl&cost=unknown",
      parserHref: "/parser-debug?source=%2Ftmp%2Fclaude%2Fa.jsonl",
      sessionHref: "/sessions?source=%2Ftmp%2Fclaude%2Fa.jsonl&cost=unknown",
      sessionsHref: "/sessions?source=%2Ftmp%2Fclaude%2Fa.jsonl&cost=unknown",
      repairHref: "/pricing?model=claude-sonnet-4-5-20250929"
    });
    expect(workbench.groups[1]).toMatchObject({
      key: expect.stringMatching(/^repair:v1:/),
      cause: "missing model",
      sourceFile: "/tmp/claude/b.jsonl",
      state: "unresolved",
      note: "",
      suggestedModel: null,
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
      itemHref: expect.stringMatching(/^\/repair\?key=repair%3Av1%3A/),
      primaryAction: {
        kind: "review-parser",
        label: "Review parser evidence",
        href: "/parser-debug?source=%2Ftmp%2Fclaude%2Fb.jsonl",
        expectedChange: "Parser review can recover a usable model name so pricing can be matched."
      },
      secondaryActions: expect.arrayContaining([
        expect.objectContaining({ kind: "view-evidence", href: "/sessions?source=%2Ftmp%2Fclaude%2Fb.jsonl&cost=unknown" }),
        expect.objectContaining({ kind: "open-focused-repair" })
      ]),
      impact: "After parser review records a usable model name, TokenTrace can match the interaction to model rates and remove the model gap.",
      resolvedStateLabel: "Resolved after parser evidence is corrected",
      repairHref: "/parser-debug?source=%2Ftmp%2Fclaude%2Fb.jsonl"
    });
  });

  it("classifies missing provider and parser-review workbench groups", async () => {
    const { buildUnknownCostRepairWorkbench, sqlite } = await loadRepair();

    sqlite.prepare("PRAGMA foreign_keys = OFF").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('orphan-tool', 'missing-provider', 'Detached Tool')").run();
    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare(
        `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES
          ('orphan-model', 'missing-provider', 'orphan-model', NULL, NULL, 'USD'),
          ('priced-model', 'openai', 'gpt-5', 1, 10, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES
          ('provider-session', 'provider-source', 'orphan-tool', 10, 'Provider gap', '/tmp/orphan.jsonl'),
          ('parser-session', 'parser-source', 'codex', 20, 'Parser review', '/tmp/parser.jsonl')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('provider-i1', 'provider-i1-source', 'provider-session', 'assistant', 'orphan-model', 10, 5, 15, 'exact', NULL),
          ('parser-i1', 'parser-i1-source', 'parser-session', 'assistant', 'priced-model', 40, 10, 50, 'exact', NULL)`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported, warnings, errors)
         VALUES ('scan-1', 1, 2, 2, 2, '[]', '[]')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO scan_files
          (id, scan_run_id, path, size_bytes, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES
          ('provider-file', 'scan-1', '/tmp/orphan.jsonl', 100, 'generic-jsonl', 'imported', 1, '[]', '[]', '{}'),
          ('parser-file', 'scan-1', '/tmp/parser.jsonl', 100, 'codex-cli', 'imported_with_errors', 1, '["cost metadata changed"]', '[]', '{}')`
      )
      .run();
    sqlite.prepare("PRAGMA foreign_keys = ON").run();

    const causes = buildUnknownCostRepairWorkbench().groups.map((group) => ({
      cause: group.cause,
      key: group.key,
      provider: group.provider,
      state: group.state,
      note: group.note,
      suggestedModel: group.suggestedModel,
      sessionsHref: group.sessionsHref
    }));

    expect(causes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cause: "missing provider",
          provider: "Unknown",
          state: "unresolved",
          note: "",
          suggestedModel: null,
          sessionsHref: "/sessions?source=%2Ftmp%2Forphan.jsonl&cost=unknown"
        }),
        expect.objectContaining({
          cause: "parser review",
          provider: "OpenAI",
          state: "unresolved",
          note: "",
          suggestedModel: null,
          sessionsHref: "/sessions?source=%2Ftmp%2Fparser.jsonl&cost=unknown"
        })
      ])
    );
  });

  it("filters repair groups to the selected interaction date window", async () => {
    const { buildUnknownCostRepairWorkbench, sqlite } = await loadRepair();
    const includedAt = new Date(2026, 4, 2).getTime();
    const excludedAt = new Date(2026, 3, 2).getTime();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare(
        `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES
          ('included-model', 'openai', 'gpt-included', NULL, NULL, 'USD'),
          ('excluded-model', 'openai', 'gpt-excluded', NULL, NULL, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES
          ('included-session', 'included-source', 'codex', ?, 'Included gap', '/tmp/included.jsonl'),
          ('excluded-session', 'excluded-source', 'codex', ?, 'Excluded gap', '/tmp/excluded.jsonl')`
      )
      .run(includedAt, excludedAt);
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, timestamp, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('included-i', 'included-i-source', 'included-session', 'assistant', 'included-model', ?, 100, 20, 120, 'exact', NULL),
          ('excluded-i', 'excluded-i-source', 'excluded-session', 'assistant', 'excluded-model', ?, 500, 100, 600, 'exact', NULL)`
      )
      .run(includedAt, excludedAt);

    const workbench = buildUnknownCostRepairWorkbench({
      from: new Date(2026, 4, 1).getTime(),
      to: new Date(2026, 4, 3).getTime()
    });

    expect(workbench.summary.totalInteractions).toBe(1);
    expect(workbench.groups).toHaveLength(1);
    expect(workbench.groups[0]).toMatchObject({
      model: "gpt-included",
      sourceFile: "/tmp/included.jsonl"
    });
  });

  it("can cap visible repair groups without losing full summary counts", async () => {
    const { buildUnknownCostRepairWorkbench, sqlite } = await loadRepair();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare(
        `INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES
          ('gpt-a', 'openai', 'gpt-a', NULL, NULL, 'USD'),
          ('gpt-b', 'openai', 'gpt-b', NULL, NULL, 'USD'),
          ('gpt-c', 'openai', 'gpt-c', NULL, NULL, 'USD')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES
          ('session-a', 'source-a', 'codex', 10, 'A', '/tmp/a.jsonl'),
          ('session-b', 'source-b', 'codex', 20, 'B', '/tmp/b.jsonl'),
          ('session-c', 'source-c', 'codex', 30, 'C', '/tmp/c.jsonl')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i-a', 'i-a-source', 'session-a', 'assistant', 'gpt-a', 100, 20, 120, 'exact', NULL),
          ('i-b', 'i-b-source', 'session-b', 'assistant', 'gpt-b', 90, 10, 100, 'exact', NULL),
          ('i-c', 'i-c-source', 'session-c', 'assistant', 'gpt-c', 80, 10, 90, 'exact', NULL)`
      )
      .run();

    const workbench = buildUnknownCostRepairWorkbench({}, { limit: 2 });

    expect(workbench.totalGroups).toBe(3);
    expect(workbench.shownGroups).toBe(2);
    expect(workbench.hasMoreGroups).toBe(true);
    expect(workbench.summary.totalInteractions).toBe(3);
    expect(workbench.summary.unresolved).toBe(3);
    expect(workbench.groups).toHaveLength(2);
  });

  it("marks missing-pricing repair items resolved when a price update recalculates their costs", async () => {
    const { buildUnknownCostRepairWorkbench, getUnknownCostReview, sqlite } = await loadRepair();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('gpt-new', 'openai', 'gpt-new', NULL, NULL, 'USD')"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, started_at, title, source_file) VALUES ('session-1', 'source-1', 'codex', 10, 'Pricing gap', '/tmp/codex.jsonl')"
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, input_tokens, output_tokens, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'gpt-new', 1000, 500, 1500, 'exact', NULL)`
      )
      .run();

    const before = buildUnknownCostRepairWorkbench().groups[0];
    expect(before).toMatchObject({
      cause: "missing pricing",
      model: "gpt-new",
      state: "unresolved"
    });

    const { upsertPricing } = await import("@/src/lib/pricing");
    const result = upsertPricing({
      providerId: "openai",
      providerName: "OpenAI",
      model: "gpt-new",
      inputTokenPrice: 1,
      outputTokenPrice: 10,
      cachedInputTokenPrice: null,
      cacheWriteTokenPrice: null,
      currency: "USD"
    });

    expect(result).toMatchObject({
      id: "gpt-new",
      interactionsChecked: 1,
      interactionsUpdated: 1,
      unknownCostInteractions: 0,
      resolvedRepairItems: 1
    });
    expect(buildUnknownCostRepairWorkbench().groups).toHaveLength(0);
    expect(getUnknownCostReview(before.key)).toMatchObject({
      status: "resolved",
      notes: "Resolved after pricing update recalculated local interaction costs."
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

  it("applies bulk review actions to unresolved repair groups", async () => {
    const { buildUnknownCostRepairWorkbench, bulkUpdateUnknownCostRepairs, sqlite } = await loadRepair();

    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('local-wrapper', 'openai', 'Local Wrapper')").run();
    sqlite.prepare("INSERT INTO models (id, provider_id, name) VALUES ('unknown-model', 'openai', 'unknown')").run();
    sqlite
      .prepare(
        `INSERT INTO sessions (id, source_id, tool_id, source_file)
         VALUES ('session-1', 'source-1', 'local-wrapper', '/tmp/local.db')`
      )
      .run();
    sqlite
      .prepare(
        `INSERT INTO interactions
          (id, source_id, session_id, role, model_id, total_tokens, token_confidence, cost)
         VALUES
          ('i1', 'i1-source', 'session-1', 'assistant', 'unknown-model', 0, 'unknown', NULL),
          ('i2', 'i2-source', 'session-1', 'assistant', 'unknown-model', 0, 'unknown', NULL)`
      )
      .run();

    const before = buildUnknownCostRepairWorkbench();
    const key = before.groups[0].key;
    const result = bulkUpdateUnknownCostRepairs({
      keys: [key],
      status: "needs-parser-review",
      notes: "Bulk parser review"
    });

    expect(result.updated).toBe(1);
    expect(buildUnknownCostRepairWorkbench().groups[0].review).toMatchObject({
      status: "needs-parser-review",
      notes: "Bulk parser review"
    });
  });
});
