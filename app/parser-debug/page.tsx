import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { getScanTrustData } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

export default function ParserDebugPage() {
  const { scanFiles, health } = getScanTrustData();
  const parserEntries = Object.entries(health.parserCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Parser Debug</h1>
        <p className="text-sm text-muted-foreground">
          Inspect adapter selection, parser confidence, extraction confidence, warnings, and failures.
        </p>
      </div>

      <div className="rounded-md border bg-card p-3">
        <div className="text-sm font-medium">Latest parser mix</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {parserEntries.length ? (
            parserEntries.map(([parser, count]) => (
              <Badge key={parser} variant={parser === "No parser" ? "secondary" : "outline"}>
                {parser}: {count.toLocaleString()}
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">No parser results yet.</span>
          )}
        </div>
      </div>

      {!scanFiles.length ? (
        <EmptyState
          title="No parser results yet"
          description="Run a scan from Settings to see adapter choices, warnings, and parser confidence."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Parser Results</CardTitle>
            <CardDescription>Latest 500 parser results. Useful when vendors change local file formats.</CardDescription>
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
                    <TableCell className="max-w-xs whitespace-normal break-words text-xs">
                      {JSON.stringify(file.rawMetadata.tokenConfidence ?? { unknown: 0 })}
                    </TableCell>
                    <TableCell>{file.recordsImported.toLocaleString()}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal break-words text-xs">{file.warnings.join("; ") || "None"}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal break-words text-xs">{file.errors.join("; ") || "None"}</TableCell>
                    <TableCell className="max-w-md break-all font-mono text-xs" title={file.path}>{file.path}</TableCell>
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
