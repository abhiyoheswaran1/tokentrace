import { NextResponse } from "next/server";
import { getDatabasePath } from "@/src/db/client";
import { getAppSettings, normalizeUsageGuardrails, saveAppSettings } from "@/src/db/settings";
import { jsonBooleanFlag, readJsonObject } from "@/src/lib/api-json";
import { normalizeImportProfiles } from "@/src/lib/import-profiles";
import { normalizeScanSchedule } from "@/src/lib/scan-schedule";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ...getAppSettings(),
    databasePath: getDatabasePath()
  });
}

export async function PUT(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.body;
  const customFolders = Array.isArray(body.customFolders)
    ? body.customFolders
        .filter((folder: unknown): folder is string => typeof folder === "string")
        .map((folder) => folder.trim())
        .filter(Boolean)
    : [];
  const saved = saveAppSettings({
    customFolders,
    storeRawMessageContent: jsonBooleanFlag(body.storeRawMessageContent),
    usageGuardrails: normalizeUsageGuardrails(body.usageGuardrails),
    importProfiles: normalizeImportProfiles(body.importProfiles),
    scanSchedule: normalizeScanSchedule(body.scanSchedule)
  });

  return NextResponse.json(saved);
}
