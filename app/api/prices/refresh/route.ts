import { NextResponse } from "next/server";
import { readJsonObject } from "@/src/lib/api-json";
import { refreshPricing } from "@/src/lib/pricing-refresh";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.body;
  const result = await refreshPricing({
    source: body?.source === "bundled" ? "bundled" : "remote",
    force: Boolean(body?.force)
  });
  return NextResponse.json(result);
}
