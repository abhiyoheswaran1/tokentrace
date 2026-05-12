import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: { close: () => void } | null = null;
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
