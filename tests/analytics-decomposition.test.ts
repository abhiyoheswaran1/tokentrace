import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function read(relativePath: string) {
  return fs.readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("analytics decomposition", () => {
  it("keeps analytics orchestration split from shared query helpers and types", async () => {
    const [analytics, helpers, types] = await Promise.all([
      read("src/lib/analytics.ts"),
      read("src/lib/analytics-query-helpers.ts"),
      read("src/lib/analytics-types.ts")
    ]);
    const analyticsLines = analytics.trimEnd().split("\n").length;

    expect(analytics).toContain("@/src/lib/analytics/summary");
    expect(analytics).toContain("@/src/lib/analytics-types");
    expect(analyticsLines).toBeLessThan(360);
    expect(helpers).toContain("export function timestampWhere");
    expect(helpers).toContain("export function fillMissingTrendDays");
    expect(types).toContain("export type AnalyticsData");
    expect(types).toContain("export type SessionRow");
  });

  it("keeps expensive analytics query domains in focused modules", async () => {
    const modules = await Promise.all([
      read("src/lib/analytics/summary.ts"),
      read("src/lib/analytics/trends.ts"),
      read("src/lib/analytics/entities.ts"),
      read("src/lib/analytics/repair.ts"),
      read("src/lib/analytics/scan-trust.ts"),
      read("src/lib/analytics/insights.ts")
    ]);

    for (const source of modules) {
      const lineCount = source.trimEnd().split("\n").length;
      expect(lineCount).toBeGreaterThan(20);
      expect(lineCount).toBeLessThan(360);
    }

    expect(modules.join("\n")).toContain("@/src/lib/analytics-query-helpers");
    expect(modules[0]).toContain("export function getSummary");
    expect(modules[0]).toContain("export function getUsageComparison");
    expect(modules[1]).toContain("export function getTrends");
    expect(modules[2]).toContain("export function getSessions");
    expect(modules[3]).toContain("export function getUnknownCostQueue");
    expect(modules[4]).toContain("export function getScanTrustData");
    expect(modules[5]).toContain("export function buildInsights");
  });
});
