import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("runtime SQLite pragmas", () => {
  let tempDir: string;
  let originalDb: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentrace-pragma-"));
    originalDb = process.env.TOKENTRACE_DB;
    process.env.TOKENTRACE_DB = path.join(tempDir, "test.db");
    vi.resetModules();
  });

  afterEach(() => {
    if (originalDb === undefined) delete process.env.TOKENTRACE_DB;
    else process.env.TOKENTRACE_DB = originalDb;
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("applies analytics-tuned pragmas to the connection", async () => {
    const { sqlite } = await import("@/src/db/client");
    expect(String(sqlite.pragma("journal_mode", { simple: true })).toLowerCase()).toBe("wal");
    expect(Number(sqlite.pragma("synchronous", { simple: true }))).toBe(1);
    expect(String(sqlite.pragma("temp_store", { simple: true }))).toBe("2");
    expect(Number(sqlite.pragma("cache_size", { simple: true }))).toBe(-65536);
    expect(Number(sqlite.pragma("mmap_size", { simple: true }))).toBe(268435456);
    expect(Number(sqlite.pragma("busy_timeout", { simple: true }))).toBe(10000);
    expect(Number(sqlite.pragma("foreign_keys", { simple: true }))).toBe(1);
  });
});
