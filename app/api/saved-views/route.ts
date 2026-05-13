import { NextResponse } from "next/server";
import { readJsonObject } from "@/src/lib/api-json";
import { getSavedViews, saveSavedView } from "@/src/lib/saved-views";

export const dynamic = "force-dynamic";

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function GET() {
  return NextResponse.json(getSavedViews());
}

export async function POST(request: Request) {
  const parsed = await readJsonObject(request);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  try {
    const view = saveSavedView({
      name: typeof parsed.body.name === "string" ? parsed.body.name : "",
      filters: object(parsed.body.filters)
    });
    return NextResponse.json({ view });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "could not save view" },
      { status: 400 }
    );
  }
}
