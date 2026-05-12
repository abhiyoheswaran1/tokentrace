import { eq } from "drizzle-orm";
import { db } from "./client";
import { settings } from "./schema";

export type AppSettings = {
  customFolders: string[];
  storeRawMessageContent: boolean;
  usageGuardrails: UsageGuardrails;
};

export type UsageGuardrails = {
  monthlyCostLimitUsd: number | null;
  monthlyTokenLimit: number | null;
};

const defaultSettings: AppSettings = {
  customFolders: [],
  storeRawMessageContent: false,
  usageGuardrails: {
    monthlyCostLimitUsd: null,
    monthlyTokenLimit: null
  }
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
    monthlyTokenLimit: positiveLimit(candidate.monthlyTokenLimit)
  };
}

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const candidate = value as Partial<AppSettings>;
  return {
    customFolders: Array.isArray(candidate.customFolders)
      ? candidate.customFolders.filter((item): item is string => typeof item === "string")
      : [],
    storeRawMessageContent: Boolean(candidate.storeRawMessageContent),
    usageGuardrails: normalizeUsageGuardrails(candidate.usageGuardrails)
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
