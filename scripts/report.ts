import { markdownReportUsage, parseMarkdownReportArgs, type MarkdownReportCliOptions } from "@/src/lib/report-cli";

const args = process.argv.slice(2);
let options: MarkdownReportCliOptions;

try {
  options = parseMarkdownReportArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid report arguments.");
  console.error(markdownReportUsage());
  process.exit(1);
}

if (options.help) {
  console.log(markdownReportUsage());
  process.exit(0);
}

const [
  { getAnalyticsData, getScanTrustData },
  { buildAccountingInvariants },
  { buildDailyDigest },
  { renderMarkdownReport },
  { buildSavedReportDefinitions, renderSavedReport },
  { buildPostSessionReview },
  { buildScanDiff },
  { resolveSinceFilter },
  { summarizeSourceCoverage }
] = await Promise.all([
  import("@/src/lib/analytics"),
  import("@/src/lib/accounting-invariants"),
  import("@/src/lib/daily-digest"),
  import("@/src/lib/markdown-report"),
  import("@/src/lib/saved-reports"),
  import("@/src/lib/post-session-review"),
  import("@/src/lib/scan-diff"),
  import("@/src/lib/since-filter"),
  import("@/src/lib/source-catalog")
]);

const trust = getScanTrustData();
const latestRun = trust.health.latestRun;
const since = resolveSinceFilter(options.since, { latestScanStartedAt: latestRun?.startedAt ?? null });
const data = getAnalyticsData(since.filters);
const accounting = buildAccountingInvariants(since.filters);
const digest = buildDailyDigest({
  scopeLabel: since.label,
  summary: data.summary,
  usageGuardrails: data.usageGuardrails,
  reviewQueue: data.reviewQueue,
  projects: data.projects,
  latestScan: latestRun
    ? {
        headline: trust.health.headline,
        completedAt: latestRun.completedAt,
        recordsImported: latestRun.recordsImported,
        filesScanned: latestRun.filesScanned
      }
    : null
});
const postSessionReview = buildPostSessionReview({
  scanDiff: buildScanDiff(),
  usageGuardrails: data.usageGuardrails,
  summary: data.summary,
  sessions: data.sessions
});

const report = {
  generatedAt: digest.generatedAt,
  scopeLabel: since.label,
  digest,
  postSessionReview,
  accounting
};

if (options.type) {
  const definition = buildSavedReportDefinitions().find((item) => item.id === options.type);
  if (!definition) {
    console.error(`Unknown report type: ${options.type}`);
    console.error(markdownReportUsage());
    process.exit(1);
  }
  const coverage = summarizeSourceCoverage(trust.scanFiles);
  const rows = options.type === "source-coverage"
    ? [
        { label: "Native files", value: coverage.nativeFiles.toLocaleString(), detail: "First-class adapters" },
        { label: "Profile-assisted files", value: coverage.profileAssistedFiles.toLocaleString(), detail: "Import profile or generic parser" },
        { label: "Fallback files", value: coverage.fallbackFiles.toLocaleString(), detail: "Low-confidence parser fallback" },
        { label: "Imported records", value: coverage.importedRecords.toLocaleString(), detail: "Records imported from scan files" }
      ]
    : [
        { label: "Tokens", value: data.summary.totalTokens.toLocaleString(), detail: since.label },
        { label: "Cost", value: `$${data.summary.totalCost.toFixed(2)}`, detail: "Provider estimate or source cost" },
        { label: "Sessions", value: data.summary.sessions.toLocaleString(), detail: "Imported sessions" },
        { label: "Unknown cost", value: data.summary.unknownCostInteractions.toLocaleString(), detail: "Repair candidates" }
      ];
  const format = options.csv ? "csv" : options.json ? "json" : "markdown";
  console.log(
    renderSavedReport({
      definitionId: options.type,
      format,
      generatedAt: digest.generatedAt,
      rows
    })
  );
} else if (options.json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(
    renderMarkdownReport({
      title: "TokenTrace Local Report",
      generatedAt: report.generatedAt,
      scopeLabel: report.scopeLabel,
      digest: {
        totalTokens: digest.totalTokens,
        totalCost: digest.totalCost,
        unknownCostInteractions: digest.unknownCostInteractions,
        topReviewTitle: digest.topReviewItem.title,
        topProjectName: digest.topProject?.project ?? "No imported project usage"
      },
      postSessionReview: {
        headline: postSessionReview.headline,
        parserWarnings: postSessionReview.parserWarnings,
        unknownCostInteractions: postSessionReview.unknownCostInteractions,
        expensiveSessionTitles: postSessionReview.expensiveSessions.map((session) => session.title)
      },
      accounting: {
        status: accounting.status,
        processedTokens: accounting.processedTokens,
        nonCacheTokens: accounting.nonCacheTokens,
        cachedTokens: accounting.cachedTokens,
        balanceDeltaTokens: accounting.balanceDeltaTokens
      }
    })
  );
}
