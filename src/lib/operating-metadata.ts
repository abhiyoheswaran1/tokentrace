import { getAppSettings } from "@/src/db/settings";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";
import { buildSavedReportDefinitions } from "@/src/lib/saved-reports";
import { buildSourceCatalog } from "@/src/lib/source-catalog";

export function buildOperatingMetadata(packageVersion: string) {
  const settings = getAppSettings();
  return {
    schemaVersion: "tokentrace.operating-metadata.v1",
    generatedAt: new Date().toISOString(),
    rawUsageIncluded: false,
    rawContentIncluded: false,
    settings: {
      customFolders: settings.customFolders,
      storeRawMessageContent: settings.storeRawMessageContent,
      usageGuardrails: settings.usageGuardrails,
      importProfiles: settings.importProfiles,
      scanSchedule: settings.scanSchedule
    },
    sourceCatalog: buildSourceCatalog(),
    reportDefinitions: buildSavedReportDefinitions(),
    roadmap: buildRoadmapStatus({ packageVersion })
  };
}
