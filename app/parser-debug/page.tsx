import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getDebugData } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

export default function ParserDebugPage() {
  const { scanFiles } = getDebugData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Parser Debug</h1>
        <p className="text-sm text-muted-foreground">
          Inspect adapter selection, parser confidence, extraction confidence, warnings, and failures.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Parser Results</CardTitle>
          <CardDescription>Useful when vendors change local file formats.</CardDescription>
        </CardHeader>
        <CardContent className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parser</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Parser confidence</TableHead>
                <TableHead>Token confidence</TableHead>
                <TableHead>Imported</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Errors</TableHead>
                <TableHead>File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scanFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>{file.parser ?? "None"}</TableCell>
                  <TableCell><Badge variant={file.errors.length ? "destructive" : file.parser ? "success" : "secondary"}>{file.status}</Badge></TableCell>
                  <TableCell>{file.rawMetadata.confidence == null ? "Unknown" : Number(file.rawMetadata.confidence).toFixed(2)}</TableCell>
                  <TableCell className="max-w-xs truncate">{JSON.stringify(file.rawMetadata.tokenConfidence ?? { unknown: 0 })}</TableCell>
                  <TableCell>{file.recordsImported.toLocaleString()}</TableCell>
                  <TableCell className="max-w-sm truncate">{file.warnings.join("; ") || "None"}</TableCell>
                  <TableCell className="max-w-sm truncate">{file.errors.join("; ") || "None"}</TableCell>
                  <TableCell className="max-w-md truncate font-mono text-xs">{file.path}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
