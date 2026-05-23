import { prepareCached } from "@/src/db/prepared";
import type { AnalyticsFilters } from "@/src/lib/analytics";
import {
  primaryRepairAction,
  repairImpact,
  resolvedStateLabel,
  secondaryRepairActions
} from "@/src/lib/repair-actions";
import { legacyRepairKey, repairItemHref, repairKey, withQuery } from "@/src/lib/unknown-cost-repair/keys";
import { emptyReview, listUnknownCostRepairs } from "@/src/lib/unknown-cost-repair/reviews";
import { aliasSuggestion, buildPricedModelLookup } from "@/src/lib/unknown-cost-repair/suggestions";
import type {
  UnknownCostRepairWorkbench,
  UnknownCostRepairWorkbenchGroup,
  UnknownCostRepairWorkbenchOptions
} from "@/src/lib/unknown-cost-repair/types";

function number(value: unknown) {
  return Number(value ?? 0);
}

function rows<T>(sql: string, ...params: unknown[]) {
  return prepareCached(sql).all(...params) as T[];
}

function interactionDateFilter(filters: AnalyticsFilters = {}, alias = "i") {
  const clauses: string[] = [];
  const params: number[] = [];
  if (typeof filters.from === "number" && Number.isFinite(filters.from)) {
    clauses.push(`${alias}.timestamp >= ?`);
    params.push(filters.from);
  }
  if (typeof filters.to === "number" && Number.isFinite(filters.to)) {
    clauses.push(`${alias}.timestamp < ?`);
    params.push(filters.to);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params
  };
}

function queryUnknownCostRows(filters: AnalyticsFilters) {
  const dateFilter = interactionDateFilter(filters);
  return rows<{
    cause: UnknownCostRepairWorkbenchGroup["cause"];
    model: string;
    providerId: string;
    provider: string;
    tool: string;
    sourceFile: string;
    interactions: number;
    sessions: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
  }>(
    `SELECT
      CASE
        WHEN (m.id IS NOT NULL AND p.id IS NULL) OR tool_provider.id IS NULL THEN 'missing provider'
        WHEN lower(COALESCE(m.name, 'unknown')) = 'unknown' THEN 'missing model'
        WHEN COALESCE(i.total_tokens, 0) <= 0 THEN 'missing token count'
        WHEN lower(COALESCE(m.name, 'unknown')) <> 'unknown'
          AND COALESCE(i.total_tokens, 0) > 0
          AND (m.input_token_price IS NULL OR m.output_token_price IS NULL)
          THEN 'missing pricing'
        WHEN EXISTS (
          SELECT 1
          FROM scan_files sf
          WHERE sf.path = s.source_file
            AND sf.status IN ('imported_with_errors', 'failed', 'skipped_unknown')
        )
          THEN 'parser review'
        ELSE 'other'
      END AS cause,
      COALESCE(m.name, 'unknown') AS model,
      COALESCE(p.id, tool_provider.id, 'unknown-provider') AS providerId,
      COALESCE(p.name, tool_provider.name, 'Unknown') AS provider,
      t.name AS tool,
      s.source_file AS sourceFile,
      COUNT(*) AS interactions,
      COUNT(DISTINCT s.id) AS sessions,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
      COALESCE(SUM(i.reasoning_tokens), 0) AS reasoningTokens
     FROM interactions i INDEXED BY interactions_cost_repair_idx
     JOIN sessions s ON s.id = i.session_id
     JOIN tools t ON t.id = s.tool_id
     LEFT JOIN providers tool_provider ON tool_provider.id = t.provider_id
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE i.cost IS NULL
      ${dateFilter.sql}
     GROUP BY cause, providerId, t.id, m.id, s.source_file
     ORDER BY
      CASE cause
        WHEN 'missing provider' THEN 0
        WHEN 'missing pricing' THEN 0
        WHEN 'missing model' THEN 1
        WHEN 'missing token count' THEN 2
        WHEN 'parser review' THEN 3
        ELSE 3
      END,
      interactions DESC,
      totalTokens DESC,
      sourceFile ASC`,
    ...dateFilter.params
  );
}

