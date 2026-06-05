import { NextResponse } from "next/server";
import { deleteSavedView } from "@/src/lib/saved-views";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ id: string }>;
  }
) {
  const { id } = await params;
  const viewId = decodeURIComponent(id).trim();
  if (!viewId) {
    return NextResponse.json({ error: "view id is required" }, { status: 400 });
  }
  return NextResponse.json({ deleted: deleteSavedView(viewId) });
}
