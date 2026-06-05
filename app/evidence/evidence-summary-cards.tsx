import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataValue, FieldLabel } from "@/components/ui/typography";
import type { EvidenceTrail } from "@/src/lib/evidence-trail";
import { formatCurrency, formatExactTokens } from "@/src/lib/format";

export function MetricTotalsCard({ totals }: { totals: EvidenceTrail["totals"] }) {
  return (
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
            <DataValue className="mt-1" size="md">{formatExactTokens(totals.tokens)}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Cost</FieldLabel>
            <DataValue className="mt-1" size="md">{formatCurrency(totals.cost)}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Sessions</FieldLabel>
            <DataValue className="mt-1" size="md">{totals.sessions.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Interactions</FieldLabel>
            <DataValue className="mt-1" size="md">{totals.interactions.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Unknown Cost</FieldLabel>
            <DataValue className="mt-1" size="md">{totals.unknownCostInteractions.toLocaleString()}</DataValue>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ConfidenceSplitCard({
  confidence,
  confidenceTotal
}: {
  confidence: EvidenceTrail["confidence"];
  confidenceTotal: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Confidence Split</CardTitle>
        <CardDescription>Interaction-level token confidence for this metric and period.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {[
          { label: "Exact", value: confidence.exact, variant: "success" as const },
          { label: "Estimated", value: confidence.estimated, variant: "secondary" as const },
          { label: "Unknown", value: confidence.unknown, variant: "warning" as const }
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
  );
}
