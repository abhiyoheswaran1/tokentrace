import type { TrendWindow } from "@/components/charts/trend-chart";
import { buildAccountingInvariants, type AccountingInvariantReport } from "@/src/lib/accounting-invariants";
import { getAnalyticsData, type AnalyticsData } from "@/src/lib/analytics";
import { buildDoctorReport, type DoctorReport } from "@/src/lib/doctor";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";
import { buildFirstRunStatus, type FirstRunStatus } from "@/src/lib/first-run-status";
import { buildUnknownCostRepairWorkbench, type UnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";
import { dateRangeQueryParams, mergeHrefParams, type ResolvedDateRange } from "@/src/lib/date-range";
import { buildScanDiff } from "@/src/lib/scan-diff";
import { buildPostSessionReview, type PostSessionReview } from "@/src/lib/post-session-review";

export type OverviewData = {
  data: AnalyticsData;
  trust: AnalyticsData["scanTrust"];
  accountingReport: AccountingInvariantReport;
  postSessionReview: PostSessionReview;
  rangeLinkParams: Record<string, string | undefined>;
  evidenceLinks: AnalyticsData["evidenceLinks"];
  roots: Awaited<ReturnType<typeof getDefaultSearchRoots>>;
  doctorReport: DoctorReport;
  repairWorkbench: UnknownCostRepairWorkbench;
  nextRepairGroup: UnknownCostRepairWorkbench["groups"][number] | null;
  repairFocusHref: string;
  unknownCostEvidenceHref: string;
  firstRunStatus: FirstRunStatus;
  summary: AnalyticsData["summary"];
  trendDefaultWindow: TrendWindow;
};

export async function getOverviewData(range: ResolvedDateRange): Promise<OverviewData> {
  const trendDefaultWindow: TrendWindow = range.key === "all" ? "30d" : "all";

  const [data, accountingReport, scanDiff, roots, repairWorkbench] = await Promise.all([
    Promise.resolve().then(() =>
      getAnalyticsData(range.filters, {
        scanFileScope: "recent",
        sessionDetail: "summary",
        analyticsProfile: "overview"
      })
    ),
    Promise.resolve().then(() => buildAccountingInvariants(range.filters)),
    Promise.resolve().then(() => buildScanDiff()),
    getDefaultSearchRoots(),
    Promise.resolve().then(() => buildUnknownCostRepairWorkbench(range.filters, { limit: 12 }))
  ]);

  const trust = data.scanTrust;
  const postSessionReview = buildPostSessionReview({
    scanDiff,
    usageGuardrails: data.usageGuardrails,
    summary: data.summary,
    sessions: data.sessions
  });
  const rangeLinkParams = dateRangeQueryParams(range);
  const evidenceLinks = Object.fromEntries(
    Object.entries(data.evidenceLinks).map(([key, href]) => [
      key,
      mergeHrefParams(href, { ...rangeLinkParams, openedFrom: "overview" })
    ])
  ) as AnalyticsData["evidenceLinks"];
  const doctorReport = buildDoctorReport({ ...trust, roots });
  const nextRepairGroup =
    repairWorkbench.groups.find(
      (group) => group.review.status !== "ignored" && group.review.status !== "resolved"
    ) ?? repairWorkbench.groups[0] ?? null;
  const repairFocusHref = mergeHrefParams(nextRepairGroup?.itemHref ?? "/repair", rangeLinkParams);
  const unknownCostEvidenceHref = evidenceLinks["unknown-cost"];
  const firstRunStatus = buildFirstRunStatus({
    rootCount: roots.length,
    pricedModelCount: trust.pricedModelCount,
    latestScan: doctorReport.latestScan.id
      ? {
          filesScanned: doctorReport.latestScan.filesScanned,
          recordsImported: doctorReport.latestScan.recordsImported,
          zeroImportExplanation: doctorReport.latestScan.zeroImportExplanation
        }
      : null,
    interactions: trust.confidence.interactions,
    unknownCostInteractions: trust.confidence.unknownCostInteractions
  });

  return {
    data,
    trust,
    accountingReport,
    postSessionReview,
    rangeLinkParams,
    evidenceLinks,
    roots,
    doctorReport,
    repairWorkbench,
    nextRepairGroup,
    repairFocusHref,
    unknownCostEvidenceHref,
    firstRunStatus,
    summary: data.summary,
    trendDefaultWindow
  };
}

export async function getOverviewPageData(range: ResolvedDateRange): Promise<OverviewData> {
  return getOverviewData(range);
}
