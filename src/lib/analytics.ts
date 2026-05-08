import { sqlite } from "@/src/db/client";
import {
  buildScanHealth,
  type ScanConfidenceSummary,
  type ScanHealth
} from "@/src/lib/scan-health";

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
  interactionCount: number;
  durationMs: number | null;
};

export type Insight = {
  id: string;
  severity: "high" | "medium" | "low";
  problem: string;
  evidence: string;
  savingOpportunity: string;
  recommendation: string;
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
  health: ScanHealth;
};

export type AnalyticsData = {
  summary: SummaryMetrics;
  trends: TrendPoint[];
  tools: ToolComparisonRow[];
  models: ModelAnalyticsRow[];
  projects: ProjectAnalyticsRow[];
  sessions: SessionRow[];
  insights: Insight[];
};

export type AnalyticsFilters = {
  from?: number | null;
  to?: number | null;
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
       FROM interactions
       ${interactionFilter.sql}`
    )
    .get(...interactionFilter.params) as Omit<SummaryMetrics, "mostUsedTool" | "mostUsedModel">;

  const toolFilter = timestampWhere(filters, "i");
  const tool = sqlite
    .prepare(
      `SELECT t.name
       FROM interactions i
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
       FROM interactions i
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

function getTrends(filters: AnalyticsFilters = {}): TrendPoint[] {
  const filter = timestampWhere(filters, "i", "AND");
  return rows<TrendPoint>(
    `SELECT
      date(COALESCE(i.timestamp, 0) / 1000, 'unixepoch') AS date,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
      COALESCE(SUM(i.reasoning_tokens), 0) AS reasoningTokens,
      COALESCE(SUM(i.cost), 0) AS cost
     FROM interactions i
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
      COUNT(i.id) AS interactions,
      COALESCE((
        SELECT m2.name
        FROM interactions i2
        JOIN sessions s2 ON s2.id = i2.session_id
        LEFT JOIN models m2 ON m2.id = i2.model_id
        WHERE s2.tool_id = t.id
        ${subFilter.sql}
        GROUP BY m2.id
        ORDER BY SUM(COALESCE(i2.cost, 0)) DESC
        LIMIT 1
      ), 'Unknown') AS mostExpensiveModel
     FROM interactions i
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
      COUNT(i.id) AS interactions,
      COALESCE(AVG(i.output_tokens), 0) AS averageOutputTokens
     FROM interactions i
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
  return rows<ProjectAnalyticsRow & { inputTokens: number; outputTokens: number }>(
    `SELECT
      pr.id,
      pr.name AS project,
      pr.path,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cost), 0) AS cost,
      COUNT(DISTINCT s.id) AS sessions,
      COUNT(i.id) AS interactions,
      MAX(i.timestamp) AS lastUsedAt
     FROM projects pr
     JOIN sessions s ON s.project_id = pr.id
     JOIN interactions i ON i.session_id = s.id ${filter.sql}
     GROUP BY pr.id
     ORDER BY totalTokens DESC`,
    ...filter.params
  ).map((row) => ({
    id: row.id,
    project: row.project,
    path: row.path,
    totalTokens: number(row.totalTokens),
    cost: number(row.cost),
    sessions: number(row.sessions),
    interactions: number(row.interactions),
    outputInputRatio: row.inputTokens ? number(row.outputTokens) / number(row.inputTokens) : 0,
    lastUsedAt: row.lastUsedAt
  }));
}

function getSessions(filters: AnalyticsFilters = {}): SessionRow[] {
  const filter = timestampJoinCondition(filters, "i");
  return rows<
    Omit<SessionRow, "costEstimated" | "estimatedTokens"> & {
      costEstimated: 0 | 1;
      estimatedTokens: 0 | 1;
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
        WHEN SUM(CASE WHEN i.token_confidence = 'low-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'low-confidence estimate'
        WHEN SUM(CASE WHEN i.token_confidence = 'high-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'high-confidence estimate'
        ELSE 'exact'
      END AS tokenConfidence,
      COUNT(i.id) AS interactionCount,
      CASE WHEN s.started_at IS NOT NULL AND s.ended_at IS NOT NULL THEN s.ended_at - s.started_at ELSE NULL END AS durationMs
     FROM sessions s
     JOIN tools t ON t.id = s.tool_id
     JOIN providers provider ON provider.id = t.provider_id
     LEFT JOIN projects pr ON pr.id = s.project_id
     JOIN interactions i ON i.session_id = s.id ${filter.sql}
     LEFT JOIN models m ON m.id = i.model_id
     GROUP BY s.id
     ORDER BY COALESCE(s.started_at, 0) DESC
     LIMIT 1000`,
    ...filter.params
  ).map((row) => ({
    ...row,
    totalTokens: number(row.totalTokens),
    inputTokens: number(row.inputTokens),
    outputTokens: number(row.outputTokens),
    cachedTokens: number(row.cachedTokens),
    reasoningTokens: number(row.reasoningTokens),
    cost: row.cost == null ? null : number(row.cost),
    costEstimated: Boolean(row.costEstimated),
    estimatedTokens: Boolean(row.estimatedTokens),
    interactionCount: number(row.interactionCount)
  }));
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

