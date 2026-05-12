import { NextResponse } from "next/server";
import {
  buildUnknownCostRepairWorkbench,
  getUnknownCostReview,
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

function workbenchGroupForKey(key: string) {
  return buildUnknownCostRepairWorkbench().groups.find((group) => group.key === key) ?? null;
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

  const group = workbenchGroupForKey(key);
  const existing = group ? null : getUnknownCostReview(key);
  if (!group && (!existing || existing.updatedAt == null)) {
    return NextResponse.json({ error: "repair key was not found in current workbench evidence" }, { status: 404 });
  }

  const metadata = {
    sourceFile: "",
    model: "",
    cause: ""
  };
  if (group) {
    metadata.sourceFile = group.sourceFile;
    metadata.model = group.model;
    metadata.cause = group.cause;
  } else if (existing) {
    metadata.sourceFile = existing.sourceFile;
    metadata.model = existing.model;
    metadata.cause = existing.cause;
  }
  const review = saveUnknownCostReview({
    key,
    status,
    notes: text(body.notes ?? body.note, 500),
    sourceFile: metadata.sourceFile,
    model: metadata.model,
    cause: metadata.cause
  });

  return NextResponse.json({ review });
}

export const PATCH = PUT;
