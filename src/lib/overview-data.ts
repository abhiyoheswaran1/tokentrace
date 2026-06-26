import { cache } from "react";
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
import { zeroImportExplanation } from "@/src/lib/doctor-recommendations";

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

export type OverviewPrimaryData = {
  data: AnalyticsData;
  trust: AnalyticsData["scanTrust"];
  rangeLinkParams: Record<string, string | undefined>;
  evidenceLinks: AnalyticsData["evidenceLinks"];
  firstRunStatus: FirstRunStatus;
  summary: AnalyticsData["summary"];
  trendDefaultWindow: TrendWindow;
  unknownCostEvidenceHref: string;
};

export type OverviewRepairData = {
  accountingReport: AccountingInvariantReport;
  postSessionReview: PostSessionReview;
  doctorReport: DoctorReport;
  repairWorkbench: UnknownCostRepairWorkbench;
  nextRepairGroup: UnknownCostRepairWorkbench["groups"][number] | null;
  repairFocusHref: string;
  evidenceLinks: AnalyticsData["evidenceLinks"];
  summary: AnalyticsData["summary"];
  trust: AnalyticsData["scanTrust"];
  rangeLinkParams: Record<string, string | undefined>;
};

const getAnalyticsForOverview = cache((range: ResolvedDateRange) =>
  getAnalyticsData(range.filters, {
    scanFileScope: "recent",
    sessionDetail: "summary",
    analyticsProfile: "overview"
  })
);

const getSearchRoots = cache(() => getDefaultSearchRoots());

export function buildOverviewFirstRunStatus(input: {
  rootCount: number;
  pricedModelCount: number;
  latestScan: {
    filesScanned: number;
    recordsImported: number;
    zeroImportExplanation: string | null;
  } | null;
  interactions: number;
  unknownCostInteractions: number;
}) {
  return buildFirstRunStatus(input);
}

function decorateEvidenceLinks(
  evidenceLinks: AnalyticsData["evidenceLinks"],
  rangeLinkParams: Record<string, string | undefined>
): AnalyticsData["evidenceLinks"] {
  return Object.fromEntries(
    Object.entries(evidenceLinks).map(([key, href]) => [
      key,
      mergeHrefParams(href, { ...rangeLinkParams, openedFrom: "overview" })
    ])
  ) as AnalyticsData["evidenceLinks"];
}

export const getOverviewPrimaryData = cache(
  async (range: ResolvedDateRange): Promise<OverviewPrimaryData> => {
    const trendDefaultWindow: TrendWindow = range.key === "all" ? "30d" : "all";
    const [data, roots] = await Promise.all([
      Promise.resolve().then(() => getAnalyticsForOverview(range)),
      getSearchRoots()
    ]);
    const trust = data.scanTrust;
    const rangeLinkParams = dateRangeQueryParams(range);
    const evidenceLinks = decorateEvidenceLinks(data.evidenceLinks, rangeLinkParams);
    const latestRun = trust.health?.latestRun ?? null;
    const firstRunStatus = buildOverviewFirstRunStatus({
      rootCount: roots.length,
      pricedModelCount: trust.pricedModelCount,
      latestScan: latestRun
        ? {
            filesScanned: latestRun.filesScanned,
            recordsImported: latestRun.recordsImported,
            zeroImportExplanation: zeroImportExplanation({
              latestRun,
              statusCounts: trust.health?.latestStatusCounts ?? {},
              rootCount: roots.length
            })
          }
        : null,
      interactions: trust.confidence.interactions,
      unknownCostInteractions: trust.confidence.unknownCostInteractions
    });
    return {
      data,
      trust,
      rangeLinkParams,
      evidenceLinks,
      firstRunStatus,
      summary: data.summary,
      trendDefaultWindow,
      unknownCostEvidenceHref: evidenceLinks["unknown-cost"]
    };
  }
);

export const getOverviewRepairData = cache(
  async (range: ResolvedDateRange): Promise<OverviewRepairData> => {
    const [data, accountingReport, scanDiff, roots, repairWorkbench] = await Promise.all([
      Promise.resolve().then(() => getAnalyticsForOverview(range)),
      Promise.resolve().then(() => buildAccountingInvariants(range.filters)),
      Promise.resolve().then(() => buildScanDiff()),
      getSearchRoots(),
      Promise.resolve().then(() => buildUnknownCostRepairWorkbench(range.filters, { limit: 12 }))
    ]);
    const trust = data.scanTrust;
    const rangeLinkParams = dateRangeQueryParams(range);
    const evidenceLinks = decorateEvidenceLinks(data.evidenceLinks, rangeLinkParams);
    const doctorReport = buildDoctorReport({ ...trust, roots });
    const postSessionReview = buildPostSessionReview({
      scanDiff,
      usageGuardrails: data.usageGuardrails,
      summary: data.summary,
      sessions: data.sessions
    });
    const nextRepairGroup =
      repairWorkbench.groups.find(
        (group) => group.review.status !== "ignored" && group.review.status !== "resolved"
      ) ?? repairWorkbench.groups[0] ?? null;
    const repairFocusHref = mergeHrefParams(nextRepairGroup?.itemHref ?? "/repair", rangeLinkParams) ?? "/repair";
    return {
      accountingReport,
      postSessionReview,
      doctorReport,
      repairWorkbench,
      nextRepairGroup,
      repairFocusHref,
      evidenceLinks,
      summary: data.summary,
      trust,
      rangeLinkParams
    };
  }
);

export async function getOverviewData(range: ResolvedDateRange): Promise<OverviewData> {
  const [primary, repair] = await Promise.all([
    getOverviewPrimaryData(range),
    getOverviewRepairData(range)
  ]);
  const roots = await getSearchRoots();
  const firstRunStatus = buildOverviewFirstRunStatus({
    rootCount: roots.length,
    pricedModelCount: primary.trust.pricedModelCount,
    latestScan: repair.doctorReport.latestScan.id
      ? {
          filesScanned: repair.doctorReport.latestScan.filesScanned,
          recordsImported: repair.doctorReport.latestScan.recordsImported,
          zeroImportExplanation: repair.doctorReport.latestScan.zeroImportExplanation
        }
      : null,
    interactions: primary.trust.confidence.interactions,
    unknownCostInteractions: primary.trust.confidence.unknownCostInteractions
  });

  return {
    data: primary.data,
    trust: primary.trust,
    accountingReport: repair.accountingReport,
    postSessionReview: repair.postSessionReview,
    rangeLinkParams: primary.rangeLinkParams,
    evidenceLinks: primary.evidenceLinks,
    roots,
    doctorReport: repair.doctorReport,
    repairWorkbench: repair.repairWorkbench,
    nextRepairGroup: repair.nextRepairGroup,
    repairFocusHref: repair.repairFocusHref,
    unknownCostEvidenceHref: primary.unknownCostEvidenceHref,
    firstRunStatus,
    summary: primary.summary,
    trendDefaultWindow: primary.trendDefaultWindow
  };
}

export const getOverviewPageData = cache(async (range: ResolvedDateRange): Promise<OverviewData> => {
  return getOverviewData(range);
});
