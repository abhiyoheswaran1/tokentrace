import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-alias-backfill-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ backfillAlias }, dbClient] = await Promise.all([
    import("@/src/lib/model-aliases/backfill"),
    import("@/src/db/client")
  ]);
  activeSqlite = dbClient.sqlite;
  return { backfillAlias, sqlite: dbClient.sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function seed(sqlite: SqliteDatabase) {
  sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
  sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
  sqlite
    .prepare(
      "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('m-priced', 'openai', 'gpt-5', 2, 8, 'USD')"
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO models (id, provider_id, name, currency) VALUES ('m-observed', 'openai', 'GPT-5', 'USD')"
    )
    .run();
  sqlite
    .prepare(
      "INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('s', 'src', 'codex-cli', '/tmp/x.jsonl')"
    )
    .run();
}

function insertInteraction(
  sqlite: SqliteDatabase,
  args: { id: string; modelId: string | null; input: number; output: number; cost: number | null }
) {
  sqlite
    .prepare(
      `INSERT INTO interactions
         (id, source_id, session_id, timestamp, role, model_id, total_tokens, input_tokens, output_tokens, token_confidence, cost)
       VALUES (?, ?, 's', 1700000000000, 'assistant', ?, ?, ?, ?, 'exact', ?)`
    )
    .run(args.id, `${args.id}-src`, args.modelId, args.input + args.output, args.input, args.output, args.cost);
}

describe("backfillAlias", () => {
  it("computes and writes cost for unknown-cost interactions matching the alias", async () => {
    const { backfillAlias, sqlite } = await loadModule();
    seed(sqlite);
    insertInteraction(sqlite, { id: "i1", modelId: "m-observed", input: 1_000_000, output: 500_000, cost: null });
    insertInteraction(sqlite, { id: "i2", modelId: "m-observed", input: 2_000_000, output: 0, cost: null });

    const result = backfillAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m-priced"
    });

    // i1: 1M input * $2 + 500k output * $8 = $2 + $4 = $6
    // i2: 2M input * $2 + 0 = $4
    expect(result.affectedInteractions).toBe(2);
    expect(result.totalCost).toBeCloseTo(10, 5);

    const rows = sqlite.prepare("SELECT id, cost, cost_estimated FROM interactions WHERE model_id = 'm-observed'").all() as Array<{
      id: string;
      cost: number;
      cost_estimated: number;
    }>;
    const byId = Object.fromEntries(rows.map((row) => [row.id, row]));
    expect(byId.i1).toBeDefined();
    expect(byId.i2).toBeDefined();
    expect(byId.i1!.cost).toBeCloseTo(6, 5);
    expect(byId.i2!.cost).toBeCloseTo(4, 5);
    expect(byId.i1!.cost_estimated).toBe(1);
  });

  it("does not touch interactions that already have cost", async () => {
    const { backfillAlias, sqlite } = await loadModule();
    seed(sqlite);
    insertInteraction(sqlite, { id: "i-priced", modelId: "m-observed", input: 1_000_000, output: 0, cost: 99 });
    insertInteraction(sqlite, { id: "i-unknown", modelId: "m-observed", input: 1_000_000, output: 0, cost: null });

    const result = backfillAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m-priced"
    });

    expect(result.affectedInteractions).toBe(1);
    const stayed = sqlite.prepare("SELECT cost FROM interactions WHERE id = 'i-priced'").get() as { cost: number };
    expect(stayed.cost).toBe(99);
  });

  it("dryRun reports what would be written without changing the database", async () => {
    const { backfillAlias, sqlite } = await loadModule();
    seed(sqlite);
    insertInteraction(sqlite, { id: "i1", modelId: "m-observed", input: 1_000_000, output: 500_000, cost: null });

    const preview = backfillAlias(
      {
        providerId: "openai",
        observedModel: "GPT-5",
        pricedModelId: "m-priced"
      },
      { dryRun: true }
    );
    expect(preview.affectedInteractions).toBe(1);
    expect(preview.totalCost).toBeCloseTo(6, 5);

    const row = sqlite.prepare("SELECT cost FROM interactions WHERE id = 'i1'").get() as { cost: number | null };
    expect(row.cost).toBeNull();
  });

  it("returns 0 when the priced model has no complete pricing", async () => {
    const { backfillAlias, sqlite } = await loadModule();
    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex-cli', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, currency) VALUES ('m-priced', 'openai', 'gpt-5', 'USD')"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO models (id, provider_id, name, currency) VALUES ('m-observed', 'openai', 'GPT-5', 'USD')"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('s', 'src', 'codex-cli', '/tmp/x.jsonl')"
      )
      .run();
    insertInteraction(sqlite, { id: "i1", modelId: "m-observed", input: 1_000_000, output: 0, cost: null });

    const result = backfillAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m-priced"
    });

    expect(result.affectedInteractions).toBe(0);
    expect(result.skippedReason).toMatch(/pricing/i);
  });

  it("returns 0 when no observed-model row exists in the models table", async () => {
    const { backfillAlias, sqlite } = await loadModule();
    seed(sqlite);

    const result = backfillAlias({
      providerId: "openai",
      observedModel: "GhostModelThatDoesNotExist",
      pricedModelId: "m-priced"
    });

    expect(result.affectedInteractions).toBe(0);
  });
});
