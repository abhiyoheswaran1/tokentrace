import {
  fillMissingTrendDays,
  number,
  rows,
  timestampWhere
} from "@/src/lib/analytics-query-helpers";
import type { AnalyticsFilters, TrendPoint } from "@/src/lib/analytics-types";

export function getTrends(filters: AnalyticsFilters = {}): TrendPoint[] {
  const filter = timestampWhere(filters, "i", "AND");
  const points = rows<TrendPoint>(
    `SELECT
      local_date_key(i.timestamp) AS date,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
      COALESCE(SUM(i.reasoning_tokens), 0) AS reasoningTokens,
      COALESCE(SUM(i.cost), 0) AS cost
     FROM interactions i INDEXED BY interactions_analytics_cover_idx
     WHERE i.timestamp IS NOT NULL
     ${filter.sql}
     GROUP BY date
     ORDER BY date ASC`,
    ...filter.params
  ).map((row) => ({
    ...row,
    totalTokens: number(row.totalTokens),
    inputTokens: number(row.inputTokens),
    outputTokens: number(row.outputTokens),
    cachedTokens: number(row.cachedTokens),
    reasoningTokens: number(row.reasoningTokens),
    cost: number(row.cost)
  }));
  return fillMissingTrendDays(points, filters);
}
