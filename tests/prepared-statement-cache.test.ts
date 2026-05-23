import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

describe("prepared-statement cache", () => {
  let tempDir: string;
  let originalDb: string | undefined;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "tokentrace-cache-"));
    originalDb = process.env.TOKENTRACE_DB;
    process.env.TOKENTRACE_DB = path.join(tempDir, "test.db");
    vi.resetModules();
  });

  afterEach(() => {
    if (originalDb === undefined) delete process.env.TOKENTRACE_DB;
    else process.env.TOKENTRACE_DB = originalDb;
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it("returns the same Statement instance for identical SQL", async () => {
    const { prepareCached, clearPreparedCache } = await import("@/src/db/prepared");
    clearPreparedCache();
    const a = prepareCached("SELECT 1");
    const b = prepareCached("SELECT 1");
    expect(a).toBe(b);
  });

  it("returns different Statements for different SQL", async () => {
    const { prepareCached, clearPreparedCache } = await import("@/src/db/prepared");
    clearPreparedCache();
    const a = prepareCached("SELECT 1");
    const b = prepareCached("SELECT 2");
    expect(a).not.toBe(b);
  });

  it("clearPreparedCache evicts stored statements", async () => {
    const { prepareCached, clearPreparedCache } = await import("@/src/db/prepared");
    clearPreparedCache();
    const a = prepareCached("SELECT 1");
    clearPreparedCache();
    const b = prepareCached("SELECT 1");
    expect(a).not.toBe(b);
  });

  it("cached statement executes correctly", async () => {
    const { prepareCached, clearPreparedCache } = await import("@/src/db/prepared");
    clearPreparedCache();
    const stmt = prepareCached("SELECT ? AS value");
    expect(stmt.get(42)).toEqual({ value: 42 });
    expect(stmt.get(7)).toEqual({ value: 7 });
  });
});
