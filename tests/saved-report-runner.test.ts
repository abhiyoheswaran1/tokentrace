import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Database as BetterSqliteDatabase } from "better-sqlite3";
import { afterEach, describe, expect, it, vi } from "vitest";

let activeSqlite: BetterSqliteDatabase | null = null;

async function load() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tokentrace-saved-runner-"));
  const dbPath = path.join(dir, "tokentrace.db");
  process.env.TOKENTRACE_DB = dbPath;
  process.env.DATABASE_URL = `file:${dbPath}`;
  vi.resetModules();
  const [runner, store, { sqlite }] = await Promise.all([
    import("@/src/lib/saved-report-runner"),
    import("@/src/lib/saved-reports-store"),
    import("@/src/db/client")
  ]);
  activeSqlite = sqlite;
  return { ...runner, ...store, sqlite };
}

afterEach(() => {
  activeSqlite?.close();
  activeSqlite = null;
  vi.resetModules();
});

describe("saved report runner", () => {
  it("renders a saved overview report in JSON format", async () => {
    const { createSavedReport, runSavedReportByName } = await load();
    createSavedReport({
      name: "Weekly cost",
      viewType: "overview",
      params: { range: "7d" },
      format: "json"
    });

    const output = runSavedReportByName("Weekly cost", { format: "json" });
    const parsed = JSON.parse(output);
    expect(parsed.schemaVersion).toBe("tokentrace.saved-report.v1");
    expect(parsed.report.name).toBe("Weekly cost");
    expect(parsed.report.viewType).toBe("overview");
    expect(parsed.report.params).toEqual({ range: "7d" });
    expect(parsed.data.summary).toBeDefined();
  });

  it("renders a saved report in markdown format", async () => {
    const { createSavedReport, runSavedReportByName } = await load();
    createSavedReport({
      name: "Monthly",
      viewType: "overview",
      params: { range: "month" },
      format: "markdown"
    });

    const output = runSavedReportByName("Monthly", { format: "markdown" });
    expect(output).toMatch(/^# /);
    expect(output).toContain("Monthly");
    expect(output).toContain("range: month");
  });

  it("renders a saved report in HTML format and escapes user-supplied values", async () => {
    const { createSavedReport, runSavedReportByName } = await load();
    createSavedReport({
      name: "<script>alert(1)</script> bad report",
      viewType: "overview",
      params: { range: "7d", project: "<img src=x onerror=alert(1)>" }
    });

    const output = runSavedReportByName("<script>alert(1)</script> bad report", { format: "html" });
    expect(output).toMatch(/^<!doctype html>/i);
    expect(output).not.toContain("<script>alert(1)</script>");
    expect(output).not.toContain("<img src=x onerror=alert(1)>");
    expect(output).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(output).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("updates lastRunAt after a run", async () => {
    const { createSavedReport, runSavedReportByName, findSavedReportByName } = await load();
    createSavedReport({ name: "Weekly", viewType: "overview", params: { range: "7d" } });

    expect(findSavedReportByName("Weekly")?.lastRunAt).toBeNull();
    runSavedReportByName("Weekly", { format: "json" });
    expect(findSavedReportByName("Weekly")?.lastRunAt).toBeTruthy();
  });

  it("throws when the report is not found", async () => {
    const { runSavedReportByName } = await load();
    expect(() => runSavedReportByName("Nope", { format: "json" })).toThrow(/not found/i);
  });

  it("rejects an unsupported format at runtime", async () => {
    const { createSavedReport, runSavedReportByName } = await load();
    createSavedReport({ name: "Weekly", viewType: "overview" });
    expect(() => runSavedReportByName("Weekly", { format: "pdf" as never })).toThrow(/format/i);
  });
});
