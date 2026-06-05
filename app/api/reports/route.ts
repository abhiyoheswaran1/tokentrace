import { NextResponse } from "next/server";
import { generateReport } from "@/src/lib/report-service";
import type { SavedReportFormat } from "@/src/lib/saved-reports";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const definitionId = url.searchParams.get("type") ?? "weekly-usage";
  const format = (url.searchParams.get("format") ?? "json") as SavedReportFormat;
  const result = generateReport(definitionId, { format });
  if (!result.ok) {
    const error = result.reason === "unknown-type" ? "Unknown report type." : "Unsupported report format.";
    return NextResponse.json({ error }, { status: 400 });
  }
  if (format === "json") {
    return new NextResponse(result.content, {
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
  if (format === "csv") {
    return new NextResponse(result.content, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="tokentrace-${definitionId}.csv"`
      }
    });
  }
  return new NextResponse(result.content, {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="tokentrace-${definitionId}.md"`
    }
  });
}
