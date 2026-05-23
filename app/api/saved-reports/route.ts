import { NextResponse } from "next/server";
import { createSavedReport, listSavedReports } from "@/src/lib/saved-reports-store";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ reports: listSavedReports() });
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name : "";
  const viewType = typeof body.viewType === "string" ? body.viewType : "";
  const format = typeof body.format === "string" ? body.format : undefined;
  const params =
    body.params && typeof body.params === "object" && !Array.isArray(body.params)
      ? (body.params as Record<string, string | number | boolean>)
      : undefined;

  try {
    const report = createSavedReport({ name, viewType, format, params });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create saved report";
    const status = /already exists/i.test(message) ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
