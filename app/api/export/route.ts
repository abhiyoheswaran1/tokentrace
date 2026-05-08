import { NextResponse } from "next/server";
import { getAnalyticsData, getDebugData } from "@/src/lib/analytics";
import { toCsv } from "@/src/lib/csv";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "sessions";
  const analytics = getAnalyticsData();
  const debug = type.startsWith("scan-") ? getDebugData() : null;
  let rows: Array<Record<string, unknown>>;

  if (type === "scan-files") rows = (debug?.scanFiles ?? []) as Array<Record<string, unknown>>;
  else if (type === "scan-runs") rows = (debug?.scanRuns ?? []) as Array<Record<string, unknown>>;
  else if (type === "projects") rows = analytics.projects as unknown as Array<Record<string, unknown>>;
  else if (type === "models") rows = analytics.models as unknown as Array<Record<string, unknown>>;
  else if (type === "tools") rows = analytics.tools as unknown as Array<Record<string, unknown>>;
  else rows = analytics.sessions as unknown as Array<Record<string, unknown>>;

  return new NextResponse(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="tokentrace-${type}.csv"`
    }
  });
}
