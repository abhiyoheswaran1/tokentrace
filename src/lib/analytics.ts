import { sqlite } from "@/src/db/client";
import {
  buildScanHealth,
  type ScanConfidenceSummary,
  type ScanHealth
} from "@/src/lib/scan-health";
import { modelNameCandidates } from "@/src/lib/model-aliases";
import { buildLocalRecommendations, type LocalRecommendation } from "@/src/lib/recommendations";
import { getUsageGuardrailProgress, type UsageGuardrailProgress } from "@/src/lib/usage-guardrails";
import { buildReviewQueue, type ReviewQueueItem } from "@/src/lib/review-queue";
import { buildSessionComparisons, type SessionComparisonRow } from "@/src/lib/session-comparison";
import { buildProjectSignals, type ProjectSignalRow } from "@/src/lib/project-signals";
import { evidenceHref, type EvidenceMetric } from "@/src/lib/evidence-trail";
import { buildDataConfidenceScore, type DataConfidenceGrade, type DataConfidenceScore } from "@/src/lib/data-confidence";

export type TrendPoint = {
  date: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  cost: number;
};

export type SummaryMetrics = {
  totalTokens: number;
  nonCachedTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  totalCost: number;
  exactCost: number;
  estimatedCost: number;
  unknownCostInteractions: number;
  sessions: number;
  interactions: number;
  mostUsedTool: string;
  mostUsedModel: string;
};

export type EvidenceLinkMap = Record<EvidenceMetric, string>;

export type UsageComparisonSnapshot = Pick<
  SummaryMetrics,
  "totalTokens" | "totalCost" | "sessions" | "interactions" | "unknownCostInteractions"
>;

export type UsageComparison = {
  mode: "selected-period" | "latest-seven-days" | "empty";
  label: string;
  current: UsageComparisonSnapshot;
  previous: UsageComparisonSnapshot;
  delta: UsageComparisonSnapshot & {
    totalTokensPercent: number | null;
    totalCostPercent: number | null;
    sessionsPercent: number | null;
    interactionsPercent: number | null;
    unknownCostInteractionsPercent: number | null;
  };
  headline: string;
  detail: string;
};

export type ToolComparisonRow = {
  tool: string;
  provider: string;
  totalTokens: number;
  cost: number;
  sessions: number;
  interactions: number;
  averageTokensPerSession: number;
  averageTokensPerInteraction: number;
  outputInputRatio: number;
  cacheEfficiency: number;
  mostExpensiveModel: string;
};

export type ModelAnalyticsRow = {
  model: string;
  provider: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  interactions: number;
  averageOutputTokens: number;
  tokenEfficiency: number;
  suggestedAlternative: string | null;
  overuseFlag: string | null;
};

export type ProjectAnalyticsRow = {
  id: string;
  project: string;
  path: string;
  totalTokens: number;
  cost: number;
  sessions: number;
  interactions: number;
  outputInputRatio: number;
  lastUsedAt: number | null;
  confidenceScore?: number;
  confidenceGrade?: DataConfidenceGrade;
};

export type SessionRow = {
  id: string;
  startedAt: number | null;
  endedAt: number | null;
  title: string | null;
  sourceFile: string;
  tool: string;
  provider: string;
  project: string;
  projectPath: string;
  models: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  cost: number | null;
  costEstimated: boolean;
  estimatedTokens: boolean;
  tokenConfidence: string;
  parser: string | null;
  parserStatus: string | null;
  parserConfidence: number | null;
  parserReason: string | null;
  sourceHref: string;
  parserHref: string;
  pricingHref: string | null;
  interactionCount: number;
  durationMs: number | null;
  confidenceScore?: number;
  confidenceGrade?: DataConfidenceGrade;
};

export type Insight = {
  id: string;
  severity: "high" | "medium" | "low";
  problem: string;
  evidence: string;
  savingOpportunity: string;
  recommendation: string;
};

