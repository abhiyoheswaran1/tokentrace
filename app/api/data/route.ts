import { NextResponse } from "next/server";
import { clearImportedData } from "@/src/lib/pricing";

export const dynamic = "force-dynamic";

export async function DELETE() {
  clearImportedData();
  return NextResponse.json({ ok: true });
}
