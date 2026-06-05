import { prepareCached } from "@/src/db/prepared";

export type StructuredQueryGroupBy = "model" | "project" | "tool" | "session" | "day";
export type StructuredQueryMetric = "cost" | "totalTokens" | "interactions";
export type StructuredQuerySort = "asc" | "desc";
export type StructuredQueryRangePreset = "today" | "7d" | "30d" | "60d" | "90d" | "all";

export type StructuredQueryRange = {
  preset?: StructuredQueryRangePreset;
  from?: string;
  to?: string;
};

export type StructuredQueryFilters = {
  model?: string;
  project?: string;
  tool?: string;
};

export type StructuredQueryArgs = {
  groupBy: StructuredQueryGroupBy;
  metric: StructuredQueryMetric;
  range?: StructuredQueryRange;
  filters?: StructuredQueryFilters;
  topN?: number;
  sort?: StructuredQuerySort;
};

export type StructuredQueryRow = {
  group: string;
  value: number;
  interactions: number;
  totalTokens: number;
  cost: number;
};

export type StructuredQueryResult = {
  generatedAt: string;
  groupBy: StructuredQueryGroupBy;
  metric: StructuredQueryMetric;
  range: { from: string | null; to: string | null; preset: StructuredQueryRangePreset | null };
  filters: { model: string | null; project: string | null; tool: string | null };
  topN: number;
  sort: StructuredQuerySort;
  rows: StructuredQueryRow[];
  truncated: boolean;
  totalGroups: number;
};

const GROUP_BY_VALUES: Record<StructuredQueryGroupBy, string> = {
  model: "COALESCE(m.name, 'unknown')",
  project: "COALESCE(p.name, 'No project')",
  tool: "t.name",
  session: "s.id",
  day: "local_date_key(i.timestamp)"
};

const METRIC_EXPRESSIONS: Record<StructuredQueryMetric, string> = {
  cost: "COALESCE(SUM(i.cost), 0)",
  totalTokens: "COALESCE(SUM(i.total_tokens), 0)",
  interactions: "COUNT(*)"
};

const VALID_GROUP_BY: readonly StructuredQueryGroupBy[] = ["model", "project", "tool", "session", "day"];
const VALID_METRIC: readonly StructuredQueryMetric[] = ["cost", "totalTokens", "interactions"];
const VALID_SORT: readonly StructuredQuerySort[] = ["asc", "desc"];
const VALID_PRESET: readonly StructuredQueryRangePreset[] = ["today", "7d", "30d", "60d", "90d", "all"];

