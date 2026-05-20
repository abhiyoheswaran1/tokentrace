import { sqlite } from "@/src/db/client";
import type { AnalyticsFilters } from "@/src/lib/analytics";
import type { EvidenceMetric } from "@/src/lib/evidence/metrics";

export type EvidenceSessionRow = {
  id: string;
  title: string;
  tool: string;
  provider: string;
  project: string;
  model: string;
  pricingModel: string | null;
  sourceFile: string;
  parser: string | null;
  parserStatus: string | null;
  parserConfidence: number | null;
  tokenConfidence: string;
  totalTokens: number;
  cost: number | null;
  unknownCostInteractions: number;
  interactions: number;
};

export type EvidenceTotalsRow = {
  tokens: number;
  cost: number;
  sessions: number;
  interactions: number;
  unknownCostInteractions: number;
};

export type EvidenceConfidenceRow = {
  exact: number;
  estimated: number;
  unknown: number;
};

export type EvidenceSourceFileRow = {
  sourceFile: string;
  tokens: number;
  sessions: number;
  interactions: number;
  unknownCostInteractions: number;
};

export type EvidenceTrailRows = {
  totals: EvidenceTotalsRow;
  confidence: EvidenceConfidenceRow;
  sourceFiles: EvidenceSourceFileRow[];
  sessions: EvidenceSessionRow[];
};

function currentMonthWindow(now = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();
  return { from, to };
}

export function metricTokenExpression(metric: EvidenceMetric, alias = "i") {
  if (metric === "cached-tokens") return `${alias}.cache_read_tokens + ${alias}.cache_write_tokens`;
  if (metric === "non-cache-tokens") return `${alias}.input_tokens + ${alias}.output_tokens + ${alias}.reasoning_tokens`;
  return `${alias}.total_tokens`;
}

function metricClauses(metric: EvidenceMetric, alias = "i") {
  if (metric === "cached-tokens") return [`(${alias}.cache_read_tokens + ${alias}.cache_write_tokens) > 0`];
  if (metric === "unknown-cost") return [`${alias}.cost IS NULL`];
  if (metric === "non-cache-tokens") {
    return [`(${alias}.input_tokens + ${alias}.output_tokens + ${alias}.reasoning_tokens) > 0`];
  }
  if (metric === "guardrails") {
    const window = currentMonthWindow();
    return [`${alias}.timestamp >= ${window.from}`, `${alias}.timestamp < ${window.to}`];
  }
  return [];
}

export function evidenceWhere(
  metric: EvidenceMetric,
  filters: AnalyticsFilters = {},
  alias = "i",
  prefix = "WHERE"
) {
  const clauses = metricClauses(metric, alias);
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
    sql: clauses.length ? `${prefix} ${clauses.join(" AND ")}` : "",
    params
  };
}

