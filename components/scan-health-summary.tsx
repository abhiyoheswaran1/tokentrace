import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileSearch,
  ShieldCheck
} from "lucide-react";
import type { ScanHealth } from "@/src/lib/scan-health";
import { formatDate, percent } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function badgeVariant(tone: ScanHealth["tone"]) {
  if (tone === "success") return "success";
  if (tone === "destructive") return "destructive";
  if (tone === "warning") return "warning";
  return "secondary";
}

function actionVariant(tone: "default" | "warning" | "destructive") {
  if (tone === "destructive") return "destructive";
  if (tone === "warning") return "outline";
  return "default";
}

function ratio(part: number, total: number) {
  return total > 0 ? part / total : 0;
}

function StatBlock({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="p-3">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold leading-tight">{value}</div>
      <div className="mt-1 text-xs leading-snug text-muted-foreground">{helper}</div>
    </div>
  );
}

export function ScanHealthSummary({ health }: { health: ScanHealth }) {
  const latest = health.latestRun;
  const statusCounts = health.latestStatusCounts;
  const importedFiles = (statusCounts.imported ?? 0) + (statusCounts.imported_with_errors ?? 0);
  const unsupportedFiles = statusCounts.skipped_unknown ?? 0;
  const failedFiles = statusCounts.failed ?? 0;
  const duplicateFiles = statusCounts.skipped_duplicate ?? 0;
  const priced = health.costCoverage.priced;
  const pricedPercent = ratio(priced, health.costCoverage.total);
  const exactTokenPercent = ratio(health.tokenCoverage.exact, health.tokenCoverage.total);
  const estimatedTokenPercent = ratio(
    health.tokenCoverage.highConfidenceEstimate + health.tokenCoverage.lowConfidenceEstimate,
    health.tokenCoverage.total
  );

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              {health.tone === "success" ? (
                <ShieldCheck className="h-4 w-4 text-primary" />
              ) : health.tone === "destructive" ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : (
                <FileSearch className="h-4 w-4 text-primary" />
              )}
              Scan Health
            </CardTitle>
            <Badge variant={badgeVariant(health.tone)}>{health.headline}</Badge>
          </div>
          <CardDescription>{health.description}</CardDescription>
        </div>
        <div className="text-sm text-muted-foreground">
          {latest ? `Last scan: ${formatDate(latest.completedAt ?? latest.startedAt)}` : "No scan history"}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid overflow-hidden rounded-md border sm:grid-cols-2 xl:grid-cols-4">
          <StatBlock
            label="Latest scan"
            value={latest ? latest.filesScanned.toLocaleString() : "0"}
            helper={latest ? `${latest.recordsImported.toLocaleString()} records imported` : "Run a scan from Settings"}
          />
          <StatBlock
            label="Files handled"
            value={importedFiles.toLocaleString()}
            helper={`${duplicateFiles.toLocaleString()} duplicate files skipped`}
          />
          <StatBlock
            label="Needs parser review"
            value={(unsupportedFiles + failedFiles).toLocaleString()}
            helper={`${unsupportedFiles.toLocaleString()} unsupported, ${failedFiles.toLocaleString()} failed`}
          />
          <StatBlock
            label="Cost coverage"
            value={percent(pricedPercent)}
            helper={`${health.costCoverage.unknown.toLocaleString()} interactions still unknown`}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Token confidence</div>
              <Badge variant={health.tokenCoverage.unknown > 0 ? "warning" : "success"}>
                {percent(exactTokenPercent)} exact
              </Badge>
            </div>
            <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {health.tokenCoverage.exact.toLocaleString()} exact,{" "}
              {health.tokenCoverage.highConfidenceEstimate.toLocaleString()} high-confidence estimate,{" "}
              {health.tokenCoverage.lowConfidenceEstimate.toLocaleString()} low-confidence estimate,{" "}
              {health.tokenCoverage.unknown.toLocaleString()} unknown.
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Estimated rows are {percent(estimatedTokenPercent)} of imported interactions.
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-medium">Pricing transparency</div>
              <Badge variant={health.costCoverage.unknown > 0 ? "warning" : "success"}>
                {percent(pricedPercent)} priced
              </Badge>
            </div>
            <div className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {health.costCoverage.exact.toLocaleString()} exact-cost interactions,{" "}
              {health.costCoverage.estimated.toLocaleString()} estimated-cost interactions,{" "}
              {health.costCoverage.unknown.toLocaleString()} unknown-cost interactions.
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Unknown cost usually means missing model pricing or missing token counts.
            </div>
          </div>
        </div>

        {health.latestWarnings.length || health.latestErrors.length ? (
          <div className="rounded-md border bg-muted/30 p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-amber-700" />
              Latest scan notes
            </div>
            <ul className="space-y-1 text-xs leading-relaxed text-muted-foreground">
              {[...health.latestErrors, ...health.latestWarnings].slice(0, 5).map((message) => (
                <li key={message} className="break-words">
                  {message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {health.actions.map((item) => (
            <Button key={`${item.href}-${item.label}`} asChild size="sm" variant={actionVariant(item.tone)}>
              <Link href={item.href} title={item.reason}>
                {item.label === "Export diagnostics" ? <Download className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                {item.label}
              </Link>
            </Button>
          ))}
          {health.tone === "success" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              Local data is current as of the latest scan.
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
