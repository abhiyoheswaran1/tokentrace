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

    expect(analytics).toContain("@/src/lib/analytics-query-helpers");
    expect(analytics).toContain("@/src/lib/analytics-types");
    expect(helpers).toContain("export function timestampWhere");
    expect(helpers).toContain("export function fillMissingTrendDays");
    expect(types).toContain("export type AnalyticsData");
    expect(types).toContain("export type SessionRow");
  });
});
