import { NextResponse } from "next/server";
import { getDatabasePath } from "@/src/db/client";
import { getAppSettings, saveAppSettings } from "@/src/db/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ...getAppSettings(),
    databasePath: getDatabasePath()
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const customFolders = Array.isArray(body.customFolders)
    ? body.customFolders.filter((folder: unknown): folder is string => typeof folder === "string")
    : [];
  const saved = saveAppSettings({
    customFolders,
    storeRawMessageContent: Boolean(body.storeRawMessageContent)
  });

  return NextResponse.json(saved);
}
