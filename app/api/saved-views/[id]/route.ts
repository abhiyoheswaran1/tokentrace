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
  return NextResponse.json({ deleted: deleteSavedView(decodeURIComponent(id)) });
}
