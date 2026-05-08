import Link from "next/link";
import { ArrowRight, CheckCircle2, FileWarning, SearchX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDebugData } from "@/src/lib/analytics";
import { formatDate } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function DiagnosticsPage() {
  const data = getDebugData();
  const latest = data.scanRuns[0];
  const imported = data.scanFiles.filter((file) => file.status === "imported").length;
  const unsupported = data.scanFiles.filter((file) => file.status === "skipped_unknown").length;
  const failed = data.scanFiles.filter((file) => file.status === "failed").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Ingestion Diagnostics</h1>
        <p className="text-sm text-muted-foreground">
          Passive filesystem ingestion status, parser coverage, and confidence transparency.
        </p>
      </div>

      <div className="dashboard-grid">
        <Card>
          <CardHeader>
            <CardTitle>Latest Scan</CardTitle>
            <CardDescription>{latest ? formatDate(latest.startedAt) : "No scans yet"}</CardDescription>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {latest?.filesScanned.toLocaleString() ?? "0"} files
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Imported</CardTitle>
            <CardDescription>Files parsed successfully.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            {imported.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Unsupported</CardTitle>
            <CardDescription>Discovered but no adapter matched.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <SearchX className="h-5 w-5 text-muted-foreground" />
            {unsupported.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Failed</CardTitle>
            <CardDescription>Parser or import errors.</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <FileWarning className="h-5 w-5 text-destructive" />
            {failed.toLocaleString()}
          </CardContent>
        </Card>
      </div>

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
