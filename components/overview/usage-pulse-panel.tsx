import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldLabel } from "@/components/ui/typography";
import type { UsageComparison } from "@/src/lib/analytics";
import { formatCurrency, formatSignedTokens, formatTokens } from "@/src/lib/format";
import { cn } from "@/src/lib/utils";

function formatSignedCurrency(value: number) {
  if (value === 0) return "$0.00";
  return `${value > 0 ? "+" : "-"}${formatCurrency(Math.abs(value))}`;
}

function formatSignedNumber(value: number) {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : "-"}${Math.abs(value).toLocaleString()}`;
}

function usagePulsePeriodLabels(mode: UsageComparison["mode"]) {
  if (mode === "latest-seven-days") {
    return {
      current: "Latest 7 days",
      previous: "Previous 7 days",
      badge: "Latest 7 days vs previous 7 days"
    };
  }
  if (mode === "selected-period") {
    return {
      current: "Selected period",
      previous: "Previous matching period",
      badge: "Selected period vs previous matching period"
    };
  }
  return {
    current: "Current",
    previous: "Previous",
    badge: "Current vs previous"
  };
}

function formatPulsePercent(percentValue: number | null, changeValue: number, previousValue: number) {
  if (percentValue == null) {
    if (previousValue === 0 && changeValue > 0) return "new";
    if (changeValue === 0) return "flat";
    return changeValue > 0 ? "up" : "down";
  }
  if (percentValue === 0) return "flat";
  return `${percentValue > 0 ? "up" : "down"} ${Math.abs(percentValue)}%`;
}

function PulseMetric({
  label,
  value,
  change,
  changeValue,
  percentValue,
  previous,
  previousValue,
  currentLabel,
  previousLabel
}: {
  label: string;
  value: string;
  change: string;
  changeValue: number;
  percentValue: number | null;
  previous: string;
  previousValue: number;
  currentLabel: string;
  previousLabel: string;
}) {
  const ToneIcon = changeValue > 0 ? TrendingUp : changeValue < 0 ? TrendingDown : Minus;
  const toneClass = changeValue > 0
    ? "text-primary"
    : changeValue < 0
      ? "text-orange-700"
      : "text-muted-foreground";

  return (
    <div className="min-w-0 border-t px-3 py-3 first:border-t-0 sm:border-l sm:border-t-0 sm:first:border-l-0">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <FieldLabel className="truncate">{label}</FieldLabel>
        <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold tabular-nums", toneClass)}>
          <ToneIcon className="h-3.5 w-3.5" aria-hidden="true" />
          {formatPulsePercent(percentValue, changeValue, previousValue)}
        </span>
      </div>
      <dl className="mt-2 grid gap-1.5 text-xs leading-5">
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="min-w-0 truncate text-muted-foreground">{currentLabel}</dt>
          <dd className="shrink-0 text-lg font-semibold leading-none tabular-nums text-foreground">{value}</dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="min-w-0 truncate text-muted-foreground">{previousLabel}</dt>
          <dd className="shrink-0 font-medium tabular-nums text-muted-foreground">{previous}</dd>
        </div>
        <div className="flex min-w-0 items-baseline justify-between gap-3">
          <dt className="min-w-0 truncate text-muted-foreground">Change</dt>
          <dd className={cn("shrink-0 font-semibold tabular-nums", toneClass)}>{change}</dd>
        </div>
      </dl>
    </div>
  );
}

export function UsagePulsePanel({ comparison }: { comparison: UsageComparison }) {
  const periodLabels = usagePulsePeriodLabels(comparison.mode);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <CardTitle>Usage Pulse</CardTitle>
              <span className="text-sm font-semibold text-foreground">{comparison.headline}</span>
            </div>
            <CardDescription>{comparison.detail}</CardDescription>
          </div>
          <Badge variant="secondary">{periodLabels.badge}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid border-t sm:grid-cols-2 xl:grid-cols-4">
          <PulseMetric
            label="Tokens"
            value={formatTokens(comparison.current.totalTokens)}
            change={formatSignedTokens(comparison.delta.totalTokens)}
            changeValue={comparison.delta.totalTokens}
            percentValue={comparison.delta.totalTokensPercent}
            previous={formatTokens(comparison.previous.totalTokens)}
            previousValue={comparison.previous.totalTokens}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
          <PulseMetric
            label="Cost"
            value={formatCurrency(comparison.current.totalCost)}
            change={formatSignedCurrency(comparison.delta.totalCost)}
            changeValue={comparison.delta.totalCost}
            percentValue={comparison.delta.totalCostPercent}
            previous={formatCurrency(comparison.previous.totalCost)}
            previousValue={comparison.previous.totalCost}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
          <PulseMetric
            label="Sessions"
            value={comparison.current.sessions.toLocaleString()}
            change={formatSignedNumber(comparison.delta.sessions)}
            changeValue={comparison.delta.sessions}
            percentValue={comparison.delta.sessionsPercent}
            previous={comparison.previous.sessions.toLocaleString()}
            previousValue={comparison.previous.sessions}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
          <PulseMetric
            label="Unknown cost"
            value={comparison.current.unknownCostInteractions.toLocaleString()}
            change={formatSignedNumber(comparison.delta.unknownCostInteractions)}
            changeValue={comparison.delta.unknownCostInteractions}
            percentValue={comparison.delta.unknownCostInteractionsPercent}
            previous={comparison.previous.unknownCostInteractions.toLocaleString()}
            previousValue={comparison.previous.unknownCostInteractions}
            currentLabel={periodLabels.current}
            previousLabel={periodLabels.previous}
          />
        </div>
      </CardContent>
    </Card>
  );
}
