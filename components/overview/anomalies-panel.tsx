import Link from "next/link";
import { AlertTriangle, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { detectAnomalies, type Anomaly, type AnomalySeverity } from "@/src/lib/anomaly-detection";
import type { TrendPoint } from "@/src/lib/analytics";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTokens } from "@/src/lib/format";

function dayDrillHref(date: string) {
  // Filter the overview to a single day using the existing custom-range params.
  const params = new URLSearchParams({ range: "custom", from: date, to: date });
  return `/?${params.toString()}`;
}

function severityVariant(severity: AnomalySeverity): "destructive" | "warning" | "secondary" {
  if (severity === "severe") return "destructive";
  if (severity === "high") return "warning";
  return "secondary";
}

function formatValue(anomaly: Anomaly) {
  if (anomaly.metric === "tokens") return `${formatTokens(anomaly.value)} tokens`;
  return `$${anomaly.value.toFixed(2)}`;
}

function formatBaseline(anomaly: Anomaly) {
  if (anomaly.metric === "tokens") return `${formatTokens(anomaly.baseline)} median`;
  return `$${anomaly.baseline.toFixed(2)} median`;
}

function formatRatio(anomaly: Anomaly) {
  if (anomaly.ratio == null || !Number.isFinite(anomaly.ratio)) return "—";
  return `${anomaly.ratio.toFixed(1)}× baseline`;
}

export function OverviewAnomaliesPanel({ trends }: { trends: TrendPoint[] }) {
  const report = detectAnomalies(trends);
  const recent = report.anomalies.slice(-6).reverse();

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Anomalies</CardTitle>
          <CardDescription>
            Local modified-z-score (MAD) detector over the last {report.windowSize}-day window. Zero AI tokens spent.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {report.summary.bySeverity.severe > 0 ? (
            <Badge variant="destructive">{report.summary.bySeverity.severe} severe</Badge>
          ) : null}
          {report.summary.bySeverity.high > 0 ? (
            <Badge variant="warning">{report.summary.bySeverity.high} high</Badge>
          ) : null}
          {report.summary.bySeverity.notable > 0 ? (
            <Badge variant="secondary">{report.summary.bySeverity.notable} notable</Badge>
          ) : null}
          {report.summary.total === 0 ? <Badge variant="success">clear</Badge> : null}
        </div>
      </CardHeader>
      <CardContent>
        {report.summary.total === 0 ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            No unusual days detected in the visible trend. The detector needs at least 5 prior days of data.
          </div>
        ) : (
          <ul className="space-y-2 text-sm">
            {recent.map((anomaly) => (
              <li
                key={`${anomaly.date}:${anomaly.metric}`}
                className="flex items-start gap-3 rounded-md border bg-muted/20 px-3 py-2"
              >
                <AlertTriangle
                  className={
                    anomaly.severity === "severe"
                      ? "h-4 w-4 mt-0.5 text-destructive"
                      : anomaly.severity === "high"
                        ? "h-4 w-4 mt-0.5 text-amber-500"
                        : "h-4 w-4 mt-0.5 text-muted-foreground"
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={severityVariant(anomaly.severity)}>{anomaly.severity}</Badge>
                    <Link
                      href={dayDrillHref(anomaly.date)}
                      className="inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
                      title={`Filter the overview to ${anomaly.date}`}
                    >
                      {anomaly.date}
                      <ArrowUpRight className="h-3 w-3" />
                    </Link>
                    <span className="text-xs text-muted-foreground uppercase tracking-wide">
                      {anomaly.metric}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatValue(anomaly)} — {formatRatio(anomaly)} ({formatBaseline(anomaly)})
                  </div>
                </div>
              </li>
            ))}
            {report.summary.total > recent.length ? (
              <li className="text-xs text-muted-foreground">
                Showing {recent.length} most recent of {report.summary.total} anomalies. Run{" "}
                <code>tokentrace anomalies --json</code> for the full report.
              </li>
            ) : null}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
