import { randomUUID } from "node:crypto";
import { sqlite } from "@/src/db/client";

export type StoredSavedReportViewType =
  | "overview"
  | "sessions"
  | "models"
  | "tools"
  | "projects"
  | "comparison";

export type StoredSavedReportFormat = "json" | "markdown" | "html";

const VIEW_TYPES = new Set<StoredSavedReportViewType>([
  "overview",
  "sessions",
  "models",
  "tools",
  "projects",
  "comparison"
]);

const FORMATS = new Set<StoredSavedReportFormat>(["json", "markdown", "html"]);

const ALLOWED_PARAM_KEYS = new Set([
  "range",
  "from",
  "to",
  "model",
  "tool",
  "project",
  "highCost",
  "comparePeriodFrom",
  "comparePeriodTo",
  "compareModel"
]);

export type StoredSavedReportParams = Record<string, string | number | boolean>;

export type StoredSavedReport = {
  id: string;
  name: string;
  viewType: StoredSavedReportViewType;
  params: StoredSavedReportParams;
  format: StoredSavedReportFormat;
  createdAt: string;
  lastRunAt: string | null;
};

export type CreateSavedReportInput = {
  name: string;
  viewType: string;
  params?: StoredSavedReportParams;
  format?: string;
};

type Row = {
  id: string;
  name: string;
  view_type: string;
  params: string;
  format: string;
  created_at: number;
  last_run_at: number | null;
};

function toReport(row: Row): StoredSavedReport {
  return {
    id: row.id,
    name: row.name,
    viewType: row.view_type as StoredSavedReportViewType,
    params: safeParseParams(row.params),
    format: row.format as StoredSavedReportFormat,
    createdAt: new Date(row.created_at).toISOString(),
    lastRunAt: row.last_run_at ? new Date(row.last_run_at).toISOString() : null
  };
}

function safeParseParams(value: string): StoredSavedReportParams {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function validateParams(params: StoredSavedReportParams) {
  for (const key of Object.keys(params)) {
    if (!ALLOWED_PARAM_KEYS.has(key)) {
      throw new Error(`saved report: unsupported param ${key}`);
    }
    const value = params[key];
    if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
      throw new Error(`saved report: param ${key} must be a string, number, or boolean`);
    }
  }
}

export function createSavedReport(input: CreateSavedReportInput): StoredSavedReport {
  const name = input.name?.trim();
  if (!name) throw new Error("saved report: name is required");

  const viewType = input.viewType?.trim() as StoredSavedReportViewType;
  if (!viewType || !VIEW_TYPES.has(viewType)) {
    throw new Error(`saved report: unsupported view type ${input.viewType}`);
  }

  const format = (input.format?.trim() ?? "markdown") as StoredSavedReportFormat;
  if (!FORMATS.has(format)) {
    throw new Error(`saved report: unsupported format ${input.format}`);
  }

  const params = input.params ?? {};
  validateParams(params);

  const nameLower = name.toLowerCase();
  const existing = sqlite
    .prepare(`SELECT id FROM saved_reports WHERE name_lower = ?`)
    .get(nameLower);
  if (existing) {
    throw new Error(`saved report: a report named "${name}" already exists`);
  }

  const id = `report-${randomUUID().slice(0, 8)}`;
  const now = Date.now();

  sqlite
    .prepare(
      `INSERT INTO saved_reports (id, name, name_lower, view_type, params, format, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(id, name, nameLower, viewType, JSON.stringify(params), format, now);

  return {
    id,
    name,
    viewType,
    params,
    format,
    createdAt: new Date(now).toISOString(),
    lastRunAt: null
  };
}

export function listSavedReports(): StoredSavedReport[] {
  const rows = sqlite
    .prepare(
      `SELECT id, name, view_type, params, format, created_at, last_run_at
       FROM saved_reports
       ORDER BY created_at DESC`
    )
    .all() as Row[];
  return rows.map(toReport);
}

export function findSavedReportByName(name: string): StoredSavedReport | null {
  if (!name?.trim()) return null;
  const row = sqlite
    .prepare(
      `SELECT id, name, view_type, params, format, created_at, last_run_at
       FROM saved_reports
       WHERE name_lower = ?`
    )
    .get(name.trim().toLowerCase()) as Row | undefined;
  return row ? toReport(row) : null;
}

export function findSavedReportById(id: string): StoredSavedReport | null {
  const row = sqlite
    .prepare(
      `SELECT id, name, view_type, params, format, created_at, last_run_at
       FROM saved_reports
       WHERE id = ?`
    )
    .get(id) as Row | undefined;
  return row ? toReport(row) : null;
}

export function deleteSavedReport(id: string): boolean {
  const result = sqlite.prepare(`DELETE FROM saved_reports WHERE id = ?`).run(id);
  return result.changes > 0;
}

export function markSavedReportRan(id: string): void {
  sqlite
    .prepare(`UPDATE saved_reports SET last_run_at = ? WHERE id = ?`)
    .run(Date.now(), id);
}
