"use client";

import { useEffect } from "react";
import { CustomFoldersSection } from "@/components/settings/custom-folders-section";
import { ExportsSection } from "@/components/settings/exports-section";
import { GuardrailsSection } from "@/components/settings/guardrails-section";
import { ImportProfilesSection } from "@/components/settings/import-profiles-section";
import { LazySettingsSection } from "@/components/settings/lazy-settings-section";
import { PackageTrustSection } from "@/components/settings/package-trust-section";
import { ScanMemorySection, ScanScheduleSection, ScanSection } from "@/components/settings/scan-section";
import { SETTINGS_SECTION_IDS, SettingsSectionNav } from "@/components/settings/section-nav";
import { StorageSection } from "@/components/settings/storage-section";
import type { SettingsPayload, SettingsScanHealth } from "@/components/settings/types";
import { useFoldersSection } from "@/components/settings/use-folders-section";
import { useGuardrailsSection } from "@/components/settings/use-guardrails-section";
import { useImportProfilesSection } from "@/components/settings/use-import-profiles-section";
import { useScanControlsSection } from "@/components/settings/use-scan-controls-section";
import { useScanScheduleSection } from "@/components/settings/use-scan-schedule-section";
import { useSettingsStatus } from "@/components/settings/use-settings-status";
import { useStorageSection } from "@/components/settings/use-storage-section";

export type { SettingsPayload, SettingsScanHealth } from "@/components/settings/types";

export function SettingsPanel({
  initialSettings,
  initialScanHealth
}: {
  initialSettings: SettingsPayload;
  initialScanHealth: SettingsScanHealth;
}) {
  const status = useSettingsStatus();
  const storage = useStorageSection(initialSettings.storeRawMessageContent);
  const guardrails = useGuardrailsSection(initialSettings.usageGuardrails);
  const schedule = useScanScheduleSection(initialSettings.scanSchedule);
  const folders = useFoldersSection(initialSettings.customFolders);
  const importProfiles = useImportProfilesSection({
    initialProfiles: initialSettings.importProfiles,
    storeRawMessageContent: storage.storeRaw,
    status
  });
  const scanControls = useScanControlsSection({
    status,
    buildSaveRequest: () => ({
      customFolders: folders.customFolders,
      storeRawMessageContent: storage.storeRaw,
      usageGuardrails: guardrails.payload(),
      importProfiles: importProfiles.importProfiles,
      scanSchedule: schedule.payload()
    })
  });

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

  return (
    <div className="space-y-4">
      <SettingsSectionNav />

      <StorageSection
        databasePath={initialSettings.databasePath}
        appVersion={initialSettings.appVersion}
        storeRaw={storage.storeRaw}
        setStoreRaw={storage.setStoreRaw}
      />

      <LazySettingsSection
        id="package-trust"
        title="Package Trust"
        description="Runtime and release guarantees for the installed TokenTrace package."
      >
        <PackageTrustSection />
      </LazySettingsSection>

      <LazySettingsSection
        id="usage-guardrails"
        title="Local Usage Guardrails"
        description="Optional month-to-date limits for local cost and token awareness."
      >
        <GuardrailsSection guardrails={guardrails} />
      </LazySettingsSection>

      <ScanMemorySection health={initialScanHealth} />

      <ScanScheduleSection schedule={schedule} />

      <CustomFoldersSection folders={folders} />

      <LazySettingsSection
        id="import-profiles"
        title="Import Profiles"
        description="Safe local log conventions for wrappers and team tools."
      >
        <ImportProfilesSection profiles={importProfiles} isPending={status.isPending} />
      </LazySettingsSection>

      <ScanSection
        scanControls={scanControls}
        isPending={status.isPending}
        message={status.message}
        health={initialScanHealth}
      />

      <LazySettingsSection
        id="local-exports"
        title="Local Exports"
        description="Privacy-safe operating artifacts for reports, evidence, and agent handoff."
      >
        <ExportsSection />
      </LazySettingsSection>
    </div>
  );
}
