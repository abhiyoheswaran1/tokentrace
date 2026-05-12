import { sqlite } from "@/src/db/client";

export type EvidenceMetric =
  | "processed-tokens"
  | "non-cache-tokens"
  | "cached-tokens"
  | "estimated-cost"
  | "sessions"
  | "unknown-cost"
  | "guardrails"
  | "review-queue";

export type EvidenceTrailSession = {
  id: string;
  title: string;
  tool: string;
  provider: string;
  project: string;
  model: string;
  sourceFile: string;
  parser: string | null;
  parserStatus: string | null;
  parserConfidence: number | null;
  tokenConfidence: string;
  totalTokens: number;
  cost: number | null;
  interactions: number;
  sessionHref: string;
  sourceHref: string;
  parserHref: string;
  pricingHref: string | null;
};

export type EvidenceTrail = {
  metric: EvidenceMetric;
  title: string;
  description: string;
  totals: {
    tokens: number;
    cost: number;
    sessions: number;
    interactions: number;
    unknownCostInteractions: number;
  };
  sessions: EvidenceTrailSession[];
};

const metricTitles: Record<EvidenceMetric, { title: string; description: string }> = {
  "processed-tokens": {
    title: "Processed tokens",
    description: "All input, output, cache, and reasoning tokens from imported local CLI records."
  },
  "non-cache-tokens": {
    title: "Non-cache tokens",
    description: "Fresh input, output, and reasoning tokens, excluding cache read/write tokens."
  },
  "cached-tokens": {
    title: "Cached tokens",
    description: "Cache read and cache write tokens reported by supported tools."
  },
  "estimated-cost": {
    title: "Estimated cost",
    description: "Cost calculated from editable model pricing, including exact, estimated, and unknown rows."
  },
  sessions: {
    title: "Sessions",
    description: "Imported local CLI sessions and their interaction evidence."
  },
  "unknown-cost": {
    title: "Unknown cost",
    description: "Interactions whose cost cannot be calculated because model, price, or token counts are missing."
  },
  guardrails: {
    title: "Monthly guardrails",
    description: "Current-month usage contributing to local guardrail progress."
  },
  "review-queue": {
    title: "Review queue",
    description: "Evidence behind deterministic local review recommendations."
  }
};

function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function evidenceHref(
  metric: EvidenceMetric,
  params: Record<string, string | null | undefined> = {}
) {
  return withQuery("/evidence", { metric, ...params });
}

