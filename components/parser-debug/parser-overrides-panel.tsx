"use client";

import { useState } from "react";
import { useJsonRequest } from "@/components/hooks/use-json-request";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonoText } from "@/components/ui/typography";
import type { ParserOverride } from "@/src/lib/parser-overrides";

type ParserOption = { id: string; displayName: string };

type Props = {
  initialOverrides: ParserOverride[];
  parsers: ParserOption[];
};

export function ParserOverridesPanel({ initialOverrides, parsers }: Props) {
  const [overrides, setOverrides] = useState<ParserOverride[]>(initialOverrides);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const saveRequest = useJsonRequest("Failed to set parser override.");
  const clearRequest = useJsonRequest("Failed to clear override.");
  const busy = saveRequest.isPending || clearRequest.isPending;
  const error = formError ?? saveRequest.error ?? clearRequest.error;

  const [path, setPath] = useState("");
  const [parserId, setParserId] = useState(parsers[0]?.id ?? "");
  const [excluded, setExcluded] = useState(false);
  const [note, setNote] = useState("");

  function resetForm() {
    setPath("");
    setParserId(parsers[0]?.id ?? "");
    setExcluded(false);
    setNote("");
    setFormError(null);
  }

  function submit() {
    setFormError(null);
    clearRequest.setError(null);
    const trimmed = path.trim();
    if (!trimmed) {
      setFormError("Path is required.");
      return;
    }
    const payload: {
      path: string;
      parserId?: string;
      excluded?: boolean;
      note?: string;
    } = { path: trimmed };
    if (excluded) payload.excluded = true;
    else payload.parserId = parserId;
    if (note.trim()) payload.note = note.trim();

    saveRequest.send<{ override: ParserOverride }>(
      "/api/parser-overrides",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      },
      (body) => {
        setOverrides((prev) => {
          const without = prev.filter((row) => row.path !== body.override.path);
          return [body.override, ...without];
        });
        resetForm();
        setAdding(false);
      }
    );
  }

  function clear(rowPath: string) {
    setFormError(null);
    saveRequest.setError(null);
    clearRequest.send(
      "/api/parser-overrides",
      {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: rowPath })
      },
      () => {
        setOverrides((prev) => prev.filter((row) => row.path !== rowPath));
      }
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Parser overrides</CardTitle>
          <CardDescription>
            Force a specific parser for a file or exclude it from future scans.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          variant={adding ? "outline" : "default"}
          onClick={() => setAdding((value) => !value)}
        >
          {adding ? "Cancel" : "Add override"}
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
              <span className="font-medium">File path</span>
              <Input
                value={path}
                onChange={(event) => setPath(event.target.value)}
                placeholder="/absolute/path/to/file.jsonl"
                spellCheck={false}
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={excluded}
                onChange={(event) => setExcluded(event.target.checked)}
              />
              <span>Exclude this file from scans</span>
            </label>
            {!excluded ? (
              <label className="block space-y-1 text-sm">
                <span className="font-medium">Parser</span>
                <select
                  value={parserId}
                  onChange={(event) => setParserId(event.target.value)}
                  className="h-9 w-full rounded-md border bg-card px-2 text-sm"
                >
                  {parsers.map((parser) => (
                    <option key={parser.id} value={parser.id}>
                      {parser.displayName} ({parser.id})
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Note (optional)</span>
              <Input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Why this override exists"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setAdding(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="button" size="sm" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : "Save override"}
              </Button>
            </div>
          </div>
        ) : null}

        {overrides.length === 0 ? (
          <p className="text-sm text-muted-foreground">No parser overrides set.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {overrides.map((override) => (
              <li key={override.path} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <MonoText className="break-all text-sm">{override.path}</MonoText>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {override.excluded ? (
                      <Badge variant="warning">Excluded</Badge>
                    ) : (
                      <Badge variant="outline">{override.parserId}</Badge>
                    )}
                    {override.note ? (
                      <span className="text-muted-foreground">{override.note}</span>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => clear(override.path)}
                  disabled={busy}
                >
                  Clear
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
