import { eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { unknownCostReviews } from "@/src/db/schema";

export type UnknownCostReviewState = "unresolved" | "ignored" | "resolved" | "needs-parser-review";

export type UnknownCostReviewModel = {
  key: string;
  state: UnknownCostReviewState;
  note: string;
  updatedAt: number | null;
};

function normalizeState(value: unknown): UnknownCostReviewState {
  if (value === "ignored" || value === "resolved" || value === "needs-parser-review") return value;
  return "unresolved";
}

function normalizeNote(value: unknown) {
  return typeof value === "string" ? value.slice(0, 500) : "";
}

export function getUnknownCostReview(key: string): UnknownCostReviewModel {
  const row = db.select().from(unknownCostReviews).where(eq(unknownCostReviews.key, key)).get();
  return {
    key,
    state: normalizeState(row?.state),
    note: normalizeNote(row?.note),
    updatedAt: row?.updatedAt?.getTime() ?? null
  };
}

export function saveUnknownCostReview(input: {
  key: string;
  state: UnknownCostReviewState;
  note?: string;
}) {
  const next = {
    key: input.key,
    state: normalizeState(input.state),
    note: normalizeNote(input.note),
    updatedAt: new Date()
  };
  db.insert(unknownCostReviews)
    .values(next)
    .onConflictDoUpdate({
      target: unknownCostReviews.key,
      set: {
        state: next.state,
        note: next.note,
        updatedAt: next.updatedAt
      }
    })
    .run();
  return getUnknownCostReview(input.key);
}
