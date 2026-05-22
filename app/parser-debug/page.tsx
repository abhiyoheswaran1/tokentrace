import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MonoText, PageHeader } from "@/components/ui/typography";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import { getScanTrustData } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

export default async function ParserDebugPage({
  searchParams
}: {
  searchParams?: Promise<{ source?: string }>;
}) {
  const params = await searchParams;
  const selectedSource = params?.source;
  const { scanFiles, health } = getScanTrustData();
  const visibleScanFiles = selectedSource
    ? scanFiles.filter((file) => file.path === selectedSource)
    : scanFiles.slice(0, 500);
  const parserEntries = Object.entries(health.parserCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parsers"
        description="Inspect adapter selection, parser confidence, extracted tokens, warnings, and failures."
      />

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
          actions={[
            { label: "Open Scan Health", href: "/diagnostics", variant: "outline" }
          ]}
        >
          <ScanNowButton size="sm" />
        </EmptyState>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Parser review</CardTitle>
            <CardDescription>
              {selectedSource
                ? "Parser evidence for the selected source file."
                : "Latest 500 parser results. Useful when vendors change local file formats."}
            </CardDescription>
          </CardHeader>
          <CardContent className="table-scroll">
            {selectedSource ? (
              <div className="mb-3 rounded-md border bg-muted/30 p-3 text-sm">
                <div className="font-medium">Selected source file</div>
                <MonoText className="mt-1 block break-all text-muted-foreground">{selectedSource}</MonoText>
              </div>
            ) : null}
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
                {visibleScanFiles.length ? (
                  visibleScanFiles.map((file) => (
                  <TableRow key={file.id}>
                    <TableCell>{file.parser ?? "None"}</TableCell>
                    <TableCell><Badge variant={file.errors.length ? "destructive" : file.parser ? "success" : "secondary"}>{file.status}</Badge></TableCell>
                    <TableCell>{file.rawMetadata.confidence == null ? "Unknown" : Number(file.rawMetadata.confidence).toFixed(2)}</TableCell>
                    <TableCell className="max-w-xs whitespace-normal wrap-break-word">
                      <MonoText className="text-muted-foreground">
                        {JSON.stringify(file.rawMetadata.tokenConfidence ?? { unknown: 0 })}
                      </MonoText>
                    </TableCell>
                    <TableCell>{file.recordsImported.toLocaleString()}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal wrap-break-word text-xs leading-relaxed text-muted-foreground">{file.warnings.join("; ") || "None"}</TableCell>
                    <TableCell className="max-w-sm whitespace-normal wrap-break-word text-xs leading-relaxed text-muted-foreground">{file.errors.join("; ") || "None"}</TableCell>
                    <TableCell className="max-w-md break-all" title={file.path}>
                      <MonoText>{file.path}</MonoText>
                    </TableCell>
                  </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No parser results match this source file.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
