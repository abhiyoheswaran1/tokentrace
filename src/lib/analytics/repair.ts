import { modelNameCandidates } from "@/src/lib/model-aliases";
import {
  number,
  rows,
  timestampJoinCondition,
  withQuery
} from "@/src/lib/analytics-query-helpers";
import type {
  AnalyticsFilters,
  ModelAliasSuggestion,
  UnknownCostQueueRow
} from "@/src/lib/analytics-types";

export function getUnknownCostQueue(filters: AnalyticsFilters = {}): UnknownCostQueueRow[] {
  const filter = timestampJoinCondition(filters, "i");
  return rows<UnknownCostQueueRow>(
    `SELECT
      CASE
        WHEN lower(COALESCE(m.name, 'unknown')) = 'unknown' THEN 'missing model'
        WHEN COALESCE(i.total_tokens, 0) <= 0 THEN 'missing token count'
        WHEN lower(COALESCE(m.name, 'unknown')) <> 'unknown'
          AND COALESCE(i.total_tokens, 0) > 0
          AND (m.input_token_price IS NULL OR m.output_token_price IS NULL)
          THEN 'missing pricing'
        ELSE 'other'
      END AS cause,
      COALESCE(m.name, 'unknown') AS model,
      COALESCE(p.name, 'Unknown') AS provider,
      t.name AS tool,
      s.source_file AS sourceFile,
      COUNT(*) AS interactions,
      COUNT(DISTINCT s.id) AS sessions,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      '' AS repairHref,
      '' AS sourceHref,
      '' AS parserHref,
      '' AS pricingHref
     FROM interactions i INDEXED BY interactions_session_analytics_idx
     JOIN sessions s ON s.id = i.session_id ${filter.sql}
     JOIN tools t ON t.id = s.tool_id
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE i.cost IS NULL
     GROUP BY cause, m.id, t.id, s.source_file
     ORDER BY
      CASE cause
        WHEN 'missing pricing' THEN 0
        WHEN 'missing model' THEN 1
        WHEN 'missing token count' THEN 2
        ELSE 3
      END,
      interactions DESC,
      totalTokens DESC
     LIMIT 20`,
    ...filter.params
  ).map((row) => {
    const parserHref = withQuery("/parser-debug", { source: row.sourceFile });
    const sourceHref = withQuery("/sessions", { source: row.sourceFile });
    const pricingHref =
      row.cause === "missing pricing" && row.model !== "unknown"
        ? withQuery("/pricing", { model: row.model })
        : null;
    return {
      ...row,
      repairHref: pricingHref ?? parserHref,
      sourceHref,
      parserHref,
      pricingHref,
      interactions: number(row.interactions),
      sessions: number(row.sessions),
      totalTokens: number(row.totalTokens)
    };
  });
}

export function getModelAliasSuggestions(filters: AnalyticsFilters = {}): ModelAliasSuggestion[] {
  const filter = timestampJoinCondition(filters, "i");
  const pricedRows = rows<{ providerId: string; model: string }>(
    `SELECT provider_id AS providerId, name AS model
     FROM models
     WHERE input_token_price IS NOT NULL AND output_token_price IS NOT NULL`
  );
  const pricedByProvider = new Map<string, Set<string>>();
  pricedRows.forEach((row) => {
    const bucket = pricedByProvider.get(row.providerId) ?? new Set<string>();
    bucket.add(row.model.toLowerCase());
    pricedByProvider.set(row.providerId, bucket);
  });
  const pricedName = new Map<string, string>();
  pricedRows.forEach((row) => {
    pricedName.set(`${row.providerId}:${row.model.toLowerCase()}`, row.model);
  });

  const suggestions: ModelAliasSuggestion[] = rows<
    Omit<ModelAliasSuggestion, "suggestedModel" | "confidence" | "reason" | "repairHref" | "parserHref"> & {
      providerId: string;
    }
  >(
    `SELECT
      COALESCE(m.name, 'unknown') AS model,
      COALESCE(p.id, tool_provider.id) AS providerId,
      COALESCE(p.name, tool_provider.name) AS provider,
      t.name AS tool,
      MIN(s.source_file) AS sourceFile,
      COUNT(*) AS interactions,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens
     FROM interactions i INDEXED BY interactions_session_analytics_idx
     JOIN sessions s ON s.id = i.session_id ${filter.sql}
     JOIN tools t ON t.id = s.tool_id
     JOIN providers tool_provider ON tool_provider.id = t.provider_id
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE i.cost IS NULL
     GROUP BY model, providerId, t.id
     ORDER BY interactions DESC, totalTokens DESC
     LIMIT 40`,
    ...filter.params
  ).map((row): ModelAliasSuggestion => {
    const baseRow = {
      model: row.model,
      provider: row.provider,
      tool: row.tool,
      sourceFile: row.sourceFile
    };
    const normalizedModel = row.model.trim().toLowerCase();
    const parserHref = withQuery("/parser-debug", { source: row.sourceFile });
    const repairHref = withQuery("/pricing", { model: row.model });
    const candidates = modelNameCandidates(row.model).slice(1);
    const pricedSet = pricedByProvider.get(row.providerId) ?? new Set<string>();
    const suggestedModel =
      candidates
        .map((candidate) => candidate.toLowerCase())
        .find((candidate) => pricedSet.has(candidate)) ?? null;
    const suggestedDisplay = suggestedModel
      ? pricedName.get(`${row.providerId}:${suggestedModel}`) ?? suggestedModel
      : null;

    if (normalizedModel === "unknown") {
      return {
        ...baseRow,
        interactions: number(row.interactions),
        totalTokens: number(row.totalTokens),
        suggestedModel: null,
        confidence: "low",
        reason: "The parser did not extract a model name. Inspect the source metadata before adding pricing.",
        repairHref: parserHref,
        parserHref
      };
    }

    if (normalizedModel === "<synthetic>" || normalizedModel === "synthetic") {
      return {
        ...baseRow,
        interactions: number(row.interactions),
        totalTokens: number(row.totalTokens),
        suggestedModel: null,
        confidence: "medium",
        reason: "Synthetic rows should inherit the real transcript model only after parser review.",
        repairHref: parserHref,
        parserHref
      };
    }

    if (suggestedDisplay) {
      return {
        ...baseRow,
        interactions: number(row.interactions),
        totalTokens: number(row.totalTokens),
        suggestedModel: suggestedDisplay,
        confidence: "high",
        reason: "This observed model name matches a priced base model after removing a dated provider suffix.",
        repairHref,
        parserHref
      };
    }

    return {
      ...baseRow,
      interactions: number(row.interactions),
      totalTokens: number(row.totalTokens),
      suggestedModel: null,
      confidence: "low",
      reason: "No priced alias candidate exists yet. Add an explicit price row or verify the model name from parser evidence.",
      repairHref,
      parserHref
    };
  });

  const confidenceRank = { high: 0, medium: 1, low: 2 };
  return suggestions
    .sort((a, b) => confidenceRank[a.confidence] - confidenceRank[b.confidence] || b.totalTokens - a.totalTokens)
    .slice(0, 8);
}
