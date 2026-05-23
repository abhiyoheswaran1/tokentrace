import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function load() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-parser-override-cli-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [cli, overrides, { sqlite }] = await Promise.all([
    import("@/src/lib/parser-overrides-cli"),
    import("@/src/lib/parser-overrides"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...cli, ...overrides, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("repair set-parser CLI", () => {
  it("parses set-parser with --parser into a write action", async () => {
    const { parseParserOverrideArgs } = await load();
    const action = parseParserOverrideArgs(["set-parser", "/tmp/x.jsonl", "--parser", "claude-code"]);
    expect(action).toEqual({
      kind: "set",
      path: "/tmp/x.jsonl",
      parserId: "claude-code",
      excluded: false,
      note: null,
      json: false
    });
  });

  it("parses set-parser with --exclude and --note", async () => {
    const { parseParserOverrideArgs } = await load();
    const action = parseParserOverrideArgs([
      "set-parser",
      "/tmp/skip.jsonl",
      "--exclude",
      "--note",
      "binary log"
    ]);
    expect(action).toEqual({
      kind: "set",
      path: "/tmp/skip.jsonl",
      parserId: null,
      excluded: true,
      note: "binary log",
      json: false
    });
  });

  it("parses clear-parser", async () => {
    const { parseParserOverrideArgs } = await load();
    expect(parseParserOverrideArgs(["clear-parser", "/tmp/x.jsonl"])).toEqual({
      kind: "clear",
      path: "/tmp/x.jsonl",
      json: false
    });
  });

  it("accepts --json on either subcommand", async () => {
    const { parseParserOverrideArgs } = await load();
    expect(
      parseParserOverrideArgs(["set-parser", "/tmp/x.jsonl", "--exclude", "--json"]).json
    ).toBe(true);
    expect(parseParserOverrideArgs(["clear-parser", "/tmp/x.jsonl", "--json"]).json).toBe(true);
  });

  it("rejects set-parser without parser or exclude", async () => {
    const { parseParserOverrideArgs } = await load();
    expect(() => parseParserOverrideArgs(["set-parser", "/tmp/x.jsonl"])).toThrow(
      /--parser or --exclude/i
    );
  });

  it("rejects set-parser with both --parser and --exclude", async () => {
    const { parseParserOverrideArgs } = await load();
    expect(() =>
      parseParserOverrideArgs(["set-parser", "/tmp/x.jsonl", "--parser", "x", "--exclude"])
    ).toThrow(/cannot combine/i);
  });

  it("rejects unknown options", async () => {
    const { parseParserOverrideArgs } = await load();
    expect(() =>
      parseParserOverrideArgs(["set-parser", "/tmp/x.jsonl", "--whoops"])
    ).toThrow(/Unknown option: --whoops/);
  });

  it("rejects missing path", async () => {
    const { parseParserOverrideArgs } = await load();
    expect(() => parseParserOverrideArgs(["set-parser", "--parser", "x"])).toThrow(/path/i);
  });

  it("executes set + clear actions against the DB", async () => {
    const { runParserOverrideAction, getParserOverride } = await load();

    const setOutput = runParserOverrideAction({
      kind: "set",
      path: "/tmp/y.jsonl",
      parserId: "generic-jsonl",
      excluded: false,
      note: null,
      json: false
    });
    expect(setOutput).toContain("/tmp/y.jsonl");
    expect(getParserOverride("/tmp/y.jsonl")?.parserId).toBe("generic-jsonl");

    const clearOutput = runParserOverrideAction({
      kind: "clear",
      path: "/tmp/y.jsonl",
      json: false
    });
    expect(clearOutput).toContain("/tmp/y.jsonl");
    expect(getParserOverride("/tmp/y.jsonl")).toBeNull();
  });

  it("emits JSON when --json was requested", async () => {
    const { runParserOverrideAction } = await load();
    const output = runParserOverrideAction({
      kind: "set",
      path: "/tmp/z.jsonl",
      parserId: "generic-jsonl",
      excluded: false,
      note: null,
      json: true
    });
    const parsed = JSON.parse(output);
    expect(parsed).toMatchObject({
      action: "set",
      path: "/tmp/z.jsonl",
      override: { parserId: "generic-jsonl", excluded: false }
    });
  });
});
