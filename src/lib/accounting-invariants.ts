import { sqlite } from "@/src/db/client";
import type { AnalyticsFilters } from "@/src/lib/analytics";

export type AccountingInvariantStatus = "ready" | "review";

export type AccountingDefinition = {
  id: "processed" | "non-cache" | "cached" | "provider-dashboard";
  label: string;
  description: string;
};

export type ProviderAccountingRow = {
  provider: string;
  tool: string;
  interactions: number;
  processedTokens: number;
  nonCacheTokens: number;
  cachedTokens: number;
  dashboardComparableTokens: number;
  balanceDeltaTokens: number;
};

export type AccountingInvariantReport = {
  status: AccountingInvariantStatus;
  processedTokens: number;
  nonCacheTokens: number;
  cachedTokens: number;
  dashboardComparableTokens: number;
  balanceDeltaTokens: number;
  definitions: AccountingDefinition[];
  providerRows: ProviderAccountingRow[];
  notes: string[];
};

const definitions: AccountingDefinition[] = [
  {
    id: "processed",
    label: "Processed tokens",
    description: "Every imported token bucket combined: fresh input, output, reasoning, cache read, and cache write."
  },
  {
    id: "non-cache",
    label: "Non-cache tokens",
    description: "Fresh input, output, and reasoning tokens. Cache read and cache write tokens are excluded."
  },
  {
    id: "cached",
    label: "Cached tokens",
    description: "Cache read and cache write tokens reported by supported local CLI records."
  },
  {
    id: "provider-dashboard",
    label: "Provider-dashboard comparable",
    description: "Exact provider-reported processed tokens. Estimated local rows are excluded from this comparison."
  }
];

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function timestampJoinCondition(filters: AnalyticsFilters = {}) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (filters.from != null) {
    clauses.push("i.timestamp >= ?");
    params.push(filters.from);
  }
  if (filters.to != null) {
    clauses.push("i.timestamp < ?");
    params.push(filters.to);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params
  };
}

type AccountingAggregateRow = {
  processedTokens: number;
  nonCacheTokens: number;
  cachedTokens: number;
  dashboardComparableTokens: number;
  balanceDeltaTokens: number;
};

type ProviderAccountingSqlRow = ProviderAccountingRow;

function rowToNumbers(row: AccountingAggregateRow): AccountingAggregateRow {
  return {
    processedTokens: number(row.processedTokens),
    nonCacheTokens: number(row.nonCacheTokens),
    cachedTokens: number(row.cachedTokens),
    dashboardComparableTokens: number(row.dashboardComparableTokens),
    balanceDeltaTokens: number(row.balanceDeltaTokens)
  };
}

function notesFor(report: AccountingAggregateRow) {
  const notes = [
    "Provider dashboards are account-level views; compare the same provider, account, and time window before treating a difference as a bug.",
    "Cached input can be billed and displayed separately by providers. TokenTrace keeps cache read/write out of fresh input/output."
  ];
  if (report.balanceDeltaTokens !== 0) {
    notes.unshift(
      `${Math.abs(report.balanceDeltaTokens).toLocaleString()} tokens are outside the visible buckets and need parser/accounting review.`
    );
  }
  return notes;
}

export function buildAccountingInvariants(filters: AnalyticsFilters = {}): AccountingInvariantReport {
  const filter = timestampJoinCondition(filters);
  const aggregate = sqlite
    .prepare(
      `SELECT
        COALESCE(SUM(i.total_tokens), 0) AS processedTokens,
        COALESCE(SUM(i.input_tokens + i.output_tokens + i.reasoning_tokens), 0) AS nonCacheTokens,
        COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
        COALESCE(SUM(CASE WHEN i.token_confidence = 'exact' THEN i.total_tokens ELSE 0 END), 0) AS dashboardComparableTokens,
        COALESCE(SUM(i.total_tokens - (
          i.input_tokens + i.output_tokens + i.reasoning_tokens + i.cache_read_tokens + i.cache_write_tokens
        )), 0) AS balanceDeltaTokens
       FROM interactions i
       WHERE 1 = 1 ${filter.sql}`
    )
    .get(...filter.params) as AccountingAggregateRow;
  const totals = rowToNumbers(aggregate);

  const providerRows = (
    sqlite
      .prepare(
        `SELECT
          p.name AS provider,
          t.name AS tool,
          COUNT(i.id) AS interactions,
          COALESCE(SUM(i.total_tokens), 0) AS processedTokens,
          COALESCE(SUM(i.input_tokens + i.output_tokens + i.reasoning_tokens), 0) AS nonCacheTokens,
          COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
          COALESCE(SUM(CASE WHEN i.token_confidence = 'exact' THEN i.total_tokens ELSE 0 END), 0) AS dashboardComparableTokens,
          COALESCE(SUM(i.total_tokens - (
            i.input_tokens + i.output_tokens + i.reasoning_tokens + i.cache_read_tokens + i.cache_write_tokens
          )), 0) AS balanceDeltaTokens
         FROM interactions i
         JOIN sessions s ON s.id = i.session_id
         JOIN tools t ON t.id = s.tool_id
         JOIN providers p ON p.id = t.provider_id
         WHERE 1 = 1 ${filter.sql}
         GROUP BY p.id, t.id
         ORDER BY processedTokens DESC, p.name ASC, t.name ASC`
      )
      .all(...filter.params) as ProviderAccountingSqlRow[]
  ).map((row) => ({
    provider: row.provider,
    tool: row.tool,
    interactions: number(row.interactions),
    processedTokens: number(row.processedTokens),
    nonCacheTokens: number(row.nonCacheTokens),
    cachedTokens: number(row.cachedTokens),
    dashboardComparableTokens: number(row.dashboardComparableTokens),
    balanceDeltaTokens: number(row.balanceDeltaTokens)
  }));

  return {
    status: totals.balanceDeltaTokens === 0 ? "ready" : "review",
    ...totals,
    definitions,
    providerRows,
    notes: notesFor(totals)
  };
}
