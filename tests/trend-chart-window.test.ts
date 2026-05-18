import { describe, expect, it } from "vitest";
import { filterTrendWindow, type TrendWindow } from "@/components/charts/trend-chart";
import type { TrendPoint } from "@/src/lib/analytics";

function point(date: string, totalTokens = 1): TrendPoint {
  return {
    date,
    totalTokens,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    cost: 0
  };
}

describe("trend chart windowing", () => {
  it("defaults chart history to the last 60 calendar days while allowing all history", () => {
    const data = [
      point("2026-01-01"),
      point("2026-03-19"),
      point("2026-03-20"),
      point("2026-05-18")
    ];

    expect(filterTrendWindow(data, "60d").map((item) => item.date)).toEqual([
      "2026-03-20",
      "2026-05-18"
    ]);
    expect(filterTrendWindow(data, "all").map((item) => item.date)).toEqual([
      "2026-01-01",
      "2026-03-19",
      "2026-03-20",
      "2026-05-18"
    ]);
  });

  it("supports 30, 60, 90, and all trend windows", () => {
    const windows: TrendWindow[] = ["30d", "60d", "90d", "all"];

    expect(windows).toEqual(["30d", "60d", "90d", "all"]);
  });
});
