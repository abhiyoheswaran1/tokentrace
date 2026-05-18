import { NextResponse } from "next/server";
import { getAppVersion } from "@/src/lib/app-version";
import { buildRoadmapStatus } from "@/src/lib/roadmap-status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildRoadmapStatus({ packageVersion: getAppVersion() }), {
    headers: {
      "cache-control": "no-store"
    }
  });
}
