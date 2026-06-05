import { getAnalyticsData, getScanTrustData, type DebugScanFile } from "@/src/lib/analytics";
import {
  buildSavedReportDefinitions,
  renderSavedReport,
  type SavedReportDefinition,
  type SavedReportFormat,
  type SavedReportRow
} from "@/src/lib/saved-reports";
import { resolveSinceFilter, type SinceFilter } from "@/src/lib/since-filter";
import { buildSourceCatalog, summarizeSourceCoverage } from "@/src/lib/source-catalog";

export type ReportScope = {
  since: string | null;
};

export type GenerateReportOptions = {
  format: SavedReportFormat;
  generatedAt?: string;
  scope?: ReportScope;
};

export type GenerateReportResult =
  | { ok: true; definition: SavedReportDefinition; content: string }
  | { ok: false; reason: "unknown-type" | "unsupported-format" };

type ResolvedReportScope = {
  since: SinceFilter;
  scanFiles: DebugScanFile[];
};

export function generateReport(definitionId: string, options: GenerateReportOptions): GenerateReportResult {
  const scope = options.scope ? resolveReportScope(options.scope) : null;
  const definition = buildSavedReportDefinitions().find((item) => item.id === definitionId);
  if (!definition) return { ok: false, reason: "unknown-type" };
  if (!definition.formats.includes(options.format)) return { ok: false, reason: "unsupported-format" };
  const content = renderSavedReport({
    definitionId,
    format: options.format,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    rows: scope ? scopedReportRows(definitionId, scope) : dashboardReportRows(definitionId)
  });
  return { ok: true, definition, content };
}

function resolveReportScope(scope: ReportScope): ResolvedReportScope {
  const trust = getScanTrustData();
  const since = resolveSinceFilter(scope.since, {
    latestScanStartedAt: trust.health.latestRun?.startedAt ?? null
  });
  return { since, scanFiles: trust.scanFiles };
}

function dashboardReportRows(definitionId: string): SavedReportRow[] {
  const analytics = getAnalyticsData();
  const trust = getScanTrustData();
  const sourceCoverage = summarizeSourceCoverage(trust.scanFiles);
  if (definitionId === "source-coverage") {
    return [
      { label: "Native files", value: sourceCoverage.nativeFiles.toLocaleString(), detail: "First-class adapters" },
      { label: "Profile-assisted files", value: sourceCoverage.profileAssistedFiles.toLocaleString(), detail: "Import profile or generic parser" },
      { label: "Fallback files", value: sourceCoverage.fallbackFiles.toLocaleString(), detail: "Low-confidence text or generic fallback" },
      { label: "Imported records", value: sourceCoverage.importedRecords.toLocaleString(), detail: "Records imported from scan files" }
    ];
  }
  if (definitionId === "guardrail-status") {
    return [
      { label: "Cost guardrail", value: analytics.usageGuardrails.cost.status, detail: `${analytics.usageGuardrails.cost.used.toFixed(2)} used` },
      { label: "Token guardrail", value: analytics.usageGuardrails.tokens.status, detail: `${analytics.usageGuardrails.tokens.used.toLocaleString()} tokens used` },
      { label: "Scoped guardrails", value: analytics.usageGuardrails.scoped.length.toLocaleString(), detail: "Project/model/tool limits" },
      { label: "Anomalies", value: analytics.usageGuardrails.anomalies.length.toLocaleString(), detail: "Warning or exceeded scoped guardrails" }
    ];
  }
  return [
    { label: "Tokens", value: analytics.summary.totalTokens.toLocaleString(), detail: "Selected local data" },
    { label: "Cost", value: `$${analytics.summary.totalCost.toFixed(2)}`, detail: "Provider estimate or source cost" },
    { label: "Sessions", value: analytics.summary.sessions.toLocaleString(), detail: "Imported sessions" },
    { label: "Unknown cost", value: analytics.summary.unknownCostInteractions.toLocaleString(), detail: "Repair queue candidates" },
    { label: "Source catalog", value: buildSourceCatalog().entries.length.toLocaleString(), detail: "Known import paths" }
  ];
}

function scopedReportRows(definitionId: string, scope: ResolvedReportScope): SavedReportRow[] {
  if (definitionId === "source-coverage") {
    const coverage = summarizeSourceCoverage(scope.scanFiles);
    return [
      { label: "Native files", value: coverage.nativeFiles.toLocaleString(), detail: "First-class adapters" },
      { label: "Profile-assisted files", value: coverage.profileAssistedFiles.toLocaleString(), detail: "Import profile or generic parser" },
      { label: "Fallback files", value: coverage.fallbackFiles.toLocaleString(), detail: "Low-confidence parser fallback" },
      { label: "Imported records", value: coverage.importedRecords.toLocaleString(), detail: "Records imported from scan files" }
    ];
  }
  const summary = getAnalyticsData(scope.since.filters).summary;
  return [
    { label: "Tokens", value: summary.totalTokens.toLocaleString(), detail: scope.since.label },
    { label: "Cost", value: `$${summary.totalCost.toFixed(2)}`, detail: "Provider estimate or source cost" },
    { label: "Sessions", value: summary.sessions.toLocaleString(), detail: "Imported sessions" },
    { label: "Unknown cost", value: summary.unknownCostInteractions.toLocaleString(), detail: "Repair candidates" }
  ];
}
