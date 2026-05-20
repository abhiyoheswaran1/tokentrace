import { Card, CardContent } from "@/components/ui/card";
import { DataValue, FieldLabel } from "@/components/ui/typography";
import type { UnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";

export function SummaryItem({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone?: "primary" | "warning" | "success" | "muted";
}) {
  const toneClass =
    tone === "warning"
      ? "text-amber-800"
      : tone === "success"
        ? "text-emerald-800"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";

  return (
    <div className="min-w-32 border-t px-4 py-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <FieldLabel>{label}</FieldLabel>
      <DataValue className={toneClass} size="md">{value.toLocaleString()}</DataValue>
    </div>
  );
}

export function RepairSummaryCard({ summary }: { summary: UnknownCostRepairWorkbench["summary"] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="grid sm:grid-cols-2 xl:grid-cols-5">
          <SummaryItem label="Unresolved" value={summary.unresolved} />
          <SummaryItem label="Parser review" value={summary.needsParserReview} tone="warning" />
          <SummaryItem label="Ignored" value={summary.ignored} tone="muted" />
          <SummaryItem label="Resolved" value={summary.resolved} tone="success" />
          <SummaryItem label="Interactions" value={summary.totalInteractions} />
        </div>
      </CardContent>
    </Card>
  );
}