function buildUnknownCostRepairGroups(filters: AnalyticsFilters): UnknownCostRepairWorkbenchGroup[] {
  const { pricedByProvider, displayByProviderModel } = buildPricedModelLookup();
  const reviewRows = listUnknownCostRepairs();
  const reviewsByKey = new Map(reviewRows.map((review) => [review.key, review]));
  const reviewFor = (key: string, legacyKey: string) => reviewsByKey.get(key) ?? reviewsByKey.get(legacyKey) ?? emptyReview(key);

  return queryUnknownCostRows(filters).map((row) => {
    const cause = row.cause;
    const base = {
      cause,
      provider: row.provider,
      tool: row.tool,
      model: row.model,
      sourceFile: row.sourceFile
    };
    const key = repairKey(base);
    const legacyKey = legacyRepairKey(base);
    const review = reviewFor(key, legacyKey);
    const suggestion = aliasSuggestion({
      cause,
      model: row.model,
      providerId: row.providerId,
      pricedByProvider,
      displayByProviderModel
    });
    const parserHref = withQuery("/parser-debug", { source: row.sourceFile });
    const pricingHref = cause === "missing pricing" && row.model !== "unknown"
      ? withQuery("/pricing", { model: row.model })
      : null;
    const sourceHref = withQuery("/sessions", { source: row.sourceFile, cost: "unknown" });
    const itemHref = repairItemHref(key);
    const actionContext = {
      ...base,
      itemHref,
      parserHref,
      pricingHref,
      sourceHref
    };
    const primaryAction = primaryRepairAction(actionContext);

    return {
      key,
      ...base,
      state: review.status,
      note: review.notes,
      suggestedModel: suggestion.suggestedModel,
      interactions: number(row.interactions),
      sessions: number(row.sessions),
      totalTokens: number(row.totalTokens),
      inputTokens: number(row.inputTokens),
      outputTokens: number(row.outputTokens),
      cachedTokens: number(row.cachedTokens),
      reasoningTokens: number(row.reasoningTokens),
      review: {
        status: review.status,
        notes: review.notes,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      },
      suggestion,
      itemHref,
      repairHref: pricingHref ?? parserHref,
      sourceHref,
      sessionHref: sourceHref,
      sessionsHref: sourceHref,
      parserHref,
      pricingHref,
      primaryAction,
      secondaryActions: secondaryRepairActions(actionContext, primaryAction),
      impact: repairImpact(cause),
      resolvedStateLabel: resolvedStateLabel(cause)
    };
  });
}

function summarizeGroups(groups: UnknownCostRepairWorkbenchGroup[]) {
  return groups.reduce<UnknownCostRepairWorkbench["summary"]>(
    (current, group) => {
      current.totalInteractions += group.interactions;
      if (group.review.status === "needs-parser-review") current.needsParserReview += 1;
      else current[group.review.status] += 1;
      return current;
    },
    {
      unresolved: 0,
      needsParserReview: 0,
      ignored: 0,
      resolved: 0,
      totalInteractions: 0
    }
  );
}

function applyWorkbenchLimit(
  allGroups: UnknownCostRepairWorkbenchGroup[],
  options: UnknownCostRepairWorkbenchOptions
) {
  const requestedLimit = typeof options.limit === "number" && Number.isFinite(options.limit)
    ? Math.max(0, Math.floor(options.limit))
    : null;
  let groups = requestedLimit === null ? allGroups : allGroups.slice(0, requestedLimit);
  const requiredKey = options.requiredKey?.trim();

  if (requiredKey && !groups.some((group) => group.key === requiredKey || legacyRepairKey(group) === requiredKey)) {
    const requiredGroup = allGroups.find((group) => group.key === requiredKey || legacyRepairKey(group) === requiredKey);
    if (requiredGroup) {
      groups = requestedLimit === null
        ? [requiredGroup, ...groups.filter((group) => group.key !== requiredGroup.key)]
        : [requiredGroup, ...groups.filter((group) => group.key !== requiredGroup.key)].slice(0, requestedLimit);
    }
  }

  return groups;
}

export function buildUnknownCostRepairWorkbench(
  filters: AnalyticsFilters = {},
  options: UnknownCostRepairWorkbenchOptions = {}
): UnknownCostRepairWorkbench {
  const allGroups = buildUnknownCostRepairGroups(filters);
  const groups = applyWorkbenchLimit(allGroups, options);

  return {
    summary: summarizeGroups(allGroups),
    groups,
    totalGroups: allGroups.length,
    shownGroups: groups.length,
    hasMoreGroups: groups.length < allGroups.length
  };
}

export function findWorkbenchGroupByKey(key: string): UnknownCostRepairWorkbenchGroup | null {
  return buildUnknownCostRepairWorkbench().groups.find((group) => (
    group.key === key || legacyRepairKey(group) === key
  )) ?? null;
}
