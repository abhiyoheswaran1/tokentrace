import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataValue, FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { ScanHealthSummary } from "@/components/scan-health-summary";
import { getAnalyticsData, getScanTrustData, type DebugScanRun } from "@/src/lib/analytics";
import { buildDoctorReport, type DoctorReport } from "@/src/lib/doctor";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";
import { formatDate } from "@/src/lib/format";

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

function DoctorReportPanel({ report }: { report: DoctorReport }) {
  const statusRows = [
    ["Imported", report.fileStatus.imported],
    ["Duplicates", report.fileStatus.duplicates],
    ["Ignored", report.fileStatus.ignored],
    ["Unsupported", report.fileStatus.unsupported],
    ["Failed", report.fileStatus.failed]
  ];
  const fixCommands = [
    "tokentrace scan",
    "tokentrace doctor --json",
    "tokentrace pricing refresh",
    "tokentrace status --json"
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Doctor report</CardTitle>
        <CardDescription>
          A shared report used by this page and `tokentrace doctor --json`.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid border-y sm:grid-cols-2 sm:divide-x xl:grid-cols-4">
          <div className="p-3">
            <FieldLabel>Readable roots</FieldLabel>
            <DataValue className="mt-1" size="md">{report.roots.count.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Latest files</FieldLabel>
            <DataValue className="mt-1" size="md">{report.latestScan.filesScanned.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Imported records</FieldLabel>
            <DataValue className="mt-1" size="md">{report.latestScan.recordsImported.toLocaleString()}</DataValue>
          </div>
          <div className="p-3">
            <FieldLabel>Unknown cost</FieldLabel>
            <DataValue className="mt-1" size="md">{report.pricing.unknown.toLocaleString()}</DataValue>
          </div>
        </div>

        {report.latestScan.zeroImportExplanation ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            {report.latestScan.zeroImportExplanation}
          </div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <div className="mb-3 text-sm font-semibold">File handling</div>
            <div className="grid border-y sm:grid-cols-5 sm:divide-x xl:grid-cols-2">
              {statusRows.map(([label, value]) => (
                <div key={label} className="p-2">
                  <FieldLabel>{label}</FieldLabel>
                  <DataValue className="mt-1">{Number(value).toLocaleString()}</DataValue>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="mb-3 text-sm font-semibold">Copyable fixes</div>
            <div className="grid border-y">
              {fixCommands.map((command) => (
                <div key={command} className="border-b px-3 py-2 last:border-b-0">
                  <MonoText>{command}</MonoText>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold">Repair recommendations</div>
          <div className="grid gap-2 lg:grid-cols-2">
            {report.recommendations.slice(0, 6).map((item) => (
              <Link key={item.id} href={item.href ?? "/diagnostics"} className="border-t p-3 transition-colors hover:bg-muted/40">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{item.title}</div>
                  <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "warning" : "secondary"}>
                    {item.severity}
                  </Badge>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.detail}</div>
                <div className="mt-2 text-xs font-medium text-emerald-800">{item.action}</div>
              </Link>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function scanRunVariant(scanRun: DebugScanRun) {
  if (scanRun.errors.length > 0) return "destructive";
  if (scanRun.warnings.length > 0) return "warning";
  if (scanRun.recordsImported > 0) return "success";
  return "secondary";
}

function scanRunLabel(scanRun: DebugScanRun) {
  if (scanRun.errors.length > 0) return "errors";
  if (scanRun.warnings.length > 0) return "warnings";
  if (scanRun.recordsImported > 0) return "imported";
  return "no new records";
}

function ScanHistoryPanel({ scanRuns }: { scanRuns: DebugScanRun[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan history</CardTitle>
        <CardDescription>
          Recent local scans, ordered by newest first, so repeated runs are easy to audit.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {scanRuns.length ? (
          <div className="divide-y border-y">
            {scanRuns.slice(0, 8).map((scanRun) => (
              <div key={scanRun.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(12rem,1fr)_repeat(4,minmax(7rem,auto))] md:items-center">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">
                    {formatDate(scanRun.completedAt ?? scanRun.startedAt)}
                  </div>
                  <MonoText className="mt-1 block truncate text-xs text-muted-foreground">{scanRun.id}</MonoText>
                </div>
                <div>
                  <FieldLabel>Files</FieldLabel>
                  <DataValue className="mt-1">{scanRun.filesScanned.toLocaleString()}</DataValue>
                </div>
                <div>
                  <FieldLabel>Imported</FieldLabel>
                  <DataValue className="mt-1">{scanRun.recordsImported.toLocaleString()}</DataValue>
                </div>
                <div>
                  <FieldLabel>Notes</FieldLabel>
                  <DataValue className="mt-1">
                    {(scanRun.warnings.length + scanRun.errors.length).toLocaleString()}
                  </DataValue>
                </div>
                <div className="md:text-right">
                  <Badge variant={scanRunVariant(scanRun)}>{scanRunLabel(scanRun)}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-y px-4 py-6 text-sm text-muted-foreground">
            No scan history yet. Run `tokentrace scan` or use Settings / Scan now.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default async function DiagnosticsPage() {
  const data = getScanTrustData();
  const analytics = getAnalyticsData();
  const roots = await getDefaultSearchRoots();
  const doctorReport = buildDoctorReport({
    ...data,
    roots
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Doctor"
        description="Local CLI ingestion status, parser coverage, pricing readiness, and confidence transparency."
      />

      <TrustChecklist data={data} rootCount={roots.length} />

      <Card>
        <CardHeader>
          <CardTitle>Local recommendations</CardTitle>
          <CardDescription>Deterministic next actions from local scan, pricing, parser, project, and cache data.</CardDescription>
        </CardHeader>
        <CardContent className="grid divide-y overflow-hidden p-0 lg:grid-cols-3 lg:divide-x lg:divide-y-0">
          {analytics.recommendations.slice(0, 3).map((item) => (
            <Link key={item.id} href={item.href} className="px-4 py-3 transition-colors hover:bg-muted/40">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{item.title}</div>
                <Badge variant={item.severity === "high" ? "destructive" : item.severity === "medium" ? "warning" : "secondary"}>
                  {item.severity}
                </Badge>
              </div>
              <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.evidence}</div>
              <div className="mt-2 text-xs font-medium text-emerald-800">{item.action}</div>
            </Link>
          ))}
        </CardContent>
      </Card>

      <DoctorReportPanel report={doctorReport} />

      <ScanHistoryPanel scanRuns={data.scanRuns} />

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
