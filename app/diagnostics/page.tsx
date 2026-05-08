import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanHealthSummary } from "@/components/scan-health-summary";
import { getScanTrustData } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

export default function DiagnosticsPage() {
  const data = getScanTrustData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Ingestion Diagnostics</h1>
        <p className="text-sm text-muted-foreground">
          Passive filesystem ingestion status, parser coverage, and confidence transparency.
        </p>
      </div>

      <ScanHealthSummary health={data.health} />

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
