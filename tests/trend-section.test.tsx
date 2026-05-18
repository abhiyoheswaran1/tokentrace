import React from "react";
import fs from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TrendSection } from "@/components/charts/trend-section";
import type { TrendPoint } from "@/src/lib/analytics";

function point(date: string): TrendPoint {
  return {
    date,
    totalTokens: 100,
    inputTokens: 40,
    outputTokens: 60,
    cachedTokens: 0,
    reasoningTokens: 0,
    cost: 0.25
  };
}

describe("TrendSection", () => {
  it("uses one lightweight shared toolbar for token and cost trend charts", () => {
    const html = renderToStaticMarkup(
      <TrendSection data={[point("2026-05-17"), point("2026-05-18")]} defaultWindow="60d" />
    );

    expect(html).toContain("Trends");
    expect(html).toContain("Token and cost history share chart display settings.");
    expect(html).toContain("Showing latest 60 days");
    expect(html).not.toContain("Trend controls");
    expect(html).not.toContain("Applies to both token and cost charts.");
    expect(html).not.toContain("rounded-lg bg-card p-3 outline outline-1 outline-border");
    expect(html.match(/Bucket/g)).toHaveLength(1);
    expect(html.match(/Display window/g)).toHaveLength(1);
    expect(html).toContain("Token Trend");
    expect(html).toContain("Cost Trend");
    expect(html).toContain("60 days");
    expect(html).toContain("xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]");
    expect(html).toContain("h-full");
    expect(html).toContain("h-72");
  });

  it("uses measured chart dimensions instead of Recharts ResponsiveContainer", () => {
    const trendChart = fs.readFileSync(path.join(process.cwd(), "components/charts/trend-chart.tsx"), "utf8");
    const rankChart = fs.readFileSync(path.join(process.cwd(), "components/charts/rank-bar-chart.tsx"), "utf8");

    expect(trendChart).toContain("useChartSize");
    expect(rankChart).toContain("useChartSize");
    expect(trendChart).not.toContain("ResponsiveContainer");
    expect(rankChart).not.toContain("ResponsiveContainer");
  });
});
