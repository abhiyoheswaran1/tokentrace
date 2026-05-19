import { NextResponse } from "next/server";
import { readJsonObject } from "@/src/lib/api-json";
import { buildImportProfilePreview } from "@/src/lib/import-profile-preview";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const filePath = parsed.body.filePath;
  if (typeof filePath !== "string" || !filePath.trim()) {
    return NextResponse.json({ error: "filePath is required." }, { status: 400 });
  }
  try {
    const preview = await buildImportProfilePreview({
      filePath: filePath.trim(),
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
