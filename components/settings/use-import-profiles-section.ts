"use client";

import { useState } from "react";
import type { ImportProfile } from "@/src/lib/import-profiles";
import { slugifyId } from "@/components/settings/form-values";
import type { ImportPreviewResult } from "@/components/settings/types";
import type { SettingsStatus } from "@/components/settings/use-settings-status";

/**
 * Owns the Import Profiles section state: the profile list, the new-profile
 * draft, and the local-file preview flow (via the shared settings status).
 */
export function useImportProfilesSection({
  initialProfiles,
  storeRawMessageContent,
  status
}: {
  initialProfiles: ImportProfile[];
  storeRawMessageContent: boolean;
  status: SettingsStatus;
}) {
  const [importProfiles, setImportProfiles] = useState(initialProfiles);
  const [newProfileLabel, setNewProfileLabel] = useState("");
  const [newProfileMatchers, setNewProfileMatchers] = useState("");
  const [previewPath, setPreviewPath] = useState("");
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);

  function toggleImportProfile(id: string) {
    setImportProfiles((current) =>
      current.map((profile) =>
        profile.id === id ? { ...profile, enabled: !profile.enabled } : profile
      )
    );
  }

  function addImportProfile() {
    const label = newProfileLabel.trim();
    const matchers = newProfileMatchers
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    if (!label || !matchers.length) return;
    const id = slugifyId("custom", label, "profile");
    setImportProfiles((current) => [
      ...current.filter((profile) => profile.id !== id),
      {
        id,
        label,
        kind: "text-log",
        description: "Custom local log convention.",
        matchers,
        enabled: true,
        builtIn: false
      }
    ]);
    setNewProfileLabel("");
    setNewProfileMatchers("");
  }

  function removeImportProfile(id: string) {
    setImportProfiles((current) => current.filter((profile) => profile.id !== id || profile.builtIn));
  }

  function previewImportProfile() {
    const filePath = previewPath.trim();
    if (!filePath) return;
    status.setStatusMessage("Previewing local file...");
    setPreviewResult(null);
    status.send<ImportPreviewResult>(
      "/api/import-profile-preview",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath, storeRawMessageContent })
      },
      (result) => {
        setPreviewResult(result);
        status.setStatusMessage("Preview complete.");
        if (Array.isArray(result.recommendedMatchers) && result.recommendedMatchers.length > 0) {
          setNewProfileMatchers(result.recommendedMatchers.join(", "));
        }
      }
    );
  }

  return {
    importProfiles,
    toggleImportProfile,
    removeImportProfile,
    newProfileLabel,
    setNewProfileLabel,
    newProfileMatchers,
    setNewProfileMatchers,
    addImportProfile,
    previewPath,
    setPreviewPath,
    previewImportProfile,
    previewResult
  };
}

export type ImportProfilesSectionController = ReturnType<typeof useImportProfilesSection>;
