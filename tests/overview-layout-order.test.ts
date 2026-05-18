import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview layout order", () => {
  it("keeps trends ahead of guardrails and recommendations on the main page", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const trendSource = fs.readFileSync(path.join(process.cwd(), "components/charts/trend-section.tsx"), "utf8");

    const usagePulse = source.indexOf("<CardTitle>Usage Pulse</CardTitle>");
    const metricCards = source.indexOf("<TokenAccountingCard");
    const trendSection = source.indexOf("<TrendSection data={data.trends} defaultWindow={trendDefaultWindow} />");
    const tokenTrend = trendSource.indexOf("<CardTitle>Token Trend</CardTitle>");
    const costTrend = trendSource.indexOf("<CardTitle>Cost Trend</CardTitle>");
    const reviewStatus = source.indexOf("<OverviewReviewStatusStrip");
    const repairItems = source.indexOf("<TopRepairItemsStrip");
    const guardrails = source.indexOf("<UsageGuardrailsPanel progress={data.usageGuardrails} />");
    const nextActions = source.indexOf("Recommended Next Actions");
    const usageByTool = source.indexOf("<CardTitle>Usage By Tool</CardTitle>");

    expect(usagePulse).toBeGreaterThan(-1);
    expect(reviewStatus).toBeGreaterThan(-1);
    expect(repairItems).toBeGreaterThan(-1);
    expect(metricCards).toBeGreaterThan(usagePulse);
    expect(trendSection).toBeGreaterThan(metricCards);
    expect(tokenTrend).toBeGreaterThan(-1);
    expect(costTrend).toBeGreaterThan(tokenTrend);
    expect(reviewStatus).toBeGreaterThan(trendSection);
    expect(repairItems).toBeGreaterThan(reviewStatus);
    expect(guardrails).toBeGreaterThan(repairItems);
    expect(nextActions).toBeGreaterThan(guardrails);
    expect(usageByTool).toBeGreaterThan(nextActions);
  });

  it("defaults all-time trend charts to 30 days while scoped periods show the full selected range", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain('const trendDefaultWindow: TrendWindow = range.key === "all" ? "30d" : "all";');
    expect(source).toContain("<TrendSection data={data.trends} defaultWindow={trendDefaultWindow} />");
  });

  it("keeps unknown-cost overview actions focused on repair and evidence", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain("dateRangeQueryParams(range)");
    expect(source).toContain("mergeHrefParams");
    expect(source).toContain("repairFocusHref");
    expect(source).toContain("Open repair");
    expect(source).toContain("View evidence");
    expect(source).toContain("evidenceLinks[\"unknown-cost\"]");
  });

  it("shows trust annotations directly on the Overview summary cards", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain("trustDetail");
    expect(source).toContain("Why this number");
    expect(source).toContain("Includes cache read/write and reasoning tokens.");
    expect(source).toContain("Fresh excludes cache");
    expect(source).toContain("Exact, estimated, and unknown costs stay split.");
    expect(source).toContain("Scan freshness is shown in Review Status.");
  });
});
