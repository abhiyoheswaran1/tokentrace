import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/typography";
import { ScanHealthSummary } from "@/components/scan-health-summary";
import { getScanTrustData } from "@/src/lib/analytics";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";

export const dynamic = "force-dynamic";

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

function TrustChecklist({
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
    unknownCauses.missingPricing > 0 ? `${unknownCauses.missingPricing.toLocaleString()} missing pricing` : null,
    unknownCauses.missingModelName > 0 ? `${unknownCauses.missingModelName.toLocaleString()} missing model` : null,
    unknownCauses.missingTokenCount > 0 ? `${unknownCauses.missingTokenCount.toLocaleString()} missing token count` : null,
    unknownCauses.other > 0 ? `${unknownCauses.other.toLocaleString()} other` : null
  ].filter(Boolean).join(", ");

  const items: Array<{ label: string; detail: string; status: ChecklistStatus }> = [
    {
      label: "Pricing loaded",
      status: data.pricedModelCount > 0 ? "pass" : "warn",
      detail: data.pricedModelCount > 0
        ? `${data.pricedModelCount.toLocaleString()} priced models are available.`
        : "Seed pricing before trusting cost totals."
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
      label: "Unknown prices",
      status: !hasInteractions ? "pending" : data.health.costCoverage.unknown > 0 ? "warn" : "pass",
      detail: !hasInteractions
        ? "Pricing coverage appears after records are imported."
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
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 gap-3 rounded-md border bg-muted/20 p-3">
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-card p-3">
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

export default async function DiagnosticsPage() {
  const data = getScanTrustData();
  const roots = await getDefaultSearchRoots();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Doctor"
        description="Local CLI ingestion status, parser coverage, pricing readiness, and confidence transparency."
      />

      <TrustChecklist data={data} rootCount={roots.length} />

      <ScanHealthSummary health={data.health} />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/discovery",
            title: "File Discovery Explorer",
            description: "Inspect which local files were discovered, skipped, imported, or unsupported."
          },
          {
            href: "/parser-debug",
            title: "Parser Debug",
            description: "Review adapter selection, parser confidence, warnings, errors, and extracted metadata."
          },
          {
            href: "/debug",
            title: "Raw Data",
            description: "See raw scan files and metadata previews for troubleshooting vendor format changes."
          }
        ].map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="h-full transition-colors hover:bg-muted/40">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {item.title}
                  <ArrowRight className="h-4 w-4" />
                </CardTitle>
                <CardDescription>{item.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Architecture Guardrails</CardTitle>
          <CardDescription>TokenTrace uses direct local filesystem ingestion as the primary architecture.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {["no proxy", "no packet sniffing", "no browser extension", "no cloud telemetry", "adapter based"].map((item) => (
            <Badge key={item} variant="secondary">{item}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