export type UnknownCostQueueRow = {
  cause: "missing model" | "missing pricing" | "missing token count" | "other";
  model: string;
  provider: string;
  tool: string;
  sourceFile: string;
  interactions: number;
  sessions: number;
  totalTokens: number;
  repairHref: string;
  sourceHref: string;
  parserHref: string;
  pricingHref: string | null;
};

export type ModelAliasSuggestion = {
  model: string;
  provider: string;
  tool: string;
  sourceFile: string;
  interactions: number;
  totalTokens: number;
  suggestedModel: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
  repairHref: string;
  parserHref: string;
};

export type DebugScanFile = {
  id: string;
  scanRunId: string;
  path: string;
  modifiedTime: number | null;
  sizeBytes: number;
  fileHash: string | null;
  parser: string | null;
  status: string;
  recordsImported: number;
  warnings: string[];
  errors: string[];
  rawMetadata: Record<string, unknown>;
  scanStartedAt: number;
};

export type DebugScanRun = {
  id: string;
  startedAt: number;
  completedAt: number | null;
  filesScanned: number;
  recordsImported: number;
  warnings: string[];
  errors: string[];
};

export type ScanTrustData = {
  scanRuns: DebugScanRun[];
  scanFiles: DebugScanFile[];
  confidence: ScanConfidenceSummary;
  pricedModelCount: number;
  health: ScanHealth;
};

export type ScanTrustOptions = {
  scanFileScope?: "all" | "recent" | "latest" | "none";
  sessionDetail?: "full" | "summary";
};

export type AnalyticsData = {
  summary: SummaryMetrics;
  scanTrust: ScanTrustData;
  dataConfidence: DataConfidenceScore;
  evidenceLinks: EvidenceLinkMap;
  comparison: UsageComparison;
  trends: TrendPoint[];
  tools: ToolComparisonRow[];
  models: ModelAnalyticsRow[];
  projects: ProjectAnalyticsRow[];
  sessions: SessionRow[];
  unknownCosts: UnknownCostQueueRow[];
  modelAliasSuggestions: ModelAliasSuggestion[];
  usageGuardrails: UsageGuardrailProgress;
  reviewQueue: ReviewQueueItem[];
  sessionComparisons: SessionComparisonRow[];
  projectSignals: ProjectSignalRow[];
  recommendations: LocalRecommendation[];
  insights: Insight[];
};

export type AnalyticsFilters = {
  from?: number | null;
  to?: number | null;
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function dateStringFromTimestamp(timestamp: number) {
  const date = new Date(timestamp);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function addCalendarDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return dateStringFromTimestamp(date.getTime());
}

function emptyTrendPoint(date: string): TrendPoint {
  return {
    date,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    reasoningTokens: 0,
    cost: 0
  };
}

function trendBounds(points: TrendPoint[], filters: AnalyticsFilters) {
  const firstDataDate = points[0]?.date;
  const lastDataDate = points.at(-1)?.date;
  const fromDate = filters.from != null ? dateStringFromTimestamp(filters.from) : firstDataDate;
  const toExclusiveDate =
    filters.to != null
      ? addCalendarDays(dateStringFromTimestamp(filters.to - 1), 1)
      : lastDataDate
        ? addCalendarDays(lastDataDate, 1)
        : null;

  if (!fromDate || !toExclusiveDate || fromDate >= toExclusiveDate) return null;
  return { fromDate, toExclusiveDate };
}

function fillMissingTrendDays(points: TrendPoint[], filters: AnalyticsFilters) {
  const bounds = trendBounds(points, filters);
  if (!bounds) return [];

  const byDate = new Map(points.map((point) => [point.date, point]));
  const filled: TrendPoint[] = [];
  for (
    let date = bounds.fromDate;
    date < bounds.toExclusiveDate;
    date = addCalendarDays(date, 1)
  ) {
    filled.push(byDate.get(date) ?? emptyTrendPoint(date));
  }
  return filled;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value) || (value && typeof value === "object")) return value as T;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rows<T>(sql: string, ...params: unknown[]) {
  return sqlite.prepare(sql).all(...params) as T[];
}

