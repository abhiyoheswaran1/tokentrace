"use client";

import { Filter, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CostFilter, ExactFilter, SessionExplorerFilterState } from "@/components/session-explorer/filtering";

export function FiltersSection({
  filters,
  options,
  hasFilters,
  activeFilters,
  onClearFilters,
  setQuery,
  setTool,
  setModel,
  setProject,
  setExact,
  setCost,
  setFrom,
  setTo,
  setHighCost,
  setHasCache
}: {
  filters: SessionExplorerFilterState;
  options: { tools: string[]; models: string[]; projects: string[] };
  hasFilters: boolean;
  activeFilters: string[];
  onClearFilters: () => void;
  setQuery: (value: string) => void;
  setTool: (value: string) => void;
  setModel: (value: string) => void;
  setProject: (value: string) => void;
  setExact: (value: ExactFilter) => void;
  setCost: (value: CostFilter) => void;
  setFrom: (value: string) => void;
  setTo: (value: string) => void;
  setHighCost: (value: boolean) => void;
  setHasCache: (value: boolean) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Search by date, tool, model, project, estimated status, or high cost.</CardDescription>
        </div>
        {hasFilters ? (
          <Button type="button" size="sm" variant="outline" onClick={onClearFilters} aria-label="Clear filters">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="query">Search</Label>
            <Input id="query" value={filters.query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, file, model" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tool">Tool</Label>
            <select id="tool" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={filters.tool} onChange={(event) => setTool(event.target.value)}>
              <option value="all">All tools</option>
              {options.tools.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="model">Model</Label>
            <select id="model" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={filters.model} onChange={(event) => setModel(event.target.value)}>
              <option value="all">All models</option>
              {options.models.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project">Project</Label>
            <select id="project" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={filters.project} onChange={(event) => setProject(event.target.value)}>
              <option value="all">All projects</option>
              {options.projects.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" value={filters.from} onChange={(event) => setFrom(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" value={filters.to} onChange={(event) => setTo(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exact">Token source</Label>
            <select id="exact" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={filters.exact} onChange={(event) => setExact(event.target.value as ExactFilter)}>
              <option value="all">Exact and estimated</option>
              <option value="exact">Exact only</option>
              <option value="estimated">Estimated only</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cost">Cost status</Label>
            <select id="cost" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={filters.cost} onChange={(event) => setCost(event.target.value as CostFilter)}>
              <option value="all">Priced and unknown</option>
              <option value="priced">Priced only</option>
              <option value="unknown">Unknown cost only</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
              <input type="checkbox" checked={filters.highCost} onChange={(event) => setHighCost(event.target.checked)} />
              High-cost sessions
            </label>
          </div>
          <div className="flex items-end">
            <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
              <input type="checkbox" checked={filters.hasCache} onChange={(event) => setHasCache(event.target.checked)} />
              Has cache tokens
            </label>
          </div>
        </div>
        <div aria-live="polite" className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active filters</span>
          {activeFilters.length ? (
            activeFilters.map((filter) => (
              <Badge key={filter} variant="secondary" className="max-w-full">
                <span className="truncate">{filter}</span>
              </Badge>
            ))
          ) : (
            <span className="text-sm text-muted-foreground">None</span>
          )}
          {activeFilters.length ? (
            <Button type="button" size="sm" variant="ghost" onClick={onClearFilters} aria-label="Clear filters">
              <RotateCcw className="h-4 w-4" />
              Clear filters
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
