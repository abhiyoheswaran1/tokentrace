import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FileCandidate } from "@/src/ingestion/types";

let activeSqlite: BetterSqliteDatabase | null = null;

async function loadIngestion() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-parser-override-ing-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [overrides, scanAdapters, { sqlite }] = await Promise.all([
    import("@/src/lib/parser-overrides"),
    import("@/src/ingestion/scan-adapters"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...overrides, ...scanAdapters, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

function fakeFile(p: string): FileCandidate {
  return {
    path: p,
    sizeBytes: 100,
    modifiedTime: new Date()
  };
}

describe("parser overrides + ingestion", () => {
  it("forces selectAdapter to use the override's parser regardless of detection score", async () => {
    const { setParserOverride, selectAdapter } = await loadIngestion();

    setParserOverride({ path: "/tmp/forced.jsonl", parserId: "generic-jsonl" });
    const choice = await selectAdapter(fakeFile("/tmp/forced.jsonl"));

    expect(choice.selected?.adapter.id).toBe("generic-jsonl");
    expect(choice.selected?.confidence).toBe(1);
    expect(choice.selected?.reason).toMatch(/user override/i);
    expect(choice.excluded).toBe(false);
  });

  it("returns excluded=true when the override marks the file as skipped", async () => {
    const { setParserOverride, selectAdapter } = await loadIngestion();

    setParserOverride({ path: "/tmp/skip.jsonl", excluded: true, note: "binary log" });
    const choice = await selectAdapter(fakeFile("/tmp/skip.jsonl"));

    expect(choice.selected).toBeNull();
    expect(choice.excluded).toBe(true);
    expect(choice.excludeReason).toMatch(/user override/i);
  });

  it("warns when the override names a parser that is no longer registered", async () => {
    const { setParserOverride, selectAdapter } = await loadIngestion();

    setParserOverride({ path: "/tmp/unknown.jsonl", parserId: "made-up-adapter" });
    const choice = await selectAdapter(fakeFile("/tmp/unknown.jsonl"));

    expect(choice.selected).toBeNull();
    expect(choice.warnings.some((message) => /override.*made-up-adapter/i.test(message))).toBe(true);
  });
});