export function getAnalyticsData(filters: AnalyticsFilters = {}): AnalyticsData {
  const summary = getSummary(filters);
  const trends = getTrends(filters);
  const tools = getToolComparison(filters);
  const models = getModelRows(filters);
  const projects = getProjectRows(filters);
  const sessions = getSessions(filters);
  const insights = buildInsights({ summary, trends, models, projects, sessions });

  return {
    summary,
    trends,
    tools,
    models,
    projects,
    sessions,
    insights
  };
}

export function getDebugData() {
  const scanRuns = rows<DebugScanRun>(
    `SELECT id, started_at AS startedAt, completed_at AS completedAt,
      files_scanned AS filesScanned, records_imported AS recordsImported, warnings, errors
     FROM scan_runs
     ORDER BY started_at DESC
     LIMIT 50`
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, [])
  }));

  const scanFiles = rows<DebugScanFile>(
    `SELECT sf.id, sf.scan_run_id AS scanRunId, sf.path, sf.modified_time AS modifiedTime,
      sf.size_bytes AS sizeBytes, sf.file_hash AS fileHash, sf.parser, sf.status,
      sf.records_imported AS recordsImported, sf.warnings, sf.errors, sf.raw_metadata AS rawMetadata,
      sr.started_at AS scanStartedAt
     FROM scan_files sf
     JOIN scan_runs sr ON sr.id = sf.scan_run_id
     ORDER BY sr.started_at DESC, sf.path ASC
     LIMIT 500`
  ).map((row) => ({
    ...row,
    warnings: parseJson<string[]>(row.warnings, []),
    errors: parseJson<string[]>(row.errors, []),
    rawMetadata: parseJson<Record<string, unknown>>(row.rawMetadata, {})
  }));

  return { scanRuns, scanFiles };
}

export function getScanConfidenceSummary(): ScanConfidenceSummary {
  const row = sqlite
    .prepare(
      `SELECT
        COUNT(*) AS interactions,
        COALESCE(SUM(CASE WHEN token_confidence = 'exact' THEN 1 ELSE 0 END), 0) AS exactTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'high-confidence estimate' THEN 1 ELSE 0 END), 0) AS highConfidenceTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'low-confidence estimate' THEN 1 ELSE 0 END), 0) AS lowConfidenceTokenInteractions,
        COALESCE(SUM(CASE WHEN token_confidence = 'unknown' THEN 1 ELSE 0 END), 0) AS unknownTokenInteractions,
        COALESCE(SUM(CASE WHEN estimated_tokens = 1 THEN 1 ELSE 0 END), 0) AS estimatedTokenInteractions,
        COALESCE(SUM(CASE WHEN cost IS NOT NULL AND cost_estimated = 0 THEN 1 ELSE 0 END), 0) AS exactCostInteractions,
        COALESCE(SUM(CASE WHEN cost IS NOT NULL AND cost_estimated = 1 THEN 1 ELSE 0 END), 0) AS estimatedCostInteractions,
        COALESCE(SUM(CASE WHEN cost IS NULL THEN 1 ELSE 0 END), 0) AS unknownCostInteractions
       FROM interactions`
    )
    .get() as ScanConfidenceSummary;

  return {
    interactions: number(row.interactions),
    exactTokenInteractions: number(row.exactTokenInteractions),
    highConfidenceTokenInteractions: number(row.highConfidenceTokenInteractions),
    lowConfidenceTokenInteractions: number(row.lowConfidenceTokenInteractions),
    unknownTokenInteractions: number(row.unknownTokenInteractions),
    estimatedTokenInteractions: number(row.estimatedTokenInteractions),
    exactCostInteractions: number(row.exactCostInteractions),
    estimatedCostInteractions: number(row.estimatedCostInteractions),
    unknownCostInteractions: number(row.unknownCostInteractions)
  };
}

export function getScanTrustData(): ScanTrustData {
  const debug = getDebugData();
  const confidence = getScanConfidenceSummary();
  return {
    ...debug,
    confidence,
    health: buildScanHealth({
      scanRuns: debug.scanRuns,
      scanFiles: debug.scanFiles,
      confidence
    })
  };
}
