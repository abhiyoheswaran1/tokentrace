"use client";

import { useEffect, useState, useTransition } from "react";
import type { ScanScheduleMode } from "@/src/lib/scan-schedule";
import { CustomFoldersSection } from "@/components/settings/custom-folders-section";
import { ExportsSection } from "@/components/settings/exports-section";
import { GuardrailsSection } from "@/components/settings/guardrails-section";
import { ImportProfilesSection } from "@/components/settings/import-profiles-section";
import { PackageTrustSection } from "@/components/settings/package-trust-section";
import { ScanMemorySection, ScanScheduleSection, ScanSection } from "@/components/settings/scan-section";
import { SETTINGS_SECTION_IDS, SettingsSectionNav } from "@/components/settings/section-nav";
import { StorageSection } from "@/components/settings/storage-section";
import type {
  ImportPreviewResult,
  ScanResult,
  ScopedGuardrail,
  SettingsPayload,
  SettingsScanHealth
} from "@/components/settings/types";

export type { SettingsPayload, SettingsScanHealth } from "@/components/settings/types";

function parseLimitInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function SettingsPanel({
  initialSettings,
  initialScanHealth
}: {
  initialSettings: SettingsPayload;
  initialScanHealth: SettingsScanHealth;
}) {
  const [customFolders, setCustomFolders] = useState(initialSettings.customFolders);
  const [storeRaw, setStoreRaw] = useState(initialSettings.storeRawMessageContent);
  const [monthlyCostLimitUsd, setMonthlyCostLimitUsd] = useState(
    initialSettings.usageGuardrails.monthlyCostLimitUsd?.toString() ?? ""
  );
  const [monthlyTokenLimit, setMonthlyTokenLimit] = useState(
    initialSettings.usageGuardrails.monthlyTokenLimit?.toString() ?? ""
  );
  const [newFolder, setNewFolder] = useState("");
  const [importProfiles, setImportProfiles] = useState(initialSettings.importProfiles);
  const [newProfileLabel, setNewProfileLabel] = useState("");
  const [newProfileMatchers, setNewProfileMatchers] = useState("");
  const [scanScheduleMode, setScanScheduleMode] = useState<ScanScheduleMode>(initialSettings.scanSchedule.mode);
  const [scanRetentionRuns, setScanRetentionRuns] = useState(String(initialSettings.scanSchedule.retentionRuns));
  const [scopedGuardrails, setScopedGuardrails] = useState<ScopedGuardrail[]>(initialSettings.usageGuardrails.scoped ?? []);
  const [newGuardrailScope, setNewGuardrailScope] = useState<ScopedGuardrail["scope"]>("project");
  const [newGuardrailName, setNewGuardrailName] = useState("");
  const [newGuardrailCost, setNewGuardrailCost] = useState("");
  const [newGuardrailTokens, setNewGuardrailTokens] = useState("");
  const [newGuardrailThreshold, setNewGuardrailThreshold] = useState("0.8");
  const [previewPath, setPreviewPath] = useState("");
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [force, setForce] = useState(false);
  const [message, setMessage] = useState("");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function scrollToHash() {
      const id = window.location.hash.slice(1) as (typeof SETTINGS_SECTION_IDS)[number];
      if (!SETTINGS_SECTION_IDS.includes(id)) return;
      window.requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: "start" });
      });
    }

    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  function addFolder() {
    const folder = newFolder.trim();
    if (!folder) return;
    if (!customFolders.includes(folder)) setCustomFolders((current) => [...current, folder]);
    setNewFolder("");
  }

  function removeFolder(folder: string) {
    setCustomFolders((current) => current.filter((item) => item !== folder));
  }

  function settingsPayload() {
    return {
      customFolders,
      storeRawMessageContent: storeRaw,
      usageGuardrails: {
        monthlyCostLimitUsd: parseLimitInput(monthlyCostLimitUsd),
        monthlyTokenLimit: parseLimitInput(monthlyTokenLimit),
        scoped: scopedGuardrails
      },
      importProfiles,
      scanSchedule: {
        mode: scanScheduleMode,
        retentionRuns: parseLimitInput(scanRetentionRuns) ?? 30,
        lastScheduledScanAt: initialSettings.scanSchedule.lastScheduledScanAt ?? null,
        lastScheduledScanStatus: initialSettings.scanSchedule.lastScheduledScanStatus ?? null,
        lastScheduledScanMessage: initialSettings.scanSchedule.lastScheduledScanMessage ?? null
      }
    };
  }

  function addScopedGuardrail() {
    const name = newGuardrailName.trim();
    if (!name) return;
    const id = `${newGuardrailScope}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guardrail"}`;
    const next: ScopedGuardrail = {
      id,
      scope: newGuardrailScope,
      name,
      monthlyCostLimitUsd: parseLimitInput(newGuardrailCost),
      monthlyTokenLimit: parseLimitInput(newGuardrailTokens),
      warningThreshold: parseLimitInput(newGuardrailThreshold) ?? 0.8
    };
    setScopedGuardrails((current) => [next, ...current.filter((item) => item.id !== id)]);
    setNewGuardrailName("");
    setNewGuardrailCost("");
    setNewGuardrailTokens("");
    setNewGuardrailThreshold("0.8");
  }

  function removeScopedGuardrail(id: string) {
    setScopedGuardrails((current) => current.filter((item) => item.id !== id));
  }

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
    const id = `custom-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile"}`;
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
    startTransition(async () => {
      setMessage("Previewing local file...");
      setPreviewResult(null);
      const response = await fetch("/api/import-profile-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath, storeRawMessageContent: storeRaw })
      });
      const result = await response.json();
      if (response.ok) {
        setPreviewResult(result as ImportPreviewResult);
        setMessage("Preview complete.");
        if (Array.isArray(result.recommendedMatchers) && result.recommendedMatchers.length > 0) {
          setNewProfileMatchers(result.recommendedMatchers.join(", "));
        }
      } else {
        setMessage(typeof result.error === "string" ? result.error : "Preview failed.");
      }
    });
  }

  function saveSettings() {
    startTransition(async () => {
      setMessage("");
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settingsPayload())
      });
      setMessage(response.ok ? "Settings saved." : "Settings save failed.");
    });
  }

  function runScan() {
    startTransition(async () => {
      setMessage("Scanning local files...");
      setScanResult(null);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(settingsPayload())
      });
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ force, compact: true })
      });
      const result = (await response.json()) as ScanResult;
      setScanResult(result);
      setMessage(response.ok ? "Scan complete." : "Scan failed.");
    });
  }

  function clearData() {
    if (!window.confirm("Clear imported sessions, interactions, projects, and scan history?")) return;
    startTransition(async () => {
      const response = await fetch("/api/data", { method: "DELETE" });
      setMessage(response.ok ? "Imported data cleared." : "Clear failed.");
      setScanResult(null);
    });
  }

  return (
    <div className="space-y-4">
      <SettingsSectionNav />

      <StorageSection
        databasePath={initialSettings.databasePath}
        appVersion={initialSettings.appVersion}
        storeRaw={storeRaw}
        setStoreRaw={setStoreRaw}
      />

      <PackageTrustSection />

      <GuardrailsSection
        monthlyCostLimitUsd={monthlyCostLimitUsd}
        setMonthlyCostLimitUsd={setMonthlyCostLimitUsd}
        monthlyTokenLimit={monthlyTokenLimit}
        setMonthlyTokenLimit={setMonthlyTokenLimit}
        scopedGuardrails={scopedGuardrails}
        newGuardrailScope={newGuardrailScope}
        setNewGuardrailScope={setNewGuardrailScope}
        newGuardrailName={newGuardrailName}
        setNewGuardrailName={setNewGuardrailName}
        newGuardrailCost={newGuardrailCost}
        setNewGuardrailCost={setNewGuardrailCost}
        newGuardrailTokens={newGuardrailTokens}
        setNewGuardrailTokens={setNewGuardrailTokens}
        newGuardrailThreshold={newGuardrailThreshold}
        setNewGuardrailThreshold={setNewGuardrailThreshold}
        addScopedGuardrail={addScopedGuardrail}
        removeScopedGuardrail={removeScopedGuardrail}
      />

      <ScanMemorySection health={initialScanHealth} />

      <ScanScheduleSection
        scanScheduleMode={scanScheduleMode}
        setScanScheduleMode={setScanScheduleMode}
        scanRetentionRuns={scanRetentionRuns}
        setScanRetentionRuns={setScanRetentionRuns}
        lastScheduledScanAt={initialSettings.scanSchedule.lastScheduledScanAt ?? null}
        lastScheduledScanMessage={initialSettings.scanSchedule.lastScheduledScanMessage ?? null}
      />

      <CustomFoldersSection
        customFolders={customFolders}
        newFolder={newFolder}
        setNewFolder={setNewFolder}
        addFolder={addFolder}
        removeFolder={removeFolder}
      />

      <ImportProfilesSection
        importProfiles={importProfiles}
        toggleImportProfile={toggleImportProfile}
        removeImportProfile={removeImportProfile}
        newProfileLabel={newProfileLabel}
        setNewProfileLabel={setNewProfileLabel}
        newProfileMatchers={newProfileMatchers}
        setNewProfileMatchers={setNewProfileMatchers}
        addImportProfile={addImportProfile}
        previewPath={previewPath}
        setPreviewPath={setPreviewPath}
        previewImportProfile={previewImportProfile}
        previewResult={previewResult}
        isPending={isPending}
      />

      <ScanSection
        force={force}
        setForce={setForce}
        saveSettings={saveSettings}
        runScan={runScan}
        clearData={clearData}
        isPending={isPending}
        message={message}
        scanResult={scanResult}
        health={initialScanHealth}
      />

      <ExportsSection />
    </div>
  );
}
