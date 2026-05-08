import { NextResponse } from "next/server";
import { runScan } from "@/src/ingestion/scan";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await runScan({
    folders: Array.isArray(body.folders)
      ? body.folders.filter((folder: unknown): folder is string => typeof folder === "string")
      : undefined,
    force: Boolean(body.force)
  });
  return NextResponse.json(result);
}
