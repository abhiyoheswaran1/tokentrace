import Link from "next/link";
import { ArrowRight, CalendarDays, Coins, Database, Info, MessageSquare, Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { TrendChart } from "@/components/charts/trend-chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAnalyticsData } from "@/src/lib/analytics";
import { dateRangeOptions, resolveDateRange } from "@/src/lib/date-range";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";

export const dynamic = "force-dynamic";

function MetricCard({
  label,
  value,
  detailItems,
  description,
  icon: Icon
}: {
  label: string;
  value: string;
  detailItems?: string[];
  description?: string;
  icon: typeof Database;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <CardTitle>{label}</CardTitle>
          {description ? (
            <span title={description} aria-label={description}>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
          ) : null}
        </div>
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold leading-tight">{value}</div>
        {detailItems?.length ? (
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs leading-snug text-muted-foreground">
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

function rangeHref(range: string) {
  return range === "all" ? "/" : `/?range=${range}`;
}

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const data = getAnalyticsData(range.filters);
  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Local token, cost, model, and session analytics across AI CLI tools.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings">
            Configure scan <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="rounded-md border bg-card px-3 py-3">
        <form className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between" action="/">
          <input type="hidden" name="range" value="custom" />
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Period
            </div>
            <Badge variant="secondary">{range.label}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1">
              {dateRangeOptions.map((option) => (
                <Button
                  key={option.key}
                  asChild
                  size="sm"
                  variant={range.key === option.key ? "default" : "outline"}
                >
                  <Link href={rangeHref(option.key)}>{option.label}</Link>
                </Button>
              ))}
            </div>
            <div className="hidden h-6 w-px bg-border xl:block" />
            <span className="text-xs font-medium text-muted-foreground">Custom</span>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>From</span>
              <Input type="date" name="from" defaultValue={range.fromInput} className="h-8 w-[9.25rem]" />
            </label>
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>To</span>
              <Input type="date" name="to" defaultValue={range.toInput} className="h-8 w-[9.25rem]" />
            </label>
            <Button size="sm" type="submit" variant={range.key === "custom" ? "default" : "outline"}>
              Apply
            </Button>
          </div>
        </form>
      </div>

      {summary.interactions === 0 ? (
        <EmptyState
          title="No usage imported yet"
          description="Add custom folders if needed, run a scan from Settings, then return here for analytics."
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
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

      <div className="grid gap-4 lg:grid-cols-2">
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

      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
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
