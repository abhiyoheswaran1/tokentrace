import { getSummary, getUsageComparison } from "@/src/lib/analytics/summary";
import { getTrends } from "@/src/lib/analytics/trends";
import {
  getModelRows,
  getProjectRows,
  getSessions,
  getToolComparison
} from "@/src/lib/analytics/entities";
import {
  getModelAliasSuggestions,
  getUnknownCostQueue
} from "@/src/lib/analytics/repair";
import { getScanTrustData } from "@/src/lib/analytics/scan-trust";
import {
  buildInsights,
  getLatestScanRecommendationStats
} from "@/src/lib/analytics/insights";
import { buildDataConfidenceScore } from "@/src/lib/data-confidence";
import { evidenceHref } from "@/src/lib/evidence-trail";
import { buildLocalRecommendations } from "@/src/lib/recommendations";
import { buildReviewQueue } from "@/src/lib/review-queue";
import { buildProjectSignals } from "@/src/lib/project-signals";
import { buildSessionComparisons } from "@/src/lib/session-comparison";
import { timeAnalyticsQuery } from "@/src/lib/analytics-timing";
import { getUsageGuardrailProgress } from "@/src/lib/usage-guardrails";
import type {
  AnalyticsData,
  AnalyticsFilters,
  EvidenceLinkMap,
  ScanTrustOptions
} from "@/src/lib/analytics-types";

export type {
  AnalyticsData,
  AnalyticsFilters,
  DebugScanFile,
  DebugScanRun,
  EvidenceLinkMap,
  Insight,
  ModelAliasSuggestion,
  ModelAnalyticsRow,
  ProjectAnalyticsRow,
  ScanTrustData,
  ScanTrustOptions,
  SessionRow,
  SummaryMetrics,
  ToolComparisonRow,
  TrendPoint,
  UnknownCostQueueRow,
  UsageComparison,
  UsageComparisonSnapshot
} from "@/src/lib/analytics-types";

export {
  getDebugData,
  getPricedModelCount,
  getScanConfidenceSummary,
  getScanTrustData
} from "@/src/lib/analytics/scan-trust";

export function getAnalyticsData(
  filters: AnalyticsFilters = {},
  options: ScanTrustOptions = {}
): AnalyticsData {
  const overviewOnly = options.analyticsProfile === "overview";
  const summary = timeAnalyticsQuery("analytics.summary", () => getSummary(filters));
  const scanTrust = getScanTrustData(filters, options);
  const dataConfidence = buildDataConfidenceScore({
    totalInteractions: scanTrust.confidence.interactions,
    exactTokenInteractions: scanTrust.confidence.exactTokenInteractions,
    tokenizerEstimateInteractions: scanTrust.confidence.tokenizerEstimateInteractions ?? 0,
    simpleEstimateInteractions:
      (scanTrust.confidence.simpleEstimateInteractions ?? 0) +
      scanTrust.confidence.highConfidenceTokenInteractions +
      scanTrust.confidence.lowConfidenceTokenInteractions,
    unknownTokenInteractions: scanTrust.confidence.unknownTokenInteractions,
    pricedCostInteractions: scanTrust.confidence.exactCostInteractions + scanTrust.confidence.estimatedCostInteractions,
    unknownCostInteractions: scanTrust.confidence.unknownCostInteractions,
    parserConfidence: null,
    scanFreshness: scanTrust.health.freshness.state
  });
  const evidenceLinks: EvidenceLinkMap = {
    "processed-tokens": evidenceHref("processed-tokens"),
    "non-cache-tokens": evidenceHref("non-cache-tokens"),
    "cached-tokens": evidenceHref("cached-tokens"),
    "estimated-cost": evidenceHref("estimated-cost"),
    sessions: evidenceHref("sessions"),
    "unknown-cost": evidenceHref("unknown-cost"),
    guardrails: evidenceHref("guardrails"),
    "review-queue": evidenceHref("review-queue")
  };
  const comparison = timeAnalyticsQuery("analytics.comparison", () => getUsageComparison(filters));
  const usageGuardrails = timeAnalyticsQuery("analytics.guardrails", () => getUsageGuardrailProgress());
  const trends = timeAnalyticsQuery("analytics.trends", () => getTrends(filters));
  const tools = timeAnalyticsQuery("analytics.tools", () => getToolComparison(filters));
  const models = overviewOnly ? [] : timeAnalyticsQuery("analytics.models", () => getModelRows(filters));
  const projects = timeAnalyticsQuery("analytics.projects", () => getProjectRows(filters));
  const sessions = timeAnalyticsQuery("analytics.sessions", () => getSessions(filters, options.sessionDetail ?? "full"));
  const unknownCosts = timeAnalyticsQuery("analytics.unknownCosts", () => getUnknownCostQueue(filters));
  const modelAliasSuggestions = overviewOnly
    ? []
    : timeAnalyticsQuery("analytics.modelAliases", () => getModelAliasSuggestions(filters));
  const sessionComparisons = overviewOnly
    ? []
    : timeAnalyticsQuery("analytics.sessionComparisons", () => buildSessionComparisons(sessions));
  const projectSignals = overviewOnly
    ? []
    : timeAnalyticsQuery("analytics.projectSignals", () => buildProjectSignals({
      totalTokens: summary.totalTokens,
      projects,
      sessions
    }));
  const recommendations = timeAnalyticsQuery("analytics.recommendations", () => buildLocalRecommendations({
    summary,
    tools,
    projects,
    unknownCosts,
    guardrails: usageGuardrails,
    scan: getLatestScanRecommendationStats()
  }));
  const reviewQueue = overviewOnly
    ? []
    : timeAnalyticsQuery("analytics.reviewQueue", () => buildReviewQueue({
      summary,
      guardrails: usageGuardrails,
      unknownCosts,
      sessions,
      projects,
      models,
      tools
    }));
  const insights = overviewOnly
    ? []
    : timeAnalyticsQuery("analytics.insights", () => buildInsights({ summary, trends, models, projects, sessions }));

  return {
    summary,
    scanTrust,
    dataConfidence,
    evidenceLinks,
    comparison,
    trends,
    tools,
    models,
    projects,
    sessions,
    unknownCosts,
    modelAliasSuggestions,
    usageGuardrails,
    reviewQueue,
    sessionComparisons,
    projectSignals,
    recommendations,
    insights
  };
}