type EvidenceSessionRow = {
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

function metricWhere(metric: EvidenceMetric, alias = "i", prefix = "WHERE") {
  if (metric === "cached-tokens") return `${prefix} (${alias}.cache_read_tokens + ${alias}.cache_write_tokens) > 0`;
  if (metric === "unknown-cost") return `${prefix} ${alias}.cost IS NULL`;
  if (metric === "non-cache-tokens") {
    return `${prefix} (${alias}.input_tokens + ${alias}.output_tokens + ${alias}.reasoning_tokens) > 0`;
  }
  return "";
}

export function buildEvidenceTrail(input: { metric: EvidenceMetric }): EvidenceTrail {
  const metric = input.metric;
  const config = metricTitles[metric] ?? metricTitles["processed-tokens"];
  const where = metricWhere(metric);
  const modelWhere = metricWhere(metric, "i3", "AND");
  const pricingWhere = metricWhere(metric, "i2", "AND");
  const sessions = sqlite
    .prepare(
      `SELECT
        s.id,
        COALESCE(s.title, t.name || ' session') AS title,
        t.name AS tool,
        p.name AS provider,
        COALESCE(pr.name, 'Unassigned') AS project,
        COALESCE((
          SELECT group_concat(model_name)
          FROM (
            SELECT DISTINCT COALESCE(m3.name, 'unknown') AS model_name
            FROM interactions i3
            LEFT JOIN models m3 ON m3.id = i3.model_id
            WHERE i3.session_id = s.id
            ${modelWhere}
            ORDER BY model_name ASC
          )
        ), 'unknown') AS model,
        (
          SELECT m2.name
          FROM interactions i2
          LEFT JOIN models m2 ON m2.id = i2.model_id
          WHERE i2.session_id = s.id
            ${pricingWhere}
            AND m2.name IS NOT NULL
          GROUP BY m2.id, m2.name
          ORDER BY SUM(i2.total_tokens) DESC, m2.name ASC
          LIMIT 1
        ) AS pricingModel,
        s.source_file AS sourceFile,
        sf.parser AS parser,
        sf.status AS parserStatus,
        json_extract(sf.raw_metadata, '$.confidence') AS parserConfidence,
        CASE
          WHEN SUM(CASE WHEN i.token_confidence = 'unknown' THEN 1 ELSE 0 END) > 0 THEN 'unknown'
          WHEN SUM(CASE WHEN i.token_confidence = 'low-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'low-confidence estimate'
          WHEN SUM(CASE WHEN i.token_confidence = 'high-confidence estimate' THEN 1 ELSE 0 END) > 0 THEN 'high-confidence estimate'
          WHEN SUM(CASE WHEN i.estimated_tokens = 1 THEN 1 ELSE 0 END) > 0 THEN 'estimated'
          ELSE 'exact'
        END AS tokenConfidence,
        COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
        SUM(i.cost) AS cost,
        SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END) AS unknownCostInteractions,
        COUNT(i.id) AS interactions
       FROM interactions i
       JOIN sessions s ON s.id = i.session_id
       JOIN tools t ON t.id = s.tool_id
       JOIN providers p ON p.id = t.provider_id
       LEFT JOIN projects pr ON pr.id = s.project_id
       LEFT JOIN scan_files sf ON sf.id = (
         SELECT sf2.id
         FROM scan_files sf2
         JOIN scan_runs sr2 ON sr2.id = sf2.scan_run_id
         WHERE sf2.path = s.source_file
         ORDER BY sr2.started_at DESC, sf2.id ASC
         LIMIT 1
       )
       ${where}
       GROUP BY s.id
       ORDER BY totalTokens DESC, s.id ASC
       LIMIT 100`
    )
    .all() as EvidenceSessionRow[];

  const mapped: EvidenceTrailSession[] = sessions.map((session) => {
    const cost = session.cost == null ? null : number(session.cost);
    return {
      id: session.id,
      title: session.title,
      tool: session.tool,
      provider: session.provider,
      project: session.project,
      model: session.model,
      sourceFile: session.sourceFile,
      parser: session.parser,
      parserStatus: session.parserStatus,
      parserConfidence:
        typeof session.parserConfidence === "number" && Number.isFinite(session.parserConfidence)
          ? session.parserConfidence
          : null,
      tokenConfidence: session.tokenConfidence,
      totalTokens: number(session.totalTokens),
      cost: metric === "unknown-cost" && number(session.unknownCostInteractions) > 0 ? null : cost,
      interactions: number(session.interactions),
      sessionHref: withQuery("/sessions", { source: session.sourceFile, evidence: metric }),
      sourceHref: withQuery("/sessions", { source: session.sourceFile, evidence: metric }),
      parserHref: withQuery("/parser-debug", { source: session.sourceFile }),
      pricingHref: session.pricingModel ? withQuery("/pricing", { model: session.pricingModel }) : null
    };
  });

  const totals = mapped.reduce(
    (summary, session, index) => {
      summary.tokens += session.totalTokens;
      summary.cost += session.cost ?? 0;
      summary.sessions += 1;
      summary.interactions += session.interactions;
      summary.unknownCostInteractions += number(sessions[index]?.unknownCostInteractions);
      return summary;
    },
    { tokens: 0, cost: 0, sessions: 0, interactions: 0, unknownCostInteractions: 0 }
  );

  return {
    metric,
    title: config.title,
    description: config.description,
    totals,
    sessions: mapped
  };
}
