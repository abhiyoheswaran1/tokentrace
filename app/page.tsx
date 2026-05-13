import Link from "next/link";
import { ArrowRight, Coins, Database, Gauge, Layers, MessageSquare, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { getAnalyticsData, getScanTrustData } from "@/src/lib/analytics";
import { buildDoctorReport, type DoctorReport } from "@/src/lib/doctor";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";
import { buildFirstRunStatus, type FirstRunStatus } from "@/src/lib/first-run-status";
import { buildUnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";
import { dateRangeQueryParams, mergeHrefParams, resolveDateRange } from "@/src/lib/date-range";
import { formatCurrency, formatSignedTokens, formatTokens, percent } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";
import type { UsageGuardrailMetric } from "@/src/lib/usage-guardrails";

export const dynamic = "force-dynamic";

function MetricCard({
  label,
  value,
  detailItems,
  description,
  href,
  actionLabel = "Inspect sessions",
  secondaryHref,
  secondaryActionLabel,
  icon: Icon,
  className,
  valueClassName
}: {
  label: string;
  value: string;
  detailItems?: string[];
  description?: string;
  href?: string;
  actionLabel?: string;
  secondaryHref?: string;
  secondaryActionLabel?: string;
  icon: typeof Database;
  className?: string;
  valueClassName?: string;
}) {
  const tooltipId = `metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-help`;

  return (
    <Card className={cn("flex h-full flex-col overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle className="leading-tight">{label}</CardTitle>
          {description ? (
            <HelpTooltip id={tooltipId} label={label} description={description} />
          ) : null}
        </div>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <DataValue size="lg" className={cn("break-words leading-none", valueClassName)}>{value}</DataValue>
        {detailItems?.length ? (
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
            {detailItems.map((item, index) => (
              <span key={item} className="inline-flex min-w-0 items-center gap-2">
                <span className="min-w-0">{item}</span>
                {index < detailItems.length - 1 ? <span className="hidden text-border sm:inline">/</span> : null}
              </span>
            ))}
          </div>
        ) : null}
        {href || secondaryHref ? (
          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4">
            {href ? (
              <Link href={href} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-primary underline-offset-4 hover:underline">
                {actionLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
            {secondaryHref ? (
              <Link href={secondaryHref} className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                {secondaryActionLabel ?? "View details"}
              </Link>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function OverviewTrustStrip({
  latestScan,
  confidence,
  repairHref,
  processedTokensHref
}: {
  latestScan: { id: string | null; filesScanned: number; recordsImported: number };
  confidence: {
    interactions: number;
    exactTokenInteractions: number;
    exactCostInteractions: number;
    estimatedCostInteractions: number;
    unknownCostInteractions: number;
  };
  repairHref: string;
  processedTokensHref: string;
}) {
  const exactTokenShare = confidence.interactions > 0 ? percent(confidence.exactTokenInteractions / confidence.interactions) : "0%";
  const costCoverage =
    confidence.interactions > 0
      ? percent((confidence.exactCostInteractions + confidence.estimatedCostInteractions) / confidence.interactions)
      : "0%";
  const trustItems = [
    {
      label: "Latest scan",
      value: latestScan.id ? `${latestScan.recordsImported.toLocaleString()} imports` : "No scan",
      detail: latestScan.id ? `${latestScan.filesScanned.toLocaleString()} files scanned` : "Waiting for imported usage",
      href: "/discovery",
      icon: Database
    },
    {
      label: "Exact tokens",
      value: exactTokenShare,
      detail: `${confidence.exactTokenInteractions.toLocaleString()} interactions with provider counts`,
      href: processedTokensHref,
      icon: Gauge
    },
    {
      label: "Cost coverage",
      value: costCoverage,
      detail:
        confidence.unknownCostInteractions > 0
          ? `${confidence.unknownCostInteractions.toLocaleString()} interactions need repair`
          : "All imported interactions priced",
      href: confidence.unknownCostInteractions > 0 ? repairHref : "/pricing",
      icon: Coins
    }
  ];

  return (
    <section className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-3" aria-label="Overview data confidence">
      {trustItems.map((item, index) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.label}
            href={item.href}
            className={cn(
              "group flex min-w-0 items-start gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""
            )}
          >
            <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 space-y-1">
              <FieldLabel>{item.label}</FieldLabel>
              <span className="block truncate text-base font-semibold text-foreground">{item.value}</span>
              <span className="block text-sm text-muted-foreground">{item.detail}</span>
            </span>
          </Link>
        );
      })}
    </section>
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

function formatPercentValue(value: number | null) {
  if (value == null) return "new";
  if (value === 0) return "flat";
  return `${value > 0 ? "+" : "-"}${Math.abs(value)}%`;
}

function DeltaMetric({
  label,
  value,
  delta,
  percentValue,
  previous
}: {
  label: string;
  value: string;
  delta: string;
  percentValue: number | null;
  previous: string;
}) {
  const ToneIcon = percentValue == null || percentValue > 0 ? TrendingUp : percentValue < 0 ? TrendingDown : Minus;
  const toneClass = percentValue == null
    ? "text-primary"
    : percentValue > 0
      ? "text-emerald-800"
      : percentValue < 0
        ? "text-orange-700"
        : "text-muted-foreground";

  return (
    <div className="min-w-0 border-t px-4 py-4 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <FieldLabel className="truncate">{label}</FieldLabel>
        <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums", toneClass)}>
          <ToneIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {formatPercentValue(percentValue)}
        </span>
      </div>
      <DataValue className="mt-1 truncate" size="md">{value}</DataValue>
      <div className="mt-1 text-xs text-muted-foreground">
        {delta} vs {previous}
      </div>
    </div>
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
      </CardContent>
    </Card>
  );
}

function readinessVariant(state: "ready" | "review" | "blocked") {
  if (state === "ready") return "success";
  if (state === "blocked") return "destructive";
  return "warning";
}

function DataReadinessPanel({
  report,
  selectedInteractions,
  selectedCachedTokens,
  repairHref,
  cachedEvidenceHref
}: {
  report: DoctorReport;
  selectedInteractions: number;
  selectedCachedTokens: number;
  repairHref: string;
  cachedEvidenceHref: string;
}) {
  const parserReviewFiles = report.parserCoverage.parserReviewFiles + report.parserCoverage.failureFiles;
  const items = [
    {
      label: "Local scans",
      value: report.latestScan.id ? `${report.latestScan.recordsImported.toLocaleString()} imports` : "No scan",
      detail: report.latestScan.zeroImportExplanation ?? `${report.latestScan.filesScanned.toLocaleString()} files checked in the latest scan.`,
      state: report.latestScan.id ? "ready" as const : "blocked" as const,
      href: "/discovery"
    },
    {
      label: "Parser coverage",
      value: parserReviewFiles > 0 ? `${parserReviewFiles.toLocaleString()} files need review` : "No parser blockers",
      detail: "Discovery and Parser Debug explain ignored, unsupported, failed, and imported files.",
      state: report.parserCoverage.failureFiles > 0 ? "blocked" as const : parserReviewFiles > 0 ? "review" as const : "ready" as const,
      href: parserReviewFiles > 0 ? "/parser-debug" : "/discovery"
    },
    {
      label: "Pricing",
      value: report.pricing.unknown > 0 ? `${report.pricing.unknown.toLocaleString()} unknown` : "Priced",
      detail: `${report.pricing.priced.toLocaleString()} priced interactions across ${report.pricing.pricedModelCount.toLocaleString()} priced models.`,
      state: report.pricing.unknown > 0 ? "blocked" as const : "ready" as const,
      href: report.pricing.unknown > 0 ? repairHref : "/pricing"
    },
    {
      label: "Cache accounting",
      value: selectedCachedTokens > 0 ? formatTokens(selectedCachedTokens) : "No cache tokens",
      detail: selectedCachedTokens > 0
        ? "Cache read and write tokens are separated from fresh input/output."
        : selectedInteractions > 0 ? "The selected period has no imported cache read/write counts." : "Scan usage before cache accounting appears.",
      state: selectedCachedTokens > 0 ? "ready" as const : "review" as const,
      href: cachedEvidenceHref
    },
    {
      label: "Boundaries",
      value: `${report.supportMatrix.summary.stable} stable, ${report.supportMatrix.summary.bestEffort} best effort`,
      detail: "Unsupported desktop scraping, packet capture, proxying, and telemetry stay out of scope.",
      state: "ready" as const,
      href: "/doctor"
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Readiness</CardTitle>
        <CardDescription>Current trust checks before acting on cost, token, parser, or cache numbers.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t md:grid-cols-2 xl:grid-cols-5">
          {items.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "block min-w-0 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                index > 0 ? "border-t border-border md:border-l md:border-t-0 xl:border-l" : ""
              )}
            >
              <div className="flex min-w-0 items-start justify-between gap-2">
                <FieldLabel className="truncate">{item.label}</FieldLabel>
                <Badge variant={readinessVariant(item.state)}>{item.state}</Badge>
              </div>
              <div className="mt-2 text-sm font-semibold text-foreground">{item.value}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</div>
            </Link>
          ))}
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
  const data = getAnalyticsData(range.filters);
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

      {summary.interactions > 0 ? (
        <OverviewTrustStrip
          latestScan={doctorReport.latestScan}
          confidence={trust.confidence}
          repairHref={repairFocusHref}
          processedTokensHref={evidenceLinks["processed-tokens"]}
        />
      ) : null}

      {summary.interactions > 0 ? (
        <DataReadinessPanel
          report={doctorReport}
          selectedInteractions={summary.interactions}
          selectedCachedTokens={summary.cachedTokens}
          repairHref={repairFocusHref}
          cachedEvidenceHref={evidenceLinks["cached-tokens"]}
        />
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>Usage Pulse</CardTitle>
              <CardDescription>{data.comparison.detail}</CardDescription>
            </div>
            <Badge variant="secondary">{data.comparison.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t px-4 py-3">
            <div className="text-sm font-semibold">{data.comparison.headline}</div>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-4">
            <DeltaMetric
              label="Tokens"
              value={formatTokens(data.comparison.current.totalTokens)}
              delta={formatSignedTokens(data.comparison.delta.totalTokens)}
              percentValue={data.comparison.delta.totalTokensPercent}
              previous={formatTokens(data.comparison.previous.totalTokens)}
            />
            <DeltaMetric
              label="Cost"
              value={formatCurrency(data.comparison.current.totalCost)}
              delta={formatSignedCurrency(data.comparison.delta.totalCost)}
              percentValue={data.comparison.delta.totalCostPercent}
              previous={formatCurrency(data.comparison.previous.totalCost)}
            />
            <DeltaMetric
              label="Sessions"
              value={data.comparison.current.sessions.toLocaleString()}
              delta={formatSignedNumber(data.comparison.delta.sessions)}
              percentValue={data.comparison.delta.sessionsPercent}
              previous={data.comparison.previous.sessions.toLocaleString()}
            />
            <DeltaMetric
              label="Unknown cost"
              value={data.comparison.current.unknownCostInteractions.toLocaleString()}
              delta={formatSignedNumber(data.comparison.delta.unknownCostInteractions)}
              percentValue={data.comparison.delta.unknownCostInteractionsPercent}
              previous={data.comparison.previous.unknownCostInteractions.toLocaleString()}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
        <MetricCard
          className="md:col-span-2"
          valueClassName="text-3xl"
          label="Processed tokens"
          value={formatTokens(summary.totalTokens)}
          description="All tokens processed locally from imported records, including fresh input, output, cache read/write, and reasoning tokens."
          detailItems={[
            `${formatTokens(summary.inputTokens)} input`,
            `${formatTokens(summary.outputTokens)} output`,
            `${formatTokens(summary.cachedTokens)} cached`
          ]}
          href={evidenceLinks["processed-tokens"]}
          actionLabel="View evidence"
          icon={Database}
        />
        <MetricCard
          label="Non-cache tokens"
          value={formatTokens(summary.nonCachedTokens)}
          description="Fresh input, output, and reasoning tokens, excluding cache read/write tokens."
          detailItems={[
            `${formatTokens(summary.inputTokens)} input`,
            `${formatTokens(summary.outputTokens)} output`,
            `${formatTokens(summary.reasoningTokens)} reasoning`
          ]}
          href={evidenceLinks["non-cache-tokens"]}
          actionLabel="View evidence"
          icon={Database}
        />
        <MetricCard
          label="Cached tokens"
          value={formatTokens(summary.cachedTokens)}
          description="Cache read and cache write tokens reported by supported tools. These are separated from fresh input/output."
          detailItems={[
            `${formatTokens(summary.cacheReadTokens)} read`,
            `${formatTokens(summary.cacheWriteTokens)} write`
          ]}
          href={evidenceLinks["cached-tokens"]}
          actionLabel="View evidence"
          icon={Layers}
        />
        <MetricCard
          label="Estimated cost"
          value={formatCurrency(summary.totalCost)}
          valueClassName="break-normal whitespace-nowrap text-2xl"
          description="Cost is calculated from editable model prices. Unknown means a model price or usable token count is missing."
          detailItems={[
            `${formatCurrency(summary.exactCost)} exact`,
            `${formatCurrency(summary.estimatedCost)} estimated`,
            `${summary.unknownCostInteractions.toLocaleString()} unknown`
          ]}
          href={summary.unknownCostInteractions > 0 ? repairFocusHref : evidenceLinks["estimated-cost"]}
          actionLabel={summary.unknownCostInteractions > 0 ? "Open next repair item" : "View evidence"}
          secondaryHref={summary.unknownCostInteractions > 0 ? unknownCostEvidenceHref : undefined}
          secondaryActionLabel="View unknown-cost evidence"
          icon={Coins}
        />
        <MetricCard
          label="Sessions"
          value={summary.sessions.toLocaleString()}
          description="Imported local CLI sessions and interactions in the selected period."
          detailItems={[`${summary.interactions.toLocaleString()} interactions`]}
          href={evidenceLinks.sessions}
          actionLabel="View evidence"
          icon={MessageSquare}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Token Trend</CardTitle>
            <CardDescription>Daily, weekly, and monthly token usage.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={data.trends} metric="totalTokens" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cost Trend</CardTitle>
            <CardDescription>Costs use editable model prices from Pricing.</CardDescription>
          </CardHeader>
          <CardContent>
            <TrendChart data={data.trends} metric="cost" color="#ea580c" />
          </CardContent>
        </Card>
      </div>

      <UsageGuardrailsPanel progress={data.usageGuardrails} />

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold leading-tight">Recommended Next Actions</h2>
          <CardDescription>
            Local rules ranked from your scan, pricing, parser, project, and cache data.
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

      {repairWorkbench.groups.length ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Unknown Cost Repair Queue</CardTitle>
              <CardDescription>
                Why cost is missing, grouped by source file, model, and repair path. Local review state only affects repair workflow labels. It does not delete imported usage.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href={repairFocusHref}>
                Open next repair <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table className="min-w-[72rem]">
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Cause</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Tool</TableHead>
                  <TableHead>Interactions</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Repair</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {repairWorkbench.groups.slice(0, 6).map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>
                      <Badge variant={row.state === "resolved" ? "success" : row.state === "needs-parser-review" ? "warning" : row.state === "ignored" ? "secondary" : "destructive"}>
                        {row.state}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.cause === "missing pricing" ? "warning" : "secondary"}>
                        {row.cause}
                      </Badge>
                    </TableCell>
                    <TableCell>{row.model}</TableCell>
                    <TableCell>{row.tool}</TableCell>
                    <TableCell>{row.interactions.toLocaleString()}</TableCell>
                    <TableCell>{formatTokens(row.totalTokens)}</TableCell>
                    <TableCell className="max-w-72 truncate">
                      <Link href={mergeHrefParams(row.sourceHref, rangeLinkParams)} title={row.sourceFile}>
                        <MonoText className="text-muted-foreground underline-offset-4 hover:underline">{row.sourceFile}</MonoText>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Link href={mergeHrefParams(row.repairHref, rangeLinkParams)} className="font-medium text-primary underline-offset-4 hover:underline">
                          {row.pricingHref ? "Configure price" : "Review parser"}
                        </Link>
                        <Link href={mergeHrefParams(row.itemHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                          Item
                        </Link>
                        <Link href={mergeHrefParams(row.sourceHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                          Evidence
                        </Link>
                        {row.pricingHref ? (
                          <Link href={mergeHrefParams(row.parserHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                            Parser
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
