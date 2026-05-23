"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonoText } from "@/components/ui/typography";
import type { StoredSavedReport } from "@/src/lib/saved-reports-store";

const VIEW_TYPES = ["overview", "sessions", "models", "tools", "projects"] as const;
const FORMATS = ["markdown", "json", "html"] as const;
const RANGE_OPTIONS = ["all", "today", "7d", "30d", "60d", "90d", "month"] as const;

type Props = {
  initial: StoredSavedReport[];
};

export function SavedReportsPanel({ initial }: Props) {
  const [reports, setReports] = useState<StoredSavedReport[]>(initial);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const [name, setName] = useState("");
  const [viewType, setViewType] = useState<(typeof VIEW_TYPES)[number]>("overview");
  const [format, setFormat] = useState<(typeof FORMATS)[number]>("markdown");
  const [range, setRange] = useState<(typeof RANGE_OPTIONS)[number]>("7d");

  function resetForm() {
    setName("");
    setViewType("overview");
    setFormat("markdown");
    setRange("7d");
    setError(null);
  }

  function submit() {
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    startTransition(async () => {
      const response = await fetch("/api/saved-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          viewType,
          format,
          params: { range }
        })
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(body.error ?? "Failed to save report.");
        return;
      }
      setReports((prev) => [body.report, ...prev]);
      resetForm();
      setAdding(false);
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/saved-reports/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Failed to delete saved report.");
        return;
      }
      setReports((prev) => prev.filter((report) => report.id !== id));
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Saved reports</CardTitle>
          <CardDescription>
            Local-only report templates. Replay any of these from the CLI with
            <MonoText className="ml-1">tokentrace report --saved &quot;name&quot;</MonoText>.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant={adding ? "outline" : "default"}
          onClick={() => setAdding((value) => !value)}
        >
          {adding ? "Cancel" : "Add saved report"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {adding ? (
          <div className="space-y-3 rounded-md border bg-muted/30 p-3">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Name</span>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Weekly cost"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">View</span>
                <select
                  value={viewType}
                  onChange={(event) => setViewType(event.target.value as typeof viewType)}
                  className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  {VIEW_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Format</span>
                <select
                  value={format}
                  onChange={(event) => setFormat(event.target.value as typeof format)}
                  className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  {FORMATS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Period</span>
                <select
                  value={range}
                  onChange={(event) => setRange(event.target.value as typeof range)}
                  className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  {RANGE_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : "Save report"}
              </Button>
            </div>
          </div>
        ) : null}

        {reports.length === 0 ? (
          <p className="text-sm text-muted-foreground">No saved reports yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {reports.map((report) => (
              <li key={report.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{report.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline">{report.viewType}</Badge>
                    <Badge variant="outline">{report.format}</Badge>
                    {Object.entries(report.params).map(([key, value]) => (
                      <Badge key={key} variant="secondary">
                        {key}: {String(value)}
                      </Badge>
                    ))}
                    {report.lastRunAt ? <span>Last run: {report.lastRunAt}</span> : <span>Never run</span>}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => remove(report.id)}
                  disabled={busy}
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
