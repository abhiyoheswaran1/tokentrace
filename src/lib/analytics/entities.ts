import { buildDataConfidenceScore } from "@/src/lib/data-confidence";
import {
  number,
  numberMetadata,
  parseJson,
  rows,
  stringMetadata,
  timestampJoinCondition,
  timestampWhere,
  withQuery
} from "@/src/lib/analytics-query-helpers";
import type {
  AnalyticsFilters,
  ModelAnalyticsRow,
  ProjectAnalyticsRow,
  ScanTrustOptions,
  SessionRow,
  ToolComparisonRow
} from "@/src/lib/analytics-types";

export function getToolComparison(filters: AnalyticsFilters = {}): ToolComparisonRow[] {
  const filter = timestampWhere(filters, "i");
  const subFilter = timestampWhere(filters, "i2", "AND");
  return rows<
    ToolComparisonRow & {
      inputTokens: number;
      outputTokens: number;
      cachedTokens: number;
    }
  >(
    `SELECT
      t.name AS tool,
      p.name AS provider,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
      COALESCE(SUM(i.cost), 0) AS cost,
      COUNT(DISTINCT s.id) AS sessions,
      COUNT(*) AS interactions,
      COALESCE((
        SELECT m2.name
        FROM interactions i2 INDEXED BY interactions_session_analytics_idx
        JOIN sessions s2 ON s2.id = i2.session_id
        LEFT JOIN models m2 ON m2.id = i2.model_id
        WHERE s2.tool_id = t.id
        ${subFilter.sql}
        GROUP BY m2.id
        ORDER BY SUM(COALESCE(i2.cost, 0)) DESC
        LIMIT 1
      ), 'Unknown') AS mostExpensiveModel
     FROM interactions i INDEXED BY interactions_session_analytics_idx
     JOIN sessions s ON s.id = i.session_id
     JOIN tools t ON t.id = s.tool_id
     JOIN providers p ON p.id = t.provider_id
     ${filter.sql}
     GROUP BY t.id, p.id
     ORDER BY totalTokens DESC`,
    ...subFilter.params,
    ...filter.params
  ).map((row) => ({
    tool: row.tool,
    provider: row.provider,
    totalTokens: number(row.totalTokens),
    cost: number(row.cost),
    sessions: number(row.sessions),
    interactions: number(row.interactions),
    averageTokensPerSession: row.sessions ? number(row.totalTokens) / number(row.sessions) : 0,
    averageTokensPerInteraction: row.interactions ? number(row.totalTokens) / number(row.interactions) : 0,
    outputInputRatio: row.inputTokens ? number(row.outputTokens) / number(row.inputTokens) : 0,
    cacheEfficiency:
      row.inputTokens + row.cachedTokens
        ? number(row.cachedTokens) / (number(row.inputTokens) + number(row.cachedTokens))
        : 0,
    mostExpensiveModel: row.mostExpensiveModel
  }));
}

export function getModelRows(filters: AnalyticsFilters = {}): ModelAnalyticsRow[] {
  const filter = timestampWhere(filters, "i");
  const baseRows = rows<
    ModelAnalyticsRow & {
      providerId: string;
      inputPrice: number | null;
      outputPrice: number | null;
    }
  >(
    `SELECT
      COALESCE(m.name, 'unknown') AS model,
      p.name AS provider,
      p.id AS providerId,
      m.input_token_price AS inputPrice,
      m.output_token_price AS outputPrice,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cost), 0) AS cost,
      COUNT(*) AS interactions,
      COALESCE(AVG(i.output_tokens), 0) AS averageOutputTokens
     FROM interactions i INDEXED BY interactions_analytics_cover_idx
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = m.provider_id
     ${filter.sql}
     GROUP BY m.id
     ORDER BY totalTokens DESC`,
    ...filter.params
  );

  const configuredPrices = rows<{
    providerId: string;
    name: string;
    combinedPrice: number;
  }>(
    `SELECT provider_id AS providerId, name,
      COALESCE(input_token_price, 999999) + COALESCE(output_token_price, 999999) AS combinedPrice
     FROM models
     WHERE input_token_price IS NOT NULL AND output_token_price IS NOT NULL`
  );

  return baseRows.map((row) => {
    const currentPrice = number(row.inputPrice) + number(row.outputPrice);
    const cheaper = configuredPrices
      .filter((candidate) => candidate.providerId === row.providerId)
      .filter((candidate) => candidate.name !== row.model)
      .filter((candidate) => !currentPrice || candidate.combinedPrice < currentPrice)
      .sort((a, b) => a.combinedPrice - b.combinedPrice)[0];
    const tokenEfficiency = row.inputTokens
      ? number(row.outputTokens) / number(row.inputTokens)
      : number(row.outputTokens);

    return {
      model: row.model,
      provider: row.provider ?? "Unknown",
      totalTokens: number(row.totalTokens),
      inputTokens: number(row.inputTokens),
      outputTokens: number(row.outputTokens),
      cost: number(row.cost),
      interactions: number(row.interactions),
      averageOutputTokens: number(row.averageOutputTokens),
      tokenEfficiency,
      suggestedAlternative: cheaper?.name ?? null,
      overuseFlag:
        number(row.cost) > 0 && cheaper && number(row.totalTokens) > 25_000
          ? "Cheaper configured alternative exists"
          : null
    };
  });
}

