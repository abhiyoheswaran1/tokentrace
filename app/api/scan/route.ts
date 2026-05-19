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
  if (jsonBooleanFlag(body.compact)) {
    const warnings = Array.isArray(result.warnings) ? result.warnings : [];
    const errors = Array.isArray(result.errors) ? result.errors : [];
    return NextResponse.json({
      ...result,
      warningCount: warnings.length,
      errorCount: errors.length,
      warnings: warnings.slice(0, 25),
      errors: errors.slice(0, 25)
    });
  }
  return NextResponse.json(result);
}
