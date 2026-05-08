import { NextResponse } from "next/server";
import { refreshPricing } from "@/src/lib/pricing-refresh";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const result = await refreshPricing({
    source: body?.source === "bundled" ? "bundled" : "remote",
    force: Boolean(body?.force)
  });
  return NextResponse.json(result);
}
