"use client";

import { useState } from "react";
import type { ScanResult, SettingsSaveRequest } from "@/components/settings/types";
import type { SettingsStatus } from "@/components/settings/use-settings-status";

/**
 * Owns the Scan Controls section state: the force-rescan toggle, the latest
 * scan result, and the save/scan/clear request flows (via the shared
 * settings status).
 */
export function useScanControlsSection({
  status,
  buildSaveRequest
}: {
  status: SettingsStatus;
  buildSaveRequest: () => SettingsSaveRequest;
}) {
  const [force, setForce] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  function putSettings(onSuccess: () => void) {
    status.send(
      "/api/settings",
      {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildSaveRequest())
      },
      onSuccess
    );
  }

  function saveSettings() {
    status.setStatusMessage("");
    putSettings(() => status.setStatusMessage("Settings saved."));
  }

  function runScan() {
    status.setStatusMessage("Scanning local files...");
    setScanResult(null);
    putSettings(() => {
      status.send<ScanResult>(
        "/api/scan",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ force, compact: true })
        },
        (result) => {
          setScanResult(result);
          status.setStatusMessage("Scan complete.");
        }
      );
    });
  }

  function clearData() {
    if (!window.confirm("Clear imported sessions, interactions, projects, and scan history?")) return;
    status.setStatusMessage("");
    setScanResult(null);
    status.send("/api/data", { method: "DELETE" }, () => {
      status.setStatusMessage("Imported data cleared.");
    });
  }

  return { force, setForce, scanResult, saveSettings, runScan, clearData };
}

export type ScanControlsSectionController = ReturnType<typeof useScanControlsSection>;
