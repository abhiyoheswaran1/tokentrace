import { eq } from "drizzle-orm";
import { db } from "./client";
import { settings } from "./schema";

export type AppSettings = {
  customFolders: string[];
  storeRawMessageContent: boolean;
};

const defaultSettings: AppSettings = {
  customFolders: [],
  storeRawMessageContent: false
};

function normalizeSettings(value: unknown): AppSettings {
  if (!value || typeof value !== "object") return defaultSettings;
  const candidate = value as Partial<AppSettings>;
  return {
    customFolders: Array.isArray(candidate.customFolders)
      ? candidate.customFolders.filter((item): item is string => typeof item === "string")
      : [],
    storeRawMessageContent: Boolean(candidate.storeRawMessageContent)
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
