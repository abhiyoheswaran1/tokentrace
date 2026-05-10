import { getScanTrustData } from "@/src/lib/analytics";
import { buildDoctorReport, type DoctorReport } from "@/src/lib/doctor";
import { getDefaultSearchRoots } from "@/src/ingestion/discovery";

const args = process.argv.slice(2);

function severityIcon(severity: string) {
  if (severity === "high") return "!";
  if (severity === "medium") return "~";
  return "-";
}

function renderText(report: DoctorReport) {
  const lines = [
    `TokenTrace Doctor: ${report.headline}`,
    report.description,
    "",
    `Roots: ${report.roots.count}`,
    `Latest scan: ${report.latestScan.filesScanned.toLocaleString()} files, ${report.latestScan.recordsImported.toLocaleString()} records imported`,
    `Freshness: ${report.scanFreshness.state} (${report.scanFreshness.description})`,
    `Files: ${report.fileStatus.imported.toLocaleString()} imported, ${report.fileStatus.duplicates.toLocaleString()} duplicates, ${report.fileStatus.ignored.toLocaleString()} ignored, ${report.fileStatus.unsupported.toLocaleString()} unsupported, ${report.fileStatus.failed.toLocaleString()} failed`,
    `Pricing: ${report.pricing.priced.toLocaleString()} priced, ${report.pricing.unknown.toLocaleString()} unknown`,
    `Support: ${report.supportMatrix.summary.stable.toLocaleString()} stable, ${report.supportMatrix.summary.bestEffort.toLocaleString()} best-effort, ${report.supportMatrix.summary.ignored.toLocaleString()} ignored, ${report.supportMatrix.summary.unsupported.toLocaleString()} unsupported`,
    report.latestScan.zeroImportExplanation ? `Zero import: ${report.latestScan.zeroImportExplanation}` : null,
    "",
    "Recommendations:"
  ].filter((line): line is string => line != null);

  for (const item of report.recommendations.slice(0, 6)) {
    lines.push(`${severityIcon(item.severity)} ${item.title}`);
    lines.push(`  ${item.detail}`);
    lines.push(`  ${item.action}`);
  }

  return lines.join("\n");
}

const trustData = getScanTrustData();
const roots = await getDefaultSearchRoots();
const report = buildDoctorReport({
  ...trustData,
  roots
});

if (args.includes("--json")) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(renderText(report));
}
