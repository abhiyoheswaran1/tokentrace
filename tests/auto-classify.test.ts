import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  ClassificationLookups,
  ClassifyInput
} from "@/src/lib/unknown-cost-repair/auto-classify";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-auto-classify-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ classifyGroup, buildClassificationLookups }, { sqlite }] = await Promise.all([
    import("@/src/lib/unknown-cost-repair/auto-classify"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { classifyGroup, buildClassificationLookups, sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

function pureLookups(): ClassificationLookups {
  return {
    pricedByProvider: new Map([
      [
        "openai",
        [
          { providerId: "openai", providerName: "OpenAI", modelName: "gpt-5", usageCount: 100 },
          { providerId: "openai", providerName: "OpenAI", modelName: "gpt-5-mini", usageCount: 50 }
        ]
      ],
      [
        "anthropic",
        [
          { providerId: "anthropic", providerName: "Anthropic", modelName: "claude-opus-4-7", usageCount: 200 }
        ]
      ]
    ]),
    pricedBySource: new Map([
      [
        "/tmp/source-a.jsonl",
        {
          sourceFile: "/tmp/source-a.jsonl",
          providerId: "openai",
          providerName: "OpenAI",
          modelName: "gpt-5",
          usageCount: 30
        }
      ]
    ])
  };
}

describe("classifyGroup (pure-function rules)", () => {
  it("returns exact-model with confidence 0.95 when the case-insensitive name matches a priced model", async () => {
    const { classifyGroup } = await loadModule();
    const input: ClassifyInput = {
      cause: "missing pricing",
      providerId: "openai",
      model: "GPT-5",
      sourceFile: "/tmp/x.jsonl"
    };
    const result = classifyGroup(input, pureLookups());
    expect(result.rule).toBe("exact-model");
    expect(result.confidence).toBe(0.95);
    expect(result.suggestedModel).toBe("gpt-5");
    expect(result.suggestedProvider).toBe("OpenAI");
    expect(result.evidence.matchedRows).toBe(100);
  });

  it("returns family-fragment with confidence 0.70 when a normalized candidate matches", async () => {
    const { classifyGroup } = await loadModule();
    const input: ClassifyInput = {
      cause: "missing pricing",
      providerId: "anthropic",
      model: "claude-opus-4-7-20260101", // snapshot-suffixed
      sourceFile: "/tmp/x.jsonl"
    };
    const result = classifyGroup(input, pureLookups());
    expect(result.rule).toBe("family-fragment");
    expect(result.confidence).toBe(0.7);
    expect(result.suggestedModel).toBe("claude-opus-4-7");
  });

  it("returns parser-source with confidence 0.45 when the source file has priced examples", async () => {
    const { classifyGroup } = await loadModule();
    const input: ClassifyInput = {
      cause: "missing model",
      providerId: "openai",
      model: "unknown",
      sourceFile: "/tmp/source-a.jsonl"
    };
    const result = classifyGroup(input, pureLookups());
    expect(result.rule).toBe("parser-source");
    expect(result.confidence).toBe(0.45);
    expect(result.suggestedModel).toBe("gpt-5");
    expect(result.evidence.sampleSourceFile).toBe("/tmp/source-a.jsonl");
  });

  it("returns rule='none' with confidence 0 when no rule matches", async () => {
    const { classifyGroup } = await loadModule();
    const input: ClassifyInput = {
      cause: "missing pricing",
      providerId: "openai",
      model: "completely-novel-model-name-with-no-match",
      sourceFile: "/tmp/unknown-source.jsonl"
    };
    const result = classifyGroup(input, pureLookups());
    expect(result.rule).toBe("none");
    expect(result.confidence).toBe(0);
    expect(result.suggestedModel).toBeNull();
  });

  it("does not suggest a model from a different provider", async () => {
    const { classifyGroup } = await loadModule();
    const input: ClassifyInput = {
      cause: "missing pricing",
      providerId: "anthropic",
      model: "gpt-5",
      sourceFile: "/tmp/x.jsonl"
    };
    const result = classifyGroup(input, pureLookups());
    expect(result.rule).toBe("none");
  });

  it("prefers exact-model over parser-source when both match", async () => {
    const { classifyGroup } = await loadModule();
    const input: ClassifyInput = {
      cause: "missing pricing",
      providerId: "openai",
      model: "gpt-5",
      sourceFile: "/tmp/source-a.jsonl"
    };
    const result = classifyGroup(input, pureLookups());
    expect(result.rule).toBe("exact-model");
  });
});

describe("buildClassificationLookups (DB-backed)", () => {
  it("builds lookups from priced models and priced source-file usage", async () => {
    const { buildClassificationLookups, sqlite } = await loadModule();
    sqlite.prepare("INSERT INTO providers (id, name, type) VALUES ('openai', 'OpenAI', 'llm-provider')").run();
    sqlite.prepare("INSERT INTO tools (id, provider_id, name) VALUES ('codex', 'openai', 'Codex CLI')").run();
    sqlite
      .prepare("INSERT INTO models (id, provider_id, name, input_token_price, output_token_price, currency) VALUES ('m-priced', 'openai', 'gpt-5', 1, 2, 'USD')")
      .run();
    sqlite
      .prepare("INSERT INTO models (id, provider_id, name) VALUES ('m-unpriced', 'openai', 'gpt-future')")
      .run();
    sqlite
      .prepare("INSERT INTO sessions (id, source_id, tool_id, source_file) VALUES ('s-1', 's1', 'codex', '/tmp/cool.jsonl')")
      .run();
    sqlite
      .prepare(
        "INSERT INTO interactions (id, source_id, session_id, timestamp, role, model_id, total_tokens, token_confidence, cost) VALUES ('i1', 'i1', 's-1', 1700000000000, 'assistant', 'm-priced', 100, 'exact', 0.5)"
      )
      .run();
    sqlite
      .prepare(
        "INSERT INTO interactions (id, source_id, session_id, timestamp, role, model_id, total_tokens, token_confidence, cost) VALUES ('i2', 'i2', 's-1', 1700000060000, 'assistant', 'm-priced', 200, 'exact', 1.0)"
      )
      .run();

    const lookups = buildClassificationLookups();
    const openaiModels = lookups.pricedByProvider.get("openai") ?? [];
    expect(openaiModels.map((row) => row.modelName)).toContain("gpt-5");
    expect(openaiModels.map((row) => row.modelName)).not.toContain("gpt-future");

    const source = lookups.pricedBySource.get("/tmp/cool.jsonl");
    expect(source).toBeDefined();
    expect(source?.modelName).toBe("gpt-5");
    expect(source?.usageCount).toBe(2);
  });
});