function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function stringMetadata(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

function numberMetadata(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

function timestampWhere(filters: AnalyticsFilters = {}, alias = "i", prefix = "WHERE") {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.from != null) {
    clauses.push(`${alias}.timestamp >= ?`);
    params.push(filters.from);
  }
  if (filters.to != null) {
    clauses.push(`${alias}.timestamp < ?`);
    params.push(filters.to);
  }
  return {
    sql: clauses.length ? `${prefix} ${clauses.join(" AND ")}` : "",
    params
  };
}

function timestampJoinCondition(filters: AnalyticsFilters = {}, alias = "i") {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.from != null) {
    clauses.push(`${alias}.timestamp >= ?`);
    params.push(filters.from);
  }
  if (filters.to != null) {
    clauses.push(`${alias}.timestamp < ?`);
    params.push(filters.to);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params
  };
}

function getSummary(filters: AnalyticsFilters = {}): SummaryMetrics {
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

function getUsageComparison(filters: AnalyticsFilters = {}): UsageComparison {
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

function getTrends(filters: AnalyticsFilters = {}): TrendPoint[] {
  const filter = timestampWhere(filters, "i", "AND");
  const points = rows<TrendPoint>(
    `SELECT
      date(COALESCE(i.timestamp, 0) / 1000, 'unixepoch', 'localtime') AS date,
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

function getToolComparison(filters: AnalyticsFilters = {}): ToolComparisonRow[] {
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

function getModelRows(filters: AnalyticsFilters = {}): ModelAnalyticsRow[] {
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

function getProjectRows(filters: AnalyticsFilters = {}): ProjectAnalyticsRow[] {
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

function getSessions(
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

function getUnknownCostQueue(filters: AnalyticsFilters = {}): UnknownCostQueueRow[] {
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

function getModelAliasSuggestions(filters: AnalyticsFilters = {}): ModelAliasSuggestion[] {
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

function getLatestScanRecommendationStats() {
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

function buildInsights(data: {
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

export function getAnalyticsData(
  filters: AnalyticsFilters = {},
  options: ScanTrustOptions = {}
): AnalyticsData {
  const summary = getSummary(filters);
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
  const comparison = getUsageComparison(filters);
  const usageGuardrails = getUsageGuardrailProgress();
  const trends = getTrends(filters);
  const tools = getToolComparison(filters);
  const models = getModelRows(filters);
  const projects = getProjectRows(filters);
  const sessions = getSessions(filters, options.sessionDetail ?? "full");
  const unknownCosts = getUnknownCostQueue(filters);
  const modelAliasSuggestions = getModelAliasSuggestions(filters);
  const sessionComparisons = buildSessionComparisons(sessions);
  const projectSignals = buildProjectSignals({
    totalTokens: summary.totalTokens,
    projects,
    sessions
  });
  const recommendations = buildLocalRecommendations({
    summary,
    tools,
    projects,
    unknownCosts,
    guardrails: usageGuardrails,
    scan: getLatestScanRecommendationStats()
  });
  const reviewQueue = buildReviewQueue({
    summary,
    guardrails: usageGuardrails,
    unknownCosts,
    sessions,
    projects,
    models,
    tools
  });
  const insights = buildInsights({ summary, trends, models, projects, sessions });

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

export function getDebugData() {
  return {
    scanRuns: getScanRunRows(50),
    scanFiles: getScanFileRows(500)
  };
}

function getScanRunRows(limit: number) {
  return rows<DebugScanRun>(
    `SELECT id, started_at AS startedAt, completed_at AS completedAt,
      files_scanned AS filesScanned, records_imported AS recordsImported, warnings, errors
     FROM scan_runs
     ORDER BY started_at DESC, completed_at DESC, id DESC
     LIMIT ?`,
    limit
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, [])
  }));
}

function getScanFileRows(limit: number | null) {
  const limitSql = limit == null ? "" : "LIMIT ?";
  const params = limit == null ? [] : [limit];
  return rows<DebugScanFile>(
    `SELECT sf.id, sf.scan_run_id AS scanRunId, sf.path, sf.modified_time AS modifiedTime,
      sf.size_bytes AS sizeBytes, sf.file_hash AS fileHash, sf.parser, sf.status,
      sf.records_imported AS recordsImported, sf.warnings, sf.errors, sf.raw_metadata AS rawMetadata,
      sr.started_at AS scanStartedAt
     FROM scan_files sf
     JOIN scan_runs sr ON sr.id = sf.scan_run_id
     ORDER BY sr.started_at DESC, sr.completed_at DESC, sr.id DESC, sf.path ASC
     ${limitSql}`,
    ...params
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, []),
    rawMetadata: parseJson<Record<string, unknown>>(row.rawMetadata, {})
  }));
}

function getScanFileRowsForRunIds(scanRunIds: string[]) {
  if (!scanRunIds.length) return [];
  const placeholders = scanRunIds.map(() => "?").join(", ");
  return rows<DebugScanFile>(
    `SELECT sf.id, sf.scan_run_id AS scanRunId, sf.path, sf.modified_time AS modifiedTime,
      sf.size_bytes AS sizeBytes, sf.file_hash AS fileHash, sf.parser, sf.status,
      sf.records_imported AS recordsImported, sf.warnings, sf.errors, sf.raw_metadata AS rawMetadata,
      sr.started_at AS scanStartedAt
     FROM scan_files sf
     JOIN scan_runs sr ON sr.id = sf.scan_run_id
     WHERE sf.scan_run_id IN (${placeholders})
     ORDER BY sr.started_at DESC, sr.completed_at DESC, sr.id DESC, sf.path ASC`,
    ...scanRunIds
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, []),
    rawMetadata: parseJson<Record<string, unknown>>(row.rawMetadata, {})
  }));
}

export function getScanConfidenceSummary(filters: AnalyticsFilters = {}): ScanConfidenceSummary {
  const filter = timestampWhere(filters, "i");
  const unknownFilter = timestampJoinCondition(filters, "i");
  const row = sqlite
    .prepare(
      `SELECT
        COUNT(*) AS interactions,
        COALESCE(SUM(CASE WHEN token_confidence = 'exact' THEN 1 ELSE 0 END), 0) AS exactTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'tokenizer estimate' THEN 1 ELSE 0 END), 0) AS tokenizerEstimateInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'simple estimate' THEN 1 ELSE 0 END), 0) AS simpleEstimateInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'high-confidence estimate' THEN 1 ELSE 0 END), 0) AS highConfidenceTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'low-confidence estimate' THEN 1 ELSE 0 END), 0) AS lowConfidenceTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'unknown' THEN 1 ELSE 0 END), 0) AS unknownTokenInteractions,
        COALESCE(SUM(CASE WHEN estimated_tokens = 1 THEN 1 ELSE 0 END), 0) AS estimatedTokenInteractions,
        COALESCE(SUM(CASE WHEN cost IS NOT NULL AND cost_estimated = 0 THEN 1 ELSE 0 END), 0) AS exactCostInteractions,
        COALESCE(SUM(CASE WHEN cost IS NOT NULL AND cost_estimated = 1 THEN 1 ELSE 0 END), 0) AS estimatedCostInteractions,
        COALESCE(SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END), 0) AS unknownCostInteractions
       FROM interactions i INDEXED BY interactions_analytics_cover_idx
       ${filter.sql}`
    )
    .get(...filter.params) as ScanConfidenceSummary;
  const unknownCostCauses = sqlite
    .prepare(
      `WITH unknown_costs AS (
        SELECT
          CASE
            WHEN lower(COALESCE(m.name, 'unknown')) = 'unknown' THEN 'missingModelName'
            WHEN COALESCE(i.total_tokens, 0) <= 0 THEN 'missingTokenCount'
            WHEN lower(COALESCE(m.name, 'unknown')) <> 'unknown'
              AND COALESCE(i.total_tokens, 0) > 0
              AND (m.input_token_price IS NULL OR m.output_token_price IS NULL)
              THEN 'missingPricing'
            ELSE 'other'
          END AS cause
        FROM interactions i INDEXED BY interactions_analytics_cover_idx
        LEFT JOIN models m ON m.id = i.model_id
        WHERE i.cost IS NULL
        ${unknownFilter.sql}
      )
      SELECT
        COALESCE(SUM(CASE WHEN cause = 'missingModelName' THEN 1 ELSE 0 END), 0) AS missingModelName,
        COALESCE(SUM(CASE WHEN cause = 'missingTokenCount' THEN 1 ELSE 0 END), 0) AS missingTokenCount,
        COALESCE(SUM(CASE WHEN cause = 'missingPricing' THEN 1 ELSE 0 END), 0) AS missingPricing,
        COALESCE(SUM(CASE WHEN cause = 'other' THEN 1 ELSE 0 END), 0) AS other
       FROM unknown_costs`
    )
    .get(...unknownFilter.params) as ScanConfidenceSummary["unknownCostCauses"];

  return {
    interactions: number(row.interactions),
    exactTokenInteractions: number(row.exactTokenInteractions),
    tokenizerEstimateInteractions: number(row.tokenizerEstimateInteractions),
    simpleEstimateInteractions: number(row.simpleEstimateInteractions),
    highConfidenceTokenInteractions: number(row.highConfidenceTokenInteractions),
    lowConfidenceTokenInteractions: number(row.lowConfidenceTokenInteractions),
    unknownTokenInteractions: number(row.unknownTokenInteractions),
    estimatedTokenInteractions: number(row.estimatedTokenInteractions),
    exactCostInteractions: number(row.exactCostInteractions),
    estimatedCostInteractions: number(row.estimatedCostInteractions),
    unknownCostInteractions: number(row.unknownCostInteractions),
    unknownCostCauses: {
      missingModelName: number(unknownCostCauses.missingModelName),
      missingPricing: number(unknownCostCauses.missingPricing),
      missingTokenCount: number(unknownCostCauses.missingTokenCount),
      other: number(unknownCostCauses.other)
    }
  };
}

export function getPricedModelCount() {
  const row = sqlite
    .prepare(
      `SELECT COUNT(*) AS count
       FROM models
       WHERE input_token_price IS NOT NULL
         AND output_token_price IS NOT NULL`
    )
    .get() as { count: number };

  return number(row.count);
}

function getScanFileRowsForScope(
  scanRuns: DebugScanRun[],
  scope: NonNullable<ScanTrustOptions["scanFileScope"]>
) {
  if (scope === "all") return getScanFileRows(null);
  if (scope === "none") return [];
  const runIds = scanRuns.slice(0, scope === "latest" ? 1 : 2).map((scanRun) => scanRun.id);
  return getScanFileRowsForRunIds(runIds);
}

export function getScanTrustData(
  filters: AnalyticsFilters = {},
  options: ScanTrustOptions = {}
): ScanTrustData {
  const scanRuns = getScanRunRows(50);
  const scanFiles = getScanFileRowsForScope(scanRuns, options.scanFileScope ?? "all");
  const confidence = getScanConfidenceSummary(filters);
  return {
    scanRuns,
    scanFiles,
    confidence,
    pricedModelCount: getPricedModelCount(),
    health: buildScanHealth({
      scanRuns,
      scanFiles,
      confidence
    })
  };
}
