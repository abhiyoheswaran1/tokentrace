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
  { buildPostSessionReview },
  { buildScanDiff },
  { resolveSinceFilter }
] = await Promise.all([
  import("@/src/lib/analytics"),
  import("@/src/lib/accounting-invariants"),
  import("@/src/lib/daily-digest"),
  import("@/src/lib/markdown-report"),
  import("@/src/lib/post-session-review"),
  import("@/src/lib/scan-diff"),
  import("@/src/lib/since-filter")
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

if (options.json) {
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
