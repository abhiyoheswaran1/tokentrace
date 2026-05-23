import { NextResponse } from "next/server";
import { deleteSavedReport, findSavedReportById } from "@/src/lib/saved-reports-store";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const report = findSavedReportById(id);
  if (!report) return NextResponse.json({ error: "saved report not found" }, { status: 404 });
  return NextResponse.json({ report });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const removed = deleteSavedReport(id);
  if (!removed) return NextResponse.json({ error: "saved report not found" }, { status: 404 });
  return NextResponse.json({ removed: true, id });
}
