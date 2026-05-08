import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/src/lib/analytics";
import { toCsv } from "@/src/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "sessions";
  const analytics = getAnalyticsData();
  const rows =
    type === "projects"
      ? analytics.projects
      : type === "models"
        ? analytics.models
        : type === "tools"
          ? analytics.tools
          : analytics.sessions;

  return new NextResponse(toCsv(rows as Array<Record<string, unknown>>), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tokentrace-${type}.csv"`
    }
  });
}
