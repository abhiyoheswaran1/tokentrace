"use client";

import Link from "next/link";
import { BookmarkPlus, Trash2 } from "lucide-react";
import type { SavedView } from "@/src/lib/saved-views";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldLabel } from "@/components/ui/typography";

function ViewLink({ view, onRemove }: { view: SavedView; onRemove: (view: SavedView) => Promise<void> }) {
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
          onClick={() => void onRemove(view)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center border-l text-muted-foreground hover:text-foreground"
          aria-label={`Delete ${view.name}`}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

export function SavedViewsSection({
  builtInViews,
  customViews,
  viewName,
  onViewNameChange,
  saving,
  saveError,
  onSave,
  onRemove
}: {
  builtInViews: SavedView[];
  customViews: SavedView[];
  viewName: string;
  onViewNameChange: (value: string) => void;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onRemove: (view: SavedView) => Promise<void>;
}) {
  return (
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
            {builtInViews.map((view) => (
              <ViewLink key={view.id} view={view} onRemove={onRemove} />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <FieldLabel>Local</FieldLabel>
          {customViews.length ? (
            <div className="flex flex-wrap gap-2">
              {customViews.map((view) => (
                <ViewLink key={view.id} view={view} onRemove={onRemove} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No local saved views yet.</div>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            value={viewName}
            onChange={(event) => onViewNameChange(event.target.value)}
            placeholder="Save current filters as..."
            className="sm:max-w-xs"
          />
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            <BookmarkPlus className="h-4 w-4" />
            Save view
          </Button>
          {saveError ? <div className="text-sm text-destructive">{saveError}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
