import { NextResponse } from "next/server";
import { getAppVersion } from "@/src/lib/app-version";
import { buildOperatingMetadata } from "@/src/lib/operating-metadata";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(buildOperatingMetadata(getAppVersion()), {
    headers: {
      "content-disposition": "attachment; filename=\"tokentrace-operating-metadata.json\""
    }
  });
}
