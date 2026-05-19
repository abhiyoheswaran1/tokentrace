"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, Download, Filter, RotateCcw, Trash2 } from "lucide-react";
import type { SessionRow } from "@/src/lib/analytics";
import type { SavedView, SavedViews } from "@/src/lib/saved-views";
import { formatCurrency, formatDate, formatDuration, formatTokens } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ScanNowButton } from "@/components/scan-now-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText } from "@/components/ui/typography";

type ExactFilter = "all" | "exact" | "estimated";
type CostFilter = "all" | "priced" | "unknown";
const SESSION_PAGE_SIZE = 50;

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

function confidenceVariant(grade: string) {
  if (grade === "high") return "success";
  if (grade === "medium") return "warning";
  if (grade === "low") return "destructive";
  return "secondary";
}

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
  const [viewName, setViewName] = useState("");
  const [customViews, setCustomViews] = useState<SavedView[]>(savedViews.custom);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);

  const tools = useMemo(() => Array.from(new Set(sessions.map((session) => session.tool))).sort(), [sessions]);
  const models = useMemo(
    () =>
      Array.from(
        new Set(
          sessions.flatMap((session) =>
            session.models
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          )
        )
      ).sort(),
    [sessions]
  );
  const projects = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.project))).sort(),
    [sessions]
  );
  const highCostThreshold = useMemo(() => {
    const costs = sessions
      .map((session) => session.cost ?? 0)
      .filter((cost) => cost > 0)
      .sort((a, b) => a - b);
    return costs.length ? costs[Math.floor(costs.length * 0.85)] : 0;
  }, [sessions]);

  const filtered = useMemo(() => {
    const fromMs = from ? new Date(`${from}T00:00:00`).getTime() : null;
    const toMs = to ? new Date(`${to}T23:59:59`).getTime() : null;
    const normalizedQuery = query.toLowerCase();

    return sessions.filter((session) => {
      if (tool !== "all" && session.tool !== tool) return false;
      if (model !== "all" && !session.models.split(",").map((item) => item.trim()).includes(model)) return false;
      if (project !== "all" && session.project !== project) return false;
      if (exact === "exact" && session.estimatedTokens) return false;
      if (exact === "estimated" && !session.estimatedTokens) return false;
      if (cost === "priced" && session.cost == null) return false;
      if (cost === "unknown" && session.cost != null) return false;
      if (fromMs && (!session.startedAt || session.startedAt < fromMs)) return false;
      if (toMs && (!session.startedAt || session.startedAt > toMs)) return false;
      if (highCost && (session.cost ?? 0) < highCostThreshold) return false;
      if (hasCache && session.cachedTokens <= 0) return false;
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
  }, [cost, exact, from, hasCache, highCost, highCostThreshold, model, project, query, sessions, to, tool]);
  const filteredSummary = useMemo(
    () =>
      filtered.reduce(
        (summary, session) => {
          summary.tokens += session.totalTokens;
          summary.cost += session.cost ?? 0;
          summary.exact += session.tokenConfidence === "exact" ? 1 : 0;
          summary.estimated += session.estimatedTokens ? 1 : 0;
          summary.unknown += session.tokenConfidence === "unknown" ? 1 : 0;
          return summary;
        },
        { tokens: 0, cost: 0, exact: 0, estimated: 0, unknown: 0 }
      ),
    [filtered]
  );
  const hasFilters =
    query ||
    tool !== "all" ||
    model !== "all" ||
    project !== "all" ||
    exact !== "all" ||
    cost !== "all" ||
    from ||
    to ||
    highCost ||
    hasCache;
  const hasEvidenceContext = Boolean(initialProject || initialTool || initialModel || initialSource || initialCost || initialCache);
  const pagination = getPaginationWindow(filtered.length, page);
  const visibleSessions = filtered.slice(pagination.start, pagination.end);
  const currentFilters = useMemo(() => {
    const filters: Record<string, string | boolean> = {};
    if (query) filters.query = query;
    if (tool !== "all") filters.tool = tool;
    if (model !== "all") filters.model = model;
    if (project !== "all") filters.project = project;
    if (exact !== "all") filters.exact = exact;
    if (cost !== "all") filters.cost = cost;
    if (from) filters.from = from;
    if (to) filters.to = to;
    if (highCost) filters.highCost = true;
    if (hasCache) filters.cache = true;
    return filters;
  }, [cost, exact, from, hasCache, highCost, model, project, query, to, tool]);

  useEffect(() => {
    setPage(1);
  }, [cost, exact, from, hasCache, highCost, model, project, query, to, tool]);

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

  async function saveCurrentView() {
    const name = viewName.trim();
    if (!name) {
      setSaveError("Name is required.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/saved-views", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, filters: currentFilters })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Could not save view.");
      setCustomViews((views) => [body.view, ...views.filter((view) => view.id !== body.view.id)]);
      setViewName("");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Could not save view.");
    } finally {
      setSaving(false);
    }
  }

  async function removeView(view: SavedView) {
    setCustomViews((views) => views.filter((item) => item.id !== view.id));
    await fetch(`/api/saved-views/${encodeURIComponent(view.id)}`, { method: "DELETE" });
  }

  function ViewLink({ view }: { view: SavedView }) {
    return (
      <span className="inline-flex min-w-0 items-center rounded-md border bg-card">
        <Link
          href={view.href}
          className="min-w-0 truncate px-3 py-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {view.name}
        </Link>
        {!view.builtIn ? (
          <button
            type="button"
            onClick={() => void removeView(view)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-l text-muted-foreground hover:text-foreground"
            aria-label={`Delete ${view.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
      </span>
    );
  }

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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <BookmarkPlus className="h-4 w-4" />
            Saved Views
          </CardTitle>
          <CardDescription>Fast local filters for review queues, monthly provider checks, and repeated evidence paths.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <FieldLabel>Built-in</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {savedViews.builtIn.map((view) => (
                <ViewLink key={view.id} view={view} />
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <FieldLabel>Local</FieldLabel>
            {customViews.length ? (
              <div className="flex flex-wrap gap-2">
                {customViews.map((view) => (
                  <ViewLink key={view.id} view={view} />
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No local saved views yet.</div>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="Save current filters as..."
              className="sm:max-w-xs"
            />
            <Button type="button" size="sm" onClick={() => void saveCurrentView()} disabled={saving}>
              <BookmarkPlus className="h-4 w-4" />
              Save view
            </Button>
            {saveError ? <div className="text-sm text-destructive">{saveError}</div> : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
          <CardDescription>Search by date, tool, model, project, estimated status, or high cost.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="query">Search</Label>
              <Input id="query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, file, model" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tool">Tool</Label>
              <select id="tool" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={tool} onChange={(event) => setTool(event.target.value)}>
                <option value="all">All tools</option>
                {tools.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">Model</Label>
              <select id="model" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={model} onChange={(event) => setModel(event.target.value)}>
                <option value="all">All models</option>
                {models.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="project">Project</Label>
              <select id="project" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={project} onChange={(event) => setProject(event.target.value)}>
                <option value="all">All projects</option>
                {projects.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="exact">Token source</Label>
              <select id="exact" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={exact} onChange={(event) => setExact(event.target.value as ExactFilter)}>
                <option value="all">Exact and estimated</option>
                <option value="exact">Exact only</option>
                <option value="estimated">Estimated only</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cost">Cost status</Label>
              <select id="cost" className="h-9 w-full rounded-md border bg-card px-3 text-sm" value={cost} onChange={(event) => setCost(event.target.value as CostFilter)}>
                <option value="all">Priced and unknown</option>
                <option value="priced">Priced only</option>
                <option value="unknown">Unknown cost only</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
                <input type="checkbox" checked={highCost} onChange={(event) => setHighCost(event.target.checked)} />
                High-cost sessions
              </label>
            </div>
            <div className="flex items-end">
              <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
                <input type="checkbox" checked={hasCache} onChange={(event) => setHasCache(event.target.checked)} />
                Has cache tokens
              </label>
            </div>
          </div>
          {hasFilters ? (
            <div className="mt-3">
              <Button type="button" size="sm" variant="ghost" onClick={clearFilters}>
                <RotateCcw className="h-4 w-4" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Sessions</CardTitle>
            <CardDescription>
              {filtered.length.toLocaleString()} sessions match the current filters.
              {filtered.length > SESSION_PAGE_SIZE
                ? ` Showing ${pagination.start + 1}-${pagination.end}.`
                : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <a href="/api/export?type=sessions">
                <Download className="h-4 w-4" />
                CSV
              </a>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid border-y sm:grid-cols-2 sm:divide-x lg:grid-cols-5">
            <div className="p-3">
              <FieldLabel>Filtered tokens</FieldLabel>
              <DataValue className="mt-1">{formatTokens(filteredSummary.tokens)}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Filtered cost</FieldLabel>
              <DataValue className="mt-1">{formatCurrency(filteredSummary.cost)}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Exact sessions</FieldLabel>
              <DataValue className="mt-1">{filteredSummary.exact.toLocaleString()}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Estimated sessions</FieldLabel>
              <DataValue className="mt-1">{filteredSummary.estimated.toLocaleString()}</DataValue>
            </div>
            <div className="p-3">
              <FieldLabel>Unknown confidence</FieldLabel>
              <DataValue className="mt-1">{filteredSummary.unknown.toLocaleString()}</DataValue>
            </div>
          </div>
          <div className="table-scroll overflow-x-auto">
          <Table className="min-w-[78rem]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Date</TableHead>
                <TableHead className="w-28">Tool</TableHead>
                <TableHead className="w-32">Project</TableHead>
                <TableHead className="w-48">Model</TableHead>
                <TableHead className="w-24">Tokens</TableHead>
                <TableHead className="w-24">Cost</TableHead>
                <TableHead className="w-20">Duration</TableHead>
                <TableHead className="w-32">Flag</TableHead>
                <TableHead className="w-32">Confidence</TableHead>
                <TableHead className="w-36">Parser</TableHead>
                <TableHead className="w-28">Evidence</TableHead>
                <TableHead className="w-80">Source file</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                visibleSessions.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatDate(session.startedAt)}</TableCell>
                    <TableCell className="font-medium">{session.tool}</TableCell>
                    <TableCell className="max-w-32 truncate" title={session.project}>{session.project}</TableCell>
                    <TableCell className="max-w-44 truncate" title={session.models}>{session.models}</TableCell>
                    <TableCell className="tabular-nums">{formatTokens(session.totalTokens)}</TableCell>
                    <TableCell className="tabular-nums">{formatCurrency(session.cost)}</TableCell>
                    <TableCell>{formatDuration(session.durationMs)}</TableCell>
                    <TableCell>
                      <Badge variant={session.tokenConfidence === "exact" ? "success" : session.tokenConfidence === "unknown" ? "destructive" : "warning"}>
                        {session.tokenConfidence}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={confidenceVariant(session.confidenceGrade ?? "empty")}>
                        {session.confidenceScore ?? 0}/100 {session.confidenceGrade ?? "empty"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{session.parser ?? "unknown"}</div>
                        {session.parserConfidence != null ? (
                          <div className="text-xs text-muted-foreground">
                            {Math.round(session.parserConfidence * 100)}% confidence
                          </div>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/sessions/${encodeURIComponent(session.id)}`} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                          Timeline
                        </Link>
                        <Link href={session.parserHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                          Parser
                        </Link>
                        {session.pricingHref ? (
                          <Link href={session.pricingHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                            Model rates
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-80 truncate" title={session.sourceFile}>
                      <MonoText className="block truncate">{session.sourceFile}</MonoText>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={12} className="py-8 text-center text-sm text-muted-foreground">
                    No sessions match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
          {filtered.length > SESSION_PAGE_SIZE ? (
            <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Page {pagination.currentPage.toLocaleString()} of {pagination.totalPages.toLocaleString()}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => setPage((current) => Math.min(pagination.totalPages, current + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
