import Link from "next/link";
import { ArrowRight, Coins, Database, MessageSquare, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, PageHeader } from "@/components/ui/typography";
import { getAnalyticsData } from "@/src/lib/analytics";
import { resolveDateRange } from "@/src/lib/date-range";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

function MetricCard({
  label,
  value,
  detailItems,
  description,
  icon: Icon,
  className,
  valueClassName
}: {
  label: string;
  value: string;
  detailItems?: string[];
  description?: string;
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
        <EmptyState
          title="No usage imported yet"
          description="Add custom folders if needed, run a scan from Settings, then return here for analytics."
        />
      ) : null}

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
          icon={Coins}
        />
        <MetricCard
          label="Sessions"
          value={summary.sessions.toLocaleString()}
          description="Imported local CLI sessions and interactions in the selected period."
          detailItems={[`${summary.interactions.toLocaleString()} interactions`]}
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
                    <TableCell className="font-medium">{tool.tool}</TableCell>
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
