import Link from "next/link";
import { ArrowRight, Coins, Database, Gauge, MessageSquare, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { TrendSection } from "@/components/charts/trend-section";
import type { TrendWindow } from "@/components/charts/trend-chart";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, PageHeader } from "@/components/ui/typography";
import { getAnalyticsData, getScanTrustData } from "@/src/lib/analytics";
import { buildAccountingInvariants, type AccountingInvariantReport } from "@/src/lib/accounting-invariants";
import { buildDoctorReport, type DoctorReport } from "@/src/lib/doctor";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";
import { buildFirstRunStatus, type FirstRunStatus } from "@/src/lib/first-run-status";
import { buildUnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";
import { dateRangeQueryParams, mergeHrefParams, resolveDateRange } from "@/src/lib/date-range";
import { formatCurrency, formatSignedTokens, formatTokens, percent } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import type { UsageGuardrailMetric } from "@/src/lib/usage-guardrails";
import { buildScanDiff } from "@/src/lib/scan-diff";
import { buildPostSessionReview, type PostSessionReview } from "@/src/lib/post-session-review";

export const dynamic = "force-dynamic";

type UsageComparison = ReturnType<typeof getAnalyticsData>["comparison"];
type DataConfidence = ReturnType<typeof getAnalyticsData>["dataConfidence"];

function CostSessionsMetricPane({
  label,
  value,
  detailItems,
  href,
  actionLabel,
  secondaryHref,
  secondaryActionLabel,
  icon: Icon,
  className,
  valueClassName,
  trustLabel,
  trustDetail
}: {
  label: string;
  value: string;
  detailItems: string[];
  href: string;
  actionLabel: string;
  secondaryHref?: string;
  secondaryActionLabel?: string;
  icon: typeof Database;
  className?: string;
  valueClassName?: string;
  trustLabel: string;
  trustDetail: string;
}) {
  return (
    <section
      className={cn(
        "cost-sessions-section grid min-w-0 grid-rows-[auto_auto_auto_auto_1fr_auto] p-4 md:row-span-6 md:[grid-template-rows:subgrid]",
        className
      )}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <FieldLabel className="text-foreground">{label}</FieldLabel>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>

      <div className="mt-3">
        <DataValue size="lg" className={cn("break-words leading-none", valueClassName)}>{value}</DataValue>
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
        {detailItems.map((item, index) => (
          <span key={item} className="inline-flex min-w-0 items-center gap-2">
            <span className="min-w-0">{item}</span>
            {index < detailItems.length - 1 ? <span className="hidden text-border sm:inline">/</span> : null}
          </span>
        ))}
      </div>

      <p aria-label={trustLabel} className="mt-3 border-t pt-2 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">Why this number:</span>{" "}
        <span>{trustDetail}</span>
      </p>

      <div aria-hidden="true" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
        <Link href={href} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
        {secondaryHref ? (
          <Link href={secondaryHref} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
            {secondaryActionLabel ?? "View details"}
          </Link>
        ) : null}
      </div>
    </section>
  );
}

type CostSessionsSummary = {
  totalCost: number;
  exactCost: number;
  estimatedCost: number;
  unknownCostInteractions: number;
  sessions: number;
  interactions: number;
};

function CostSessionsCard({
  summary,
  costHref,
  costActionLabel,
  unknownCostEvidenceHref,
  sessionsHref
}: {
  summary: CostSessionsSummary;
  costHref: string;
  costActionLabel: string;
  unknownCostEvidenceHref?: string;
  sessionsHref: string;
}) {
  return (
    <Card className="cost-sessions-card flex h-full flex-col overflow-hidden md:col-span-2 xl:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle>Cost & Sessions</CardTitle>
          <HelpTooltip
            id="cost-sessions-help"
            label="Cost & Sessions"
            description="Cost is calculated from editable provider model rates. Unknown cost means a model rate or usable token count is missing. Sessions count imported local CLI sessions and interactions in the selected period."
          />
        </div>
        <CardDescription>Model-rate trust and imported activity in one place.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col p-0">
        <div className="grid flex-1 border-t md:grid-cols-2 md:[grid-template-rows:auto_auto_auto_auto_1fr_auto]">
          <CostSessionsMetricPane
            label="Cost"
            value={formatCurrency(summary.totalCost)}
            valueClassName="break-normal whitespace-nowrap text-2xl"
            detailItems={[
              `${formatCurrency(summary.exactCost)} exact`,
              `${formatCurrency(summary.estimatedCost)} estimated`,
              `${summary.unknownCostInteractions.toLocaleString()} unknown`
            ]}
            href={costHref}
            actionLabel={costActionLabel}
            secondaryHref={unknownCostEvidenceHref}
            secondaryActionLabel="View evidence"
            trustLabel="Cost trust"
            trustDetail="Exact, estimated, and unknown costs stay split."
            icon={Coins}
          />
          <CostSessionsMetricPane
            className="border-t md:border-l md:border-t-0"
            label="Sessions"
            value={summary.sessions.toLocaleString()}
            detailItems={[`${summary.interactions.toLocaleString()} interactions`]}
            href={sessionsHref}
            actionLabel="View evidence"
            trustLabel="Session trust"
            trustDetail="Scan freshness is shown in Review Status."
            icon={MessageSquare}
          />
        </div>
      </CardContent>
    </Card>
  );
}

type TokenAccountingSummary = {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  nonCachedTokens: number;
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
};

function TokenAccountingSlice({
  label,
  value,
  detail
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="min-w-0 border-t p-3 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
      <FieldLabel>{label}</FieldLabel>
      <DataValue className="mt-1 break-words leading-none" size="md">{value}</DataValue>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
    </div>
  );
}

function TokenAccountingCard({
  summary,
  processedHref,
  freshHref,
  cacheHref
}: {
  summary: TokenAccountingSummary;
  processedHref: string;
  freshHref: string;
  cacheHref: string;
}) {
  const evidenceActions = [
    { label: "Processed", href: processedHref },
    { label: "Fresh", href: freshHref },
    { label: "Cache", href: cacheHref }
  ];

  return (
    <Card className="flex h-full flex-col overflow-hidden md:col-span-2 xl:col-span-4">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-1.5">
            <CardTitle className="leading-tight">Token Accounting</CardTitle>
            <HelpTooltip
              id="token-accounting-help"
              label="Token Accounting"
              description="Processed tokens combine fresh input, output, reasoning, and cache read/write tokens. Fresh and cache totals are shown separately so high cache use is not mistaken for live context size."
            />
          </div>
          <CardDescription className="mt-1">
            Processed, fresh, and cache tokens share one accounting view.
          </CardDescription>
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Database className="h-4 w-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <DataValue size="lg" className="break-words text-3xl leading-none">{formatTokens(summary.totalTokens)}</DataValue>
        <div className="mt-1 text-sm font-medium text-foreground">processed tokens</div>
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
          {[
            `${formatTokens(summary.inputTokens)} input`,
            `${formatTokens(summary.outputTokens)} output`,
            `${formatTokens(summary.reasoningTokens)} reasoning`,
            `${formatTokens(summary.cachedTokens)} cached`
          ].map((item, index, items) => (
            <span key={item} className="inline-flex min-w-0 items-center gap-2">
              <span className="min-w-0">{item}</span>
              {index < items.length - 1 ? <span className="hidden text-border sm:inline">/</span> : null}
            </span>
          ))}
        </div>

        <div className="mt-4 grid overflow-hidden rounded-md border border-border md:grid-cols-3">
          <TokenAccountingSlice
            label="Processed"
            value={formatTokens(summary.totalTokens)}
            detail="Fresh work, cache read/write, and reasoning tokens counted together."
          />
          <TokenAccountingSlice
            label="Fresh / non-cache"
            value={formatTokens(summary.nonCachedTokens)}
            detail={`${formatTokens(summary.inputTokens)} input / ${formatTokens(summary.outputTokens)} output / ${formatTokens(summary.reasoningTokens)} reasoning`}
          />
          <TokenAccountingSlice
            label="Cache"
            value={formatTokens(summary.cachedTokens)}
            detail={`${formatTokens(summary.cacheReadTokens)} read / ${formatTokens(summary.cacheWriteTokens)} write`}
          />
        </div>

        <p className="mt-3 border-t pt-2 text-xs leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">Why this number:</span>{" "}
          <span>
            Includes cache read/write and reasoning tokens. Fresh excludes cache, and cache is split into read/write so large totals are not mistaken for live context size.
          </span>
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
          {evidenceActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              aria-label={`View ${action.label.toLowerCase()} token evidence`}
              className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline"
            >
              <span className="text-muted-foreground">{action.label}</span>
              <span>View evidence</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

type ReviewStatus = "ready" | "review" | "blocked";

function reviewStatusVariant(state: ReviewStatus) {
  if (state === "ready") return "success";
  if (state === "blocked") return "destructive";
  return "warning";
}

function OverviewReviewStatusTile({
  label,
  value,
  detail,
  href,
  actionLabel,
  state,
  icon: Icon,
  className
}: {
  label: string;
  value: string;
  detail: string;
  href: string;
  actionLabel: "View evidence" | "Open repair" | "Set model rate" | "Review parser";
  state: ReviewStatus;
  icon: typeof Database;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex min-w-0 gap-3 p-3 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
    >
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 flex-wrap items-center gap-2">
          <FieldLabel className="text-foreground">{label}</FieldLabel>
          <Badge variant={reviewStatusVariant(state)}>{state}</Badge>
        </span>
        <span className="mt-1 block text-sm font-semibold text-foreground">{value}</span>
        <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{detail}</span>
        <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 group-hover:underline">
          {actionLabel}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}

function OverviewReviewStatusStrip({
  report,
  confidence,
  accountingReport,
  review,
  selectedInteractions,
  selectedCachedTokens,
  repairHref,
  processedTokensHref,
  cachedEvidenceHref
}: {
  report: DoctorReport;
  confidence: ReturnType<typeof getScanTrustData>["confidence"];
  accountingReport: AccountingInvariantReport;
  review: PostSessionReview;
  selectedInteractions: number;
  selectedCachedTokens: number;
  repairHref: string;
  processedTokensHref: string;
  cachedEvidenceHref: string;
}) {
  const parserReviewFiles = report.parserCoverage.parserReviewFiles + report.parserCoverage.failureFiles;
  const exactTokenShare = confidence.interactions > 0
    ? percent(confidence.exactTokenInteractions / confidence.interactions)
    : "0%";
  const costCoverage = confidence.interactions > 0
    ? percent((confidence.exactCostInteractions + confidence.estimatedCostInteractions) / confidence.interactions)
    : "0%";
  const items = [
    {
      label: "Imported usage",
      value: report.latestScan.id ? `${report.latestScan.recordsImported.toLocaleString()} imports` : "No scan",
      detail: report.latestScan.zeroImportExplanation ?? `${report.latestScan.filesScanned.toLocaleString()} files checked in the latest scan.`,
      state: report.latestScan.id ? "ready" as const : "blocked" as const,
      href: "/discovery",
      actionLabel: "View evidence" as const,
      icon: Database
    },
    {
      label: "Files to review",
      value: parserReviewFiles > 0 ? `${parserReviewFiles.toLocaleString()} files` : "No file blockers",
      detail: parserReviewFiles > 0 ? "Unsupported, failed, or low-confidence files need parser review." : "Imported files have usable parser status.",
      state: report.parserCoverage.failureFiles > 0 ? "blocked" as const : parserReviewFiles > 0 ? "review" as const : "ready" as const,
      href: parserReviewFiles > 0 ? "/parser-debug" : "/discovery",
      actionLabel: parserReviewFiles > 0 ? "Review parser" as const : "View evidence" as const,
      icon: Gauge
    },
    {
      label: "Cost coverage",
      value: report.pricing.unknown > 0 ? `${report.pricing.unknown.toLocaleString()} unknown` : costCoverage,
      detail: report.pricing.unknown > 0
        ? `${report.pricing.priced.toLocaleString()} priced interactions; unknown costs need model rates or parser repair.`
        : "All imported interactions in this view have priced or estimated cost.",
      state: report.pricing.unknown > 0 ? "blocked" as const : "ready" as const,
      href: report.pricing.unknown > 0 ? repairHref : "/pricing",
      actionLabel: report.pricing.unknown > 0 ? "Open repair" as const : "Set model rate" as const,
      icon: Coins
    },
    {
      label: "Token math",
      value: accountingReport.balanceDeltaTokens === 0 ? "Balanced" : `${formatTokens(Math.abs(accountingReport.balanceDeltaTokens))} delta`,
      detail: accountingReport.balanceDeltaTokens === 0
        ? `${exactTokenShare} of interactions have exact provider token counts.`
        : "Processed tokens do not fully match the visible input, output, reasoning, and cache buckets.",
      state: accountingReport.status === "ready" ? "ready" as const : "review" as const,
      href: processedTokensHref,
      actionLabel: "View evidence" as const,
      icon: Database
    },
    {
      label: "Session review",
      value: `${review.expensiveSessions.length.toLocaleString()} high-cost`,
      detail: `${review.newlyImportedRecords.toLocaleString()} newly imported records; ${review.parserWarnings.toLocaleString()} parser warnings in the latest review.`,
      state: review.parserWarnings > 0 || review.unknownCostInteractions > 0 ? "review" as const : "ready" as const,
      href: "/sessions",
      actionLabel: "View evidence" as const,
      icon: MessageSquare
    },
    {
      label: "Privacy boundary",
      value: `${report.supportMatrix.summary.stable} stable checks`,
      detail: selectedCachedTokens > 0
        ? `${formatTokens(selectedCachedTokens)} cache tokens counted without reading private prompts.`
        : selectedInteractions > 0 ? "TokenTrace uses local files and does not add telemetry." : "Scan usage before privacy and cache checks appear.",
      state: "ready" as const,
      href: cachedEvidenceHref,
      actionLabel: "View evidence" as const,
      icon: Gauge
    }
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Review Status</CardTitle>
          <CardDescription>Compact checks for imported usage, files, cost coverage, token math, and local boundaries.</CardDescription>
        </div>
        <Badge variant={items.some((item) => item.state === "blocked") ? "destructive" : items.some((item) => item.state === "review") ? "warning" : "success"}>
          {items.some((item) => item.state === "blocked") ? "needs repair" : items.some((item) => item.state === "review") ? "review" : "ready"}
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t md:grid-cols-2 xl:grid-cols-3">
          {items.map((item, index) => (
            <OverviewReviewStatusTile
              key={item.label}
              {...item}
              className={cn(index > 0 ? "border-t border-border md:border-l md:border-t-0" : "", index % 3 === 0 ? "xl:border-l-0" : "xl:border-l")}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function formatSignedCurrency(value: number) {
  if (value === 0) return "$0.00";
  return `${value > 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function formatSignedNumber(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${Math.abs(value).toLocaleString()}`;
}

function usagePulsePeriodLabels(mode: UsageComparison["mode"]) {
  if (mode === "latest-seven-days") {
    return {
      current: "Latest 7 days",
      previous: "Previous 7 days",
      badge: "Latest 7 days vs previous 7 days"
    };
  }
  if (mode === "selected-period") {
    return {
      current: "Selected period",
      previous: "Previous matching period",
      badge: "Selected period vs previous matching period"
    };
  }
  return {
    current: "Current",
    previous: "Previous",
    badge: "Current vs previous"
  };
}

function formatPulsePercent(percentValue: number | null, changeValue: number, previousValue: number) {
  if (percentValue == null) {
    if (previousValue === 0 && changeValue > 0) return "new";
    if (changeValue === 0) return "flat";
    return changeValue > 0 ? "up" : "down";
  }
  if (percentValue === 0) return "flat";
  return `${percentValue > 0 ? "up" : "down"} ${Math.abs(percentValue)}%`;
}

function PulseMetric({
  label,
  value,
  change,
  changeValue,
  percentValue,
  previous,
  previousValue,
  currentLabel,
  previousLabel
}: {
  label: string;
  value: string;
  change: string;
  changeValue: number;
  percentValue: number | null;
  previous: string;
  previousValue: number;
  currentLabel: string;
  previousLabel: string;
}) {
  const ToneIcon = changeValue > 0 ? TrendingUp : changeValue < 0 ? TrendingDown : Minus;
  const toneClass = changeValue > 0
    ? "text-primary"
    : changeValue < 0
      ? "text-orange-700"
      : "text-muted-foreground";

  return (
    <div className="min-w-0 border-t px-3 py-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <FieldLabel className="truncate">{label}</FieldLabel>
        <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums", toneClass)}>
          <ToneIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {formatPulsePercent(percentValue, changeValue, previousValue)}
        </span>
      </div>
      <dl className="mt-2 grid gap-1.5 text-xs leading-5">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="min-w-0 truncate text-muted-foreground">{currentLabel}</dt>
          <dd className="shrink-0 text-lg font-semibold leading-none tabular-nums text-foreground">{value}</dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="min-w-0 truncate text-muted-foreground">{previousLabel}</dt>
          <dd className="shrink-0 font-medium tabular-nums text-muted-foreground">{previous}</dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="min-w-0 truncate text-muted-foreground">Change</dt>
          <dd className={cn("shrink-0 font-semibold tabular-nums", toneClass)}>{change}</dd>
        </div>
      </dl>
    </div>
  );
}

function UsagePulsePanel({ comparison }: { comparison: UsageComparison }) {
  const periodLabels = usagePulsePeriodLabels(comparison.mode);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <CardTitle>Usage Pulse</CardTitle>
              <span className="text-sm font-semibold text-foreground">{comparison.headline}</span>
            </div>
            <CardDescription>{comparison.detail}</CardDescription>
          </div>
          <Badge variant="secondary">{periodLabels.badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t sm:grid-cols-2 xl:grid-cols-4">
          <PulseMetric
            label="Tokens"
            value={formatTokens(comparison.current.totalTokens)}
            change={formatSignedTokens(comparison.delta.totalTokens)}
            changeValue={comparison.delta.totalTokens}
            percentValue={comparison.delta.totalTokensPercent}
            previous={formatTokens(comparison.previous.totalTokens)}
            previousValue={comparison.previous.totalTokens}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
          <PulseMetric
            label="Cost"
            value={formatCurrency(comparison.current.totalCost)}
            change={formatSignedCurrency(comparison.delta.totalCost)}
            changeValue={comparison.delta.totalCost}
            percentValue={comparison.delta.totalCostPercent}
            previous={formatCurrency(comparison.previous.totalCost)}
            previousValue={comparison.previous.totalCost}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
          <PulseMetric
            label="Sessions"
            value={comparison.current.sessions.toLocaleString()}
            change={formatSignedNumber(comparison.delta.sessions)}
            changeValue={comparison.delta.sessions}
            percentValue={comparison.delta.sessionsPercent}
            previous={comparison.previous.sessions.toLocaleString()}
            previousValue={comparison.previous.sessions}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
          <PulseMetric
            label="Unknown cost"
            value={comparison.current.unknownCostInteractions.toLocaleString()}
            change={formatSignedNumber(comparison.delta.unknownCostInteractions)}
            changeValue={comparison.delta.unknownCostInteractions}
            percentValue={comparison.delta.unknownCostInteractionsPercent}
            previous={comparison.previous.unknownCostInteractions.toLocaleString()}
            previousValue={comparison.previous.unknownCostInteractions}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function confidenceVariant(grade: DataConfidence["grade"]) {
  if (grade === "high") return "success";
  if (grade === "medium") return "warning";
  if (grade === "low") return "destructive";
  return "secondary";
}

function DataConfidenceStrip({ confidence }: { confidence: DataConfidence }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-sm font-semibold">Data Confidence</div>
            <Badge variant={confidenceVariant(confidence.grade)}>{confidence.score}/100 {confidence.grade}</Badge>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {confidence.drivers.slice(0, 2).join(" ")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {confidence.repairHref ? (
            <Button asChild variant="outline" size="sm">
              <Link href={confidence.repairHref}>Open repair <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href="/diagnostics">Open Scan Health <ArrowRight className="h-4 w-4" /></Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function guardrailBadgeVariant(status: UsageGuardrailMetric["status"]) {
  if (status === "exceeded") return "destructive";
  if (status === "warning") return "warning";
  if (status === "ok") return "success";
  return "secondary";
}

function guardrailLabel(status: UsageGuardrailMetric["status"]) {
  if (status === "exceeded") return "exceeded";
  if (status === "warning") return "watch";
  if (status === "ok") return "within limit";
  return "not set";
}

function repairCauseLabel(cause: string) {
  if (cause === "missing pricing") return "missing model rate";
  return cause;
}

function GuardrailMetricPanel({
  label,
  metric,
  formatValue
}: {
  label: string;
  metric: UsageGuardrailMetric;
  formatValue: (value: number | null) => string;
}) {
  const cappedPercent = Math.min(1, Math.max(0, metric.percent));
  const barClass =
    metric.status === "exceeded"
      ? "bg-destructive"
      : metric.status === "warning"
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="min-w-0 border-t p-3 first:border-t-0 md:border-l md:border-t-0 md:first:border-l-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel>{label}</FieldLabel>
        <Badge variant={guardrailBadgeVariant(metric.status)}>{guardrailLabel(metric.status)}</Badge>
      </div>
      <DataValue className="mt-1" size="md">
        {metric.configured ? `${formatValue(metric.used)} / ${formatValue(metric.limit)}` : formatValue(metric.used)}
      </DataValue>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", barClass)} style={{ width: `${cappedPercent * 100}%` }} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {metric.configured
          ? `${percent(metric.percent)} used, ${formatValue(metric.remaining)} remaining`
          : "Set a local monthly limit in Settings."}
      </div>
    </div>
  );
}

function UsageGuardrailsPanel({
  progress
}: {
  progress: {
    monthLabel: string;
    cost: UsageGuardrailMetric;
    tokens: UsageGuardrailMetric;
  };
}) {
  const configured = progress.cost.configured || progress.tokens.configured;
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-primary" />
            Monthly Guardrails
          </CardTitle>
          <CardDescription>
            {configured
              ? `Month-to-date checks for ${progress.monthLabel}, based only on imported local CLI usage.`
              : "Optional local limits for monthly cost and tokens."}
          </CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/settings">
            Configure <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t md:grid-cols-2">
          <GuardrailMetricPanel label="Cost" metric={progress.cost} formatValue={formatCurrency} />
          <GuardrailMetricPanel label="Tokens" metric={progress.tokens} formatValue={formatTokens} />
        </div>
      </CardContent>
    </Card>
  );
}

function FirstRunPanel({ status }: { status: FirstRunStatus }) {
  return (
    <Card className={status.tone === "warning" ? "border-amber-300 bg-amber-50/50" : undefined}>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>{status.title}</CardTitle>
          <CardDescription>{status.description}</CardDescription>
        </div>
        <Button asChild variant={status.tone === "warning" ? "outline" : "default"}>
          <Link href={status.primaryAction.href}>
            {status.primaryAction.label} <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid divide-y border-y md:grid-cols-5 md:divide-x md:divide-y-0">
          {status.checks.map((check) => (
            <div key={check.id} className="p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{check.label}</div>
                <Badge variant={check.state === "pass" ? "success" : check.state === "warn" ? "warning" : "secondary"}>
                  {check.state}
                </Badge>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{check.detail}</div>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold leading-tight">Guided setup</h2>
            <span className="text-xs text-muted-foreground">Five local steps to first useful evidence.</span>
          </div>
          <ol className="mt-3 grid overflow-hidden rounded-md border bg-card md:grid-cols-5">
            {status.setupSteps.map((step, index) => (
              <li
                key={step.id}
                className={cn(
                  "min-w-0 p-3",
                  index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <Badge variant={step.state === "pass" ? "success" : step.state === "warn" ? "warning" : "secondary"}>
                    {step.state}
                  </Badge>
                </div>
                <div className="mt-2 text-sm font-semibold leading-tight">{step.label}</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{step.detail}</p>
                <Link href={step.href} className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
                  {step.action}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function TopRepairItemsStrip({
  groups,
  repairHref,
  rangeLinkParams
}: {
  groups: ReturnType<typeof buildUnknownCostRepairWorkbench>["groups"];
  repairHref: string;
  rangeLinkParams: Record<string, string | undefined>;
}) {
  const topGroups = groups.slice(0, 3);
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Top repair items</CardTitle>
          <CardDescription>Most important unknown-cost groups stay summarized here. The full queue lives in Repair.</CardDescription>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={repairHref}>
            Open repair <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t md:grid-cols-3">
          {topGroups.map((row, index) => {
            const primaryHref = row.pricingHref
              ? mergeHrefParams(row.pricingHref, { returnTo: mergeHrefParams(row.itemHref, rangeLinkParams) })
              : mergeHrefParams(row.repairHref, rangeLinkParams);
            return (
              <div
                key={row.key}
                className={cn("min-w-0 p-3", index > 0 ? "border-t border-border md:border-l md:border-t-0" : "")}
              >
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <div className="min-w-0">
                    <FieldLabel>{repairCauseLabel(row.cause)}</FieldLabel>
                    <div className="mt-1 truncate text-sm font-semibold text-foreground">{row.model}</div>
                  </div>
                  <Badge variant={row.state === "resolved" ? "success" : row.state === "needs-parser-review" ? "warning" : row.state === "ignored" ? "secondary" : "destructive"}>
                    {row.state}
                  </Badge>
                </div>
                <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {row.interactions.toLocaleString()} interactions, {formatTokens(row.totalTokens)} tokens, {row.tool}.
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
                  <Link href={primaryHref} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
                    {row.pricingHref ? "Set model rate" : "Review parser"}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link href={mergeHrefParams(row.itemHref, rangeLinkParams)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    Open repair
                  </Link>
                  <Link href={mergeHrefParams(row.sourceHref, rangeLinkParams)} className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                    View evidence
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

type OverviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const trendDefaultWindow: TrendWindow = range.key === "all" ? "30d" : "all";
  const data = getAnalyticsData(range.filters);
  const accountingReport = buildAccountingInvariants(range.filters);
  const postSessionReview = buildPostSessionReview({
    scanDiff: buildScanDiff(),
    usageGuardrails: data.usageGuardrails,
    summary: data.summary,
    sessions: data.sessions
  });
  const rangeLinkParams = dateRangeQueryParams(range);
  const evidenceLinks = Object.fromEntries(
    Object.entries(data.evidenceLinks).map(([key, href]) => [key, mergeHrefParams(href, rangeLinkParams)])
  ) as typeof data.evidenceLinks;
  const trust = getScanTrustData(range.filters);
  const roots = await getDefaultSearchRoots();
  const doctorReport = buildDoctorReport({ ...trust, roots });
  const repairWorkbench = buildUnknownCostRepairWorkbench(range.filters);
  const nextRepairGroup =
    repairWorkbench.groups.find((group) => group.review.status !== "ignored" && group.review.status !== "resolved")
    ?? repairWorkbench.groups[0]
    ?? null;
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
  const { summary } = data;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Overview"
        description="Local token, cost, model, and session analytics across AI CLI tools."
        actions={
          <Button asChild>
            <Link href="/settings">
              Configure scan <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <PeriodFilter range={range} />

      {summary.interactions === 0 ? (
        <FirstRunPanel status={firstRunStatus} />
      ) : null}

      <UsagePulsePanel comparison={data.comparison} />

      <DataConfidenceStrip confidence={data.dataConfidence} />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
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

      <TrendSection data={data.trends} defaultWindow={trendDefaultWindow} />

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

      <UsageGuardrailsPanel progress={data.usageGuardrails} />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold leading-tight">Recommended Next Actions</h2>
          <CardDescription>
            Local rules ranked from your scan, model rates, parser, project, and cache data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ol className="grid divide-y overflow-hidden lg:grid-cols-3 lg:divide-x lg:divide-y-0">
            {data.recommendations.slice(0, 3).map((item, index) => (
              <li key={item.id} className="min-w-0">
                <Link
                  href={item.href}
                  className="group flex h-full min-w-0 gap-3 px-4 py-4 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-semibold tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">{item.title}</span>
                      <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "warning" : "secondary"}>
                        {item.severity}
                      </Badge>
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{item.evidence}</span>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                      {item.action}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(20rem,0.9fr)_minmax(0,1.1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Usage By Tool</CardTitle>
            <CardDescription>Top tools by total tokens.</CardDescription>
          </CardHeader>
          <CardContent>
            <RankBarChart data={data.tools as unknown as Array<Record<string, string | number | null>>} nameKey="tool" valueKey="totalTokens" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Current Mix</CardTitle>
            <CardDescription>
              Most used tool: {summary.mostUsedTool}. Most used model: {summary.mostUsedModel}.
            </CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tool</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Cache</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.tools.slice(0, 5).map((tool) => (
                  <TableRow key={tool.tool}>
                    <TableCell className="font-medium">
                      <Link href={`/sessions?tool=${encodeURIComponent(tool.tool)}`} className="text-primary underline-offset-4 hover:underline">
                        {tool.tool}
                      </Link>
                    </TableCell>
                    <TableCell>{tool.provider}</TableCell>
                    <TableCell>{formatTokens(tool.totalTokens)}</TableCell>
                    <TableCell>{formatCurrency(tool.cost)}</TableCell>
                    <TableCell>
                      <Badge variant={tool.cacheEfficiency > 0.1 ? "success" : "secondary"}>
                        {percent(tool.cacheEfficiency)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
