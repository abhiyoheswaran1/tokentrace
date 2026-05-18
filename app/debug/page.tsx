import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonoText, PageHeader } from "@/components/ui/typography";
import { getDebugData } from "@/src/lib/analytics";
import { formatDate } from "@/src/lib/format";

export const dynamic = "force-dynamic";

function statusVariant(status: string) {
  if (status === "imported") return "success";
  if (status.includes("error") || status === "failed") return "destructive";
  if (status.includes("skipped")) return "secondary";
  return "warning";
}

export default function DebugPage() {
  const data = getDebugData();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raw Data"
        description="Local raw data for scan runs, parser selection, imported records, warnings, and failures."
      />

      <div className="rounded-md border bg-card p-3 text-sm leading-6 text-muted-foreground">
        <span className="font-medium text-foreground">Local raw data:</span>{" "}
        Treat file paths and parser metadata as local sensitive data. This page is for debugging imports, not sharing screenshots.
      </div>

      {!data.scanRuns.length && !data.scanFiles.length ? (
        <EmptyState
          title="No raw scan data yet"
          description="Run a scan to populate local raw data. If nothing appears after a scan, open Scan Health to review roots and parser status."
          actions={[
            { label: "Open Scan Health", href: "/diagnostics", variant: "outline" }
          ]}
        >
          <ScanNowButton size="sm" />
        </EmptyState>
      ) : (
        <>
      <Card>
        <CardHeader>
          <CardTitle>Recent Scan Runs</CardTitle>
          <CardDescription>High-level import history.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Files</TableHead>
                <TableHead>Imported</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Errors</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.scanRuns.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{formatDate(run.startedAt)}</TableCell>
                  <TableCell>{formatDate(run.completedAt)}</TableCell>
                  <TableCell>{run.filesScanned.toLocaleString()}</TableCell>
                  <TableCell>{run.recordsImported.toLocaleString()}</TableCell>
                  <TableCell>{run.warnings.length.toLocaleString()}</TableCell>
                  <TableCell>{run.errors.length.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scanned Files</CardTitle>
          <CardDescription>Parser, status, warning, error, and metadata preview per file.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File</TableHead>
                <TableHead>Parser</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Imported</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.scanFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="max-w-96 truncate">
                    <MonoText>{file.path}</MonoText>
                  </TableCell>
                  <TableCell>{file.parser ?? "None"}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(file.status)}>{file.status}</Badge>
                  </TableCell>
                  <TableCell>{file.recordsImported.toLocaleString()}</TableCell>
                  <TableCell className="max-w-64 truncate">{file.warnings.join("; ") || "None"}</TableCell>
                  <TableCell className="max-w-64 truncate">{file.errors.join("; ") || "None"}</TableCell>
                  <TableCell className="max-w-80 truncate">
                    <MonoText>{JSON.stringify(file.rawMetadata)}</MonoText>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
