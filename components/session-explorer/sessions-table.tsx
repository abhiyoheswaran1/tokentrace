"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";
import { Download, RotateCcw } from "lucide-react";
import type { SessionRow } from "@/src/lib/analytics";
import { formatCurrency, formatDate, formatDuration, formatTokens } from "@/src/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataValue, FieldLabel, MonoText } from "@/components/ui/typography";
import { cn } from "@/src/lib/utils";
import { SESSION_PAGE_SIZE, type RowDensity } from "@/components/session-explorer/filtering";

function confidenceVariant(grade: string) {
  if (grade === "high") return "success";
  if (grade === "medium") return "warning";
  if (grade === "low") return "destructive";
  return "secondary";
}

export function SessionsTable({
  filtered,
  filteredSummary,
  pagination,
  visibleSessions,
  setPage,
  onClearFilters
}: {
  filtered: SessionRow[];
  filteredSummary: { tokens: number; cost: number; exact: number; estimated: number; unknown: number };
  pagination: { totalPages: number; currentPage: number; start: number; end: number };
  visibleSessions: SessionRow[];
  setPage: Dispatch<SetStateAction<number>>;
  onClearFilters: () => void;
}) {
  const [rowDensity, setRowDensity] = useState<RowDensity>("comfortable");
  const tableDensityClass = rowDensity === "compact" ? "[&_td]:py-2 [&_th]:h-9" : "[&_td]:py-3 [&_th]:h-10";

  return (
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border bg-muted/20 p-0.5" aria-label="Row density">
            <Button
              type="button"
              size="sm"
              variant={rowDensity === "comfortable" ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setRowDensity("comfortable")}
            >
              Comfortable
            </Button>
            <Button
              type="button"
              size="sm"
              variant={rowDensity === "compact" ? "secondary" : "ghost"}
              className="h-7 px-2 text-xs"
              onClick={() => setRowDensity("compact")}
            >
              Compact
            </Button>
          </div>
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
        {filtered.length ? (
        <div className="table-scroll max-h-152 overflow-x-auto">
        <Table className={cn("min-w-312", tableDensityClass)}>
          <TableHeader className="sticky top-0 z-10 bg-background shadow-xs">
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
            {visibleSessions.map((session) => (
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
              ))}
          </TableBody>
        </Table>
        </div>
        ) : (
          <div className="rounded-md border bg-muted/20 px-4 py-8 text-center">
            <div className="text-sm font-semibold">No matching sessions</div>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
              The current filters hide every imported session. Clear them to return to the full local session list.
            </p>
            <Button type="button" size="sm" variant="outline" className="mt-4" onClick={onClearFilters}>
              <RotateCcw className="h-4 w-4" />
              Clear filters and show all sessions
            </Button>
          </div>
        )}
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
  );
}