function parseIsoDate(value: string, label: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${label} date: ${value} (expected YYYY-MM-DD)`);
  }
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    throw new Error(`Invalid ${label} calendar date: ${value}`);
  }
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new Error(`Invalid ${label} calendar date: ${value}`);
  }
  return date.getTime();
}

function startOfTodayLocal(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

function startOfTomorrowLocal(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
}

function presetToTimestamps(preset: StructuredQueryRangePreset): { from: number | null; to: number | null } {
  if (preset === "all") return { from: null, to: null };
  const to = startOfTomorrowLocal();
  if (preset === "today") return { from: startOfTodayLocal(), to };
  const days: Record<Exclude<StructuredQueryRangePreset, "today" | "all">, number> = {
    "7d": 7,
    "30d": 30,
    "60d": 60,
    "90d": 90
  };
  const span = days[preset];
  return {
    from: startOfTodayLocal() - (span - 1) * 24 * 60 * 60 * 1000,
    to
  };
}

type ResolvedRange = {
  fromMs: number | null;
  toMs: number | null;
  fromIso: string | null;
  toIso: string | null;
  preset: StructuredQueryRangePreset | null;
};

function toIsoDate(ms: number): string {
  const date = new Date(ms);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function resolveRange(range: StructuredQueryRange | undefined): ResolvedRange {
  if (!range || (!range.preset && !range.from && !range.to)) {
    return { fromMs: null, toMs: null, fromIso: null, toIso: null, preset: null };
  }

  if (range.preset) {
    if (range.from || range.to) {
      throw new Error("range.preset is mutually exclusive with range.from / range.to.");
    }
    if (!VALID_PRESET.includes(range.preset)) {
      throw new Error(`Unsupported range preset: ${range.preset}`);
    }
    const { from, to } = presetToTimestamps(range.preset);
    return {
      fromMs: from,
      toMs: to,
      fromIso: from != null ? toIsoDate(from) : null,
      toIso: to != null ? toIsoDate(to) : null,
      preset: range.preset
    };
  }

  const fromMs = range.from ? parseIsoDate(range.from, "range.from") : null;
  const toMs = range.to ? parseIsoDate(range.to, "range.to") : null;
  if (fromMs != null && toMs != null && fromMs >= toMs) {
    throw new Error("range.from must be before range.to");
  }
  return {
    fromMs,
    toMs,
    fromIso: range.from ?? null,
    toIso: range.to ?? null,
    preset: null
  };
}

function validateArgs(args: StructuredQueryArgs) {
  if (!args || typeof args !== "object") {
    throw new Error("runStructuredQuery requires an args object.");
  }
  if (!args.groupBy) throw new Error("runStructuredQuery requires a groupBy argument.");
  if (!args.metric) throw new Error("runStructuredQuery requires a metric argument.");
  if (!VALID_GROUP_BY.includes(args.groupBy)) {
    throw new Error(`Unsupported groupBy: ${args.groupBy}`);
  }
  if (!VALID_METRIC.includes(args.metric)) {
    throw new Error(`Unsupported metric: ${args.metric}`);
  }
  if (args.sort && !VALID_SORT.includes(args.sort)) {
    throw new Error(`Unsupported sort: ${args.sort}`);
  }
  if (args.topN != null) {
    if (!Number.isInteger(args.topN)) {
      throw new Error("topN must be an integer.");
    }
    if (args.topN < 1 || args.topN > 200) {
      throw new Error("topN must be between 1 and 200.");
    }
  }
}

export function runStructuredQuery(args: StructuredQueryArgs): StructuredQueryResult {
  validateArgs(args);

  const groupBy = args.groupBy;
  const metric = args.metric;
  const sort: StructuredQuerySort = args.sort ?? "desc";
  const topN = args.topN ?? 20;
  const filters = args.filters ?? {};
  const range = resolveRange(args.range);

  const whereClauses: string[] = ["i.timestamp IS NOT NULL"];
  const params: unknown[] = [];

  if (range.fromMs != null) {
    whereClauses.push("i.timestamp >= ?");
    params.push(range.fromMs);
  }
  if (range.toMs != null) {
    whereClauses.push("i.timestamp < ?");
    params.push(range.toMs);
  }
  if (filters.model && filters.model.trim()) {
    whereClauses.push("lower(m.name) = lower(?)");
    params.push(filters.model.trim());
  }
  if (filters.tool && filters.tool.trim()) {
    whereClauses.push("lower(t.name) = lower(?)");
    params.push(filters.tool.trim());
  }
  if (filters.project && filters.project.trim()) {
    whereClauses.push("lower(p.name) = lower(?)");
    params.push(filters.project.trim());
  }

  const groupExpr = GROUP_BY_VALUES[groupBy];
  const metricExpr = METRIC_EXPRESSIONS[metric];
  const orderDirection = sort === "asc" ? "ASC" : "DESC";

  const sql = `
    SELECT
      ${groupExpr} AS group_value,
      ${metricExpr} AS value,
      COUNT(*) AS interactions,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.cost), 0) AS cost
    FROM interactions i
    JOIN sessions s ON s.id = i.session_id
    JOIN tools t ON t.id = s.tool_id
    LEFT JOIN projects p ON p.id = s.project_id
    LEFT JOIN models m ON m.id = i.model_id
    WHERE ${whereClauses.join(" AND ")}
    GROUP BY group_value
    ORDER BY value ${orderDirection}, group_value ASC
  `;

  type Row = {
    group_value: string;
    value: number;
    interactions: number;
    totalTokens: number;
    cost: number;
  };

  const allRows = (prepareCached(sql).all(...params) as Row[]).map((row) => ({
    group: String(row.group_value ?? "unknown"),
    value: Number(row.value ?? 0),
    interactions: Number(row.interactions ?? 0),
    totalTokens: Number(row.totalTokens ?? 0),
    cost: Number(row.cost ?? 0)
  }));

  const rows = allRows.slice(0, topN);

  return {
    generatedAt: new Date().toISOString(),
    groupBy,
    metric,
    range: {
      from: range.fromIso,
      to: range.toIso,
      preset: range.preset
    },
    filters: {
      model: filters.model?.trim() || null,
      project: filters.project?.trim() || null,
      tool: filters.tool?.trim() || null
    },
    topN,
    sort,
    rows,
    truncated: allRows.length > rows.length,
    totalGroups: allRows.length
  };
}