export function getProjectRows(filters: AnalyticsFilters = {}): ProjectAnalyticsRow[] {
  const filter = timestampJoinCondition(filters, "i");
  return rows<
    ProjectAnalyticsRow & {
      inputTokens: number;
      outputTokens: number;
      exactTokenInteractions: number;
      tokenizerEstimateInteractions: number;
      simpleEstimateInteractions: number;
      unknownTokenInteractions: number;
      pricedCostInteractions: number;
      unknownCostInteractions: number;
    }
  >(
    `SELECT
      pr.id,
      pr.name AS project,
      pr.path,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cost), 0) AS cost,
      COUNT(DISTINCT s.id) AS sessions,
      COUNT(*) AS interactions,
      COALESCE(SUM(CASE WHEN i.token_confidence = 'exact' THEN 1 ELSE 0 END), 0) AS exactTokenInteractions,
      COALESCE(SUM(CASE WHEN i.token_confidence = 'tokenizer estimate' THEN 1 ELSE 0 END), 0) AS tokenizerEstimateInteractions,
      COALESCE(SUM(CASE WHEN i.token_confidence IN ('simple estimate', 'high-confidence estimate', 'low-confidence estimate') THEN 1 ELSE 0 END), 0) AS simpleEstimateInteractions,
      COALESCE(SUM(CASE WHEN i.token_confidence = 'unknown' THEN 1 ELSE 0 END), 0) AS unknownTokenInteractions,
      COALESCE(SUM(CASE WHEN i.cost IS NOT NULL THEN 1 ELSE 0 END), 0) AS pricedCostInteractions,
      COALESCE(SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END), 0) AS unknownCostInteractions,
      MAX(i.timestamp) AS lastUsedAt
     FROM projects pr
     JOIN sessions s ON s.project_id = pr.id
     JOIN interactions i INDEXED BY interactions_session_analytics_idx ON i.session_id = s.id ${filter.sql}
     GROUP BY pr.id
     ORDER BY totalTokens DESC`,
    ...filter.params
  ).map((row) => {
    const confidence = buildDataConfidenceScore({
      totalInteractions: number(row.interactions),
      exactTokenInteractions: number(row.exactTokenInteractions),
      tokenizerEstimateInteractions: number(row.tokenizerEstimateInteractions),
      simpleEstimateInteractions: number(row.simpleEstimateInteractions),
      unknownTokenInteractions: number(row.unknownTokenInteractions),
      pricedCostInteractions: number(row.pricedCostInteractions),
      unknownCostInteractions: number(row.unknownCostInteractions),
      parserConfidence: null,
      scanFreshness: "fresh"
    });

    return {
      id: row.id,
      project: row.project,
      path: row.path,
      totalTokens: number(row.totalTokens),
      cost: number(row.cost),
      sessions: number(row.sessions),
      interactions: number(row.interactions),
      outputInputRatio: row.inputTokens ? number(row.outputTokens) / number(row.inputTokens) : 0,
      lastUsedAt: row.lastUsedAt,
      confidenceScore: confidence.score,
      confidenceGrade: confidence.grade
    };
  });
}

