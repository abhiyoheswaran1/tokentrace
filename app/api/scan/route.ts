import { NextResponse } from "next/server";
import { runScan } from "@/src/ingestion/scan";
import { jsonBooleanFlag, readOptionalJsonObject } from "@/src/lib/api-json";

export const dynamic = "force-dynamic";

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter((folder): folder is string => typeof folder === "string")
        .map((folder) => folder.trim())
        .filter(Boolean)
    : undefined;
}

export async function POST(request: Request) {
  const parsed = await readOptionalJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.body;
  const result = await runScan({
    folders: stringList(body.folders),
    force: jsonBooleanFlag(body.force)
  });
  return NextResponse.json(result);
}
