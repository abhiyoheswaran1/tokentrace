import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadStore() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-model-aliases-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [store, dbClient] = await Promise.all([
    import("@/src/lib/model-aliases/store"),
    import("@/src/db/client")
  ]);
  activeSqlite = dbClient.sqlite;
  return { store, sqlite: dbClient.sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function seedPricedModel(sqlite: SqliteDatabase, providerId: string, modelId: string, name: string) {
  sqlite
    .prepare(
      "INSERT OR IGNORE INTO providers (id, name, type) VALUES (?, ?, 'llm-provider')"
    )
    .run(providerId, providerId);
  sqlite
    .prepare(
      "INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES (?, ?, ?, 1, 2, 'USD')"
    )
    .run(modelId, providerId, name);
}

describe("model alias store", () => {
  it("upserts an alias and returns the stored row", async () => {
    const { store, sqlite } = await loadStore();
    seedPricedModel(sqlite, "openai", "m-priced", "gpt-5");

    const created = store.upsertAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m-priced",
      confidence: 0.95,
      rule: "exact-model"
    });

    expect(created).toMatchObject({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m-priced",
      confidence: 0.95,
      rule: "exact-model"
    });
    expect(created.id).toMatch(/^alias-/);
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBeGreaterThan(0);
  });

  it("treats (providerId, observedModel) as unique and updates on second upsert", async () => {
    const { store, sqlite } = await loadStore();
    seedPricedModel(sqlite, "openai", "m1", "gpt-5");
    seedPricedModel(sqlite, "openai", "m2", "gpt-5-mini");

    const first = store.upsertAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m1",
      confidence: 0.7,
      rule: "family-fragment"
    });

    const second = store.upsertAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m2",
      confidence: 0.95,
      rule: "exact-model"
    });

    expect(second.id).toBe(first.id);
    expect(second.pricedModelId).toBe("m2");
    expect(second.confidence).toBe(0.95);
    expect(second.rule).toBe("exact-model");
    expect(second.updatedAt).toBeGreaterThanOrEqual(first.updatedAt);
    expect(store.listAliases()).toHaveLength(1);
  });

  it("listAliases returns rows joined with priced-model metadata", async () => {
    const { store, sqlite } = await loadStore();
    seedPricedModel(sqlite, "openai", "m1", "gpt-5");
    seedPricedModel(sqlite, "anthropic", "m2", "claude-opus-4-7");

    store.upsertAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m1",
      confidence: 0.95,
      rule: "exact-model"
    });
    store.upsertAlias({
      providerId: "anthropic",
      observedModel: "claude-opus-4-7-20260101",
      pricedModelId: "m2",
      confidence: 0.7,
      rule: "family-fragment"
    });

    const aliases = store.listAliases();
    expect(aliases).toHaveLength(2);
    const openaiAlias = aliases.find((row) => row.providerId === "openai");
    expect(openaiAlias?.pricedModelName).toBe("gpt-5");
    expect(openaiAlias?.providerName).toBe("openai");
  });

  it("getAlias returns null for unknown (provider, model) pairs", async () => {
    const { store } = await loadStore();
    expect(store.getAlias("openai", "ghost-model")).toBeNull();
  });

  it("deleteAlias removes the row and returns true; second call returns false", async () => {
    const { store, sqlite } = await loadStore();
    seedPricedModel(sqlite, "openai", "m1", "gpt-5");
    store.upsertAlias({
      providerId: "openai",
      observedModel: "GPT-5",
      pricedModelId: "m1",
      confidence: 0.95,
      rule: "exact-model"
    });

    expect(store.deleteAlias("openai", "GPT-5")).toBe(true);
    expect(store.deleteAlias("openai", "GPT-5")).toBe(false);
    expect(store.listAliases()).toHaveLength(0);
  });

  it("rejects aliases that reference a missing priced model", async () => {
    const { store } = await loadStore();
    expect(() =>
      store.upsertAlias({
        providerId: "openai",
        observedModel: "GPT-5",
        pricedModelId: "missing-model",
        confidence: 0.95,
        rule: "exact-model"
      })
    ).toThrow(/priced model/i);
  });
});
