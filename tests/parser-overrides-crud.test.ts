import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function loadParserOverrides() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-parser-overrides-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [overrides, { sqlite }] = await Promise.all([
    import("@/src/lib/parser-overrides"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...overrides, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("parser overrides", () => {
  it("persists a per-file parser override that scan can later honor", async () => {
    const { setParserOverride, getParserOverride } = await loadParserOverrides();

    setParserOverride({ path: "/tmp/x.jsonl", parserId: "claude-jsonl" });
    const override = getParserOverride("/tmp/x.jsonl");

    expect(override).toMatchObject({
      path: "/tmp/x.jsonl",
      parserId: "claude-jsonl",
      excluded: false
    });
    expect(override?.createdAt).toBeTruthy();
    expect(override?.updatedAt).toBeTruthy();
  });

  it("records an exclusion override with no parser id", async () => {
    const { setParserOverride, getParserOverride } = await loadParserOverrides();

    setParserOverride({ path: "/tmp/skip.jsonl", excluded: true, note: "binary log" });
    const override = getParserOverride("/tmp/skip.jsonl");

    expect(override).toMatchObject({
      path: "/tmp/skip.jsonl",
      parserId: null,
      excluded: true,
      note: "binary log"
    });
  });

  it("upserts on the same path and advances updated_at", async () => {
    const { setParserOverride, getParserOverride } = await loadParserOverrides();

    setParserOverride({ path: "/tmp/a.jsonl", parserId: "v1" });
    const first = getParserOverride("/tmp/a.jsonl");
    await new Promise((resolve) => setTimeout(resolve, 5));
    setParserOverride({ path: "/tmp/a.jsonl", parserId: "v2" });
    const second = getParserOverride("/tmp/a.jsonl");

    expect(second?.parserId).toBe("v2");
    expect(second?.createdAt).toBe(first?.createdAt);
    expect(second?.updatedAt).not.toBe(first?.updatedAt);
  });

  it("lists overrides ordered by most recently updated", async () => {
    const { setParserOverride, listParserOverrides } = await loadParserOverrides();

    setParserOverride({ path: "/tmp/older.jsonl", parserId: "p1" });
    await new Promise((resolve) => setTimeout(resolve, 5));
    setParserOverride({ path: "/tmp/newer.jsonl", parserId: "p2" });

    const all = listParserOverrides();
    expect(all.map((row) => row.path)).toEqual(["/tmp/newer.jsonl", "/tmp/older.jsonl"]);
  });

  it("clears an override by path", async () => {
    const { setParserOverride, clearParserOverride, getParserOverride } = await loadParserOverrides();

    setParserOverride({ path: "/tmp/temp.jsonl", parserId: "p1" });
    clearParserOverride("/tmp/temp.jsonl");

    expect(getParserOverride("/tmp/temp.jsonl")).toBeNull();
  });

  it("rejects an override that names neither a parser nor an exclusion", async () => {
    const { setParserOverride } = await loadParserOverrides();

    expect(() => setParserOverride({ path: "/tmp/blank.jsonl" } as { path: string })).toThrow(
      /parserId or excluded/i
    );
  });

  it("rejects a blank path", async () => {
    const { setParserOverride } = await loadParserOverrides();

    expect(() => setParserOverride({ path: "  ", parserId: "p" })).toThrow(/path is required/i);
  });

  it("normalizes the stored path to absolute so scan-resolved paths match", async () => {
    const { setParserOverride, getParserOverride } = await loadParserOverrides();
    const original = process.cwd();
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-normalize-"));
    process.chdir(tempDir);
    const cwd = process.cwd(); // realpath form after chdir on macOS
    try {
      setParserOverride({ path: "./relative.jsonl", parserId: "generic-jsonl" });
      const fromRelative = getParserOverride("./relative.jsonl");
      const fromAbsolute = getParserOverride(path.join(cwd, "relative.jsonl"));
      const fromMessyPath = getParserOverride(path.join(cwd, ".", "relative.jsonl"));

      const expected = path.join(cwd, "relative.jsonl");
      expect(fromRelative?.path).toBe(expected);
      expect(fromAbsolute?.path).toBe(expected);
      expect(fromMessyPath?.path).toBe(expected);
      expect(fromRelative?.parserId).toBe("generic-jsonl");
    } finally {
      process.chdir(original);
    }
  });
});
