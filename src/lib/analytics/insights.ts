import { sqlite } from "@/src/db/client";
import { number, rows } from "@/src/lib/analytics-query-helpers";
import type {
  Insight,
  ModelAnalyticsRow,
  ProjectAnalyticsRow,
  SessionRow,
  SummaryMetrics,
  TrendPoint
} from "@/src/lib/analytics-types";

export function getLatestScanRecommendationStats() {
  const latest = sqlite
    .prepare(
      `SELECT id, records_imported AS recordsImported
       FROM scan_runs
       ORDER BY started_at DESC, completed_at DESC, id DESC
       LIMIT 1`
    )
    .get() as { id: string; recordsImported: number } | undefined;

  if (!latest) {
    return {
      latestRecordsImported: 0,
      duplicateFiles: 0,
      parserReviewFiles: 0,
      ignoredFiles: 0
    };
  }

  const counts = rows<{ status: string; count: number }>(
    `SELECT status, COUNT(*) AS count
     FROM scan_files
     WHERE scan_run_id = ?
     GROUP BY status`,
    latest.id
  ).reduce<Record<string, number>>((summary, row) => {
    summary[row.status] = number(row.count);
    return summary;
  }, {});

  return {
    latestRecordsImported: number(latest.recordsImported),
    duplicateFiles: counts.skipped_duplicate ?? 0,
    parserReviewFiles: (counts.skipped_unknown ?? 0) + (counts.failed ?? 0) + (counts.imported_with_errors ?? 0),
    ignoredFiles: counts.ignored_non_usage ?? 0
  };
}

export function buildInsights(data: {
  summary: SummaryMetrics;
  projects: ProjectAnalyticsRow[];
  sessions: SessionRow[];
  models: ModelAnalyticsRow[];
  trends: TrendPoint[];
}): Insight[] {
  const insights: Insight[] = [];
  const totalCost = data.summary.totalCost;
  const topSessions = [...data.sessions].sort((a, b) => b.totalTokens - a.totalTokens);
  const topTenTokens = topSessions.slice(0, Math.max(1, Math.ceil(topSessions.length * 0.1))).reduce(
    (sum, session) => sum + session.totalTokens,
    0
  );

  if (data.summary.totalTokens > 0 && topTenTokens / data.summary.totalTokens > 0.5) {
    insights.push({
      id: "concentrated-usage",
      severity: "high",
      problem: "A small number of sessions account for most token usage.",
      evidence: `Top sessions represent ${Math.round((topTenTokens / data.summary.totalTokens) * 100)}% of all tokens.`,
      savingOpportunity: totalCost ? `Reviewing these sessions targets about $${(totalCost * 0.5).toFixed(2)} of spend.` : "High token concentration even when cost is unknown.",
      recommendation: "Split large tasks into smaller prompts and add checkpoints before long coding runs."
    });
  }

  const highOutputProject = data.projects.find((project) => project.outputInputRatio > 2 && project.totalTokens > 5_000);
  if (highOutputProject) {
    insights.push({
      id: "high-output-project",
      severity: "medium",
      problem: "One project uses unusually high output tokens.",
      evidence: `${highOutputProject.project} has an output/input ratio of ${highOutputProject.outputInputRatio.toFixed(1)}x.`,
      savingOpportunity: highOutputProject.cost ? `Potential review pool: $${highOutputProject.cost.toFixed(2)}.` : "Savings depend on configured pricing.",
      recommendation: "Ask for concise diffs, summaries, or file-scoped edits when working in this project."
    });
  }

  const cacheEfficiency =
    data.summary.inputTokens + data.summary.cachedTokens
      ? data.summary.cachedTokens / (data.summary.inputTokens + data.summary.cachedTokens)
      : 0;
  if (data.summary.inputTokens > 10_000 && cacheEfficiency < 0.05) {
    insights.push({
      id: "low-cache",
      severity: "medium",
      problem: "Cache usage is low.",
      evidence: `Cached tokens are ${Math.round(cacheEfficiency * 100)}% of reusable input volume.`,
      savingOpportunity: "Better context reuse can reduce repeated input-token spend on supported models.",
      recommendation: "Keep stable instructions and repo context consistent across related runs where the CLI supports caching."
    });
  }

  const costlyAlternative = data.models.find((model) => model.overuseFlag && model.suggestedAlternative);
  if (costlyAlternative) {
    insights.push({
      id: "expensive-model-overuse",
      severity: "medium",
      problem: "Configured cheaper models may fit some low-complexity work.",
      evidence: `${costlyAlternative.model} has ${costlyAlternative.totalTokens.toLocaleString()} tokens and ${costlyAlternative.suggestedAlternative} is cheaper in your pricing table.`,
      savingOpportunity: costlyAlternative.cost ? `Candidate spend: $${costlyAlternative.cost.toFixed(2)}.` : "Savings require complete pricing.",
      recommendation: "Use cheaper models for refactoring, search-heavy, or mechanical edits, and reserve expensive models for ambiguous architecture work."
    });
  }

  if (data.trends.length >= 14) {
    const last = data.trends.slice(-7).reduce((sum, day) => sum + day.totalTokens, 0) / 7;
    const previous = data.trends.slice(-14, -7).reduce((sum, day) => sum + day.totalTokens, 0) / 7;
    if (previous > 0 && last / previous > 1.25) {
      insights.push({
        id: "session-length-growing",
        severity: "low",
        problem: "Average usage is increasing.",
        evidence: `Last 7-day average is ${Math.round((last / previous - 1) * 100)}% above the prior week.`,
        savingOpportunity: "Reducing drift can slow recurring spend growth.",
        recommendation: "Use planning prompts before long coding runs and prune stale context between unrelated tasks."
      });
    }
  }

  if (!insights.length) {
    insights.push({
      id: "baseline",
      severity: "low",
      problem: "No strong optimization pattern detected yet.",
      evidence: "Scan more sessions or configure prices for richer recommendations.",
      savingOpportunity: "Unknown until more local usage is imported.",
      recommendation: "Run a scan after several CLI sessions and revisit this page."
    });
  }

  return insights;
}
