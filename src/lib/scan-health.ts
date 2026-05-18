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
  actions: ScanHealthAction[];
};

function increment(target: Record<string, number>, key: string, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

function uniqueMessages(messages: string[]) {
  return Array.from(new Set(messages.map((message) => message.trim()).filter(Boolean))).slice(0, 6);
}

function groupScanNotes(scanRun: ScanHealthRun | null, files: ScanHealthFile[]): ScanHealthNoteGroup[] {
  const groups = new Map<string, ScanHealthNoteGroup>();

  function add(severity: ScanHealthNoteGroup["severity"], message: string, example?: string) {
    const trimmed = message.trim();
    if (!trimmed) return;
    const key = `${severity}:${trimmed}`;
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (example && !existing.examples.includes(example) && existing.examples.length < 3) {
        existing.examples.push(example);
      }
      return;
    }

    groups.set(key, {
      severity,
      message: trimmed,
      count: 1,
      examples: example ? [example] : []
    });
  }

  for (const error of scanRun?.errors ?? []) add("error", error);
  for (const warning of scanRun?.warnings ?? []) add("warning", warning);
  for (const file of files) {
    const fileErrorSeverity = file.status === "skipped_unknown" ? "warning" : "error";
    for (const error of file.errors) add(fileErrorSeverity, error, file.path);
    for (const warning of file.warnings) add("warning", warning, file.path);
  }

  return Array.from(groups.values())
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === "error" ? -1 : 1;
      return b.count - a.count;
    })
    .slice(0, 6);
}

function action(label: string, href: string, reason: string, tone: ScanHealthAction["tone"] = "default") {
  return { label, href, reason, tone };
}

function plural(count: number, singular: string, pluralValue = `${singular}s`) {
  return `${count} ${count === 1 ? singular : pluralValue}`;
}

function joinHealthParts(parts: string[]) {
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

const staleAfterMs = 7 * 24 * 60 * 60 * 1000;

function isSuccessfulRun(scanRun: ScanHealthRun) {
  return scanRun.completedAt != null && scanRun.recordsImported > 0 && scanRun.errors.length === 0;
}

function buildFreshness({
  latestRun,
  lastSuccessfulRun,
  now
}: {
  latestRun: ScanHealthRun | null;
  lastSuccessfulRun: ScanHealthRun | null;
  now: number;
}): ScanHealth["freshness"] {
  if (!latestRun) {
    return {
      state: "no-scan",
      lastSuccessfulCompletedAt: null,
      staleAfterMs,
      description: "No local scan has run yet."
    };
  }

  if (!lastSuccessfulRun?.completedAt) {
    return {
      state: "no-successful-scan",
      lastSuccessfulCompletedAt: null,
      staleAfterMs,
      description: "No completed scan has imported usage records yet."
    };
  }

  if (now - lastSuccessfulRun.completedAt > staleAfterMs) {
    return {
      state: "stale",
      lastSuccessfulCompletedAt: lastSuccessfulRun.completedAt,
      staleAfterMs,
      description: "The last successful import is more than seven days old."
    };
  }

  return {
    state: "fresh",
    lastSuccessfulCompletedAt: lastSuccessfulRun.completedAt,
    staleAfterMs,
    description: "Recent scan history includes a successful import."
  };
}

export function buildScanHealth({
  scanRuns,
  scanFiles,
  confidence,
  now = Date.now()
}: {
  scanRuns: ScanHealthRun[];
  scanFiles: ScanHealthFile[];
  confidence: ScanConfidenceSummary;
  now?: number;
}): ScanHealth {
  const latestRun = scanRuns[0] ?? null;
  const lastSuccessfulRun = scanRuns.find(isSuccessfulRun) ?? null;
  const freshness = buildFreshness({ latestRun, lastSuccessfulRun, now });
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
  const latestNoteGroups = groupScanNotes(latestRun, latestFiles);

  const unsupported = latestStatusCounts.skipped_unknown ?? 0;
  const failed = latestStatusCounts.failed ?? 0;
  const importedWithErrors = latestStatusCounts.imported_with_errors ?? 0;
  const duplicates = latestStatusCounts.skipped_duplicate ?? 0;
  const imported = latestStatusCounts.imported ?? 0;
  const warningCount = latestWarnings.length;
  const hardErrorCount =
    (latestRun?.errors.length ?? 0) +
    latestFiles
      .filter((file) => file.status === "failed" || file.status === "imported_with_errors")
      .reduce((total, file) => total + file.errors.length, 0);

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
    unknownCauses: confidence.unknownCostCauses,
    total: confidence.interactions
  };

  const actions: ScanHealthAction[] = [];
  let headline = "No scans yet";
  let description = "Run a local scan to discover Claude Code, Codex CLI, and generic AI CLI artifacts.";
  let tone: ScanHealth["tone"] = "secondary";

  if (!latestRun) {
    actions.push(action("Run first scan", "/settings", "Discover local AI CLI usage files."));
  } else if (failed > 0 || importedWithErrors > 0 || hardErrorCount > 0) {
    headline = "Scan needs attention";
    description = `${joinHealthParts([
      `${plural(failed + importedWithErrors, "file")} failed or imported with errors`,
      unsupported > 0 ? `${plural(unsupported, "file")} need parser review` : ""
    ].filter(Boolean))} in the latest scan.`;
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
        : "The latest scan completed without parser errors, unsupported files, or unknown model rates.";
    tone = "success";
  }

  if (failed > 0 || importedWithErrors > 0 || hardErrorCount > 0) {
    actions.push(action("Review parser failures", "/parser-debug", "Parser errors can hide usage data.", "destructive"));
  }
  if (unsupported > 0) {
    actions.push(action("Inspect unsupported files", "/discovery", "Unsupported files show where adapters need improvement.", "warning"));
  }
  if (confidence.unknownCostInteractions > 0) {
    actions.push(action("Set missing model rates", "/pricing", "Unknown costs make cost totals incomplete.", "warning"));
  }
  if (confidence.unknownTokenInteractions > 0 || confidence.estimatedTokenInteractions > 0) {
    actions.push(action("Review token confidence", "/parser-debug", "Estimated or unknown token counts should stay visible.", "warning"));
  }
  if (freshness.state === "stale") {
    actions.push(action("Run a fresh scan", "/settings", freshness.description, "warning"));
  }
  if (latestRun && imported === 0 && duplicates === 0 && unsupported === 0 && failed === 0) {
    actions.push(action("Add custom folders", "/settings", "No files were imported by the latest scan.", "warning"));
  }
  if (latestRun) {
    actions.push(action("Export diagnostics", "/api/export?type=scan-files", "Share parser metadata without raw prompts."));
  }

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
    actions
  };
}
