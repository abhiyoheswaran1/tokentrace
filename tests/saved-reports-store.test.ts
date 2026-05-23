import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function load() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-saved-reports-store-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [store, { sqlite }] = await Promise.all([
    import("@/src/lib/saved-reports-store"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...store, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("saved reports store", () => {
  it("creates and lists a saved report", async () => {
    const { createSavedReport, listSavedReports } = await load();

    const report = createSavedReport({
      name: "Weekly cost",
      viewType: "overview",
      params: { range: "7d" },
      format: "markdown"
    });

    expect(report.id).toMatch(/^report-/);
    expect(report.name).toBe("Weekly cost");
    expect(report.viewType).toBe("overview");
    expect(report.params).toEqual({ range: "7d" });
    expect(report.format).toBe("markdown");

    expect(listSavedReports()).toEqual([report]);
  });

  it("rejects a blank name", async () => {
    const { createSavedReport } = await load();
    expect(() => createSavedReport({ name: "  ", viewType: "overview" })).toThrow(/name/i);
  });

  it("rejects an unsupported view type", async () => {
    const { createSavedReport } = await load();
    expect(() => createSavedReport({ name: "Weekly", viewType: "totally-fake" })).toThrow(
      /view type/i
    );
  });

  it("rejects an unsupported format", async () => {
    const { createSavedReport } = await load();
    expect(() => createSavedReport({ name: "Weekly", viewType: "overview", format: "pdf" })).toThrow(
      /format/i
    );
  });

  it("rejects a duplicate name (case-insensitive)", async () => {
    const { createSavedReport } = await load();
    createSavedReport({ name: "Weekly cost", viewType: "overview" });
    expect(() => createSavedReport({ name: "weekly cost", viewType: "overview" })).toThrow(
      /already exists/i
    );
  });

  it("looks up by name (case-insensitive)", async () => {
    const { createSavedReport, findSavedReportByName } = await load();
    const created = createSavedReport({ name: "Weekly cost", viewType: "overview" });

    expect(findSavedReportByName("WEEKLY COST")?.id).toBe(created.id);
    expect(findSavedReportByName("weekly cost")?.id).toBe(created.id);
    expect(findSavedReportByName("nope")).toBeNull();
  });

  it("rejects param keys that are not in the allow-list", async () => {
    const { createSavedReport } = await load();
    expect(() =>
      createSavedReport({
        name: "Bad",
        viewType: "overview",
        params: { range: "7d", maliciousScript: "DROP TABLE" }
      })
    ).toThrow(/unsupported param/i);
  });

  it("deletes a saved report by id", async () => {
    const { createSavedReport, deleteSavedReport, listSavedReports } = await load();
    const report = createSavedReport({ name: "Weekly", viewType: "overview" });
    expect(deleteSavedReport(report.id)).toBe(true);
    expect(deleteSavedReport(report.id)).toBe(false);
    expect(listSavedReports()).toEqual([]);
  });

  it("records the last run timestamp via markSavedReportRan", async () => {
    const { createSavedReport, markSavedReportRan, findSavedReportByName } = await load();
    const report = createSavedReport({ name: "Weekly", viewType: "overview" });
    expect(report.lastRunAt).toBeNull();

    markSavedReportRan(report.id);
    const after = findSavedReportByName("Weekly");
    expect(after?.lastRunAt).toBeTruthy();
  });
});
