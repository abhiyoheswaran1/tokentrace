import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("scan file-hash cache", () => {
  let tempDir: string;
  let originalDb: string | undefined;

  beforeEach(() => {
    originalDb = process.env.TOKENTRACE_DB;
    vi.resetModules();
  });

  afterEach(async () => {
    if (originalDb === undefined) delete process.env.TOKENTRACE_DB;
    else process.env.TOKENTRACE_DB = originalDb;
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  });

  async function setup() {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-hash-cache-"));
    process.env.TOKENTRACE_DB = path.join(tempDir, "test.db");
    const scanFiles = await import("@/src/ingestion/scan-files");
    return { tempDir, scanFiles };
  }

  it("getCachedFileHash returns null when no scan_files row matches", async () => {
    const { scanFiles } = await setup();
    expect(scanFiles.getCachedFileHash("/no/such/path", 100, 1000)).toBeNull();
  });

  it("getCachedFileHash returns the file_hash when path, size, and mtime match", async () => {
    const { scanFiles } = await setup();
    const { sqlite } = await import("@/src/db/client");
    sqlite
      .prepare(`INSERT INTO scan_runs (id, started_at, warnings, errors) VALUES (?, ?, '[]', '[]')`)
      .run("run1", 1_000);
    sqlite
      .prepare(
        `INSERT INTO scan_files (id, scan_run_id, path, modified_time, size_bytes, file_hash, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "f1",
        "run1",
        "/path/foo.jsonl",
        2_000_000,
        4096,
        "abc123",
        "claude-jsonl",
        "imported",
        7,
        "[]",
        "[]",
        "{}"
      );
    expect(scanFiles.getCachedFileHash("/path/foo.jsonl", 4096, 2_000_000)).toBe("abc123");
  });

  it("getCachedFileHash returns null when size or mtime differs", async () => {
    const { scanFiles } = await setup();
    const { sqlite } = await import("@/src/db/client");
    sqlite
      .prepare(`INSERT INTO scan_runs (id, started_at, warnings, errors) VALUES (?, ?, '[]', '[]')`)
      .run("run1", 1_000);
    sqlite
      .prepare(
        `INSERT INTO scan_files (id, scan_run_id, path, modified_time, size_bytes, file_hash, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run("f1", "run1", "/path/foo.jsonl", 2_000_000, 4096, "abc123", "claude-jsonl", "imported", 7, "[]", "[]", "{}");
    expect(scanFiles.getCachedFileHash("/path/foo.jsonl", 9999, 2_000_000)).toBeNull();
    expect(scanFiles.getCachedFileHash("/path/foo.jsonl", 4096, 9_999_999)).toBeNull();
  });
});

describe("hashFileWithCache", () => {
  let tempDir: string;
  let originalDb: string | undefined;

  beforeEach(() => {
    originalDb = process.env.TOKENTRACE_DB;
    vi.resetModules();
  });

  afterEach(async () => {
    if (originalDb === undefined) delete process.env.TOKENTRACE_DB;
    else process.env.TOKENTRACE_DB = originalDb;
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("returns the cached hash without reading the file when (path, size, mtime) matches a prior scan_files row", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-hash-skip-"));
    process.env.TOKENTRACE_DB = path.join(tempDir, "test.db");
    const filePath = path.join(tempDir, "session.jsonl");
    await fs.writeFile(filePath, "hello world");

    const stat = await fs.stat(filePath);
    const { sqlite } = await import("@/src/db/client");
    sqlite
      .prepare(`INSERT INTO scan_runs (id, started_at, warnings, errors) VALUES (?, ?, '[]', '[]')`)
      .run("previous-run", 1_000);
    sqlite
      .prepare(
        `INSERT INTO scan_files (id, scan_run_id, path, modified_time, size_bytes, file_hash, parser, status, records_imported, warnings, errors, raw_metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        "cached-id",
        "previous-run",
        filePath,
        stat.mtime.getTime(),
        stat.size,
        "cached-hash",
        "claude-jsonl",
        "imported",
        3,
        "[]",
        "[]",
        "{}"
      );

    const { hashFileWithCache } = await import("@/src/ingestion/scan-adapters");
    const result = await hashFileWithCache({
      path: filePath,
      modifiedTime: stat.mtime,
      sizeBytes: stat.size,
      hash: undefined
    });

    // The cached hash differs from what would be computed if the file
    // were re-read, so returning "cached-hash" proves the cache was
    // used instead of re-reading + hashing the file content.
    expect(result.hash).toBe("cached-hash");
  });

  it("falls back to reading and hashing when no cached row matches", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-hash-fresh-"));
    process.env.TOKENTRACE_DB = path.join(tempDir, "test.db");
    const filePath = path.join(tempDir, "session.jsonl");
    await fs.writeFile(filePath, "hello world");
    const stat = await fs.stat(filePath);

    const { hashFileWithCache } = await import("@/src/ingestion/scan-adapters");
    const result = await hashFileWithCache({
      path: filePath,
      modifiedTime: stat.mtime,
      sizeBytes: stat.size,
      hash: undefined
    });

    expect(result.hash).toBeTruthy();
    expect(typeof result.hash).toBe("string");
  });
});
