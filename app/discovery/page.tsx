import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText, PageHeader } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { getScanTrustData } from "@/src/lib/analytics";
import { formatDate } from "@/src/lib/format";

export const dynamic = "force-dynamic";

function variant(status: string) {
  if (status === "imported") return "success";
  if (status === "skipped_unknown") return "secondary";
  if (status === "failed") return "destructive";
  return "warning";
}

export default function DiscoveryPage() {
  const { scanFiles, health } = getScanTrustData();
  const imported = health.latestStatusCounts.imported ?? 0;
  const unsupported = health.latestStatusCounts.skipped_unknown ?? 0;
  const duplicate = health.latestStatusCounts.skipped_duplicate ?? 0;
  const failed = health.latestStatusCounts.failed ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="File Discovery Explorer"
        description="Every file shown here was discovered by passive local filesystem scanning."
      />
      <div className="grid overflow-hidden rounded-md border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-3">
          <FieldLabel>Latest imported files</FieldLabel>
          <DataValue className="mt-1" size="md">{imported.toLocaleString()}</DataValue>
        </div>
        <div className="p-3">
          <FieldLabel>Unsupported files</FieldLabel>
          <DataValue className="mt-1" size="md">{unsupported.toLocaleString()}</DataValue>
        </div>
        <div className="p-3">
          <FieldLabel>Duplicate files</FieldLabel>
          <DataValue className="mt-1" size="md">{duplicate.toLocaleString()}</DataValue>
        </div>
        <div className="p-3">
          <FieldLabel>Failed files</FieldLabel>
          <DataValue className="mt-1" size="md">{failed.toLocaleString()}</DataValue>
        </div>
      </div>
      {!scanFiles.length ? (
        <EmptyState
          title="No files discovered yet"
          description="Run a scan from Settings to populate the file discovery explorer."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Discovered Files</CardTitle>
            <CardDescription>Latest 500 discovered files. Unsupported files are retained so parser gaps are visible.</CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Modified</TableHead>
                  <TableHead>Parser</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scanFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell className="max-w-xl break-all" title={file.path}>
                      <MonoText>{file.path}</MonoText>
                    </TableCell>
                    <TableCell><Badge variant={variant(file.status)}>{file.status}</Badge></TableCell>
                    <TableCell>{file.sizeBytes.toLocaleString()} bytes</TableCell>
                    <TableCell>{formatDate(file.modifiedTime)}</TableCell>
                    <TableCell>{file.parser ?? "None"}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal break-words text-xs leading-relaxed text-muted-foreground">
                      {String(file.rawMetadata.reason ?? file.errors[0] ?? file.warnings[0] ?? "None")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
