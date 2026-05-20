import type { ScanConfidenceSummary, ScanHealth, ScanHealthRun } from "@/src/lib/scan-health";

export type DoctorRecommendation = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  action: string;
  href?: string;
};

export function countStatus(statusCounts: Record<string, number>, status: string) {
  return statusCounts[status] ?? 0;
}

function recommendation(
  id: string,
  severity: DoctorRecommendation["severity"],
  title: string,
  detail: string,
  action: string,
  href?: string
): DoctorRecommendation {
  return { id, severity, title, detail, action, href };
}

export function zeroImportExplanation(args: {
  latestRun: ScanHealthRun | null;
  statusCounts: Record<string, number>;
  rootCount: number;
}) {
  const { latestRun, statusCounts, rootCount } = args;
  if (!latestRun) return null;
  if (latestRun.recordsImported > 0) return null;
  if (rootCount === 0) return "No readable CLI roots were found, so TokenTrace had nowhere to discover usage files.";
  if (latestRun.filesScanned === 0) return "The latest scan checked no files in the configured roots.";

  const imported = countStatus(statusCounts, "imported");
  const importedWithErrors = countStatus(statusCounts, "imported_with_errors");
  const duplicates = countStatus(statusCounts, "skipped_duplicate");
  const ignored = countStatus(statusCounts, "ignored_non_usage");
  const unsupported = countStatus(statusCounts, "skipped_unknown");
  const failed = countStatus(statusCounts, "failed");
  const totalKnown = imported + importedWithErrors + duplicates + ignored + unsupported + failed;

  if (importedWithErrors > 0) return "The latest scan found candidate files, but parser errors prevented complete imports.";
  if (imported > 0) return "The latest scan marked files as imported, but they produced no usage records.";
  if (duplicates > 0 && duplicates === totalKnown) {
    return "The latest scan imported nothing because all usage candidates were already imported duplicates.";
  }
  if (ignored > 0 && ignored === totalKnown) {
    return "The latest scan only found known CLI support files, not usage transcripts.";
  }
  if (unsupported > 0 && unsupported === totalKnown) {
    return "The latest scan found files, but none matched a supported CLI usage parser.";
  }
  if (failed > 0 && failed === totalKnown) {
    return "The latest scan found candidate files, but parser failures prevented imports.";
  }
  if (ignored > 0 || unsupported > 0 || duplicates > 0 || failed > 0) {
    return "The latest scan found files, but imports were blocked by duplicates, ignored support files, unsupported formats, or parser failures.";
  }
  return "The latest scan imported no interactions. Add a custom folder or inspect Discovery for discovered file details.";
}

export function buildDoctorRecommendations(args: {
  health: ScanHealth;
  rootCount: number;
  pricedModelCount: number;
  zeroImport: string | null;
}) {
  const { health, rootCount, pricedModelCount, zeroImport } = args;
  const statusCounts = health.latestStatusCounts;
  const recommendations: DoctorRecommendation[] = [];
  const duplicates = countStatus(statusCounts, "skipped_duplicate");
  const ignored = countStatus(statusCounts, "ignored_non_usage");
  const unsupported = countStatus(statusCounts, "skipped_unknown");
  const failed = countStatus(statusCounts, "failed");
  const imported = countStatus(statusCounts, "imported");
  const importedWithErrors = countStatus(statusCounts, "imported_with_errors");
  const unknownCauses: ScanConfidenceSummary["unknownCostCauses"] = health.costCoverage.unknownCauses;

  if (!health.latestRun) {
    recommendations.push(recommendation(
      "run-first-scan",
      "high",
      "Run the first local scan",
      "TokenTrace has no scan history yet.",
      "Run `tokentrace scan` or use Settings -> Scan now.",
      "/settings#scan-controls"
    ));
  }

  if (rootCount === 0) {
    recommendations.push(recommendation(
      "no-roots",
      "high",
      "Add a readable CLI folder",
      "No Claude, Codex, OpenAI, project, or custom roots are currently readable.",
      "Open Settings and add the folder containing your CLI usage logs.",
      "/settings#custom-folders"
    ));
  }

  if (zeroImport && duplicates > 0 && imported === 0 && ignored === 0 && unsupported === 0 && failed === 0 && importedWithErrors === 0) {
    recommendations.push(recommendation(
      "scan-duplicates-only",
      "low",
      "Latest scan only found duplicates",
      zeroImport,
      "No action is required unless you expected new sessions. Use force rescan only when parser behavior changed.",
      "/settings#scan-controls"
    ));
  } else if (zeroImport) {
    recommendations.push(recommendation(
      "zero-import",
      "medium",
      "Latest scan imported no records",
      zeroImport,
      "Inspect Discovery to see which files were found and why they were not imported.",
      "/discovery"
    ));
  }

  if (failed > 0 || importedWithErrors > 0) {
    recommendations.push(recommendation(
      "parser-failures",
      "high",
      "Review parser failures",
      `${(failed + importedWithErrors).toLocaleString()} files failed or imported with parser errors.`,
      "Open Parsers and export diagnostics if the format looks like real CLI usage.",
      "/parser-debug"
    ));
  }

  if (unsupported > 0) {
    recommendations.push(recommendation(
      "parser-review",
      "medium",
      "Inspect unsupported usage candidates",
      `${unsupported.toLocaleString()} files need parser review.`,
      "Open Discovery to confirm whether these are real usage files or support files.",
      "/discovery"
    ));
  }

  if (ignored > 0) {
    recommendations.push(recommendation(
      "ignored-support-files",
      "low",
      "Ignored support files are being tracked",
      `${ignored.toLocaleString()} known non-usage files were ignored instead of treated as parser failures.`,
      "No action is needed unless an ignored file is actually a usage transcript.",
      "/discovery"
    ));
  }

  if (pricedModelCount === 0) {
    recommendations.push(recommendation(
      "seed-pricing",
      "high",
      "Seed or refresh model rates",
      "No priced models are available, so cost totals cannot be trusted.",
      "Run `tokentrace pricing refresh` or open Model Rates.",
      "/pricing"
    ));
  }

  if (unknownCauses.missingPricing > 0) {
    recommendations.push(recommendation(
      "missing-pricing",
      "high",
      "Add missing model rates",
      `${unknownCauses.missingPricing.toLocaleString()} interactions have token counts and model names but no usable price row.`,
      "Open Model Rates and configure the missing model rows.",
      "/pricing"
    ));
  }

  if (unknownCauses.missingModelName > 0) {
    recommendations.push(recommendation(
      "missing-model",
      "medium",
      "Review missing model names",
      `${unknownCauses.missingModelName.toLocaleString()} interactions could not be priced because the model is unknown.`,
      "Open Parsers and inspect source metadata for model aliases.",
      "/parser-debug"
    ));
  }

  if (unknownCauses.missingTokenCount > 0) {
    recommendations.push(recommendation(
      "missing-token-count",
      "medium",
      "Review missing token counts",
      `${unknownCauses.missingTokenCount.toLocaleString()} interactions could not be priced because token counts are missing.`,
      "Open Parsers and check token confidence for low-confidence adapters.",
      "/parser-debug"
    ));
  }

  if (!recommendations.length) {
    recommendations.push(recommendation(
      "healthy",
      "low",
      "Scan Health looks healthy",
      "Recent scans, parser coverage, and model-rate coverage do not show a blocking issue.",
      "Keep scanning after new CLI sessions.",
      "/"
    ));
  }

  return recommendations.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}
