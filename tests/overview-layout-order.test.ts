import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview layout order", () => {
  it("keeps trends ahead of guardrails and recommendations on the main page", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const trendSource = fs.readFileSync(path.join(process.cwd(), "components/charts/trend-section.tsx"), "utf8");
    const pulseSource = fs.readFileSync(path.join(process.cwd(), "components/overview/usage-pulse-panel.tsx"), "utf8");
    const recommendationsSource = fs.readFileSync(path.join(process.cwd(), "components/overview/recommendations-card.tsx"), "utf8");
    const currentMixSource = fs.readFileSync(path.join(process.cwd(), "components/overview/current-mix-panel.tsx"), "utf8");

    const usagePulse = source.indexOf("<UsagePulsePanel");
    const metricCards = source.indexOf("<TokenAccountingCard");
    const trendSection = source.indexOf("<TrendSection");
    const tokenTrend = trendSource.indexOf("<CardTitle>Token Trend</CardTitle>");
    const costTrend = trendSource.indexOf("<CardTitle>Cost Trend</CardTitle>");
    const reviewStatus = source.indexOf("<OverviewReviewStatusStrip");
    const repairItems = source.indexOf("<TopRepairItemsStrip");
    const guardrails = source.indexOf("<UsageGuardrailsPanel progress={data.usageGuardrails} />");
    const nextActions = source.indexOf("<OverviewRecommendationsCard");
    const usageByTool = source.indexOf("<OverviewCurrentMixPanel");

    expect(usagePulse).toBeGreaterThan(-1);
    expect(pulseSource).toContain("<CardTitle>Usage Pulse</CardTitle>");
    expect(recommendationsSource).toContain("Recommended Next Actions");
    expect(currentMixSource).toContain("<CardTitle>Usage By Tool</CardTitle>");
    expect(reviewStatus).toBeGreaterThan(-1);
    expect(repairItems).toBeGreaterThan(-1);
    expect(metricCards).toBeGreaterThan(usagePulse);
    expect(trendSection).toBeGreaterThan(metricCards);
    expect(tokenTrend).toBeGreaterThan(-1);
    expect(costTrend).toBeGreaterThan(tokenTrend);
    // After 0.17.0 Suspense split, the page renders the Primary
    // (analytics-driven) section first and then streams in the Repair
    // (decision-support) section, so guardrails / recommendations / mix
    // live in Primary and review-status / repair-items live in Repair.
    expect(guardrails).toBeGreaterThan(trendSection);
    expect(nextActions).toBeGreaterThan(guardrails);
    expect(usageByTool).toBeGreaterThan(nextActions);
    expect(reviewStatus).toBeGreaterThan(usageByTool);
    expect(repairItems).toBeGreaterThan(reviewStatus);
  });

  it("defaults all-time trend charts to 30 days while scoped periods show the full selected range", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const overviewData = fs.readFileSync(path.join(process.cwd(), "src/lib/overview-data.ts"), "utf8");

    expect(overviewData).toContain('const trendDefaultWindow: TrendWindow = range.key === "all" ? "30d" : "all";');
    expect(source).toMatch(/<TrendSection[\s\S]*?data=\{data\.trends\}[\s\S]*?defaultWindow=\{trendDefaultWindow\}/);
  });

  it("keeps unknown-cost overview actions focused on repair and evidence", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const overviewData = fs.readFileSync(path.join(process.cwd(), "src/lib/overview-data.ts"), "utf8");
    const repairItems = fs.readFileSync(path.join(process.cwd(), "components/overview/top-repair-items-strip.tsx"), "utf8");
    const summaryCards = fs.readFileSync(path.join(process.cwd(), "components/overview/summary-cards.tsx"), "utf8");

    expect(overviewData).toContain("dateRangeQueryParams(range)");
    expect(repairItems).toContain("mergeHrefParams");
    expect(source).toContain("repairFocusHref");
    expect(`${source}\n${repairItems}\n${summaryCards}`).toContain("Open repair");
    expect(`${source}\n${repairItems}\n${summaryCards}`).toContain("View evidence");
    expect(overviewData).toContain("evidenceLinks[\"unknown-cost\"]");
  });

  it("shows trust annotations directly on the Overview summary cards", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "components/overview/summary-cards.tsx"), "utf8");

    expect(source).toContain("trustDetail");
    expect(source).toContain("Why this number");
    expect(source).toContain("Includes cache read/write and reasoning tokens.");
    expect(source).toContain("Fresh excludes cache");
    expect(source).toContain("Exact, estimated, and unknown costs stay split.");
    expect(source).toContain("Scan freshness is shown in Review Status.");
  });
});
