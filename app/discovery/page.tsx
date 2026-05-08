import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDebugData } from "@/src/lib/analytics";
import { formatDate } from "@/src/lib/format";

export const dynamic = "force-dynamic";

function variant(status: string) {
  if (status === "imported") return "success";
  if (status === "skipped_unknown") return "secondary";
  if (status === "failed") return "destructive";
  return "warning";
}

export default function DiscoveryPage() {
  const { scanFiles } = getDebugData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">File Discovery Explorer</h1>
        <p className="text-sm text-muted-foreground">
          Every file shown here was discovered by passive local filesystem scanning.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Discovered Files</CardTitle>
          <CardDescription>Unsupported files are retained so parser gaps are visible.</CardDescription>
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
                  <TableCell className="max-w-xl truncate font-mono text-xs">{file.path}</TableCell>
                  <TableCell><Badge variant={variant(file.status)}>{file.status}</Badge></TableCell>
                  <TableCell>{file.sizeBytes.toLocaleString()} bytes</TableCell>
                  <TableCell>{formatDate(file.modifiedTime)}</TableCell>
                  <TableCell>{file.parser ?? "None"}</TableCell>
                  <TableCell className="max-w-sm truncate">{String(file.rawMetadata.reason ?? file.errors[0] ?? "None")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
