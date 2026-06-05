import type { ImportProfile } from "@/src/lib/import-profiles";
import type { ScanSchedule } from "@/src/lib/scan-schedule";
import type { ScanHealth } from "@/src/lib/scan-health";

export type ScopedGuardrail = {
  id: string;
  scope: "project" | "model" | "tool";
  name: string;
  monthlyCostLimitUsd: number | null;
  monthlyTokenLimit: number | null;
  warningThreshold: number;
};

export type SettingsPayload = {
  customFolders: string[];
  storeRawMessageContent: boolean;
  usageGuardrails: {
    monthlyCostLimitUsd: number | null;
    monthlyTokenLimit: number | null;
    scoped: ScopedGuardrail[];
  };
  importProfiles: ImportProfile[];
  scanSchedule: ScanSchedule;
  databasePath: string;
  appVersion: string;
};

/** Body shape for `PUT /api/settings`: the editable subset of the payload. */
export type SettingsSaveRequest = Omit<SettingsPayload, "databasePath" | "appVersion">;

export type ScanResult = {
  scanRunId: string;
  filesScanned: number;
  recordsImported: number;
  costsRecalculated: number;
  modelAliasesUpdated: number;
  unknownCostInteractions: number;
  staleNonUsageSessionsRemoved: number;
  warnings: string[];
  errors: string[];
  warningCount?: number;
  errorCount?: number;
};

export type SettingsScanHealth = Pick<
  ScanHealth,
  "latestRun" | "headline" | "tone" | "latestWarnings" | "latestErrors"
> & {
  costCoverage: Pick<ScanHealth["costCoverage"], "priced" | "unknown" | "total">;
};

export type ImportPreviewResult = {
  detected: boolean;
  adapterName: string | null;
  confidence: number;
  reason: string | null;
  recommendedMatchers: string[];
  fields: string[];
  warnings: string[];
  errors: string[];
  preview: {
    sessions: number;
    interactions: number;
  };
};
