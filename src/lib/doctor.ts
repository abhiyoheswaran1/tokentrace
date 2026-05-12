import {
  buildScanHealth,
  type ScanConfidenceSummary,
  type ScanHealth,
  type ScanHealthFile,
  type ScanHealthRun
} from "@/src/lib/scan-health";
import {
  getSupportMatrix,
  summarizeSupportMatrix,
  type SupportMatrixItem,
  type SupportMatrixSummary
} from "@/src/lib/support-matrix";
import { buildParserTrustReportForScanFiles, type ParserTrustReport } from "@/src/lib/parser-trust";
import { buildScanDiff, type ScanDiff } from "@/src/lib/scan-diff";

export type DoctorRecommendation = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  action: string;
  href?: string;
};

export type DoctorReport = {
  generatedAt: string;
  status: ScanHealth["tone"];
  headline: string;
  description: string;
  roots: {
    count: number;
    paths: string[];
  };
  latestScan: {
    id: string | null;
    completedAt: number | null;
    filesScanned: number;
    recordsImported: number;
    zeroImportExplanation: string | null;
  };
  scanFreshness: ScanHealth["freshness"];
  fileStatus: {
    imported: number;
    importedWithErrors: number;
    duplicates: number;
    ignored: number;
    unsupported: number;
    failed: number;
  };
  parserCoverage: {
    parsers: Record<string, number>;
    parserReviewFiles: number;
    failureFiles: number;
  };
  pricing: {
    pricedModelCount: number;
    interactions: number;
    priced: number;
    exact: number;
    estimated: number;
    unknown: number;
    unknownCauses: ScanConfidenceSummary["unknownCostCauses"];
  };
  supportMatrix: {
    summary: SupportMatrixSummary;
    items: SupportMatrixItem[];
  };
  parserTrust: ParserTrustReport;
  scanDiff: ScanDiff;
  recommendations: DoctorRecommendation[];
};

function count(statusCounts: Record<string, number>, status: string) {
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

function zeroImportExplanation(args: {
  latestRun: ScanHealthRun | null;
  statusCounts: Record<string, number>;
  rootCount: number;
}) {
  const { latestRun, statusCounts, rootCount } = args;
  if (!latestRun) return null;
  if (latestRun.recordsImported > 0) return null;
  if (rootCount === 0) return "No readable CLI roots were found, so TokenTrace had nowhere to discover usage files.";
  if (latestRun.filesScanned === 0) return "The latest scan checked no files in the configured roots.";

  const imported = count(statusCounts, "imported");
  const importedWithErrors = count(statusCounts, "imported_with_errors");
  const duplicates = count(statusCounts, "skipped_duplicate");
  const ignored = count(statusCounts, "ignored_non_usage");
  const unsupported = count(statusCounts, "skipped_unknown");
  const failed = count(statusCounts, "failed");
  const totalKnown = imported + importedWithErrors + duplicates + ignored + unsupported + failed;

  if (importedWithErrors > 0) {
    return "The latest scan found candidate files, but parser errors prevented complete imports.";
  }
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

function buildRecommendations(args: {
  health: ScanHealth;
  rootCount: number;
  pricedModelCount: number;
  zeroImport: string | null;
}) {
  const { health, rootCount, pricedModelCount, zeroImport } = args;
  const statusCounts = health.latestStatusCounts;
  const recommendations: DoctorRecommendation[] = [];
  const duplicates = count(statusCounts, "skipped_duplicate");
  const ignored = count(statusCounts, "ignored_non_usage");
  const unsupported = count(statusCounts, "skipped_unknown");
  const failed = count(statusCounts, "failed");
  const importedWithErrors = count(statusCounts, "imported_with_errors");
  const unknownCauses = health.costCoverage.unknownCauses;

  if (!health.latestRun) {
    recommendations.push(recommendation(
      "run-first-scan",
      "high",
      "Run the first local scan",
      "TokenTrace has no scan history yet.",
      "Run `tokentrace scan` or use Settings -> Scan now.",
      "/settings"
    ));
  }

  if (rootCount === 0) {
    recommendations.push(recommendation(
      "no-roots",
      "high",
      "Add a readable CLI folder",
      "No Claude, Codex, OpenAI, project, or custom roots are currently readable.",
      "Open Settings and add the folder containing your CLI usage logs.",
      "/settings"
    ));
  }

  if (zeroImport && duplicates > 0 && ignored === 0 && unsupported === 0 && failed === 0 && importedWithErrors === 0) {
    recommendations.push(recommendation(
      "scan-duplicates-only",
      "low",
      "Latest scan only found duplicates",
      zeroImport,
      "No action is required unless you expected new sessions. Use force rescan only when parser behavior changed.",
      "/settings"
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
      "Open Parser Debug and export diagnostics if the format looks like real CLI usage.",
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
      "Seed or refresh model pricing",
      "No priced models are available, so cost totals cannot be trusted.",
      "Run `tokentrace pricing refresh` or open Pricing.",
      "/pricing"
    ));
  }

  if (unknownCauses.missingPricing > 0) {
    recommendations.push(recommendation(
      "missing-pricing",
      "high",
      "Add missing model prices",
      `${unknownCauses.missingPricing.toLocaleString()} interactions have token counts and model names but no usable price row.`,
      "Open Pricing and configure the missing model rows.",
      "/pricing"
    ));
  }

  if (unknownCauses.missingModelName > 0) {
    recommendations.push(recommendation(
      "missing-model",
      "medium",
      "Review missing model names",
      `${unknownCauses.missingModelName.toLocaleString()} interactions could not be priced because the model is unknown.`,
      "Open Parser Debug and inspect source metadata for model aliases.",
      "/parser-debug"
    ));
  }

  if (unknownCauses.missingTokenCount > 0) {
    recommendations.push(recommendation(
      "missing-token-count",
      "medium",
      "Review missing token counts",
      `${unknownCauses.missingTokenCount.toLocaleString()} interactions could not be priced because token counts are missing.`,
      "Open Parser Debug and check token confidence for low-confidence adapters.",
      "/parser-debug"
    ));
  }

  if (!recommendations.length) {
    recommendations.push(recommendation(
      "healthy",
      "low",
      "Scan doctor looks healthy",
      "Recent scans, parser coverage, and pricing coverage do not show a blocking issue.",
      "Keep scanning after new CLI sessions.",
      "/"
    ));
  }

  return recommendations.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.severity] - rank[b.severity];
  });
}

