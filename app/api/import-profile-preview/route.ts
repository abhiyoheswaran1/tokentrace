import { NextResponse } from "next/server";
import { getAppSettings } from "@/src/db/settings";
import { readJsonObject } from "@/src/lib/api-json";
import { buildImportProfilePreview } from "@/src/lib/import-profile-preview";
import { PathAccessError, pathAccessStatus, resolveReadablePath } from "@/src/lib/path-access";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const filePath = parsed.body.filePath;
  if (typeof filePath !== "string" || !filePath.trim()) {
    return NextResponse.json({ error: "filePath is required." }, { status: 400 });
  }

  let resolvedPath: string;
  try {
    resolvedPath = await resolveReadablePath(filePath, {
      extraRoots: getAppSettings().customFolders
    });
  } catch (error) {
    if (error instanceof PathAccessError) {
      return NextResponse.json({ error: error.message }, { status: pathAccessStatus(error.code) });
    }
    return NextResponse.json({ error: "Preview failed." }, { status: 400 });
  }

  try {
    const preview = await buildImportProfilePreview({
      filePath: resolvedPath,
      storeRawMessageContent: parsed.body.storeRawMessageContent === true
    });
    return NextResponse.json(preview);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Preview failed." },
      { status: 400 }
    );
  }
}
