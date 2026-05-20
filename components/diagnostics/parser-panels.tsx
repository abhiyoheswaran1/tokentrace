import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText } from "@/components/ui/typography";
import type { DebugScanRun, getScanTrustData } from "@/src/lib/analytics";
import type { DoctorReport } from "@/src/lib/doctor";
import { buildSourceCatalog, summarizeSourceCoverage } from "@/src/lib/source-catalog";
import { formatDate } from "@/src/lib/format";

export function ParserTrustPanel({ report }: { report: DoctorReport["parserTrust"] }) {
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

export function ScanDiffPanel({ report }: { report: DoctorReport["scanDiff"] }) {
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

export function ScanHistoryPanel({ scanRuns }: { scanRuns: DebugScanRun[] }) {
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

export function SourceCoveragePanel({ scanFiles }: { scanFiles: ReturnType<typeof getScanTrustData>["scanFiles"] }) {
  const catalog = buildSourceCatalog();
  const coverage = summarizeSourceCoverage(scanFiles);
  const summary = [
    ["Native", coverage.nativeFiles],
    ["Profile-assisted", coverage.profileAssistedFiles],
    ["Fallback", coverage.fallbackFiles],
    ["Unsupported", coverage.unsupportedFiles]
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Source Coverage</CardTitle>
          <CardDescription>
            Import support is grouped by native adapters, profile-assisted parsers, fallback parsers, and unsupported files.
          </CardDescription>
        </div>
        <Link href="/api/reports?type=source-coverage&format=markdown" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
          Export source report
        </Link>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid border-y sm:grid-cols-2 lg:grid-cols-4">
          {summary.map(([label, value]) => (
            <div key={label} className="p-3">
              <FieldLabel>{label}</FieldLabel>
              <DataValue className="mt-1" size="md">{Number(value).toLocaleString()}</DataValue>
            </div>
          ))}
        </div>
        <div className="grid gap-2 lg:grid-cols-2">
          {catalog.entries.map((entry) => (
            <div key={entry.id} className="rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-sm font-semibold">{entry.label}</div>
                <Badge variant={entry.tier === "native" ? "success" : entry.tier === "profile-assisted" ? "warning" : "secondary"}>
                  {entry.tier}
                </Badge>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{entry.description}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {entry.matchers.map((matcher) => (
                  <code key={matcher} className="rounded bg-muted px-1.5 py-0.5 text-xs">{matcher}</code>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
