import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/src/lib/analytics";
import { resolveDateRange } from "@/src/lib/date-range";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const range = resolveDateRange(new URL(request.url).searchParams);
  return NextResponse.json(getAnalyticsData(range.filters));
}
