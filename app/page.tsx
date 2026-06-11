import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TrendSection } from "@/components/charts/trend-section-lazy";
import type { TrendAnomalyMarker } from "@/components/charts/trend-chart";
import { OverviewAnomaliesPanel } from "@/components/overview/anomalies-panel";
import { detectAnomalies } from "@/src/lib/anomaly-detection";
import { OverviewCurrentMixPanel } from "@/components/overview/current-mix-panel";
import { DataConfidenceStrip } from "@/components/overview/data-confidence-strip";
import { FirstRunPanel } from "@/components/overview/first-run-panel";
import { UsageGuardrailsPanel } from "@/components/overview/guardrails-panel";
import { OverviewRecommendationsCard } from "@/components/overview/recommendations-card";
import { OverviewReviewStatusStrip } from "@/components/overview/review-status-strip";
import {
  OverviewPrimarySkeleton,
  OverviewRepairSkeleton
} from "@/components/overview/section-skeletons";
import { CostSessionsCard, TokenAccountingCard } from "@/components/overview/summary-cards";
import { TopRepairItemsStrip } from "@/components/overview/top-repair-items-strip";
import { OverviewTrustFooter } from "@/components/overview/trust-footer";
import { UsagePulsePanel } from "@/components/overview/usage-pulse-panel";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/typography";
import { mergeHrefParams, type ResolvedDateRange, resolveDateRange } from "@/src/lib/date-range";
import { runDueScheduledScan } from "@/src/lib/scheduled-scan";
import { getOverviewPrimaryData, getOverviewRepairData } from "@/src/lib/overview-data";

export const dynamic = "force-dynamic";

type OverviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function OverviewPrimarySection({ range }: { range: ResolvedDateRange }) {
  const {
    data,
    trust,
    evidenceLinks,
    firstRunStatus,
    summary,
    trendDefaultWindow,
    unknownCostEvidenceHref,
    rangeLinkParams
  } = await getOverviewPrimaryData(range);
  const repairFocusHref = mergeHrefParams("/repair", rangeLinkParams);
  const anomalyReport = detectAnomalies(data.trends);
  const tokenMarkers: TrendAnomalyMarker[] = anomalyReport.anomalies
    .filter((entry) => entry.metric === "tokens")
    .map((entry) => ({ date: entry.date, value: entry.value, severity: entry.severity }));
  const costMarkers: TrendAnomalyMarker[] = anomalyReport.anomalies
    .filter((entry) => entry.metric === "cost")
    .map((entry) => ({ date: entry.date, value: entry.value, severity: entry.severity }));

  return (
    <div className="overview-primary-section space-y-7">
      {summary.interactions === 0 ? <FirstRunPanel status={firstRunStatus} /> : null}
      <UsagePulsePanel comparison={data.comparison} />
      <DataConfidenceStrip confidence={data.dataConfidence} />
      <div className="overview-summary-grid grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <TokenAccountingCard
          summary={summary}
          processedHref={evidenceLinks["processed-tokens"]}
          freshHref={evidenceLinks["non-cache-tokens"]}
          cacheHref={evidenceLinks["cached-tokens"]}
        />
        <CostSessionsCard
          summary={summary}
          costHref={summary.unknownCostInteractions > 0 ? repairFocusHref : evidenceLinks["estimated-cost"]}
          costActionLabel={summary.unknownCostInteractions > 0 ? "Open repair" : "View evidence"}
          unknownCostEvidenceHref={summary.unknownCostInteractions > 0 ? unknownCostEvidenceHref : undefined}
          sessionsHref={evidenceLinks.sessions}
        />
      </div>
      <OverviewTrustFooter health={trust.health} pricedModelCount={trust.pricedModelCount} />
      <TrendSection
        data={data.trends}
        defaultWindow={trendDefaultWindow}
        tokenMarkers={tokenMarkers}
        costMarkers={costMarkers}
      />
      <OverviewAnomaliesPanel trends={data.trends} />
      <UsageGuardrailsPanel progress={data.usageGuardrails} />
      <OverviewRecommendationsCard recommendations={data.recommendations} />
      <OverviewCurrentMixPanel
        tools={data.tools}
        mostUsedTool={summary.mostUsedTool}
        mostUsedModel={summary.mostUsedModel}
      />
    </div>
  );
}

async function OverviewRepairSection({ range }: { range: ResolvedDateRange }) {
  const {
    accountingReport,
    postSessionReview,
    doctorReport,
    repairWorkbench,
    repairFocusHref,
    evidenceLinks,
    summary,
    trust,
    rangeLinkParams
  } = await getOverviewRepairData(range);

  if (summary.interactions === 0 && repairWorkbench.groups.length === 0) {
    return null;
  }

  return (
    <div className="overview-repair-section space-y-7">
      {summary.interactions > 0 ? (
        <OverviewReviewStatusStrip
          report={doctorReport}
          confidence={trust.confidence}
          accountingReport={accountingReport}
          review={postSessionReview}
          selectedInteractions={summary.interactions}
          selectedCachedTokens={summary.cachedTokens}
          repairHref={repairFocusHref}
          processedTokensHref={evidenceLinks["processed-tokens"]}
          cachedEvidenceHref={evidenceLinks["cached-tokens"]}
        />
      ) : null}
      {repairWorkbench.groups.length ? (
        <TopRepairItemsStrip
          groups={repairWorkbench.groups}
          repairHref={repairFocusHref}
          rangeLinkParams={rangeLinkParams}
        />
      ) : null}
    </div>
  );
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  void runDueScheduledScan().catch(() => undefined);
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);

  return (
    <div className="overview-workbench space-y-7">
      <PageHeader
        title="Overview"
        description="Local token, cost, model, and session analytics across AI CLI tools."
        actions={
          <Button asChild>
            <Link href="/settings#scan-controls">
              Configure scan <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <PeriodFilter range={range} />

      <Suspense fallback={<OverviewPrimarySkeleton />}>
        <OverviewPrimarySection range={range} />
      </Suspense>

      <Suspense fallback={<OverviewRepairSkeleton />}>
        <OverviewRepairSection range={range} />
      </Suspense>
    </div>
  );
}
