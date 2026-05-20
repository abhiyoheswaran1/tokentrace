import { sqlite } from "@/src/db/client";
import { number, timestampWhere } from "@/src/lib/analytics-query-helpers";
import type {
  AnalyticsFilters,
  SummaryMetrics,
  UsageComparison,
  UsageComparisonSnapshot
} from "@/src/lib/analytics-types";

export function getSummary(filters: AnalyticsFilters = {}): SummaryMetrics {
  const interactionFilter = timestampWhere(filters, "interactions");
  const aggregate = sqlite
    .prepare(
      `SELECT
        COALESCE(SUM(total_tokens), 0) AS totalTokens,
        COALESCE(SUM(input_tokens + output_tokens + reasoning_tokens), 0) AS nonCachedTokens,
        COALESCE(SUM(input_tokens), 0) AS inputTokens,
        COALESCE(SUM(output_tokens), 0) AS outputTokens,
        COALESCE(SUM(cache_read_tokens), 0) AS cacheReadTokens,
        COALESCE(SUM(cache_write_tokens), 0) AS cacheWriteTokens,
        COALESCE(SUM(cache_read_tokens + cache_write_tokens), 0) AS cachedTokens,
        COALESCE(SUM(reasoning_tokens), 0) AS reasoningTokens,
        COALESCE(SUM(cost), 0) AS totalCost,
        COALESCE(SUM(CASE WHEN cost_estimated = 0 AND cost IS NOT NULL THEN cost ELSE 0 END), 0) AS exactCost,
        COALESCE(SUM(CASE WHEN cost_estimated = 1 AND cost IS NOT NULL THEN cost ELSE 0 END), 0) AS estimatedCost,
        COALESCE(SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END), 0) AS unknownCostInteractions,
        COUNT(*) AS interactions,
        COUNT(DISTINCT session_id) AS sessions
       FROM interactions INDEXED BY interactions_analytics_cover_idx
       ${interactionFilter.sql}`
    )
    .get(...interactionFilter.params) as Omit<SummaryMetrics, "mostUsedTool" | "mostUsedModel">;

  const toolFilter = timestampWhere(filters, "i");
  const tool = sqlite
    .prepare(
      `SELECT t.name
       FROM interactions i INDEXED BY interactions_analytics_cover_idx
       JOIN sessions s ON s.id = i.session_id
       JOIN tools t ON t.id = s.tool_id
       ${toolFilter.sql}
       GROUP BY t.id
       ORDER BY SUM(i.total_tokens) DESC
       LIMIT 1`
    )
    .get(...toolFilter.params) as { name: string } | undefined;

  const modelFilter = timestampWhere(filters, "i");
  const model = sqlite
    .prepare(
      `SELECT m.name
       FROM interactions i INDEXED BY interactions_analytics_cover_idx
       LEFT JOIN models m ON m.id = i.model_id
       ${modelFilter.sql}
       GROUP BY m.id
       ORDER BY SUM(i.total_tokens) DESC
       LIMIT 1`
    )
    .get(...modelFilter.params) as { name: string } | undefined;

  return {
    totalTokens: number(aggregate.totalTokens),
    nonCachedTokens: number(aggregate.nonCachedTokens),
    inputTokens: number(aggregate.inputTokens),
    outputTokens: number(aggregate.outputTokens),
    cacheReadTokens: number(aggregate.cacheReadTokens),
    cacheWriteTokens: number(aggregate.cacheWriteTokens),
    cachedTokens: number(aggregate.cachedTokens),
    reasoningTokens: number(aggregate.reasoningTokens),
    totalCost: number(aggregate.totalCost),
    exactCost: number(aggregate.exactCost),
    estimatedCost: number(aggregate.estimatedCost),
    unknownCostInteractions: number(aggregate.unknownCostInteractions),
    sessions: number(aggregate.sessions),
    interactions: number(aggregate.interactions),
    mostUsedTool: tool?.name ?? "No data",
    mostUsedModel: model?.name ?? "No data"
  };
}

