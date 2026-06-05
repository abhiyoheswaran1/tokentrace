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
import { getAnalyticsTimingReport, type AnalyticsTimingReport } from "@/src/lib/analytics-timing";
import {
  buildDoctorRecommendations,
  countStatus,
  zeroImportExplanation,
  type DoctorRecommendation
} from "@/src/lib/doctor-recommendations";

export type { DoctorRecommendation } from "@/src/lib/doctor-recommendations";

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
  analyticsTiming: AnalyticsTimingReport;
  recommendations: DoctorRecommendation[];
};

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
      imported: countStatus(statusCounts, "imported"),
      importedWithErrors: countStatus(statusCounts, "imported_with_errors"),
      duplicates: countStatus(statusCounts, "skipped_duplicate"),
      ignored: countStatus(statusCounts, "ignored_non_usage"),
      unsupported: countStatus(statusCounts, "skipped_unknown"),
      failed: countStatus(statusCounts, "failed")
    },
    parserCoverage: {
      parsers: health.parserCounts,
      parserReviewFiles: countStatus(statusCounts, "skipped_unknown"),
      failureFiles: countStatus(statusCounts, "failed") + countStatus(statusCounts, "imported_with_errors")
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
    analyticsTiming: getAnalyticsTimingReport(),
    recommendations: buildDoctorRecommendations({
      health,
      rootCount: roots.length,
      pricedModelCount,
      zeroImport
    })
  };
}

/**
 * Compose the full doctor report the same way `tokentrace doctor` does:
 * local scan trust data plus the default search roots. Imports are dynamic so
 * importing this module never touches the local database.
 */
export async function buildDoctorReportSnapshot(): Promise<DoctorReport> {
  const [{ getScanTrustData }, { getDefaultSearchRoots }] = await Promise.all([
    import("@/src/lib/analytics"),
    import("@/src/ingestion/discovery")
  ]);
  const trustData = getScanTrustData();
  const roots = await getDefaultSearchRoots();
  return buildDoctorReport({ ...trustData, roots });
}