export function fetchEvidenceTrailRows({
  metric,
  filters
}: {
  metric: EvidenceMetric;
  filters?: AnalyticsFilters;
}): EvidenceTrailRows {
  const activeFilters = filters ?? {};
  const where = evidenceWhere(metric, activeFilters);
  const modelWhere = evidenceWhere(metric, activeFilters, "i3", "AND");
  const pricingWhere = evidenceWhere(metric, activeFilters, "i2", "AND");
  const tokenExpression = metricTokenExpression(metric);
  const pricingTokenExpression = metricTokenExpression(metric, "i2");
  const totals = sqlite
    .prepare(
      `SELECT
        COALESCE(SUM(${tokenExpression}), 0) AS tokens,
        COALESCE(SUM(i.cost), 0) AS cost,
        COUNT(DISTINCT i.session_id) AS sessions,
        COUNT(*) AS interactions,
        SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END) AS unknownCostInteractions
       FROM interactions i INDEXED BY interactions_analytics_cover_idx
       ${where.sql}`
    )
    .get(...where.params) as EvidenceTotalsRow;
  const confidence = sqlite
    .prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN i.token_confidence = 'exact' AND i.estimated_tokens = 0 THEN 1 ELSE 0 END), 0) AS exact,
        COALESCE(SUM(CASE WHEN i.estimated_tokens = 1 OR i.token_confidence LIKE '%estimate%' THEN 1 ELSE 0 END), 0) AS estimated,
        COALESCE(SUM(CASE WHEN i.token_confidence = 'unknown' THEN 1 ELSE 0 END), 0) AS unknown
       FROM interactions i INDEXED BY interactions_analytics_cover_idx
       ${where.sql}`
    )
    .get(...where.params) as EvidenceConfidenceRow;
  const sourceFiles = sqlite
    .prepare(
      `SELECT
        s.source_file AS sourceFile,
        COALESCE(SUM(${tokenExpression}), 0) AS tokens,
        COUNT(DISTINCT s.id) AS sessions,
        COUNT(*) AS interactions,
        SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END) AS unknownCostInteractions
       FROM interactions i INDEXED BY interactions_analytics_cover_idx
       JOIN sessions s ON s.id = i.session_id
       ${where.sql}
       GROUP BY s.source_file
       ORDER BY tokens DESC, interactions DESC, sourceFile ASC
       LIMIT 8`
    )
    .all(...where.params) as EvidenceSourceFileRow[];
  const sessions = sqlite
    .prepare(
      `WITH session_totals AS (
        SELECT
          i.session_id AS sessionId,
          CASE
            WHEN SUM(CASE WHEN i.token_confidence = 'unknown' THEN 1 ELSE 0 END) > 0 THEN 'unknown'
            WHEN SUM(CASE WHEN i.token_confidence = 'low-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'low-confidence estimate'
            WHEN SUM(CASE WHEN i.token_confidence = 'high-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'high-confidence estimate'
            WHEN SUM(CASE WHEN i.estimated_tokens = 1 THEN 1 ELSE 0 END) > 0 THEN 'estimated'
            ELSE 'exact'
          END AS tokenConfidence,
          COALESCE(SUM(${tokenExpression}), 0) AS totalTokens,
          SUM(i.cost) AS cost,
          SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END) AS unknownCostInteractions,
          COUNT(*) AS interactions
        FROM interactions i INDEXED BY interactions_analytics_cover_idx
        ${where.sql}
        GROUP BY i.session_id
        ORDER BY totalTokens DESC, sessionId ASC
        LIMIT 100
      )
      SELECT
        s.id,
        COALESCE(s.title, t.name || ' session') AS title,
        t.name AS tool,
        p.name AS provider,
        COALESCE(pr.name, 'Unassigned') AS project,
        COALESCE((
          SELECT group_concat(model_name)
          FROM (
            SELECT DISTINCT COALESCE(m3.name, 'unknown') AS model_name
            FROM interactions i3 INDEXED BY interactions_session_analytics_idx
            LEFT JOIN models m3 ON m3.id = i3.model_id
            WHERE i3.session_id = s.id
            ${modelWhere.sql}
            ORDER BY model_name ASC
          )
        ), 'unknown') AS model,
        (
          SELECT m2.name
          FROM interactions i2 INDEXED BY interactions_session_analytics_idx
          LEFT JOIN models m2 ON m2.id = i2.model_id
          WHERE i2.session_id = s.id
            ${pricingWhere.sql}
            AND m2.name IS NOT NULL
          GROUP BY m2.id, m2.name
          ORDER BY SUM(${pricingTokenExpression}) DESC, m2.name ASC
          LIMIT 1
        ) AS pricingModel,
        s.source_file AS sourceFile,
        sf.parser AS parser,
        sf.status AS parserStatus,
        json_extract(sf.raw_metadata, '$.confidence') AS parserConfidence,
        st.tokenConfidence,
        st.totalTokens,
        st.cost,
        st.unknownCostInteractions,
        st.interactions
       FROM session_totals st
       JOIN sessions s ON s.id = st.sessionId
       JOIN tools t ON t.id = s.tool_id
       JOIN providers p ON p.id = t.provider_id
       LEFT JOIN projects pr ON pr.id = s.project_id
       LEFT JOIN scan_files sf ON sf.id = (
         SELECT sf2.id
         FROM scan_files sf2
         JOIN scan_runs sr2 ON sr2.id = sf2.scan_run_id
         WHERE sf2.path = s.source_file
         ORDER BY
           CASE
             WHEN sf2.status IN ('imported', 'imported_with_errors')
               AND sf2.parser IS NOT NULL
               AND sf2.raw_metadata IS NOT NULL
               AND sf2.raw_metadata <> '{}'
               THEN 0
             WHEN sf2.status IN ('imported', 'imported_with_errors')
               AND sf2.parser IS NOT NULL
               THEN 1
             ELSE 2
           END,
           sr2.started_at DESC,
           sf2.id ASC
         LIMIT 1
       )
       ORDER BY st.totalTokens DESC, s.id ASC`
    )
    .all(...where.params, ...modelWhere.params, ...pricingWhere.params) as EvidenceSessionRow[];

  return {
    totals,
    confidence,
    sourceFiles,
    sessions
  };
}