const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
const maxUsefulPercentDelta = 999;

function comparisonSnapshot(summary: SummaryMetrics): UsageComparisonSnapshot {
  return {
    totalTokens: summary.totalTokens,
    totalCost: summary.totalCost,
    sessions: summary.sessions,
    interactions: summary.interactions,
    unknownCostInteractions: summary.unknownCostInteractions
  };
}

function percentDelta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  const rounded = Math.round(((current - previous) / previous) * 100);
  return Math.abs(rounded) > maxUsefulPercentDelta ? null : rounded;
}

function deltaLabel(percentValue: number | null, absolute: number, previous: number, noun: string) {
  if (percentValue == null) {
    if (previous === 0) return absolute > 0 ? `New ${noun} activity` : `No ${noun} activity yet`;
    if (absolute === 0) return `${noun} unchanged`;
    return `${absolute > 0 ? "Higher" : "Lower"} ${noun} activity`;
  }
  if (percentValue === 0) return `${noun} unchanged`;
  return `${Math.abs(percentValue)}% ${percentValue > 0 ? "more" : "less"} ${noun}`;
}

function getComparisonWindow(filters: AnalyticsFilters = {}) {
  if (filters.from != null && filters.to != null && filters.to > filters.from) {
    const duration = filters.to - filters.from;
    return {
      mode: "selected-period" as const,
      label: "Previous matching period",
      current: { from: filters.from, to: filters.to },
      previous: { from: filters.from - duration, to: filters.from }
    };
  }

  const latest = sqlite.prepare("SELECT MAX(timestamp) AS latest FROM interactions WHERE timestamp IS NOT NULL").get() as
    | { latest: number | null }
    | undefined;
  const latestTimestamp = latest?.latest;
  if (latestTimestamp == null) {
    return {
      mode: "empty" as const,
      label: "Previous period",
      current: {},
      previous: {}
    };
  }

  const currentTo = latestTimestamp + 1;
  const currentFrom = currentTo - sevenDaysMs;
  return {
    mode: "latest-seven-days" as const,
    label: "Previous 7 days",
    current: { from: currentFrom, to: currentTo },
    previous: { from: currentFrom - sevenDaysMs, to: currentFrom }
  };
}

export function getUsageComparison(filters: AnalyticsFilters = {}): UsageComparison {
  const window = getComparisonWindow(filters);
  const current = comparisonSnapshot(getSummary(window.current));
  const previous = comparisonSnapshot(getSummary(window.previous));
  const delta = {
    totalTokens: current.totalTokens - previous.totalTokens,
    totalCost: current.totalCost - previous.totalCost,
    sessions: current.sessions - previous.sessions,
    interactions: current.interactions - previous.interactions,
    unknownCostInteractions: current.unknownCostInteractions - previous.unknownCostInteractions,
    totalTokensPercent: percentDelta(current.totalTokens, previous.totalTokens),
    totalCostPercent: percentDelta(current.totalCost, previous.totalCost),
    sessionsPercent: percentDelta(current.sessions, previous.sessions),
    interactionsPercent: percentDelta(current.interactions, previous.interactions),
    unknownCostInteractionsPercent: percentDelta(
      current.unknownCostInteractions,
      previous.unknownCostInteractions
    )
  };

  const headline =
    window.mode === "empty"
      ? "No previous usage to compare yet"
      : deltaLabel(delta.totalTokensPercent, delta.totalTokens, previous.totalTokens, "tokens");
  const detail =
    window.mode === "selected-period"
      ? "Compared with the immediately previous matching period."
      : window.mode === "latest-seven-days"
        ? "Compared with the seven days before the latest imported interaction."
        : "Run a scan after CLI sessions to build a local comparison baseline.";

  return {
    mode: window.mode,
    label: window.label,
    current,
    previous,
    delta,
    headline,
    detail
  };
}
