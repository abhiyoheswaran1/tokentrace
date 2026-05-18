import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

function DoctorReportPanel({ report }: { report: DoctorReport }) {
  const statusRows = [
    ["Imported", report.fileStatus.imported],
    ["With errors", report.fileStatus.importedWithErrors],
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
        <CardTitle>Scan Health report</CardTitle>
        <CardDescription>
          The same local Scan Health data returned by `tokentrace doctor --json`.
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

        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-sm font-semibold">Scan freshness</div>
          <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {report.scanFreshness.description}
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
            <div className="grid border-y sm:grid-cols-6 sm:divide-x xl:grid-cols-2">
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
          <div className="text-sm font-semibold">Recommended fixes</div>
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

        <div className="space-y-3">
          <div>
            <div className="text-sm font-semibold">Supported file types</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {report.supportMatrix.summary.stable.toLocaleString()} stable,{" "}
              {report.supportMatrix.summary.bestEffort.toLocaleString()} best-effort,{" "}
              {report.supportMatrix.summary.ignored.toLocaleString()} ignored,{" "}
              {report.supportMatrix.summary.unsupported.toLocaleString()} unsupported.
            </div>
          </div>
          <div className="grid divide-y border-y lg:grid-cols-2 lg:divide-x lg:divide-y-0">
            {report.supportMatrix.items.map((item) => (
              <div key={item.id} className="p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{item.label}</div>
                  <Badge variant={item.level === "stable" ? "success" : item.level === "unsupported" ? "destructive" : item.level === "best-effort" ? "warning" : "secondary"}>
                    {item.level}
                  </Badge>
                </div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.description}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ParserTrustPanel({ report }: { report: DoctorReport["parserTrust"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>File parser review</CardTitle>
        <CardDescription>
          Latest scan files grouped by parser, source family, version, status, and import yield. Ignored files are known support files, not usage transcripts. Unsupported files need parser review before they become usage.
        </CardDescription>
      </CardHeader>
      <CardContent className="table-scroll">
        {report.parsers.length ? (
          <Table className="min-w-[72rem]">
            <TableHeader>
              <TableRow>
                <TableHead>Parser</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Source</TableHead>
                <TableHead className="text-right">Imported</TableHead>
                <TableHead className="text-right">With errors</TableHead>
                <TableHead className="text-right">Ignored</TableHead>
                <TableHead className="text-right">Unsupported</TableHead>
                <TableHead className="text-right">Failed</TableHead>
                <TableHead className="text-right">Duplicate</TableHead>
                <TableHead className="text-right">Records</TableHead>
                <TableHead className="min-w-56">Latest reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.parsers.map((row) => (
                <TableRow key={`${row.parser}:${row.version}:${row.sourceFamily}`}>
                  <TableCell className="font-medium">{row.parser}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.version}</Badge>
                  </TableCell>
                  <TableCell>{row.sourceFamily}</TableCell>
                  <TableCell className="text-right">{row.imported.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.importedWithErrors.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.ignored.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.unsupported.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.failed.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.duplicate.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{row.recordsImported.toLocaleString()}</TableCell>
                  <TableCell className="max-w-md text-xs text-muted-foreground">
                    {row.latestReason || "No parser reason recorded."}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            No parser trust data yet. Run `tokentrace scan` to populate the latest scan report.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDelta(value: number) {
  if (value > 0) return `+${value.toLocaleString()}`;
  return value.toLocaleString();
}

function ScanDiffPanel({ report }: { report: DoctorReport["scanDiff"] }) {
  const rows: Array<[string, keyof DoctorReport["scanDiff"]["current"]]> = [
    ["Files scanned", "filesScanned"],
    ["Records imported", "recordsImported"],
    ["Imported", "imported"],
    ["With errors", "importedWithErrors"],
    ["Duplicates", "duplicates"],
    ["Ignored", "ignored"],
    ["Unsupported", "unsupported"],
    ["Failed", "failed"]
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Scan history comparison</CardTitle>
        <CardDescription>
          Latest scan compared with the previous scan using deterministic scan ordering. Ignored files are known support files, not usage transcripts.
        </CardDescription>
      </CardHeader>
      <CardContent className="table-scroll space-y-4">
        <div className="grid border-y md:grid-cols-2 md:divide-x">
          <div className="min-w-0 p-3">
            <FieldLabel>Latest scan</FieldLabel>
            <div className="mt-1 text-sm font-semibold">{formatDate(report.latestCompletedAt ?? report.latestStartedAt)}</div>
            <MonoText className="mt-1 block truncate text-xs text-muted-foreground">
              {report.latestScanId ?? "No scan"}
            </MonoText>
          </div>
          <div className="min-w-0 p-3">
            <FieldLabel>Previous scan</FieldLabel>
            <div className="mt-1 text-sm font-semibold">{formatDate(report.previousCompletedAt ?? report.previousStartedAt)}</div>
            <MonoText className="mt-1 block truncate text-xs text-muted-foreground">
              {report.previousScanId ?? "No previous scan"}
            </MonoText>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Count</TableHead>
              <TableHead className="text-right">Current</TableHead>
              <TableHead className="text-right">Previous</TableHead>
              <TableHead className="text-right">Delta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([label, key]) => (
              <TableRow key={key}>
                <TableCell className="font-medium">{label}</TableCell>
                <TableCell className="text-right">{report.current[key].toLocaleString()}</TableCell>
                <TableCell className="text-right">{report.previous[key].toLocaleString()}</TableCell>
                <TableCell className="text-right">{formatDelta(report.delta[key])}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {report.explanation ? (
          <div className="rounded-md border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
            {report.explanation}
          </div>
        ) : null}
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
        title="Scan Health"
        description="Shows whether local usage was imported, which files need review, and whether model-rate coverage is usable."
      />

      <TrustChecklist data={data} rootCount={roots.length} />

      <Card>
        <CardHeader>
          <CardTitle>Local recommendations</CardTitle>
          <CardDescription>Deterministic next actions from local scan, model rates, parser, project, and cache data.</CardDescription>
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

      <ParserTrustPanel report={doctorReport.parserTrust} />

      <ScanDiffPanel report={doctorReport.scanDiff} />

      <ScanHistoryPanel scanRuns={data.scanRuns} />

      <ScanHealthSummary health={data.health} />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/discovery",
            title: "Discovered files",
            description: "Inspect which local files were discovered, skipped, imported, or unsupported."
          },
          {
            href: "/parser-debug",
            title: "Parser review",
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
          <CardTitle>Local privacy rules</CardTitle>
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
