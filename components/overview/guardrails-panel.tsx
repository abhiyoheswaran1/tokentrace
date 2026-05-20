import Link from "next/link";
import { ArrowRight, Gauge } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataValue, FieldLabel } from "@/components/ui/typography";
import { formatCurrency, formatTokens, percent } from "@/src/lib/format";
import type { UsageGuardrailMetric } from "@/src/lib/usage-guardrails";
import { cn } from "@/src/lib/utils";

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

export function UsageGuardrailsPanel({
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
          <Link href="/settings#usage-guardrails">
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
