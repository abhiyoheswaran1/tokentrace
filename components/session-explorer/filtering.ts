import type { SessionRow } from "@/src/lib/analytics";

export type ExactFilter = "all" | "exact" | "estimated";
export type CostFilter = "all" | "priced" | "unknown";
export type RowDensity = "comfortable" | "compact";

export const SESSION_PAGE_SIZE = 50;

export type SessionExplorerFilterState = {
  query: string;
  tool: string;
  model: string;
  project: string;
  exact: ExactFilter;
  cost: CostFilter;
  from: string;
  to: string;
  highCost: boolean;
  hasCache: boolean;
};

export function getPaginationWindow(total: number, page: number, pageSize = SESSION_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  return {
    totalPages,
    currentPage,
    start,
    end
  };
}

export function getSessionFilterOptions(sessions: SessionRow[]) {
  return {
    tools: Array.from(new Set(sessions.map((session) => session.tool))).sort(),
    models: Array.from(
      new Set(
        sessions.flatMap((session) =>
          session.models
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        )
      )
    ).sort(),
    projects: Array.from(new Set(sessions.map((session) => session.project))).sort()
  };
}

export function getHighCostThreshold(sessions: SessionRow[]) {
  const costs = sessions
    .map((session) => session.cost ?? 0)
    .filter((cost) => cost > 0)
    .sort((a, b) => a - b);
  return costs.length ? costs[Math.floor(costs.length * 0.85)] : 0;
}

export function filterSessions(
  sessions: SessionRow[],
  filters: SessionExplorerFilterState,
  highCostThreshold: number
) {
  const fromMs = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : null;
  const toMs = filters.to ? new Date(`${filters.to}T23:59:59`).getTime() : null;
  const normalizedQuery = filters.query.toLowerCase();

  return sessions.filter((session) => {
    if (filters.tool !== "all" && session.tool !== filters.tool) return false;
    if (filters.model !== "all" && !session.models.split(",").map((item) => item.trim()).includes(filters.model)) return false;
    if (filters.project !== "all" && session.project !== filters.project) return false;
    if (filters.exact === "exact" && session.estimatedTokens) return false;
    if (filters.exact === "estimated" && !session.estimatedTokens) return false;
    if (filters.cost === "priced" && session.cost == null) return false;
    if (filters.cost === "unknown" && session.cost != null) return false;
    if (fromMs && (!session.startedAt || session.startedAt < fromMs)) return false;
    if (toMs && (!session.startedAt || session.startedAt > toMs)) return false;
    if (filters.highCost && (session.cost ?? 0) < highCostThreshold) return false;
    if (filters.hasCache && session.cachedTokens <= 0) return false;
    if (!normalizedQuery) return true;
    return [
      session.title,
      session.sourceFile,
      session.tool,
      session.project,
      session.models,
      session.parser,
      session.parserStatus
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedQuery);
  });
}

export function summarizeSessions(sessions: SessionRow[]) {
  return sessions.reduce(
    (summary, session) => {
      summary.tokens += session.totalTokens;
      summary.cost += session.cost ?? 0;
      summary.exact += session.tokenConfidence === "exact" ? 1 : 0;
      summary.estimated += session.estimatedTokens ? 1 : 0;
      summary.unknown += session.tokenConfidence === "unknown" ? 1 : 0;
      return summary;
    },
    { tokens: 0, cost: 0, exact: 0, estimated: 0, unknown: 0 }
  );
}

export function hasSessionFilters(filters: SessionExplorerFilterState) {
  return Boolean(
    filters.query ||
    filters.tool !== "all" ||
    filters.model !== "all" ||
    filters.project !== "all" ||
    filters.exact !== "all" ||
    filters.cost !== "all" ||
    filters.from ||
    filters.to ||
    filters.highCost ||
    filters.hasCache
  );
}

export function getActiveSessionFilters(filters: SessionExplorerFilterState) {
  const active: string[] = [];
  if (filters.query) active.push(`Search: ${filters.query}`);
  if (filters.tool !== "all") active.push(`Tool: ${filters.tool}`);
  if (filters.model !== "all") active.push(`Model: ${filters.model}`);
  if (filters.project !== "all") active.push(`Project: ${filters.project}`);
  if (filters.exact !== "all") active.push(`Tokens: ${filters.exact}`);
  if (filters.cost !== "all") active.push(`Cost: ${filters.cost}`);
  if (filters.from) active.push(`From: ${filters.from}`);
  if (filters.to) active.push(`To: ${filters.to}`);
  if (filters.highCost) active.push("High-cost");
  if (filters.hasCache) active.push("Has cache tokens");
  return active;
}

export function getCurrentSessionFilters(filters: SessionExplorerFilterState) {
  const current: Record<string, string | boolean> = {};
  if (filters.query) current.query = filters.query;
  if (filters.tool !== "all") current.tool = filters.tool;
  if (filters.model !== "all") current.model = filters.model;
  if (filters.project !== "all") current.project = filters.project;
  if (filters.exact !== "all") current.exact = filters.exact;
  if (filters.cost !== "all") current.cost = filters.cost;
  if (filters.from) current.from = filters.from;
  if (filters.to) current.to = filters.to;
  if (filters.highCost) current.highCost = true;
  if (filters.hasCache) current.cache = true;
  return current;
}
