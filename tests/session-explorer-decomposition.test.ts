import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { SessionRow } from "@/src/lib/analytics";
import {
  filterSessions,
  getActiveSessionFilters,
  getCurrentSessionFilters,
  getHighCostThreshold,
  getPaginationWindow,
  summarizeSessions
} from "@/components/session-explorer/filtering";

function read(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const baseSession: SessionRow = {
  id: "session-1",
  startedAt: new Date("2026-05-01T12:00:00Z").getTime(),
  endedAt: null,
  title: "Codex dashboard work",
  sourceFile: "/tmp/session-1.jsonl",
  tool: "Codex CLI",
  provider: "openai",
  project: "token-usage",
  projectPath: "/repo",
  models: "gpt-5.2, gpt-5.4",
  totalTokens: 10_000,
  inputTokens: 6_000,
  outputTokens: 3_000,
  cachedTokens: 1_000,
  reasoningTokens: 0,
  cost: 3.5,
  costEstimated: false,
  estimatedTokens: false,
  tokenConfidence: "exact",
  parser: "codex",
  parserStatus: "imported",
  parserConfidence: 0.95,
  parserReason: null,
  sourceHref: "/debug",
  parserHref: "/parser-debug",
  pricingHref: "/pricing",
  interactionCount: 4,
  durationMs: 60_000,
  confidenceScore: 90,
  confidenceGrade: "high"
};

describe("Session Explorer decomposition", () => {
  it("keeps the component a thin coordinator while hooks and sections own the details", () => {
    const source = read("components/session-explorer.tsx");
    const helper = read("components/session-explorer/filtering.ts");
    const filtersHook = read("components/session-explorer/use-session-filters.ts");
    const savedViewsHook = read("components/session-explorer/use-saved-views.ts");
    const savedViewsSection = read("components/session-explorer/saved-views-section.tsx");
    const filtersSection = read("components/session-explorer/filters-section.tsx");
    const sessionsTable = read("components/session-explorer/sessions-table.tsx");

    expect(source.trimEnd().split("\n").length).toBeLessThan(260);
    expect(source).toContain("@/components/session-explorer/filtering");
    expect(source).toContain("@/components/session-explorer/use-session-filters");
    expect(source).toContain("@/components/session-explorer/use-saved-views");
    expect(source).toContain("@/components/session-explorer/saved-views-section");
    expect(source).toContain("@/components/session-explorer/filters-section");
    expect(source).toContain("@/components/session-explorer/sessions-table");
    expect(filtersHook).toContain("export function useSessionFilters");
    expect(savedViewsHook).toContain("export function useSavedViews");
    expect(savedViewsHook).toContain("useJsonRequest");
    expect(savedViewsSection).toContain("export function SavedViewsSection");
    expect(filtersSection).toContain("export function FiltersSection");
    expect(sessionsTable).toContain("export function SessionsTable");
    expect(helper).toContain("export function filterSessions");
    expect(helper).toContain("export function summarizeSessions");
    expect(helper).toContain("export function getActiveSessionFilters");
    expect(helper).toContain("export function getCurrentSessionFilters");
    expect(helper).toContain("export function getHighCostThreshold");
  });

  it("filters, summarizes, and serializes saved-view state without rendering", () => {
    const sessions: SessionRow[] = [
      baseSession,
      {
        ...baseSession,
        id: "session-2",
        title: "Claude parser review",
        tool: "Claude Code",
        project: "website",
        models: "claude-sonnet-4",
        cachedTokens: 0,
        cost: null,
        estimatedTokens: true,
        tokenConfidence: "unknown"
      }
    ];

    const filters = {
      query: "dashboard",
      tool: "Codex CLI",
      model: "gpt-5.4",
      project: "token-usage",
      exact: "exact" as const,
      cost: "priced" as const,
      from: "2026-05-01",
      to: "2026-05-02",
      highCost: true,
      hasCache: true
    };

    const highCostThreshold = getHighCostThreshold(sessions);
    expect(highCostThreshold).toBeDefined();
    const filtered = filterSessions(sessions, filters, highCostThreshold!);

    expect(filtered.map((session) => session.id)).toEqual(["session-1"]);
    expect(summarizeSessions(filtered)).toMatchObject({ tokens: 10_000, cost: 3.5, exact: 1 });
    expect(getActiveSessionFilters(filters)).toContain("Model: gpt-5.4");
    expect(getCurrentSessionFilters(filters)).toEqual({
      query: "dashboard",
      tool: "Codex CLI",
      model: "gpt-5.4",
      project: "token-usage",
      exact: "exact",
      cost: "priced",
      from: "2026-05-01",
      to: "2026-05-02",
      highCost: true,
      cache: true
    });
    expect(getPaginationWindow(151, 99)).toMatchObject({ totalPages: 4, currentPage: 4 });
  });
});
