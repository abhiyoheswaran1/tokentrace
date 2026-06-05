"use client";

import type { SessionRow } from "@/src/lib/analytics";
import type { SavedViews } from "@/src/lib/saved-views";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import type { CostFilter, ExactFilter } from "@/components/session-explorer/filtering";
import { FiltersSection } from "@/components/session-explorer/filters-section";
import { SavedViewsSection } from "@/components/session-explorer/saved-views-section";
import { SessionsTable } from "@/components/session-explorer/sessions-table";
import { useSavedViews } from "@/components/session-explorer/use-saved-views";
import { useSessionFilters } from "@/components/session-explorer/use-session-filters";

export { getPaginationWindow } from "@/components/session-explorer/filtering";

// Thin coordinator: filter/pagination state lives in use-session-filters,
// save/delete flows in use-saved-views, and the section markup that used to
// be inline here now lives in the section modules:
// - sessions-table.tsx renders the table in its `overflow-x-auto` scroll
//   region with the Timeline / Parser / "Model rates" evidence links per row.
// - saved-views-section.tsx keeps saved-view chips truncating via `min-w-0`.
// - filters-section.tsx owns the filter grid and active-filter badges.
export function SessionExplorer({
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
  initialCache,
  savedViews
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
  savedViews: SavedViews;
}) {
  const explorer = useSessionFilters({
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
  });
  const views = useSavedViews(savedViews, explorer.currentFilters);
  const hasEvidenceContext = Boolean(initialProject || initialTool || initialModel || initialSource || initialCost || initialCache);

  if (!sessions.length) {
    return (
      <EmptyState
        title="No sessions imported yet"
        description="Run a scan after local AI CLI activity. If files were scanned but no sessions appeared, open Scan Health for parser and folder details."
        actions={[
          { label: "Open Scan Health", href: "/diagnostics", variant: "outline" }
        ]}
      >
        <ScanNowButton size="sm" />
      </EmptyState>
    );
  }

  return (
    <div className="space-y-4">
      {hasEvidenceContext ? (
        <Card className="border-primary/25 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle>Evidence Trail</CardTitle>
            <CardDescription>
              This view is filtered from a dashboard, repair queue, or parser link so you can inspect the sessions behind that number.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2 text-sm">
            {initialTool ? <Badge variant="secondary">Tool: {initialTool}</Badge> : null}
            {initialModel ? <Badge variant="secondary">Model: {initialModel}</Badge> : null}
            {initialProject ? <Badge variant="secondary">Project: {initialProject}</Badge> : null}
            {initialCost === "unknown" ? <Badge variant="warning">Unknown cost</Badge> : null}
            {initialCache ? <Badge variant="secondary">Has cache tokens</Badge> : null}
            {initialSource ? (
              <Badge variant="secondary" className="max-w-full">
                <span className="truncate">Source: {initialSource}</span>
              </Badge>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <SavedViewsSection
        builtInViews={savedViews.builtIn}
        customViews={views.customViews}
        viewName={views.viewName}
        onViewNameChange={views.setViewName}
        saving={views.saving}
        saveError={views.saveError}
        onSave={views.saveCurrentView}
        onRemove={views.removeView}
      />

      <FiltersSection
        filters={explorer.filters}
        options={explorer.options}
        hasFilters={explorer.hasFilters}
        activeFilters={explorer.activeFilters}
        onClearFilters={explorer.clearFilters}
        setQuery={explorer.setQuery}
        setTool={explorer.setTool}
        setModel={explorer.setModel}
        setProject={explorer.setProject}
        setExact={explorer.setExact}
        setCost={explorer.setCost}
        setFrom={explorer.setFrom}
        setTo={explorer.setTo}
        setHighCost={explorer.setHighCost}
        setHasCache={explorer.setHasCache}
      />

      <SessionsTable
        filtered={explorer.filtered}
        filteredSummary={explorer.filteredSummary}
        pagination={explorer.pagination}
        visibleSessions={explorer.visibleSessions}
        setPage={explorer.setPage}
        onClearFilters={explorer.clearFilters}
      />
    </div>
  );
}
