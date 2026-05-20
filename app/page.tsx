import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RankBarChart } from "@/components/charts/rank-bar-chart";
import { TrendSection } from "@/components/charts/trend-section";
import { DataConfidenceStrip } from "@/components/overview/data-confidence-strip";
import { FirstRunPanel } from "@/components/overview/first-run-panel";
import { UsageGuardrailsPanel } from "@/components/overview/guardrails-panel";
import { OverviewReviewStatusStrip } from "@/components/overview/review-status-strip";
import { CostSessionsCard, TokenAccountingCard } from "@/components/overview/summary-cards";
import { TopRepairItemsStrip } from "@/components/overview/top-repair-items-strip";
import { OverviewTrustFooter } from "@/components/overview/trust-footer";
import { UsagePulsePanel } from "@/components/overview/usage-pulse-panel";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/typography";
import { resolveDateRange } from "@/src/lib/date-range";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";
import { runDueScheduledScan } from "@/src/lib/scheduled-scan";
import { getOverviewData } from "@/src/lib/overview-data";

export const dynamic = "force-dynamic";

type OverviewPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OverviewPage({ searchParams }: OverviewPageProps) {
  void runDueScheduledScan().catch(() => undefined);
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const overview = await getOverviewData(range);
  const {
    data,
    trust,
    accountingReport,
    postSessionReview,
    rangeLinkParams,
    evidenceLinks,
    doctorReport,
    repairWorkbench,
    repairFocusHref,
    unknownCostEvidenceHref,
    firstRunStatus,
    summary,
    trendDefaultWindow
  } = overview;

  return (
    <div className="space-y-8">
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

      <OverviewTrustFooter health={trust.health} pricedModelCount={trust.pricedModelCount} />

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
          <CardContent className="table-scroll overflow-x-auto">
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
