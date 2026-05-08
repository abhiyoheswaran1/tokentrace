import { NextResponse } from "next/server";
import { getAnalyticsData } from "@/src/lib/analytics";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getAnalyticsData());
}