export function getSessions(
  filters: AnalyticsFilters = {},
  detail: NonNullable<ScanTrustOptions["sessionDetail"]> = "full"
): SessionRow[] {
  const filter = timestampJoinCondition(filters, "i");
  const pricingModelSql =
    detail === "full"
      ? `(
        SELECT m2.name
        FROM interactions i2 INDEXED BY interactions_session_analytics_idx
        LEFT JOIN models m2 ON m2.id = i2.model_id
        WHERE i2.session_id = s.id
        GROUP BY m2.id
        ORDER BY SUM(i2.total_tokens) DESC
        LIMIT 1
      )`
      : "NULL";
  const parserColumns =
    detail === "full"
      ? `sf.parser AS parser,
      sf.status AS parserStatus,
      sf.raw_metadata AS parserRawMetadata,`
      : `NULL AS parser,
      NULL AS parserStatus,
      NULL AS parserRawMetadata,`;
  const parserJoin =
    detail === "full"
      ? `LEFT JOIN scan_files sf ON sf.id = (
       SELECT sf2.id
       FROM scan_files sf2
       JOIN scan_runs sr2 ON sr2.id = sf2.scan_run_id
       WHERE sf2.path = s.source_file
       ORDER BY sr2.started_at DESC
       LIMIT 1
     )`
      : "";
  return rows<
    Omit<SessionRow, "costEstimated" | "estimatedTokens" | "confidenceGrade" | "confidenceScore"> & {
      costEstimated: 0 | 1;
      estimatedTokens: 0 | 1;
      parserRawMetadata: string | null;
      pricingModel: string | null;
      exactTokenInteractions: number;
      tokenizerEstimateInteractions: number;
      simpleEstimateInteractions: number;
      unknownTokenInteractions: number;
      pricedCostInteractions: number;
      unknownCostInteractions: number;
    }
  >(
    `SELECT
      s.id,
      s.started_at AS startedAt,
      s.ended_at AS endedAt,
      s.title,
      s.source_file AS sourceFile,
      t.name AS tool,
      provider.name AS provider,
      pr.name AS project,
      pr.path AS projectPath,
      COALESCE(group_concat(DISTINCT m.name), 'unknown') AS models,
      ${pricingModelSql} AS pricingModel,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
      COALESCE(SUM(i.reasoning_tokens), 0) AS reasoningTokens,
      SUM(i.cost) AS cost,
      MAX(i.cost_estimated) AS costEstimated,
      MAX(i.estimated_tokens) AS estimatedTokens,
      CASE
        WHEN SUM(CASE WHEN i.token_confidence = 'unknown' THEN 1 ELSE 0 END) > 0 THEN 'unknown'
        WHEN SUM(CASE WHEN i.token_confidence = 'simple estimate' THEN 1 ELSE 0 END) > 0 THEN 'simple estimate'
        WHEN SUM(CASE WHEN i.token_confidence = 'low-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'low-confidence estimate'
        WHEN SUM(CASE WHEN i.token_confidence = 'tokenizer estimate' THEN 1 ELSE 0 END) > 0 THEN 'tokenizer estimate'
        WHEN SUM(CASE WHEN i.token_confidence = 'high-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'high-confidence estimate'
        ELSE 'exact'
      END AS tokenConfidence,
      COALESCE(SUM(CASE WHEN i.token_confidence = 'exact' THEN 1 ELSE 0 END), 0) AS exactTokenInteractions,
      COALESCE(SUM(CASE WHEN i.token_confidence = 'tokenizer estimate' THEN 1 ELSE 0 END), 0) AS tokenizerEstimateInteractions,
      COALESCE(SUM(CASE WHEN i.token_confidence IN ('simple estimate', 'high-confidence estimate', 'low-confidence estimate') THEN 1 ELSE 0 END), 0) AS simpleEstimateInteractions,
      COALESCE(SUM(CASE WHEN i.token_confidence = 'unknown' THEN 1 ELSE 0 END), 0) AS unknownTokenInteractions,
      COALESCE(SUM(CASE WHEN i.cost IS NOT NULL THEN 1 ELSE 0 END), 0) AS pricedCostInteractions,
      COALESCE(SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END), 0) AS unknownCostInteractions,
      ${parserColumns}
      COUNT(*) AS interactionCount,
      CASE WHEN s.started_at IS NOT NULL AND s.ended_at IS NOT NULL THEN s.ended_at - s.started_at ELSE NULL END AS durationMs
     FROM sessions s
     JOIN tools t ON t.id = s.tool_id
     JOIN providers provider ON provider.id = t.provider_id
     LEFT JOIN projects pr ON pr.id = s.project_id
     JOIN interactions i INDEXED BY interactions_session_analytics_idx ON i.session_id = s.id ${filter.sql}
     LEFT JOIN models m ON m.id = i.model_id
     ${parserJoin}
     GROUP BY s.id
     ORDER BY COALESCE(s.started_at, 0) DESC
     LIMIT 1000`,
    ...filter.params
  ).map((row) => {
    const parserMetadata = parseJson<Record<string, unknown>>(row.parserRawMetadata, {});
    const pricingModel = row.pricingModel && row.pricingModel !== "unknown" ? row.pricingModel : null;
    const parserConfidence = numberMetadata(parserMetadata, "confidence");
    const confidence = buildDataConfidenceScore({
      totalInteractions: number(row.interactionCount),
      exactTokenInteractions: number(row.exactTokenInteractions),
      tokenizerEstimateInteractions: number(row.tokenizerEstimateInteractions),
      simpleEstimateInteractions: number(row.simpleEstimateInteractions),
      unknownTokenInteractions: number(row.unknownTokenInteractions),
      pricedCostInteractions: number(row.pricedCostInteractions),
      unknownCostInteractions: number(row.unknownCostInteractions),
      parserConfidence,
      scanFreshness: "fresh"
    });
    return {
      ...row,
      totalTokens: number(row.totalTokens),
      inputTokens: number(row.inputTokens),
      outputTokens: number(row.outputTokens),
      cachedTokens: number(row.cachedTokens),
      reasoningTokens: number(row.reasoningTokens),
      cost: row.cost == null ? null : number(row.cost),
      costEstimated: Boolean(row.costEstimated),
      estimatedTokens: Boolean(row.estimatedTokens),
      parserConfidence,
      parserReason: stringMetadata(parserMetadata, "reason"),
      sourceHref: withQuery("/sessions", { source: row.sourceFile }),
      parserHref: withQuery("/parser-debug", { source: row.sourceFile }),
      pricingHref: pricingModel ? withQuery("/pricing", { model: pricingModel }) : null,
      interactionCount: number(row.interactionCount),
      confidenceScore: confidence.score,
      confidenceGrade: confidence.grade
    };
  });
}
