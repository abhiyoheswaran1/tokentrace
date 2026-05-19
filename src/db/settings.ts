import { eq } from "drizzle-orm";
import { normalizeImportProfiles, type ImportProfile } from "@/src/lib/import-profiles";
import { normalizeScanSchedule, type ScanSchedule } from "@/src/lib/scan-schedule";
import { db } from "./client";
import { settings } from "./schema";

export type AppSettings = {
  customFolders: string[];
  storeRawMessageContent: boolean;
  usageGuardrails: UsageGuardrails;
  importProfiles: ImportProfile[];
  scanSchedule: ScanSchedule;
};

export type UsageGuardrails = {
  monthlyCostLimitUsd: number | null;
  monthlyTokenLimit: number | null;
  scoped: ScopedUsageGuardrail[];
};

export type ScopedUsageGuardrail = {
  id: string;
  scope: "project" | "model" | "tool";
  name: string;
  monthlyCostLimitUsd: number | null;
  monthlyTokenLimit: number | null;
  warningThreshold: number;
};

const defaultSettings: AppSettings = {
  customFolders: [],
  storeRawMessageContent: false,
  usageGuardrails: {
    monthlyCostLimitUsd: null,
    monthlyTokenLimit: null,
    scoped: []
  },
  importProfiles: normalizeImportProfiles(null),
  scanSchedule: normalizeScanSchedule(null)
};

function positiveLimit(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return null;
}

export function normalizeUsageGuardrails(value: unknown): UsageGuardrails {
  if (!value || typeof value !== "object") return defaultSettings.usageGuardrails;
  const candidate = value as Partial<UsageGuardrails>;
  return {
    monthlyCostLimitUsd: positiveLimit(candidate.monthlyCostLimitUsd),
    monthlyTokenLimit: positiveLimit(candidate.monthlyTokenLimit),
    scoped: normalizeScopedUsageGuardrails(candidate.scoped)
  };
}

function normalizeScope(value: unknown): ScopedUsageGuardrail["scope"] | null {
  if (value === "project" || value === "model" || value === "tool") return value;
  return null;
}

function normalizeWarningThreshold(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 0.8;
  if (!Number.isFinite(parsed)) return 0.8;
  return Math.min(0.99, Math.max(0.1, parsed));
}

function normalizeScopedUsageGuardrails(value: unknown): ScopedUsageGuardrail[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item, index) => {
      const scope = normalizeScope(item.scope);
      const name = typeof item.name === "string" ? item.name.trim() : "";
      if (!scope || !name) return null;
      const id =
        typeof item.id === "string" && item.id.trim()
          ? item.id.trim()
          : `${scope}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || index}`;
      return {
        id,
        scope,
        name: name.slice(0, 120),
        monthlyCostLimitUsd: positiveLimit(item.monthlyCostLimitUsd),
        monthlyTokenLimit: positiveLimit(item.monthlyTokenLimit),
        warningThreshold: normalizeWarningThreshold(item.warningThreshold)
      };
    })
    .filter((item): item is ScopedUsageGuardrail => Boolean(item))
    .slice(0, 100);
}

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const candidate = value as Partial<AppSettings>;
  return {
    customFolders: Array.isArray(candidate.customFolders)
      ? candidate.customFolders
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],
    storeRawMessageContent: candidate.storeRawMessageContent === true,
    usageGuardrails: normalizeUsageGuardrails(candidate.usageGuardrails),
    importProfiles: normalizeImportProfiles(candidate.importProfiles),
    scanSchedule: normalizeScanSchedule(candidate.scanSchedule)
  };
}

export function getAppSettings(): AppSettings {
  const row = db.select().from(settings).where(eq(settings.key, "app")).get();
  return normalizeSettings(row?.value);
}

export function saveAppSettings(nextSettings: AppSettings) {
  db.insert(settings)
    .values({
      key: "app",
      value: nextSettings,
      updatedAt: new Date()
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: nextSettings,
        updatedAt: new Date()
      }
    })
    .run();
  return nextSettings;
}
