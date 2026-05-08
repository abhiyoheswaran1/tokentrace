import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">File Discovery Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Every file shown here was discovered by passive local filesystem scanning.
        </p>
      </div>
      <div className="grid overflow-hidden rounded-md border bg-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-3">
          <div className="text-xs text-muted-foreground">Latest imported files</div>
          <div className="mt-1 text-xl font-semibold">{imported.toLocaleString()}</div>
        </div>
        <div className="p-3">
          <div className="text-xs text-muted-foreground">Unsupported files</div>
          <div className="mt-1 text-xl font-semibold">{unsupported.toLocaleString()}</div>
        </div>
        <div className="p-3">
          <div className="text-xs text-muted-foreground">Duplicate files</div>
          <div className="mt-1 text-xl font-semibold">{duplicate.toLocaleString()}</div>
        </div>
        <div className="p-3">
          <div className="text-xs text-muted-foreground">Failed files</div>
          <div className="mt-1 text-xl font-semibold">{failed.toLocaleString()}</div>
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
                    <TableCell className="max-w-xl break-all font-mono text-xs" title={file.path}>
                      {file.path}
                    </TableCell>
                    <TableCell><Badge variant={variant(file.status)}>{file.status}</Badge></TableCell>
                    <TableCell>{file.sizeBytes.toLocaleString()} bytes</TableCell>
                    <TableCell>{formatDate(file.modifiedTime)}</TableCell>
                    <TableCell>{file.parser ?? "None"}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal break-words text-xs">
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
