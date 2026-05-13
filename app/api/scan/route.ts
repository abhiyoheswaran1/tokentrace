import { NextResponse } from "next/server";
import { runScan } from "@/src/ingestion/scan";
import { readJsonObject } from "@/src/lib/api-json";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.body;
  const result = await runScan({
    folders: Array.isArray(body.folders)
      ? body.folders.filter((folder: unknown): folder is string => typeof folder === "string")
      : undefined,
    force: Boolean(body.force)
  });
  return NextResponse.json(result);
}
