import crypto from "node:crypto";
import { sqlite } from "@/src/db/client";

export type SavedViewFilters = {
  query?: string;
  source?: string;
  tool?: string;
  model?: string;
  project?: string;
  exact?: "all" | "exact" | "estimated";
  cost?: "all" | "priced" | "unknown";
  from?: string;
  to?: string;
  highCost?: boolean;
  cache?: boolean;
};

export type SavedView = {
  id: string;
  name: string;
  filters: SavedViewFilters;
  href: string;
  builtIn: boolean;
  createdAt: number | null;
  updatedAt: number | null;
};

export type SavedViews = {
  builtIn: SavedView[];
  custom: SavedView[];
};

type SavedViewRow = {
  id: string;
  name: string;
  filters: string;
  createdAt: number | null;
  updatedAt: number | null;
};

const costValues = new Set(["all", "priced", "unknown"]);
const exactValues = new Set(["all", "exact", "estimated"]);

function hashId(name: string) {
  return `view-${crypto.createHash("sha1").update(name).digest("hex").slice(0, 16)}`;
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfMonth(date: Date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return dateOnly(value);
}

function text(value: unknown, maxLength = 200) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeFilters(input: Record<string, unknown>): SavedViewFilters {
  const filters: SavedViewFilters = {};
  const query = text(input.query);
  const source = text(input.source, 1000);
  const tool = text(input.tool);
  const model = text(input.model);
  const project = text(input.project);
  const from = text(input.from, 20);
  const to = text(input.to, 20);

  if (query) filters.query = query;
  if (source) filters.source = source;
  if (tool) filters.tool = tool;
  if (model) filters.model = model;
  if (project) filters.project = project;
  if (from) filters.from = from;
  if (to) filters.to = to;

  if (input.exact != null) {
    if (typeof input.exact !== "string" || !exactValues.has(input.exact)) {
      throw new Error("unsupported exact filter");
    }
    if (input.exact !== "all") filters.exact = input.exact as SavedViewFilters["exact"];
  }

  if (input.cost != null) {
    if (typeof input.cost !== "string" || !costValues.has(input.cost)) {
      throw new Error("unsupported cost filter");
    }
    if (input.cost !== "all") filters.cost = input.cost as SavedViewFilters["cost"];
  }

  if (input.highCost === true) filters.highCost = true;
  if (input.cache === true) filters.cache = true;
  return filters;
}

export function savedViewHref(filters: SavedViewFilters) {
  const params = new URLSearchParams();
  if (filters.query) params.set("query", filters.query);
  if (filters.source) params.set("source", filters.source);
  if (filters.tool) params.set("tool", filters.tool);
  if (filters.model) params.set("model", filters.model);
  if (filters.project) params.set("project", filters.project);
  if (filters.exact) params.set("exact", filters.exact);
  if (filters.cost) params.set("cost", filters.cost);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.highCost) params.set("highCost", "1");
  if (filters.cache) params.set("cache", "1");
  const query = params.toString();
  return query ? `/sessions?${query}` : "/sessions";
}

function builtInView(id: string, name: string, filters: SavedViewFilters): SavedView {
  return {
    id,
    name,
    filters,
    href: savedViewHref(filters),
    builtIn: true,
    createdAt: null,
    updatedAt: null
  };
}

function builtInViews(now: Date): SavedView[] {
  const from = startOfMonth(now);
  const to = dateOnly(now);
  return [
    builtInView("unknown-cost", "Unknown cost", { cost: "unknown" }),
    builtInView("high-cost-sessions", "High-cost sessions", { highCost: true }),
    builtInView("claude-this-month", "Claude this month", { tool: "Claude Code", from, to }),
    builtInView("codex-this-month", "Codex this month", { tool: "Codex CLI", from, to }),
    builtInView("estimated-tokens", "Estimated tokens", { exact: "estimated" }),
    builtInView("guardrail-review", "Guardrail review", { highCost: true, cost: "priced" }),
    builtInView("parser-review", "Parser review", { exact: "estimated", cost: "unknown" })
  ];
}

function parseFilters(value: string): SavedViewFilters {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? normalizeFilters(parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function rowToView(row: SavedViewRow): SavedView {
  const filters = parseFilters(row.filters);
  return {
    id: row.id,
    name: row.name,
    filters,
    href: savedViewHref(filters),
    builtIn: false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function getSavedViews(now = new Date()): SavedViews {
  const custom = (
    sqlite
      .prepare(
        `SELECT id, name, filters, created_at AS createdAt, updated_at AS updatedAt
         FROM saved_views
         ORDER BY updated_at DESC, name ASC`
      )
      .all() as SavedViewRow[]
  ).map(rowToView);

  return {
    builtIn: builtInViews(now),
    custom
  };
}

export function saveSavedView(input: { name: string; filters: Record<string, unknown> }): SavedView {
  const name = text(input.name, 80);
  if (!name) throw new Error("name is required");
  const filters = normalizeFilters(input.filters ?? {});
  const id = hashId(name);
  const now = Date.now();
  const existing = sqlite.prepare("SELECT created_at AS createdAt FROM saved_views WHERE id = ?").get(id) as
    | { createdAt: number | null }
    | undefined;
  sqlite
    .prepare(
      `INSERT INTO saved_views (id, name, filters, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         filters = excluded.filters,
         updated_at = excluded.updated_at`
    )
    .run(id, name, JSON.stringify(filters), existing?.createdAt ?? now, now);

  return {
    id,
    name,
    filters,
    href: savedViewHref(filters),
    builtIn: false,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
}

export function deleteSavedView(id: string) {
  const normalized = text(id, 120);
  if (!normalized) return false;
  const result = sqlite.prepare("DELETE FROM saved_views WHERE id = ?").run(normalized);
  return result.changes > 0;
}