export function buildDoctorReport({
  scanRuns,
  scanFiles,
  confidence,
  pricedModelCount,
  roots
}: {
  scanRuns: ScanHealthRun[];
  scanFiles: ScanHealthFile[];
  confidence: ScanConfidenceSummary;
  pricedModelCount: number;
  roots: string[];
}): DoctorReport {
  const health = buildScanHealth({ scanRuns, scanFiles, confidence });
  const supportMatrix = getSupportMatrix();
  const parserTrust = buildParserTrustReportForScanFiles(scanFiles, health.latestRun?.id ?? null);
  const scanDiff = buildScanDiff({ scanRuns, scanFiles });
  const statusCounts = health.latestStatusCounts;
  const zeroImport = zeroImportExplanation({
    latestRun: health.latestRun,
    statusCounts,
    rootCount: roots.length
  });

  return {
    generatedAt: new Date().toISOString(),
    status: health.tone,
    headline: health.headline,
    description: health.description,
    roots: {
      count: roots.length,
      paths: roots
    },
    latestScan: {
      id: health.latestRun?.id ?? null,
      completedAt: health.latestRun?.completedAt ?? null,
      filesScanned: health.latestRun?.filesScanned ?? 0,
      recordsImported: health.latestRun?.recordsImported ?? 0,
      zeroImportExplanation: zeroImport
    },
    scanFreshness: health.freshness,
    fileStatus: {
      imported: count(statusCounts, "imported"),
      importedWithErrors: count(statusCounts, "imported_with_errors"),
      duplicates: count(statusCounts, "skipped_duplicate"),
      ignored: count(statusCounts, "ignored_non_usage"),
      unsupported: count(statusCounts, "skipped_unknown"),
      failed: count(statusCounts, "failed")
    },
    parserCoverage: {
      parsers: health.parserCounts,
      parserReviewFiles: count(statusCounts, "skipped_unknown"),
      failureFiles: count(statusCounts, "failed") + count(statusCounts, "imported_with_errors")
    },
    pricing: {
      pricedModelCount,
      interactions: confidence.interactions,
      priced: health.costCoverage.priced,
      exact: health.costCoverage.exact,
      estimated: health.costCoverage.estimated,
      unknown: health.costCoverage.unknown,
      unknownCauses: health.costCoverage.unknownCauses
    },
    supportMatrix: {
      summary: summarizeSupportMatrix(supportMatrix),
      items: supportMatrix
    },
    parserTrust,
    scanDiff,
    recommendations: buildRecommendations({
      health,
      rootCount: roots.length,
      pricedModelCount,
      zeroImport
    })
  };
}
