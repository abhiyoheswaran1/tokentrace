import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: {
  close: () => void;
  prepare: (sql: string) => { all: () => unknown[] };
} | null = null;
const tempDirs: string[] = [];

async function loadRunScan() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-scan-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  const scanDir = path.join(tempDir, "scan-root");
  await fs.mkdir(scanDir);
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const [{ runScan }, { sqlite }] = await Promise.all([
    import("@/src/ingestion/scan"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { runScan, scanDir };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.resetModules();

  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("runScan result messages", () => {
  it("includes skipped unknown files in the returned error summary", async () => {
    const { runScan, scanDir } = await loadRunScan();
    const filePath = path.join(scanDir, "usage.sqlite");
    await fs.writeFile(filePath, "not a supported token log");

    const result = await runScan({ folders: [scanDir], includeDefaults: false });

    expect(result.filesScanned).toBe(1);
    expect(result.recordsImported).toBe(0);
    expect(result.errors).toEqual([
      `${filePath}: No parser detected a compatible format.`
    ]);
  });

  it("includes skipped duplicate files in the returned warning summary", async () => {
    const { runScan } = await loadRunScan();
    const fixturePath = path.join(process.cwd(), "fixtures", "generic-jsonl", "sample.jsonl");

    const first = await runScan({ folders: [fixturePath], includeDefaults: false });
    const second = await runScan({ folders: [fixturePath], includeDefaults: false });

    expect(first.recordsImported).toBe(2);
    expect(second.recordsImported).toBe(0);
    expect(second.warnings).toEqual([
      `${fixturePath}: File hash already imported. Use force rescan to parse again.`
    ]);
  });

  it("records ignored non-usage files without treating them as scan errors", async () => {
    const { runScan, scanDir } = await loadRunScan();
    const transcriptPath = path.join(scanDir, ".claude", "projects", "-Users-abhyoh-project", "session.jsonl");
    const ignoredPath = path.join(scanDir, ".claude", "cache", "my-closed-issues.json");

    await fs.mkdir(path.dirname(transcriptPath), { recursive: true });
    await fs.mkdir(path.dirname(ignoredPath), { recursive: true });
    await fs.writeFile(
      transcriptPath,
      JSON.stringify({
        type: "assistant",
        message: { role: "assistant", model: "claude-sonnet-4-5-20250929" },
        usage: { input_tokens: 10, output_tokens: 20 }
      }) + "\n"
    );
    await fs.writeFile(ignoredPath, JSON.stringify({ cached: true }));

    const result = await runScan({ folders: [scanDir], includeDefaults: false });
    const rows = activeSqlite
      ?.prepare("SELECT path, status, raw_metadata AS rawMetadata FROM scan_files ORDER BY path")
      .all() as Array<{ path: string; status: string; rawMetadata: string }>;

    expect(result.filesScanned).toBe(2);
    expect(result.errors).toEqual([]);
    expect(rows.map((row) => [row.path, row.status])).toEqual([
      [ignoredPath, "ignored_non_usage"],
      [transcriptPath, "imported"]
    ]);
    expect(JSON.parse(rows[0].rawMetadata)).toMatchObject({
      ignoreReason: "Claude support file outside project transcripts"
    });
  });
});
