import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/typography";
import type { EvidenceMetric, EvidenceTrail } from "@/src/lib/evidence-trail";
import { mergeHrefParams } from "@/src/lib/date-range";
import { cn } from "@/src/lib/utils";
import type { EvidenceDrilldownAction } from "@/app/evidence/evidence-page-data";

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
            "inline-flex h-8 items-center rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

function EvidenceDrilldownStrip({ actions }: { actions: EvidenceDrilldownAction[] }) {
  return (
    <div className="grid overflow-hidden rounded-md border border-border md:grid-cols-4">
      {actions.map((action, index) => (
        <Link
          key={action.label}
          href={action.href}
          className={cn(
            "group min-w-0 p-3 transition-colors hover:bg-muted/50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
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

export function EvidenceWorkbenchCard({
  trail,
  contextParams,
  drilldownActions
}: {
  trail: EvidenceTrail;
  contextParams: Record<string, string | undefined>;
  drilldownActions: EvidenceDrilldownAction[];
}) {
  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="space-y-1">
          <CardTitle>Evidence Workbench</CardTitle>
          <CardDescription>
            You are viewing {trail.title}. Pivot across related metrics, then continue into source files, sessions, parser status, or model-rate repair.
          </CardDescription>
        </div>
        <EvidenceMetricTabs current={trail.metric} rangeLinkParams={contextParams} />
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
  );
}
