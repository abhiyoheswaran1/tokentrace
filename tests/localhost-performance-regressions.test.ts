import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("localhost performance regressions", () => {
  it("does not serialize full scan-file health into the Settings client bundle", () => {
    const settingsPage = read("app/settings/page.tsx");
    const settingsPanel = read("components/settings-panel.tsx");

    expect(settingsPage).toContain("toSettingsScanHealth(scanTrust.health)");
    expect(settingsPage).toContain('scanFileScope: "latest"');
    expect(settingsPanel).toContain("type SettingsScanHealth");
    expect(settingsPanel).not.toContain("initialScanHealth: ScanHealth");
  });

  it("keeps Overview from blocking render on scheduled scans and duplicate scan-trust reads", () => {
    const overview = read("app/page.tsx");
    const overviewData = read("src/lib/overview-data.ts");
    const analytics = read("src/lib/analytics.ts");

    expect(overview).toContain("void runDueScheduledScan()");
    expect(overview).not.toContain("await runDueScheduledScan()");
    expect(overviewData).toContain("const trust = data.scanTrust");
    expect(overview).not.toContain("const trust = getScanTrustData(range.filters)");
    expect(analytics).toContain("scanTrust: ScanTrustData");
    expect(analytics).toContain("scanFileScope");
    expect(analytics).toContain("sessionDetail");
    expect(overviewData).toContain('sessionDetail: "summary"');
  });

  it("keeps large-database reads on covering indexes instead of raw interaction rows", () => {
    const migrations = read("src/db/migrate-core.ts");
    const analytics = read("src/lib/analytics.ts");
    const evidence = read("src/lib/evidence-trail.ts");

    expect(migrations).toContain("interactions_analytics_cover_idx");
    expect(migrations).toContain("interactions_session_analytics_idx");
    expect(migrations).toContain("scan_files_path_latest_idx");
    expect(analytics).toContain("INDEXED BY interactions_analytics_cover_idx");
    expect(analytics).toContain("INDEXED BY interactions_session_analytics_idx");
    expect(evidence).toContain("WITH session_totals AS");
    expect(`${analytics}\n${evidence}`).not.toContain("COUNT(i.id)");
  });

  it("keeps contextual period filters on their current page and one-line capable on desktop", () => {
    const periodFilter = read("components/period-filter.tsx");
    const evidencePage = read("app/evidence/page.tsx");
    const repairPage = read("app/repair/page.tsx");

    expect(periodFilter).toContain("basePath");
    expect(periodFilter).toContain("preserveParams");
    expect(periodFilter).toContain("lg:flex-nowrap");
    expect(periodFilter).toContain("flex-1 overflow-x-auto");
    expect(evidencePage).toContain('basePath="/evidence"');
    expect(evidencePage).toContain("openedFrom");
    expect(repairPage).toContain('basePath="/repair"');
  });

  it("shows chart placeholders during hydration instead of blank chart cards", () => {
    const trendChart = read("components/charts/trend-chart.tsx");
    const rankChart = read("components/charts/rank-bar-chart.tsx");

    expect(trendChart).toContain("function ChartSkeleton");
    expect(rankChart).toContain("function ChartSkeleton");
    expect(trendChart).toContain("<ChartSkeleton />");
    expect(rankChart).toContain("<ChartSkeleton />");
  });

  it("keeps the Repair page from rendering the entire unknown-cost queue on first load", () => {
    const repairPage = read("app/repair/page.tsx");
    const repairLib = read("src/lib/unknown-cost-repair.ts");

    expect(repairPage).toContain("REPAIR_PAGE_GROUP_LIMIT");
    expect(repairPage).toContain("visible repair groups");
    expect(repairPage).not.toContain("keys={workbench.groups.map((group) => group.key)}");
    expect(repairLib).toContain("type UnknownCostRepairWorkbenchOptions");
    expect(repairLib).toContain("hasMoreGroups");
  });

  it("keeps Scan Health from loading all scan files and full sessions for summary panels", () => {
    const diagnosticsPage = read("app/diagnostics/page.tsx");

    expect(diagnosticsPage).toContain('getScanTrustData({}, { scanFileScope: "recent" })');
    expect(diagnosticsPage).toContain('getAnalyticsData({}, { scanFileScope: "none", sessionDetail: "summary" })');
    expect(diagnosticsPage).not.toContain("const baseData = getScanTrustData();");
    expect(diagnosticsPage).not.toContain("const analytics = getAnalyticsData();");
  });

  it("keeps trend aggregation off SQLite localtime bucketing", () => {
    const analytics = read("src/lib/analytics.ts");
    const client = read("src/db/client.ts");

    expect(analytics).toContain("local_date_key(i.timestamp) AS date");
    expect(analytics).not.toContain("'localtime'");
    expect(client).toContain("registerSqliteFunctions(sqlite)");
  });

  it("keeps Overview on a page-specific analytics profile", () => {
    const overview = read("app/page.tsx");
    const overviewData = read("src/lib/overview-data.ts");
    const analytics = read("src/lib/analytics.ts");

    expect(overviewData).toContain('analyticsProfile: "overview"');
    expect(overview).toContain("getOverviewData(range)");
    expect(analytics).toContain('analyticsProfile?: "full" | "overview"');
    expect(analytics).toContain('const overviewOnly = options.analyticsProfile === "overview"');
    expect(analytics).toContain('const models = overviewOnly ? [] : timeAnalyticsQuery("analytics.models"');
    expect(analytics).toContain('const modelAliasSuggestions = overviewOnly ? [] : timeAnalyticsQuery("analytics.modelAliases"');
    expect(analytics).toContain('const insights = overviewOnly ? [] : timeAnalyticsQuery("analytics.insights"');
  });

  it("keeps Overview server data assembly behind a focused helper", () => {
    const overview = read("app/page.tsx");
    const overviewData = read("src/lib/overview-data.ts");

    expect(overview).toContain('import { getOverviewData } from "@/src/lib/overview-data";');
    expect(overview).toContain("const overview = await getOverviewData(range);");
    expect(overview).not.toContain("buildAccountingInvariants");
    expect(overview).not.toContain("buildDoctorReport");
    expect(overview).not.toContain("buildUnknownCostRepairWorkbench");
    expect(overviewData).toContain("export async function getOverviewData");
    expect(overviewData).toContain('analyticsProfile: "overview"');
    expect(overviewData).toContain("repairFocusHref");
  });

  it("surfaces slow analytics page queries through doctor-ready timing guardrails", () => {
    const analytics = read("src/lib/analytics.ts");
    const timing = read("src/lib/analytics-timing.ts");
    const doctor = read("src/lib/doctor.ts");
    const doctorCli = read("scripts/doctor.ts");

    expect(timing).toContain("DEFAULT_ANALYTICS_QUERY_WARN_MS = 500");
    expect(timing).toContain("export function timeAnalyticsQuery");
    expect(timing).toContain("export function getAnalyticsTimingReport");
    expect(analytics).toContain('timeAnalyticsQuery("analytics.trends"');
    expect(analytics).toContain('timeAnalyticsQuery("analytics.sessions"');
    expect(analytics).toContain('timeAnalyticsQuery("analytics.scanTrust"');
    expect(doctor).toContain("analyticsTiming");
    expect(doctorCli).toContain("Slow analytics queries");
  });

  it("pins Next output tracing to the app root so worktree lockfiles do not raise dev overlay issues", () => {
    const nextConfig = read("next.config.mjs");

    expect(nextConfig).toContain("fileURLToPath(import.meta.url)");
    expect(nextConfig).toContain("const projectRoot");
    expect(nextConfig).toContain("outputFileTracingRoot: projectRoot");
  });

  it("keeps server bundle readability config out of the dev overlay issue badge", () => {
    const nextConfig = read("next.config.mjs");

    expect(nextConfig).toContain("const productionExperimentalConfig");
    expect(nextConfig).toContain('process.env.NODE_ENV === "production"');
    expect(nextConfig).toContain("experimental: productionExperimentalConfig");
    expect(nextConfig).toContain("serverMinification: false");
  });
});
