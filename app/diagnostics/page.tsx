import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DoctorReportPanel } from "@/components/diagnostics/doctor-report-panel";
import { LocalRecommendationsCard } from "@/components/diagnostics/local-recommendations-card";
import { ParserTrustPanel, ScanDiffPanel, ScanHistoryPanel, SourceCoveragePanel } from "@/components/diagnostics/parser-panels";
import { TrustChecklist } from "@/components/diagnostics/trust-checklist";
import { ScanHealthSummary } from "@/components/scan-health-summary";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/typography";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";
import { getAnalyticsData, getScanTrustData } from "@/src/lib/analytics";
import { buildDoctorReport } from "@/src/lib/doctor";
import { buildScanHealth } from "@/src/lib/scan-health";
import { getSupplyChainHealth } from "@/src/lib/supply-chain-health";

export const dynamic = "force-dynamic";

const diagnosticLinks = [
  {
    href: "/discovery",
    title: "Discovered files",
    description: "Inspect which local files were discovered, skipped, imported, or unsupported."
  },
  {
    href: "/parser-debug",
    title: "Parser review",
    description: "Review adapter selection, parser confidence, warnings, errors, and extracted metadata."
  },
  {
    href: "/debug",
    title: "Raw Data",
    description: "See raw scan files and metadata previews for troubleshooting vendor format changes."
  }
];

const privacyRules = ["no proxy", "no packet sniffing", "no browser extension", "no cloud telemetry", "adapter based"];

export default async function DiagnosticsPage() {
  const baseData = getScanTrustData({}, { scanFileScope: "recent" });
  const supplyChain = getSupplyChainHealth();
  const data = {
    ...baseData,
    health: buildScanHealth({
      scanRuns: baseData.scanRuns,
      scanFiles: baseData.scanFiles,
      confidence: baseData.confidence,
      supplyChain
    })
  };
  const analytics = getAnalyticsData({}, { scanFileScope: "none", sessionDetail: "summary" });
  const roots = await getDefaultSearchRoots();
  const doctorReport = buildDoctorReport({
    ...data,
    roots
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scan Health"
        description="Scan Health report showing whether local usage was imported, which files need review, and whether model-rate coverage is usable."
      />

      <TrustChecklist data={data} rootCount={roots.length} />
      <LocalRecommendationsCard recommendations={analytics.recommendations} />
      <DoctorReportPanel report={doctorReport} />
      <ParserTrustPanel report={doctorReport.parserTrust} />
      <ScanDiffPanel report={doctorReport.scanDiff} />
      <ScanHistoryPanel scanRuns={data.scanRuns} />
      <SourceCoveragePanel scanFiles={data.scanFiles} />
      <ScanHealthSummary health={data.health} />

      <div className="grid gap-4 md:grid-cols-3">
        {diagnosticLinks.map((item) => (
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
          <CardTitle>Local privacy rules</CardTitle>
          <CardDescription>TokenTrace uses direct local filesystem ingestion as the primary architecture.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {privacyRules.map((item) => (
            <Badge key={item} variant="secondary">{item}</Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
