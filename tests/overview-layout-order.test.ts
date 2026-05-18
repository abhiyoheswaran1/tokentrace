import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Overview layout order", () => {
  it("keeps trends ahead of guardrails and recommendations on the main page", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");
    const trendSource = fs.readFileSync(path.join(process.cwd(), "components/charts/trend-section.tsx"), "utf8");

    const usagePulse = source.indexOf("<CardTitle>Usage Pulse</CardTitle>");
    const metricCards = source.indexOf("label=\"Processed tokens\"");
    const trendSection = source.indexOf("<TrendSection data={data.trends} defaultWindow={trendDefaultWindow} />");
    const tokenTrend = trendSource.indexOf("<CardTitle>Token Trend</CardTitle>");
    const costTrend = trendSource.indexOf("<CardTitle>Cost Trend</CardTitle>");
    const trustStrip = source.indexOf("<OverviewTrustStrip");
    const dataReadiness = source.indexOf("<DataReadinessPanel");
    const guardrails = source.indexOf("<UsageGuardrailsPanel progress={data.usageGuardrails} />");
    const nextActions = source.indexOf("Recommended Next Actions");
    const usageByTool = source.indexOf("<CardTitle>Usage By Tool</CardTitle>");

    expect(usagePulse).toBeGreaterThan(-1);
    expect(trustStrip).toBeGreaterThan(-1);
    expect(dataReadiness).toBeGreaterThan(-1);
    expect(metricCards).toBeGreaterThan(usagePulse);
    expect(trendSection).toBeGreaterThan(metricCards);
    expect(tokenTrend).toBeGreaterThan(-1);
    expect(costTrend).toBeGreaterThan(tokenTrend);
    expect(trustStrip).toBeGreaterThan(trendSection);
    expect(dataReadiness).toBeGreaterThan(trustStrip);
    expect(guardrails).toBeGreaterThan(dataReadiness);
    expect(nextActions).toBeGreaterThan(guardrails);
    expect(usageByTool).toBeGreaterThan(nextActions);
  });

  it("keeps unknown-cost overview actions focused on repair and evidence", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain("dateRangeQueryParams(range)");
    expect(source).toContain("mergeHrefParams");
    expect(source).toContain("repairFocusHref");
    expect(source).toContain("Open next repair item");
    expect(source).toContain("View unknown-cost evidence");
    expect(source).toContain("evidenceLinks[\"unknown-cost\"]");
  });

  it("shows trust annotations directly on the Overview metric cards", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/page.tsx"), "utf8");

    expect(source).toContain("trustNote");
    expect(source).toContain("Why this number");
    expect(source).toContain("Includes cache read/write and reasoning tokens.");
    expect(source).toContain("Exact, estimated, and unknown costs stay split.");
    expect(source).toContain("Scan freshness is shown in Data Readiness.");
  });
});
