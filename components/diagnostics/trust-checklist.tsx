import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { getScanTrustData } from "@/src/lib/analytics";

type ChecklistStatus = "pass" | "warn" | "pending";

function statusIcon(status: ChecklistStatus) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-primary" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-700" />;
  return <CircleDashed className="h-4 w-4 text-muted-foreground" />;
}

function statusBadge(status: ChecklistStatus) {
  if (status === "pass") return <Badge variant="success">ready</Badge>;
  if (status === "warn") return <Badge variant="warning">review</Badge>;
  return <Badge variant="secondary">waiting</Badge>;
}

export function TrustChecklist({
  data,
  rootCount
}: {
  data: ReturnType<typeof getScanTrustData>;
  rootCount: number;
}) {
  const latest = data.health.latestRun;
  const statusCounts = data.health.latestStatusCounts;
  const unsupportedFiles = statusCounts.skipped_unknown ?? 0;
  const failedFiles = statusCounts.failed ?? 0;
  const importedWithErrors = statusCounts.imported_with_errors ?? 0;
  const ignoredFiles = statusCounts.ignored_non_usage ?? 0;
  const warningCount = data.health.latestWarnings.length + data.health.latestErrors.length;
  const hasInteractions = data.confidence.interactions > 0;
  const unknownCauses = data.health.costCoverage.unknownCauses;
  const unknownCauseText = [
    unknownCauses.missingPricing > 0 ? `${unknownCauses.missingPricing.toLocaleString()} missing model rate` : null,
    unknownCauses.missingModelName > 0 ? `${unknownCauses.missingModelName.toLocaleString()} missing model` : null,
    unknownCauses.missingTokenCount > 0 ? `${unknownCauses.missingTokenCount.toLocaleString()} missing token count` : null,
    unknownCauses.other > 0 ? `${unknownCauses.other.toLocaleString()} other` : null
  ].filter(Boolean).join(", ");

  const items: Array<{ label: string; detail: string; status: ChecklistStatus }> = [
    {
      label: "Model rates loaded",
      status: data.pricedModelCount > 0 ? "pass" : "warn",
      detail: data.pricedModelCount > 0
        ? `${data.pricedModelCount.toLocaleString()} rated models are available.`
        : "Seed model rates before trusting cost totals."
    },
    {
      label: "CLI roots found",
      status: rootCount > 0 ? "pass" : "warn",
      detail: rootCount > 0
        ? `${rootCount.toLocaleString()} readable Claude, Codex, OpenAI, or custom roots found.`
        : "No default or custom CLI roots are readable yet."
    },
    {
      label: "Files discovered",
      status: latest && latest.filesScanned > 0 ? "pass" : "pending",
      detail: latest
        ? `${latest.filesScanned.toLocaleString()} files checked, including ${ignoredFiles.toLocaleString()} ignored non-usage files.`
        : "Run a scan to discover local usage files."
    },
    {
      label: "Records imported",
      status: latest && latest.recordsImported > 0 ? "pass" : latest ? "warn" : "pending",
      detail: latest ? `${latest.recordsImported.toLocaleString()} interactions imported in the latest scan.` : "No scan has imported records yet."
    },
    {
      label: "Unknown cost",
      status: !hasInteractions ? "pending" : data.health.costCoverage.unknown > 0 ? "warn" : "pass",
      detail: !hasInteractions
        ? "Model-rate coverage appears after records are imported."
        : data.health.costCoverage.unknown > 0
          ? `${data.health.costCoverage.unknown.toLocaleString()} interactions need repair: ${unknownCauseText || "cause unavailable"}.`
          : "Imported interactions have usable cost coverage."
    },
    {
      label: "Parser warnings",
      status: failedFiles + importedWithErrors > 0 ? "warn" : unsupportedFiles + warningCount > 0 ? "warn" : latest ? "pass" : "pending",
      detail: latest
        ? `${unsupportedFiles.toLocaleString()} unsupported, ${failedFiles.toLocaleString()} failed, ${importedWithErrors.toLocaleString()} imported with errors, ${ignoredFiles.toLocaleString()} ignored.`
        : "Parser status appears after the first scan."
    }
  ];

  const nextAction = data.health.actions[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>First-run checklist</CardTitle>
        <CardDescription>Use this to decide whether TokenTrace found real CLI usage and which repair step matters next.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid border-y md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 gap-3 p-3">
              <div className="mt-0.5 shrink-0">{statusIcon(item.status)}</div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold leading-tight">{item.label}</div>
                  {statusBadge(item.status)}
                </div>
                <div className="text-xs leading-relaxed text-muted-foreground">{item.detail}</div>
              </div>
            </div>
          ))}
        </div>
        {nextAction ? (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <div>
              <div className="text-sm font-semibold">Next recommended action</div>
              <div className="text-xs leading-relaxed text-muted-foreground">{nextAction.reason}</div>
            </div>
            <Link href={nextAction.href} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              {nextAction.label}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
