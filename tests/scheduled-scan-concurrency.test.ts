import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as SqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: SqliteDatabase | null = null;
const tempDirs: string[] = [];

async function loadModule() {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-sched-concurrency-"));
  tempDirs.push(tempDir);
  const dbPath = path.join(tempDir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();

  const scanModule = await import("@/src/ingestion/scan");
  const runScanSpy = vi.spyOn(scanModule, "runScan");

  const [{ runDueScheduledScan }, { saveAppSettings, getAppSettings }, dbClient] = await Promise.all([
    import("@/src/lib/scheduled-scan"),
    import("@/src/db/settings"),
    import("@/src/db/client")
  ]);
  activeSqlite = dbClient.sqlite;
  return { runDueScheduledScan, runScanSpy, saveAppSettings, getAppSettings, sqlite: dbClient.sqlite };
}

afterEach(async () => {
  activeSqlite?.close();
  activeSqlite = null;
  delete process.env.TOKENTRACE_DB;
  delete process.env.DATABASE_URL;
  vi.restoreAllMocks();
  vi.resetModules();
  await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true })));
});

describe("runDueScheduledScan concurrency guard", () => {
  it("coalesces overlapping calls into a single scan run", async () => {
    const { runDueScheduledScan, runScanSpy, saveAppSettings, getAppSettings } = await loadModule();

    // Enable on-open scheduling so a never-scanned DB is due.
    const settings = getAppSettings();
    saveAppSettings({
      ...settings,
      scanSchedule: { ...settings.scanSchedule, mode: "on-open" }
    });

    // A gate the scan blocks on until we open it, so all overlapping callers
    // are guaranteed to be in-flight when we assert the call count.
    let openGate: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      openGate = resolve;
    });
    runScanSpy.mockImplementation(async () => {
      await gate;
      return { filesScanned: 1, recordsImported: 1, warnings: [], errors: [] } as never;
    });

    // Fire three overlapping calls before the first scan resolves.
    const a = runDueScheduledScan();
    const b = runDueScheduledScan();
    const c = runDueScheduledScan();

    // Let microtasks settle so all three have entered the function, then
    // release the scan and await all callers.
    await Promise.resolve();
    openGate();
    const [ra, rb, rc] = await Promise.all([a, b, c]);

    // runScan must have been invoked exactly once despite three callers.
    expect(runScanSpy).toHaveBeenCalledTimes(1);
    expect(ra.ran).toBe(true);
    expect(rb.ran).toBe(true);
    expect(rc.ran).toBe(true);
  });

  it("allows a fresh scan after the in-flight one settles", async () => {
    const { runDueScheduledScan, runScanSpy, saveAppSettings, getAppSettings, sqlite } =
      await loadModule();
    const settings = getAppSettings();
    saveAppSettings({
      ...settings,
      scanSchedule: { ...settings.scanSchedule, mode: "on-open" }
    });

    // A realistic runScan records a scan_runs row, which is what the due-check
    // reads. Mock that side effect so the subsequent due-check sees a recent scan.
    runScanSpy.mockImplementation(async () => {
      sqlite
        .prepare(
          "INSERT INTO scan_runs (id, started_at, completed_at, files_scanned, records_imported) VALUES (?, ?, ?, 1, 1)"
        )
        .run(`run-${Date.now()}-${Math.random()}`, Date.now(), Date.now());
      return { filesScanned: 1, recordsImported: 1, warnings: [], errors: [] } as never;
    });

    // First call runs (DB never scanned -> due).
    const first = await runDueScheduledScan();
    expect(first.ran).toBe(true);
    expect(runScanSpy).toHaveBeenCalledTimes(1);

    // Guard has cleared, but on-open requires >5 min elapsed since the recorded
    // scan, so the next call is not due — proving the guard didn't permanently block.
    const second = await runDueScheduledScan();
    expect(second.ran).toBe(false);
    expect(runScanSpy).toHaveBeenCalledTimes(1);
  });
});
