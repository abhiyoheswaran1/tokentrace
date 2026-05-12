import { NextResponse } from "next/server";
import {
  buildUnknownCostRepairWorkbench,
  saveUnknownCostReview,
  type UnknownCostRepairStatus
} from "@/src/lib/unknown-cost-repair";

export const dynamic = "force-dynamic";

const reviewStates = new Set<UnknownCostRepairStatus>([
  "unresolved",
  "ignored",
  "resolved",
  "needs-parser-review"
]);

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function reviewState(value: unknown): UnknownCostRepairStatus | null {
  return typeof value === "string" && reviewStates.has(value as UnknownCostRepairStatus)
    ? (value as UnknownCostRepairStatus)
    : null;
}

export async function GET() {
  return NextResponse.json(buildUnknownCostRepairWorkbench());
}

export async function PUT(request: Request) {
  const body = await request.json();
  const key = text(body.key, 1000);
  const status = reviewState(body.status ?? body.state);

  if (!key) {
    return NextResponse.json({ error: "key is required" }, { status: 400 });
  }

  if (!status) {
    return NextResponse.json({ error: "status must be unresolved, ignored, resolved, or needs-parser-review" }, { status: 400 });
  }

  const review = saveUnknownCostReview({
    key,
    status,
    notes: text(body.notes ?? body.note, 500)
  });

  return NextResponse.json({ review });
}

export const PATCH = PUT;
