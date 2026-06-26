import type {
  ScanConfidenceSummary,
  ScanHealth,
  ScanHealthAction,
  ScanHealthFile,
  ScanHealthNoteGroup,
  ScanHealthRun,
  SupplyChainHealth
} from "@/src/lib/scan-health-types";

export function incrementCount(target: Record<string, number>, key: string, amount = 1) {
  target[key] = (target[key] ?? 0) + amount;
}

export function uniqueMessages(messages: string[]) {
  return Array.from(new Set(messages.map((message) => message.trim()).filter(Boolean))).slice(0, 6);
}

export function groupScanNotes(scanRun: ScanHealthRun | null, files: ScanHealthFile[]): ScanHealthNoteGroup[] {
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

export const scanHealthStaleAfterMs = 7 * 24 * 60 * 60 * 1000;

export function isSuccessfulScanRun(scanRun: ScanHealthRun) {
  return scanRun.completedAt != null && scanRun.recordsImported > 0 && scanRun.errors.length === 0;
}

export function buildScanFreshness({
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
      staleAfterMs: scanHealthStaleAfterMs,
      description: "No local scan has run yet."
    };
  }

  if (!lastSuccessfulRun?.completedAt) {
    return {
      state: "no-successful-scan",
      lastSuccessfulCompletedAt: null,
      staleAfterMs: scanHealthStaleAfterMs,
      description: "No completed scan has imported usage records yet."
    };
  }

  if (now - lastSuccessfulRun.completedAt > scanHealthStaleAfterMs) {
    return {
      state: "stale",
      lastSuccessfulCompletedAt: lastSuccessfulRun.completedAt,
      staleAfterMs: scanHealthStaleAfterMs,
      description: "The last successful import is more than seven days old."
    };
  }

  return {
    state: "fresh",
    lastSuccessfulCompletedAt: lastSuccessfulRun.completedAt,
    staleAfterMs: scanHealthStaleAfterMs,
    description: "Recent scan history includes a successful import."
  };
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

export type ScanHealthRuleStats = {
  unsupported: number;
  failed: number;
  importedWithErrors: number;
  duplicates: number;
  imported: number;
  warningCount: number;
  hardErrorCount: number;
};

export function buildScanHealthStatus({
  latestRun,
  stats,
  confidence
}: {
  latestRun: ScanHealthRun | null;
  stats: ScanHealthRuleStats;
  confidence: ScanConfidenceSummary;
}): Pick<ScanHealth, "headline" | "description" | "tone"> {
  if (!latestRun) {
    return {
      headline: "No scans yet",
      description: "Run a local scan to discover Claude Code, Codex CLI, and generic AI CLI artifacts.",
      tone: "secondary"
    };
  }

  if (stats.failed > 0 || stats.importedWithErrors > 0 || stats.hardErrorCount > 0) {
    return {
      headline: "Scan needs attention",
      description: `${joinHealthParts([
        `${plural(stats.failed + stats.importedWithErrors, "file")} failed or imported with errors`,
        stats.unsupported > 0 ? `${plural(stats.unsupported, "file")} need parser review` : ""
      ].filter(Boolean))} in the latest scan.`,
      tone: "destructive"
    };
  }

  if (stats.unsupported > 0 || stats.warningCount > 0 || confidence.unknownCostInteractions > 0 || confidence.unknownTokenInteractions > 0) {
    return {
      headline: "Review recommended",
      description: "The latest scan completed, but some files, prices, or token confidence need review.",
      tone: "warning"
    };
  }

  return {
    headline: "Scan health looks good",
    description: stats.duplicates > 0
      ? "The latest scan completed and previously imported duplicate files were safely skipped."
      : "The latest scan completed without parser errors, unsupported files, or unknown model rates.",
    tone: "success"
  };
}

export function buildScanHealthActions({
  latestRun,
  stats,
  confidence,
  freshness,
  supplyChain
}: {
  latestRun: ScanHealthRun | null;
  stats: ScanHealthRuleStats;
  confidence: ScanConfidenceSummary;
  freshness: ScanHealth["freshness"];
  supplyChain?: SupplyChainHealth;
}) {
  const actions: ScanHealthAction[] = [];
  const supplyChainStatus = supplyChain ?? {
    status: "not-run" as const,
    checkedAt: null,
    findings: 0,
    summary: "Supply-chain IOC check has not run in this dashboard process."
  };

  if (supplyChainStatus.status === "failed") {
    actions.push(action("Review supply-chain check", "/diagnostics#supply-chain", supplyChainStatus.summary, "destructive"));
  }
  if (!latestRun) {
    actions.push(action("Run first scan", "/settings#scan-controls", "Discover local AI CLI usage files."));
  }
  if (stats.failed > 0 || stats.importedWithErrors > 0 || stats.hardErrorCount > 0) {
    actions.push(action("Review parser failures", "/parser-debug", "Parser errors can hide usage data.", "destructive"));
  }
  if (stats.unsupported > 0) {
    actions.push(action("Inspect unsupported files", "/discovery", "Unsupported files show where adapters need improvement.", "warning"));
  }
  if (confidence.unknownCostInteractions > 0) {
    actions.push(action("Set model rate", "/pricing", "Unknown costs make cost totals incomplete.", "warning"));
  }
  if (confidence.unknownTokenInteractions > 0 || confidence.estimatedTokenInteractions > 0) {
    actions.push(action("Review token confidence", "/parser-debug", "Estimated or unknown token counts should stay visible.", "warning"));
  }
  if (freshness.state === "stale") {
    actions.push(action("Run a fresh scan", "/settings#scan-controls", freshness.description, "warning"));
  }
  if (latestRun && stats.imported === 0 && stats.duplicates === 0 && stats.unsupported === 0 && stats.failed === 0) {
    actions.push(action("Add custom folders", "/settings#custom-folders", "No files were imported by the latest scan.", "warning"));
  }
  if (latestRun) {
    actions.push(action("Export pack", "/api/export?type=scan-files", "Share parser metadata without raw prompts."));
  }

  return {
    supplyChainStatus,
    actions
  };
}
