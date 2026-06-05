import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import { PeriodFilter } from "@/components/period-filter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel, PageHeader } from "@/components/ui/typography";
import { cn } from "@/src/lib/utils";
import { getEvidencePageData, type EvidencePageSearchParams } from "@/app/evidence/evidence-page-data";
import { EvidenceContextPanel } from "@/app/evidence/evidence-context-panel";
import { ConfidenceSplitCard, MetricTotalsCard } from "@/app/evidence/evidence-summary-cards";
import { SessionEvidenceCard, TopSourceFilesCard } from "@/app/evidence/evidence-tables";
import { EvidenceWorkbenchCard } from "@/app/evidence/evidence-workbench";

export const dynamic = "force-dynamic";

type EvidencePageProps = {
  searchParams?: EvidencePageSearchParams;
};

function EvidenceBreadcrumbs({
  openedFrom,
  metricTitle,
  periodLabel,
  returnHref
}: {
  openedFrom: string;
  metricTitle: string;
  periodLabel: string;
  returnHref: string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-muted/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link href={returnHref} className="font-medium text-primary underline-offset-4 hover:underline">
            {openedFrom}
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="font-medium text-foreground">Evidence</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground">{metricTitle}</span>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          Opened from {openedFrom}. Metric: {metricTitle}. Period: {periodLabel}.
        </p>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={returnHref}>
          <ArrowLeft className="h-4 w-4" />
          Return to where you came from
        </Link>
      </Button>
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
  // returnHref arrives pre-sanitized: safeReturnTo in evidence-page-data.ts
  // validates the returnTo query value before it reaches any rendered link.
  const {
    range,
    trail,
    rangeLinkParams,
    openedFrom,
    returnHref,
    evidenceContextParams,
    pricingReturnParams,
    periodPreserveParams,
    sessionsHref,
    repairHref,
    modelRatesHref,
    confidenceTotal,
    drilldownActions
  } = await getEvidencePageData(searchParams);
  const contextActions = [
    {
      label: "Return to where you came from",
      detail: "Go back to the page, period, or workflow that opened this evidence path.",
      href: returnHref
    },
    {
      label: "Open Sessions",
      detail: "Continue from this metric into conversations, tools, models, and projects.",
      href: sessionsHref
    },
    {
      label: "Open repair",
      detail: "Review unknown cost, missing model names, parser gaps, and verification state.",
      href: repairHref
    },
    {
      label: "Set model rate",
      detail: "Edit provider model rates when cost evidence is blocked or estimated.",
      href: modelRatesHref
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${trail.title} Evidence`}
        description={trail.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/api/evidence-pack?metric=${trail.metric}&format=json`}>
                <Download className="h-4 w-4" />
                Export JSON pack
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/api/evidence-pack?metric=${trail.metric}&format=markdown`}>
                <Download className="h-4 w-4" />
                Export Markdown pack
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={returnHref}>
                <ArrowLeft className="h-4 w-4" />
                Return
              </Link>
            </Button>
          </div>
        }
      />

      <PeriodFilter range={range} basePath="/evidence" preserveParams={periodPreserveParams} />

      <EvidenceBreadcrumbs
        openedFrom={openedFrom}
        metricTitle={trail.title}
        periodLabel={range.label}
        returnHref={returnHref}
      />

      <EvidenceContextPanel actions={contextActions} />

      <EvidenceWorkbenchCard trail={trail} contextParams={evidenceContextParams} drilldownActions={drilldownActions} />

      <WhyThisNumberPanel title={trail.title} />

      {!trail.sessions.length && !trail.sourceFiles.length ? (
        <EmptyState
          title="No evidence for this metric yet"
          description="Run a scan or open sessions to confirm whether local usage exists for the selected period and metric."
          actions={[
            { label: "Return to where you came from", href: returnHref, variant: "outline" },
            { label: "Configure scan", href: "/settings#scan-controls", variant: "outline" },
            { label: "Open Sessions", href: sessionsHref, variant: "outline" },
            { label: "Open Scan Health", href: "/diagnostics", variant: "outline" }
          ]}
        >
          <ScanNowButton size="sm" />
        </EmptyState>
      ) : null}

      <MetricTotalsCard totals={trail.totals} />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <ConfidenceSplitCard confidence={trail.confidence} confidenceTotal={confidenceTotal} />
        <TopSourceFilesCard sourceFiles={trail.sourceFiles} rangeLinkParams={rangeLinkParams} />
      </div>

      <SessionEvidenceCard
        sessions={trail.sessions}
        rangeLinkParams={rangeLinkParams}
        pricingReturnParams={pricingReturnParams}
      />
    </div>
  );
}
