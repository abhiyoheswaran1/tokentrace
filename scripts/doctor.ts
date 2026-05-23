import { doctorUsage, parseDoctorArgs, type DoctorCliOptions } from "@/src/lib/doctor-cli";
import type { DoctorReport } from "@/src/lib/doctor";
import type { AnalyticsTimingReport } from "@/src/lib/analytics-timing";

const args = process.argv.slice(2);
let options: DoctorCliOptions;

try {
  options = parseDoctorArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid doctor arguments.");
  console.error(doctorUsage());
  process.exit(1);
}

if (options.help) {
  console.log(doctorUsage());
  process.exit(0);
}

if (options.timings) {
  process.env.TOKENTRACE_ANALYTICS_TIMING = "1";
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

function renderTimings(report: AnalyticsTimingReport) {
  const lines = [
    "Analytics timings",
    `  enabled: ${report.enabled ? "yes" : "no"}`,
    `  threshold: ${report.thresholdMs}ms`,
    `  slow queries: ${report.slowQueries.length}`
  ];
  for (const sample of report.slowQueries) {
    lines.push(`  - ${sample.label}: ${sample.durationMs}ms (recorded ${sample.recordedAt})`);
  }
  return lines.join("\n");
}

const [{ getScanTrustData }, { buildDoctorReport }, { getDefaultSearchRoots }, { getAnalyticsTimingReport }] =
  await Promise.all([
    import("@/src/lib/analytics"),
    import("@/src/lib/doctor"),
    import("@/src/ingestion/discovery"),
    import("@/src/lib/analytics-timing")
  ]);
const trustData = getScanTrustData();
const roots = await getDefaultSearchRoots();
const report = buildDoctorReport({
  ...trustData,
  roots
});

if (options.timings) {
  const timingReport = getAnalyticsTimingReport();
  if (options.json) {
    console.log(JSON.stringify(timingReport, null, 2));
  } else {
    console.log(renderTimings(timingReport));
  }
} else if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(renderText(report));
}
