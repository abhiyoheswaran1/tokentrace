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
  highConfidenceTokenInteractions: number;
  lowConfidenceTokenInteractions: number;
  unknownTokenInteractions: number;
  estimatedTokenInteractions: number;
  exactCostInteractions: number;
  estimatedCostInteractions: number;
  unknownCostInteractions: number;
};

export type ScanHealthAction = {
  label: string;
  href: string;
  reason: string;
  tone: "default" | "warning" | "destructive";
};

export type ScanHealth = {
  latestRun: ScanHealthRun | null;
  latestFiles: ScanHealthFile[];
  headline: string;
  description: string;
  tone: "success" | "warning" | "destructive" | "secondary";
  latestStatusCounts: Record<string, number>;
  parserCounts: Record<string, number>;
  latestWarnings: string[];
  latestErrors: string[];
  tokenCoverage: {
    exact: number;
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
    total: number;
  };
  actions: ScanHealthAction[];
};

function increment(target: Record<string, number>, key: string, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

function uniqueMessages(messages: string[]) {
  return Array.from(new Set(messages.map((message) => message.trim()).filter(Boolean))).slice(0, 6);
}

function action(label: string, href: string, reason: string, tone: ScanHealthAction["tone"] = "default") {
  return { label, href, reason, tone };
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

export function buildScanHealth({
  scanRuns,
  scanFiles,
  confidence
}: {
  scanRuns: ScanHealthRun[];
  scanFiles: ScanHealthFile[];
  confidence: ScanConfidenceSummary;
}): ScanHealth {
  const latestRun = scanRuns[0] ?? null;
  const latestFiles = latestRun ? scanFiles.filter((file) => file.scanRunId === latestRun.id) : [];
  const latestStatusCounts: Record<string, number> = {};
  const parserCounts: Record<string, number> = {};

  for (const file of latestFiles) {
    increment(latestStatusCounts, file.status);
    increment(parserCounts, file.parser ?? "No parser");
  }

  const latestWarnings = uniqueMessages([
    ...(latestRun?.warnings ?? []),
    ...latestFiles.flatMap((file) => file.warnings.map((warning) => `${file.path}: ${warning}`))
  ]);
  const latestErrors = uniqueMessages([
    ...(latestRun?.errors ?? []),
    ...latestFiles.flatMap((file) => file.errors.map((error) => `${file.path}: ${error}`))
  ]);

  const unsupported = latestStatusCounts.skipped_unknown ?? 0;
  const failed = latestStatusCounts.failed ?? 0;
  const importedWithErrors = latestStatusCounts.imported_with_errors ?? 0;
  const duplicates = latestStatusCounts.skipped_duplicate ?? 0;
  const imported = latestStatusCounts.imported ?? 0;
  const warningCount = latestWarnings.length;
  const errorCount = latestErrors.length;

  const tokenCoverage = {
    exact: confidence.exactTokenInteractions,
    highConfidenceEstimate: confidence.highConfidenceTokenInteractions,
    lowConfidenceEstimate: confidence.lowConfidenceTokenInteractions,
    unknown: confidence.unknownTokenInteractions,
    estimated: confidence.estimatedTokenInteractions,
    total: confidence.interactions
  };
  const costCoverage = {
    priced: confidence.exactCostInteractions + confidence.estimatedCostInteractions,
    exact: confidence.exactCostInteractions,
    estimated: confidence.estimatedCostInteractions,
    unknown: confidence.unknownCostInteractions,
    total: confidence.interactions
  };

  const actions: ScanHealthAction[] = [];
  let headline = "No scans yet";
  let description = "Run a local scan to discover Claude Code, Codex CLI, and generic AI CLI artifacts.";
  let tone: ScanHealth["tone"] = "secondary";

  if (!latestRun) {
    actions.push(action("Run first scan", "/settings", "Discover local AI CLI usage files."));
  } else if (failed > 0 || importedWithErrors > 0 || errorCount > 0) {
    headline = "Scan needs attention";
    description = `${plural(failed + importedWithErrors, "file")} failed or imported with errors in the latest scan.`;
    tone = "destructive";
  } else if (unsupported > 0 || warningCount > 0 || confidence.unknownCostInteractions > 0 || confidence.unknownTokenInteractions > 0) {
    headline = "Review recommended";
    description = "The latest scan completed, but some files, prices, or token confidence need review.";
    tone = "warning";
  } else {
    headline = "Scan health looks good";
    description =
      duplicates > 0
        ? "The latest scan completed and previously imported duplicate files were safely skipped."
        : "The latest scan completed without parser errors, unsupported files, or unknown pricing.";
    tone = "success";
  }

  if (failed > 0 || importedWithErrors > 0 || errorCount > 0) {
    actions.push(action("Review parser failures", "/parser-debug", "Parser errors can hide usage data.", "destructive"));
  }
  if (unsupported > 0) {
    actions.push(action("Inspect unsupported files", "/discovery", "Unsupported files show where adapters need improvement.", "warning"));
  }
  if (confidence.unknownCostInteractions > 0) {
    actions.push(action("Configure missing prices", "/pricing", "Unknown prices make cost totals incomplete.", "warning"));
  }
  if (confidence.unknownTokenInteractions > 0 || confidence.estimatedTokenInteractions > 0) {
    actions.push(action("Review token confidence", "/parser-debug", "Estimated or unknown token counts should stay visible.", "warning"));
  }
  if (latestRun && imported === 0 && duplicates === 0 && unsupported === 0 && failed === 0) {
    actions.push(action("Add custom folders", "/settings", "No files were imported by the latest scan.", "warning"));
  }
  if (latestRun) {
    actions.push(action("Export diagnostics", "/api/export?type=scan-files", "Share parser metadata without raw prompts."));
  }

  return {
    latestRun,
    latestFiles,
    headline,
    description,
    tone,
    latestStatusCounts,
    parserCounts,
    latestWarnings,
    latestErrors,
    tokenCoverage,
    costCoverage,
    actions
  };
}
