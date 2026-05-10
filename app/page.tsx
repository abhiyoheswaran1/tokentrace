import Link from "next/link";
import { ArrowRight, Coins, Database, MessageSquare, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
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
import { buildDoctorReport } from "@/src/lib/doctor";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";
import { buildFirstRunStatus, type FirstRunStatus } from "@/src/lib/first-run-status";
import { resolveDateRange } from "@/src/lib/date-range";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

function MetricCard({
  label,
  value,
  detailItems,
  description,
  href,
  actionLabel = "Inspect sessions",
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
  icon: typeof Database;
  className?: string;
  valueClassName?: string;
}) {
  const tooltipId = `metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-help`;

  return (
    <Card className={cn("h-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle className="leading-tight">{label}</CardTitle>
          {description ? (
            <HelpTooltip id={tooltipId} label={label} description={description} />
          ) : null}
        </div>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <DataValue size="lg" className={valueClassName}>{value}</DataValue>
        {detailItems?.length ? (
          <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
            {detailItems.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        ) : null}
        {href ? (
          <Link href={href} className="mt-3 inline-flex text-xs font-medium text-primary underline-offset-4 hover:underline">
            {actionLabel}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatSignedNumber(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${Math.abs(value).toLocaleString()}`;
}

function formatSignedCurrency(value: number) {
  if (value === 0) return "$0.00";
  return `${value > 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
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
    <div className="min-w-44 border-t p-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", toneClass)}>
          <ToneIcon className="h-3.5 w-3.5" />
          {formatPercentValue(percentValue)}
        </span>
      </div>
      <DataValue className="mt-1" size="md">{value}</DataValue>
      <div className="mt-1 text-xs text-muted-foreground">
        {delta} vs {previous}
      </div>
    </div>
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

type OverviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const data = getAnalyticsData(range.filters);
  const trust = getScanTrustData();
  const roots = await getDefaultSearchRoots();
  const doctorReport = buildDoctorReport({ ...trust, roots });
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
              delta={formatSignedNumber(data.comparison.delta.totalTokens)}
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

      <Card>
        <CardHeader>
          <h2 className="text-sm font-semibold leading-tight">Recommended Next Actions</h2>
          <CardDescription>
            Local rules ranked from your scan, pricing, parser, project, and cache data.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid divide-y overflow-hidden p-0 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {data.recommendations.slice(0, 3).map((item) => (
            <Link key={item.id} href={item.href} className="px-4 py-3 transition-colors hover:bg-muted/30">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{item.title}</div>
                <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "warning" : "secondary"}>
                  {item.severity}
                </Badge>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.evidence}</div>
              <div className="mt-2 text-xs font-medium text-emerald-800">{item.action}</div>
            </Link>
          ))}
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
          href="/sessions"
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
          href="/sessions"
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
          href="/sessions?cache=1"
          actionLabel="Inspect cached sessions"
          icon={Sparkles}
        />
        <MetricCard
          label="Estimated cost"
          value={formatCurrency(summary.totalCost)}
          description="Cost is calculated from editable model prices. Unknown means a model price or usable token count is missing."
          detailItems={[
            `${formatCurrency(summary.exactCost)} exact`,
            `${formatCurrency(summary.estimatedCost)} estimated`,
            `${summary.unknownCostInteractions.toLocaleString()} unknown`
          ]}
          href={summary.unknownCostInteractions > 0 ? "/sessions?cost=unknown" : "/sessions"}
          actionLabel={summary.unknownCostInteractions > 0 ? "Inspect unknown costs" : "Inspect sessions"}
          icon={Coins}
        />
        <MetricCard
          label="Sessions"
          value={summary.sessions.toLocaleString()}
          description="Imported local CLI sessions and interactions in the selected period."
          detailItems={[`${summary.interactions.toLocaleString()} interactions`]}
          href="/sessions"
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

      {data.unknownCosts.length ? (
        <Card>
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardTitle>Unknown Cost Repair Queue</CardTitle>
              <CardDescription>
                Why cost is missing, grouped by source file, model, and repair path.
              </CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/diagnostics">
                Open Doctor <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
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
                {data.unknownCosts.slice(0, 6).map((row) => (
                  <TableRow key={`${row.cause}-${row.model}-${row.sourceFile}`}>
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
                      <Link href={row.sourceHref} title={row.sourceFile}>
                        <MonoText className="text-muted-foreground underline-offset-4 hover:underline">{row.sourceFile}</MonoText>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Link href={row.repairHref} className="font-medium text-primary underline-offset-4 hover:underline">
                          {row.pricingHref ? "Configure price" : "Review parser"}
                        </Link>
                        {row.pricingHref ? (
                          <Link href={row.parserHref} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
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
