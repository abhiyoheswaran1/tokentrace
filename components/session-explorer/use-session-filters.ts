"use client";

import { useMemo, useState } from "react";
import type { SessionRow } from "@/src/lib/analytics";
import {
  filterSessions,
  getActiveSessionFilters,
  getCurrentSessionFilters,
  getHighCostThreshold,
  getPaginationWindow,
  getSessionFilterOptions,
  hasSessionFilters,
  summarizeSessions,
  type CostFilter,
  type ExactFilter,
  type SessionExplorerFilterState
} from "@/components/session-explorer/filtering";

/**
 * Owns every filter and pagination state hook for the Session Explorer plus
 * the derived values (options, filtered rows, summary, pagination window).
 * The page resets to 1 whenever any filter changes.
 */
export function useSessionFilters({
  sessions,
  initialProject,
  initialTool,
  initialModel,
  initialQuery,
  initialSource,
  initialExact,
  initialCost,
  initialFrom,
  initialTo,
  initialHighCost,
  initialCache
}: {
  sessions: SessionRow[];
  initialProject?: string;
  initialTool?: string;
  initialModel?: string;
  initialQuery?: string;
  initialSource?: string;
  initialExact?: ExactFilter;
  initialCost?: CostFilter;
  initialFrom?: string;
  initialTo?: string;
  initialHighCost?: boolean;
  initialCache?: boolean;
}) {
  const [query, setQuery] = useState(initialQuery ?? initialSource ?? "");
  const [tool, setTool] = useState(initialTool ?? "all");
  const [model, setModel] = useState(initialModel ?? "all");
  const [project, setProject] = useState(initialProject ?? "all");
  const [exact, setExact] = useState<ExactFilter>(initialExact ?? "all");
  const [cost, setCost] = useState<CostFilter>(initialCost ?? "all");
  const [from, setFrom] = useState(initialFrom ?? "");
  const [to, setTo] = useState(initialTo ?? "");
  const [highCost, setHighCost] = useState(Boolean(initialHighCost));
  const [hasCache, setHasCache] = useState(Boolean(initialCache));
  const [page, setPage] = useState(1);

  const options = useMemo(() => getSessionFilterOptions(sessions), [sessions]);
  const highCostThreshold = useMemo(() => getHighCostThreshold(sessions) ?? 0, [sessions]);
  const filterState = useMemo<SessionExplorerFilterState>(
    () => ({ query, tool, model, project, exact, cost, from, to, highCost, hasCache }),
    [cost, exact, from, hasCache, highCost, model, project, query, to, tool]
  );
  const [prevFilterState, setPrevFilterState] = useState(filterState);
  if (filterState !== prevFilterState) {
    setPrevFilterState(filterState);
    setPage(1);
  }
  const filtered = useMemo(
    () => filterSessions(sessions, filterState, highCostThreshold),
    [filterState, highCostThreshold, sessions]
  );
  const filteredSummary = useMemo(() => summarizeSessions(filtered), [filtered]);
  const hasFilters = useMemo(() => hasSessionFilters(filterState), [filterState]);
  const pagination = getPaginationWindow(filtered.length, page);
  const visibleSessions = filtered.slice(pagination.start, pagination.end);
  const activeFilters = useMemo(() => getActiveSessionFilters(filterState), [filterState]);
  const currentFilters = useMemo(() => getCurrentSessionFilters(filterState), [filterState]);

  function clearFilters() {
    setQuery("");
    setTool("all");
    setModel("all");
    setProject("all");
    setExact("all");
    setCost("all");
    setFrom("");
    setTo("");
    setHighCost(false);
    setHasCache(false);
  }

  return {
    filters: filterState,
    setQuery,
    setTool,
    setModel,
    setProject,
    setExact,
    setCost,
    setFrom,
    setTo,
    setHighCost,
    setHasCache,
    options,
    filtered,
    filteredSummary,
    hasFilters,
    activeFilters,
    currentFilters,
    pagination,
    visibleSessions,
    setPage,
    clearFilters
  };
}
