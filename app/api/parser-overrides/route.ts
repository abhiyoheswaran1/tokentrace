import { NextResponse } from "next/server";
import {
  clearParserOverride,
  listParserOverrides,
  setParserOverride
} from "@/src/lib/parser-overrides";

export const dynamic = "force-dynamic";

type WriteBody = {
  path?: unknown;
  parserId?: unknown;
  excluded?: unknown;
  note?: unknown;
};

export async function GET() {
  return NextResponse.json({ overrides: listParserOverrides() });
}

export async function POST(request: Request) {
  let body: WriteBody;
  try {
    body = (await request.json()) as WriteBody;
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const path = typeof body.path === "string" ? body.path.trim() : "";
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 });

  const excluded = body.excluded === true;
  const parserId =
    !excluded && typeof body.parserId === "string" && body.parserId.trim()
      ? body.parserId.trim()
      : undefined;
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : undefined;

  if (!excluded && !parserId) {
    return NextResponse.json({ error: "parserId or excluded must be provided" }, { status: 400 });
  }

  try {
    const override = setParserOverride({ path, parserId, excluded, note });
    return NextResponse.json({ override });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to set parser override" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  let body: { path?: unknown };
  try {
    body = (await request.json()) as { path?: unknown };
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }
  const path = typeof body.path === "string" ? body.path.trim() : "";
  if (!path) return NextResponse.json({ error: "path is required" }, { status: 400 });
  const removed = clearParserOverride(path);
  return NextResponse.json({ removed, path });
}
