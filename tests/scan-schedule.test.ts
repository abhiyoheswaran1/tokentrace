import { describe, expect, it } from "vitest";
import { isScanDue, normalizeScanSchedule, summarizeScheduledScanResult } from "@/src/lib/scan-schedule";

describe("scan schedule", () => {
  it("normalizes local scan schedules with safe defaults", () => {
    expect(normalizeScanSchedule(null)).toMatchObject({
      mode: "manual",
      retentionRuns: 30
    });
    expect(normalizeScanSchedule({ mode: "hourly", retentionRuns: "10" })).toMatchObject({
      mode: "hourly",
      retentionRuns: 10
    });
  });

  it("detects due scans for on-open, hourly, and daily modes", () => {
    const now = new Date("2026-05-19T12:00:00.000Z");

    expect(isScanDue({ mode: "manual", retentionRuns: 30 }, null, now)).toBe(false);
    expect(isScanDue({ mode: "on-open", retentionRuns: 30 }, null, now)).toBe(true);
    expect(
      isScanDue(
        { mode: "hourly", retentionRuns: 30 },
        new Date("2026-05-19T10:59:00.000Z"),
        now
      )
    ).toBe(true);
    expect(
      isScanDue(
        { mode: "daily", retentionRuns: 30 },
        new Date("2026-05-18T11:59:00.000Z"),
        now
      )
    ).toBe(true);
  });

  it("summarizes scheduled scan results with a next action", () => {
    expect(
      summarizeScheduledScanResult({
        filesScanned: 7,
        recordsImported: 2,
        warnings: ["Parser warning"],
        errors: []
      })
    ).toMatchObject({
      headline: "2 records imported",
      tone: "warning",
      nextAction: "Open Scan Health"
    });
  });
});
