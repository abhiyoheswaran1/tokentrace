import {
  buildScanFreshness,
  buildScanHealthActions,
  buildScanHealthStatus,
  groupScanNotes,
  incrementCount,
  isSuccessfulScanRun,
  uniqueMessages,
  type ScanHealthRuleStats
} from "@/src/lib/scan-health-rules";
import type {
  ScanConfidenceSummary,
  ScanHealth,
  ScanHealthFile,
  ScanHealthRun,
  SupplyChainHealth
} from "@/src/lib/scan-health-types";

export type {
  ScanConfidenceSummary,
  ScanHealth,
  ScanHealthAction,
  ScanHealthFile,
  ScanHealthNoteGroup,
  ScanHealthRun,
  SupplyChainHealth
} from "@/src/lib/scan-health-types";

export function buildScanHealth({
  scanRuns,
  scanFiles,
  confidence,
  supplyChain,
  now = Date.now()
}: {
  scanRuns: ScanHealthRun[];
  scanFiles: ScanHealthFile[];
  confidence: ScanConfidenceSummary;
  supplyChain?: SupplyChainHealth;
  now?: number;
}): ScanHealth {
  const latestRun = scanRuns[0] ?? null;
  const lastSuccessfulRun = scanRuns.find(isSuccessfulScanRun) ?? null;
  const freshness = buildScanFreshness({ latestRun, lastSuccessfulRun, now });
  const latestFiles = latestRun ? scanFiles.filter((file) => file.scanRunId === latestRun.id) : [];
  const latestStatusCounts: Record<string, number> = {};
  const parserCounts: Record<string, number> = {};

  for (const file of latestFiles) {
    incrementCount(latestStatusCounts, file.status);
    incrementCount(parserCounts, file.parser ?? "No parser");
  }

  const latestWarnings = uniqueMessages([
    ...(latestRun?.warnings ?? []),
    ...latestFiles.flatMap((file) => file.warnings.map((warning) => `${file.path}: ${warning}`))
  ]);
  const latestErrors = uniqueMessages([
    ...(latestRun?.errors ?? []),
    ...latestFiles.flatMap((file) => file.errors.map((error) => `${file.path}: ${error}`))
  ]);
  const latestNoteGroups = groupScanNotes(latestRun, latestFiles);

  const stats: ScanHealthRuleStats = {
    unsupported: latestStatusCounts.skipped_unknown ?? 0,
    failed: latestStatusCounts.failed ?? 0,
    importedWithErrors: latestStatusCounts.imported_with_errors ?? 0,
    duplicates: latestStatusCounts.skipped_duplicate ?? 0,
    imported: latestStatusCounts.imported ?? 0,
    warningCount: latestWarnings.length,
    hardErrorCount:
      (latestRun?.errors.length ?? 0) +
      latestFiles
        .filter((file) => file.status === "failed" || file.status === "imported_with_errors")
        .reduce((total, file) => total + file.errors.length, 0)
  };

  const tokenCoverage = {
    exact: confidence.exactTokenInteractions ?? 0,
    tokenizerEstimate: confidence.tokenizerEstimateInteractions ?? 0,
    simpleEstimate: confidence.simpleEstimateInteractions ?? 0,
    highConfidenceEstimate: confidence.highConfidenceTokenInteractions ?? 0,
    lowConfidenceEstimate: confidence.lowConfidenceTokenInteractions ?? 0,
    unknown: confidence.unknownTokenInteractions ?? 0,
    estimated: confidence.estimatedTokenInteractions ?? 0,
    total: confidence.interactions ?? 0
  };
  const costCoverage = {
    priced: confidence.exactCostInteractions + confidence.estimatedCostInteractions,
    exact: confidence.exactCostInteractions,
    estimated: confidence.estimatedCostInteractions,
    unknown: confidence.unknownCostInteractions,
    unknownCauses: confidence.unknownCostCauses,
    total: confidence.interactions
  };

  const { headline, description, tone } = buildScanHealthStatus({ latestRun, stats, confidence });
  const { supplyChainStatus, actions } = buildScanHealthActions({
    latestRun,
    stats,
    confidence,
    freshness,
    supplyChain
  });

  return {
    latestRun,
    lastSuccessfulRun,
    latestFiles,
    headline,
    description,
    tone,
    latestStatusCounts,
    parserCounts,
    latestWarnings,
    latestErrors,
    latestNoteGroups,
    freshness,
    tokenCoverage,
    costCoverage,
    supplyChain: supplyChainStatus,
    actions
  };
}
