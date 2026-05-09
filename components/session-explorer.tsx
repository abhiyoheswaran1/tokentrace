"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, Filter, RotateCcw } from "lucide-react";
import type { SessionRow } from "@/src/lib/analytics";
import { formatCurrency, formatDate, formatDuration, formatTokens } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText } from "@/components/ui/typography";

type ExactFilter = "all" | "exact" | "estimated";
type CostFilter = "all" | "priced" | "unknown";

export function SessionExplorer({
  sessions,
  initialProject,
  initialTool,
  initialModel,
  initialSource,
  initialCost,
  initialCache
}: {
  sessions: SessionRow[];
  initialProject?: string;
  initialTool?: string;
  initialModel?: string;
  initialSource?: string;
  initialCost?: CostFilter;
  initialCache?: boolean;
}) {
  const [query, setQuery] = useState(initialSource ?? "");
  const [tool, setTool] = useState(initialTool ?? "all");
  const [model, setModel] = useState(initialModel ?? "all");
  const [project, setProject] = useState(initialProject ?? "all");
  const [exact, setExact] = useState<ExactFilter>("all");
  const [cost, setCost] = useState<CostFilter>(initialCost ?? "all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [highCost, setHighCost] = useState(false);
  const [hasCache, setHasCache] = useState(Boolean(initialCache));

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
            <CardDescription>{filtered.length.toLocaleString()} sessions match the current filters.</CardDescription>
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
          <div className="table-scroll">
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
                <TableHead className="w-36">Parser</TableHead>
                <TableHead className="w-28">Evidence</TableHead>
                <TableHead className="w-80">Source file</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                filtered.map((session) => (
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
                        <Link href={session.parserHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                          Parser
                        </Link>
                        {session.pricingHref ? (
                          <Link href={session.pricingHref} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                            Pricing
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
                  <TableCell colSpan={11} className="py-8 text-center text-sm text-muted-foreground">
                    No sessions match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
