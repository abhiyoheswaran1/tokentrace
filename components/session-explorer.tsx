"use client";

import { useMemo, useState } from "react";
import { Download, Filter, RotateCcw } from "lucide-react";
import type { SessionRow } from "@/src/lib/analytics";
import { formatCurrency, formatDate, formatDuration, formatTokens } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type ExactFilter = "all" | "exact" | "estimated";

export function SessionExplorer({
  sessions,
  initialProject
}: {
  sessions: SessionRow[];
  initialProject?: string;
}) {
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState("all");
  const [model, setModel] = useState("all");
  const [project, setProject] = useState(initialProject ?? "all");
  const [exact, setExact] = useState<ExactFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [highCost, setHighCost] = useState(false);

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
      if (fromMs && (!session.startedAt || session.startedAt < fromMs)) return false;
      if (toMs && (!session.startedAt || session.startedAt > toMs)) return false;
      if (highCost && (session.cost ?? 0) < highCostThreshold) return false;
      if (!normalizedQuery) return true;
      return [
        session.title,
        session.sourceFile,
        session.tool,
        session.project,
        session.models
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [exact, from, highCost, highCostThreshold, model, project, query, sessions, to, tool]);
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
    query || tool !== "all" || model !== "all" || project !== "all" || exact !== "all" || from || to || highCost;

  function clearFilters() {
    setQuery("");
    setTool("all");
    setModel("all");
    setProject("all");
    setExact("all");
    setFrom("");
    setTo("");
    setHighCost(false);
  }

  return (
    <div className="space-y-4">
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
            <div className="flex items-end">
              <label className="flex h-9 items-center gap-2 rounded-md border bg-card px-3 text-sm">
                <input type="checkbox" checked={highCost} onChange={(event) => setHighCost(event.target.checked)} />
                High-cost sessions
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
          <div className="grid overflow-hidden rounded-md border sm:grid-cols-2 lg:grid-cols-5">
            <div className="p-3">
              <div className="text-xs text-muted-foreground">Filtered tokens</div>
              <div className="mt-1 text-sm font-semibold">{formatTokens(filteredSummary.tokens)}</div>
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">Filtered cost</div>
              <div className="mt-1 text-sm font-semibold">{formatCurrency(filteredSummary.cost)}</div>
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">Exact sessions</div>
              <div className="mt-1 text-sm font-semibold">{filteredSummary.exact.toLocaleString()}</div>
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">Estimated sessions</div>
              <div className="mt-1 text-sm font-semibold">{filteredSummary.estimated.toLocaleString()}</div>
            </div>
            <div className="p-3">
              <div className="text-xs text-muted-foreground">Unknown confidence</div>
              <div className="mt-1 text-sm font-semibold">{filteredSummary.unknown.toLocaleString()}</div>
            </div>
          </div>
          <div className="table-scroll">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Tool</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Tokens</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Flag</TableHead>
                <TableHead>Source file</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length ? (
                filtered.map((session) => (
                  <TableRow key={session.id}>
                    <TableCell>{formatDate(session.startedAt)}</TableCell>
                    <TableCell className="font-medium">{session.tool}</TableCell>
                    <TableCell>{session.project}</TableCell>
                    <TableCell className="max-w-44 truncate" title={session.models}>{session.models}</TableCell>
                    <TableCell>{formatTokens(session.totalTokens)}</TableCell>
                    <TableCell>{formatCurrency(session.cost)}</TableCell>
                    <TableCell>{formatDuration(session.durationMs)}</TableCell>
                    <TableCell>
                      <Badge variant={session.tokenConfidence === "exact" ? "success" : session.tokenConfidence === "unknown" ? "destructive" : "warning"}>
                        {session.tokenConfidence}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-72 break-all font-mono text-xs" title={session.sourceFile}>{session.sourceFile}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="py-8 text-center text-sm text-muted-foreground">
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
