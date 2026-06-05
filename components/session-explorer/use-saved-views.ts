"use client";

import { useState } from "react";
import type { SavedView, SavedViews } from "@/src/lib/saved-views";
import { useJsonRequest } from "@/components/hooks/use-json-request";

/**
 * Owns the local saved-view list plus the save/delete request flows.
 * Save state (pending flag + error copy) comes from the shared
 * `useJsonRequest` hook so the error fallbacks stay consistent.
 */
export function useSavedViews(savedViews: SavedViews, currentFilters: Record<string, string | boolean>) {
  const [viewName, setViewName] = useState("");
  const [customViews, setCustomViews] = useState<SavedView[]>(savedViews.custom);
  const { isPending: saving, error: saveError, setError: setSaveError, send } = useJsonRequest("Could not save view.");

  function saveCurrentView() {
    const name = viewName.trim();
    if (!name) {
      setSaveError("Name is required.");
      return;
    }
    send<{ view: SavedView }>(
      "/api/saved-views",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, filters: currentFilters })
      },
      (body) => {
        setCustomViews((views) => [body.view, ...views.filter((view) => view.id !== body.view.id)]);
        setViewName("");
      }
    );
  }

  async function removeView(view: SavedView) {
    setCustomViews((views) => views.filter((item) => item.id !== view.id));
    await fetch(`/api/saved-views/${encodeURIComponent(view.id)}`, { method: "DELETE" });
  }

  return {
    viewName,
    setViewName,
    customViews,
    saving,
    saveError,
    saveCurrentView,
    removeView
  };
}
