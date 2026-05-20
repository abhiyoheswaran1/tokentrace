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

export type ScanHealthRun = {
  id: string;
  startedAt: number;
  completedAt: number | null;
  filesScanned: number;
  recordsImported: number;
  warnings: string[];
  errors: string[];
};

export type ScanHealthFile = {
  id: string;
  scanRunId: string;
  path: string;
  modifiedTime: number | null;
  sizeBytes: number;
  parser: string | null;
  status: string;
  recordsImported: number;
  warnings: string[];
  errors: string[];
  rawMetadata: Record<string, unknown>;
};

export type ScanConfidenceSummary = {
  interactions: number;
  exactTokenInteractions: number;
  tokenizerEstimateInteractions?: number;
  simpleEstimateInteractions?: number;
  highConfidenceTokenInteractions: number;
  lowConfidenceTokenInteractions: number;
  unknownTokenInteractions: number;
  estimatedTokenInteractions: number;
  exactCostInteractions: number;
  estimatedCostInteractions: number;
  unknownCostInteractions: number;
  unknownCostCauses: {
    missingModelName: number;
    missingPricing: number;
    missingTokenCount: number;
    other: number;
  };
};

export type ScanHealthAction = {
  label: string;
  href: string;
  reason: string;
  tone: "default" | "warning" | "destructive";
};

export type SupplyChainHealth = {
  status: "passed" | "failed" | "not-run";
  checkedAt: number | null;
  findings: number;
  summary: string;
};

export type ScanHealthNoteGroup = {
  severity: "warning" | "error";
  message: string;
  count: number;
  examples: string[];
};

export type ScanHealth = {
  latestRun: ScanHealthRun | null;
  lastSuccessfulRun: ScanHealthRun | null;
  latestFiles: ScanHealthFile[];
  headline: string;
  description: string;
  tone: "success" | "warning" | "destructive" | "secondary";
  latestStatusCounts: Record<string, number>;
  parserCounts: Record<string, number>;
  latestWarnings: string[];
  latestErrors: string[];
  latestNoteGroups: ScanHealthNoteGroup[];
  freshness: {
    state: "no-scan" | "no-successful-scan" | "fresh" | "stale";
    lastSuccessfulCompletedAt: number | null;
    staleAfterMs: number;
    description: string;
  };
  tokenCoverage: {
    exact: number;
    tokenizerEstimate: number;
    simpleEstimate: number;
    highConfidenceEstimate: number;
    lowConfidenceEstimate: number;
    unknown: number;
    estimated: number;
    total: number;
  };
  costCoverage: {
    priced: number;
    exact: number;
    estimated: number;
    unknown: number;
    unknownCauses: ScanConfidenceSummary["unknownCostCauses"];
    total: number;
  };
  supplyChain: SupplyChainHealth;
  actions: ScanHealthAction[];
};

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
