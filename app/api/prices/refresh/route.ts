import { NextResponse } from "next/server";
import { jsonBooleanFlag, readOptionalJsonObject } from "@/src/lib/api-json";
import { refreshPricing } from "@/src/lib/pricing-refresh";

export const dynamic = "force-dynamic";

function refreshSource(value: unknown) {
  if (value == null) return "remote";
  if (value === "remote" || value === "bundled") return value;
  return null;
}

export async function POST(request: Request) {
  const parsed = await readOptionalJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const body = parsed.body;
  const source = refreshSource(body.source);
  if (!source) {
    return NextResponse.json({ error: "source must be remote or bundled" }, { status: 400 });
  }
  const result = await refreshPricing({
    source,
    force: jsonBooleanFlag(body.force)
  });
  return NextResponse.json(result);
}
