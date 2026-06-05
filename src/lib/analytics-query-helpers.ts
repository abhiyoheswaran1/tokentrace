import { prepareCached } from "@/src/db/prepared";
import type { AnalyticsFilters, TrendPoint } from "@/src/lib/analytics-types";

export function number(value: unknown) {
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
  const [year = NaN, month = NaN, day = NaN] = value.split("-").map(Number);
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

export function fillMissingTrendDays(points: TrendPoint[], filters: AnalyticsFilters) {
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

export function parseJson<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value) || (value && typeof value === "object")) return value as T;
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function rows<T>(sql: string, ...params: unknown[]) {
  return prepareCached(sql).all(...params) as T[];
}

export function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

export function stringMetadata(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

export function numberMetadata(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : null;
}

export function timestampWhere(filters: AnalyticsFilters = {}, alias = "i", prefix = "WHERE") {
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

export function timestampJoinCondition(filters: AnalyticsFilters = {}, alias = "i") {
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
