import { jsonReportUsage, parseJsonReportArgs, type JsonReportCliOptions } from "@/src/lib/report-cli";
import type { DoctorReport } from "@/src/lib/doctor";

const args = process.argv.slice(2);
let options: JsonReportCliOptions;

try {
  options = parseJsonReportArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid doctor arguments.");
  console.error(jsonReportUsage("doctor"));
  process.exit(1);
}

if (options.help) {
  console.log(jsonReportUsage("doctor"));
  process.exit(0);
}

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
    `Files: ${report.fileStatus.imported.toLocaleString()} imported, ${report.fileStatus.importedWithErrors.toLocaleString()} with errors, ${report.fileStatus.duplicates.toLocaleString()} duplicates, ${report.fileStatus.ignored.toLocaleString()} ignored, ${report.fileStatus.unsupported.toLocaleString()} unsupported, ${report.fileStatus.failed.toLocaleString()} failed`,
    `Pricing: ${report.pricing.priced.toLocaleString()} priced, ${report.pricing.unknown.toLocaleString()} unknown`,
    `Support: ${report.supportMatrix.summary.stable.toLocaleString()} stable, ${report.supportMatrix.summary.bestEffort.toLocaleString()} best-effort, ${report.supportMatrix.summary.ignored.toLocaleString()} ignored, ${report.supportMatrix.summary.unsupported.toLocaleString()} unsupported`,
    report.latestScan.zeroImportExplanation ? `Zero import: ${report.latestScan.zeroImportExplanation}` : null,
    report.scanDiff.explanation ? `Scan diff: ${report.scanDiff.explanation}` : null,
    `Scan delta: ${report.scanDiff.delta.filesScanned.toLocaleString()} files, ${report.scanDiff.delta.recordsImported.toLocaleString()} records`,
    report.analyticsTiming.slowQueries.length ? `Slow analytics queries: ${report.analyticsTiming.slowQueries.length} over ${report.analyticsTiming.thresholdMs}ms` : null,
    "",
    "Recommendations:"
  ].filter((line): line is string => line != null);

  for (const query of report.analyticsTiming.slowQueries.slice(0, 5)) {
    lines.push(`~ ${query.label}: ${query.durationMs}ms`);
  }

  for (const item of report.recommendations.slice(0, 6)) {
    lines.push(`${severityIcon(item.severity)} ${item.title}`);
    lines.push(`  ${item.detail}`);
    lines.push(`  ${item.action}`);
  }

  return lines.join("\n");
}

const [{ getScanTrustData }, { buildDoctorReport }, { getDefaultSearchRoots }] = await Promise.all([
  import("@/src/lib/analytics"),
  import("@/src/lib/doctor"),
  import("@/src/ingestion/discovery")
]);
const trustData = getScanTrustData();
const roots = await getDefaultSearchRoots();
const report = buildDoctorReport({
  ...trustData,
  roots
});

if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(renderText(report));
}
