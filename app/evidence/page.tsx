import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import { PeriodFilter } from "@/components/period-filter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { dateRangeQueryParams, mergeHrefParams, resolveDateRange } from "@/src/lib/date-range";
import { buildEvidenceTrail, parseEvidenceMetric, type EvidenceMetric } from "@/src/lib/evidence-trail";
import { formatCurrency, formatExactTokens, percent } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

export const dynamic = "force-dynamic";

type EvidencePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function confidenceVariant(value: string) {
  if (value === "exact") return "success";
  if (value === "unknown") return "warning";
  return "secondary";
}

function parserStatusVariant(value: string | null) {
  if (value === "imported") return "success";
  if (value === "imported_with_errors") return "warning";
  if (!value) return "secondary";
  return "outline";
}

const evidenceMetricTabs: Array<{ metric: EvidenceMetric; label: string }> = [
  { metric: "processed-tokens", label: "Processed" },
  { metric: "non-cache-tokens", label: "Fresh / non-cache" },
  { metric: "cached-tokens", label: "Cache" },
  { metric: "estimated-cost", label: "Cost" },
  { metric: "sessions", label: "Sessions" }
];

function EvidenceMetricTabs({
  current,
  rangeLinkParams
}: {
  current: EvidenceMetric;
  rangeLinkParams: Record<string, string | undefined>;
}) {
  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Evidence metric views">
      {evidenceMetricTabs.map((item) => (
        <Link
          key={item.metric}
          href={mergeHrefParams(`/evidence?metric=${item.metric}`, rangeLinkParams)}
          className={cn(
            "inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            current === item.metric
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:bg-muted"
          )}
          aria-current={current === item.metric ? "page" : undefined}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

function EvidenceDrilldownStrip({
  actions
}: {
  actions: Array<{
    label: string;
    detail: string;
    href: string;
  }>;
}) {
  return (
    <div className="grid overflow-hidden rounded-md border border-border md:grid-cols-4">
      {actions.map((action, index) => (
        <Link
          key={action.label}
          href={action.href}
          className={cn(
            "group min-w-0 p-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            index > 0 ? "border-t border-border md:border-l md:border-t-0" : ""
          )}
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {action.label}
            <ArrowRight className="h-3.5 w-3.5 text-primary transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">{action.detail}</span>
        </Link>
      ))}
    </div>
  );
}

function WhyThisNumberPanel({ title }: { title: string }) {
  const items = [
    ["Metric definition", `${title} uses the selected period, metric type, and imported local interactions.`],
    ["Source files explain", "Source files explain which local artifacts contributed records to this number."],
    ["Sessions explain", "Sessions explain which conversations, tools, models, and projects produced the total."],
    ["Parser confidence explains", "Parser confidence explains whether imported values are exact, estimated, or need review."],
    ["Model-rate state explains", "Model-rate state explains whether cost is exact, estimated, or blocked by unknown pricing."]
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Why this number</CardTitle>
        <CardDescription>Use these checks before treating the metric as a final answer.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-0 overflow-x-auto p-0 sm:grid-cols-2 xl:grid-cols-5">
        {items.map(([label, detail], index) => (
          <div key={label} className={cn("min-w-48 p-3", index > 0 ? "border-t sm:border-l sm:border-t-0" : "")}>
            <FieldLabel>{label}</FieldLabel>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default async function EvidencePage({ searchParams }: EvidencePageProps) {
  const params = (await searchParams) ?? {};
  const range = resolveDateRange(params);
  const metric = parseEvidenceMetric(params?.metric);
  const trail = buildEvidenceTrail({ metric, filters: range.filters });
  const rangeLinkParams = dateRangeQueryParams(range);
  const overviewHref = mergeHrefParams("/", rangeLinkParams);
  const currentEvidenceHref = mergeHrefParams(`/evidence?metric=${trail.metric}`, rangeLinkParams);
  const pricingReturnParams = { returnTo: currentEvidenceHref };
  const confidenceTotal = Math.max(1, trail.confidence.exact + trail.confidence.estimated + trail.confidence.unknown);
  const leadingSource = trail.sourceFiles[0];
  const leadingSession = trail.sessions[0];
  const drilldownActions = [
    {
      label: "Top source files",
      detail: "Compare the local files contributing most to this metric.",
      href: "#top-source-files"
    },
    {
      label: "Largest sessions",
      detail: "Open the session evidence table and continue into filtered sessions.",
      href: "#session-evidence"
    },
    {
      label: "Parser confidence",
      detail: "Check whether parser status affects the imported records.",
      href: leadingSource ? mergeHrefParams(leadingSource.parserHref, rangeLinkParams) : "/parser-debug"
    },
    {
      label: "Model rates / repair",
      detail: "Follow provider model rates or unknown-cost repair when cost needs review.",
      href: leadingSession?.pricingHref
        ? mergeHrefParams(leadingSession.pricingHref, pricingReturnParams)
        : mergeHrefParams("/repair", rangeLinkParams)
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${trail.title} Evidence`}
        description={trail.description}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={overviewHref}>
              <ArrowLeft className="h-4 w-4" />
              Overview
            </Link>
          </Button>
        }
      />

      <PeriodFilter range={range} />

      <Card>
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle>Token Evidence</CardTitle>
            <CardDescription>
              You are viewing {trail.title}. Pivot across related metrics, then continue into source files, sessions, parser status, or model-rate repair.
            </CardDescription>
          </div>
          <EvidenceMetricTabs current={trail.metric} rangeLinkParams={rangeLinkParams} />
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">
            <span className="font-medium text-foreground">Definition:</span>{" "}
            {trail.description}
          </p>
          <div className="space-y-2">
            <FieldLabel>Continue drilling down</FieldLabel>
            <EvidenceDrilldownStrip actions={drilldownActions} />
          </div>
        </CardContent>
      </Card>

      <WhyThisNumberPanel title={trail.title} />

      {!trail.sessions.length && !trail.sourceFiles.length ? (
        <EmptyState
          title="No evidence for this metric yet"
          description="Run a scan or open sessions to confirm whether local usage exists for the selected period and metric."
          actions={[
            { label: "Open sessions", href: "/sessions", variant: "outline" },
            { label: "Open Scan Health", href: "/diagnostics", variant: "outline" }
          ]}
        >
          <ScanNowButton size="sm" />
        </EmptyState>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Metric Totals</CardTitle>
          <CardDescription>
            Totals use the same filtered metric definition as the session evidence below.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-5">
            <div className="p-3">
              <FieldLabel>Tokens</FieldLabel>
              <DataValue className="mt-1" size="md">{formatExactTokens(trail.totals.tokens)}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Cost</FieldLabel>
              <DataValue className="mt-1" size="md">{formatCurrency(trail.totals.cost)}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Sessions</FieldLabel>
              <DataValue className="mt-1" size="md">{trail.totals.sessions.toLocaleString()}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Interactions</FieldLabel>
              <DataValue className="mt-1" size="md">{trail.totals.interactions.toLocaleString()}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Unknown Cost</FieldLabel>
              <DataValue className="mt-1" size="md">{trail.totals.unknownCostInteractions.toLocaleString()}</DataValue>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Confidence Split</CardTitle>
            <CardDescription>Interaction-level token confidence for this metric and period.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "Exact", value: trail.confidence.exact, variant: "success" as const },
              { label: "Estimated", value: trail.confidence.estimated, variant: "secondary" as const },
              { label: "Unknown", value: trail.confidence.unknown, variant: "warning" as const }
            ].map((item) => (
              <div key={item.label} className="grid grid-cols-[5.5rem_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
                <Badge variant={item.variant}>{item.label}</Badge>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(item.value / confidenceTotal) * 100}%` }} />
                </div>
                <div className="text-right tabular-nums text-muted-foreground">{item.value.toLocaleString()}</div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card id="top-source-files">
          <CardHeader>
            <CardTitle>Top Source Files</CardTitle>
            <CardDescription>Largest contributing local files for the same metric definition.</CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Interactions</TableHead>
                  <TableHead>Unknown cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trail.sourceFiles.length ? (
                  trail.sourceFiles.map((source) => (
                    <TableRow key={source.sourceFile}>
                      <TableCell className="max-w-96">
                        <Link href={mergeHrefParams(source.sourceHref, rangeLinkParams)} title={source.sourceFile}>
                          <MonoText className="block truncate text-muted-foreground underline-offset-4 hover:underline">
                            {source.sourceFile}
                          </MonoText>
                        </Link>
                      </TableCell>
                      <TableCell>{formatExactTokens(source.tokens)}</TableCell>
                      <TableCell>{source.interactions.toLocaleString()}</TableCell>
                      <TableCell>{source.unknownCostInteractions.toLocaleString()}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Link href={mergeHrefParams(source.sourceHref, rangeLinkParams)} className="font-medium text-primary underline-offset-4 hover:underline">
                            Sessions
                          </Link>
                          <Link href={mergeHrefParams(source.parserHref, rangeLinkParams)} className="font-medium text-muted-foreground underline-offset-4 hover:underline">
                            Parser
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      No source-file evidence is available for this metric yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card id="session-evidence">
        <CardHeader>
          <CardTitle>Session, Source, Parser, And Model Rate Evidence</CardTitle>
          <CardDescription>
            The table is capped at the top 100 contributing sessions; totals above include the full metric set.
          </CardDescription>
        </CardHeader>
        <CardContent className="table-scroll p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Session</TableHead>
                <TableHead>Metric Total</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Parser</TableHead>
                <TableHead>Model rates</TableHead>
                <TableHead>Confidence</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trail.sessions.length ? (
                trail.sessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell className="min-w-64">
                      <Link href={mergeHrefParams(session.sessionHref, rangeLinkParams)} className="font-medium text-primary underline-offset-4 hover:underline">
                        {session.title}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {session.tool} / {session.provider} / {session.project}
                      </div>
                    </TableCell>
                    <TableCell>{formatExactTokens(session.totalTokens)}</TableCell>
                    <TableCell>{formatCurrency(session.cost)}</TableCell>
                    <TableCell className="max-w-80">
                      <Link href={mergeHrefParams(session.sourceHref, rangeLinkParams)} title={session.sourceFile}>
                        <MonoText className="block truncate text-muted-foreground underline-offset-4 hover:underline">
                          {session.sourceFile}
                        </MonoText>
                      </Link>
                    </TableCell>
                    <TableCell className="min-w-44">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={parserStatusVariant(session.parserStatus)}>
                          {session.parserStatus ?? "not scanned"}
                        </Badge>
                        <Link href={mergeHrefParams(session.parserHref, rangeLinkParams)} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                          Parser <ArrowRight className="inline h-3.5 w-3.5" />
                        </Link>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {session.parser ?? "No parser"} / {session.parserConfidence == null ? "confidence unknown" : percent(session.parserConfidence)}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-44">
                      {session.pricingHref ? (
                        <Link href={mergeHrefParams(session.pricingHref, pricingReturnParams)} className="font-medium text-primary underline-offset-4 hover:underline">
                          {session.model}
                        </Link>
                      ) : (
                        <span>{session.model}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={confidenceVariant(session.tokenConfidence)}>
                          {session.tokenConfidence}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {session.interactions.toLocaleString()} interactions
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    No evidence is available for this metric yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
