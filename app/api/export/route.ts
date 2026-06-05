import { NextResponse } from "next/server";
import { getAnalyticsData, getDebugData } from "@/src/lib/analytics";
import { toCsv } from "@/src/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "sessions";
  const analytics = getAnalyticsData();
  const debug = type.startsWith("scan-") ? getDebugData() : null;

  let csv: string;
  if (type === "scan-files") csv = toCsv(debug?.scanFiles ?? []);
  else if (type === "scan-runs") csv = toCsv(debug?.scanRuns ?? []);
  else if (type === "projects") csv = toCsv(analytics.projects);
  else if (type === "models") csv = toCsv(analytics.models);
  else if (type === "tools") csv = toCsv(analytics.tools);
  else csv = toCsv(analytics.sessions);

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tokentrace-${type}.csv"`
    }
  });
}
