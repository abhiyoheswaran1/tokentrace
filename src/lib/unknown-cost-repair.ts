import { asc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { unknownCostReviews } from "@/src/db/schema";

export type UnknownCostRepairStatus = "unresolved" | "ignored" | "resolved" | "needs-parser-review";
export type UnknownCostReviewState = UnknownCostRepairStatus;

export type UnknownCostReviewModel = {
  key: string;
  sourceFile: string;
  model: string;
  cause: string;
  status: UnknownCostRepairStatus;
  notes: string;
  createdAt: number | null;
  updatedAt: number | null;
};

function normalizeStatus(value: unknown): UnknownCostRepairStatus {
  if (value === "ignored" || value === "resolved" || value === "needs-parser-review") return value;
  return "unresolved";
}

function normalizeText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function parseCauseFromKey(key: string) {
  const [cause] = key.split(":");
  return cause ?? "";
}

function parseModelFromKey(key: string) {
  return key.split(":").at(-1) ?? "";
}

function toModel(row: typeof unknownCostReviews.$inferSelect): UnknownCostReviewModel {
  return {
    key: row.key,
    sourceFile: normalizeText(row.sourceFile, 1000),
    model: normalizeText(row.model),
    cause: normalizeText(row.cause),
    status: normalizeStatus(row.status),
    notes: row.notes,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime()
  };
}

function normalizeNote(value: unknown) {
  return typeof value === "string" ? value.slice(0, 500) : "";
}

function nextNotes(input: { notes?: string; note?: string }, existingNotes: string | undefined) {
  if (input.notes !== undefined) return normalizeNote(input.notes);
  if (input.note !== undefined) return normalizeNote(input.note);
  return existingNotes ?? "";
}

export function getUnknownCostReview(key: string): UnknownCostReviewModel {
  const row = db.select().from(unknownCostReviews).where(eq(unknownCostReviews.key, key)).get();
  if (row) return toModel(row);
  return {
    key,
    sourceFile: "",
    model: "",
    cause: "",
    status: "unresolved",
    notes: "",
    createdAt: null,
    updatedAt: null
  };
}

export function saveUnknownCostReview(input: {
  key: string;
  sourceFile?: string;
  model?: string;
  cause?: string;
  status?: UnknownCostRepairStatus;
  notes?: string;
  state?: UnknownCostReviewState;
  note?: string;
}) {
  const existing = db.select().from(unknownCostReviews).where(eq(unknownCostReviews.key, input.key)).get();
  const now = new Date();
  const next = {
    key: input.key,
    sourceFile: normalizeText(input.sourceFile ?? existing?.sourceFile, 1000),
    model: normalizeText(input.model ?? existing?.model ?? parseModelFromKey(input.key)),
    cause: normalizeText(input.cause ?? existing?.cause ?? parseCauseFromKey(input.key)),
    status: normalizeStatus(input.status ?? input.state ?? existing?.status),
    notes: nextNotes(input, existing?.notes),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now
  };
  db.insert(unknownCostReviews)
    .values(next)
    .onConflictDoUpdate({
      target: unknownCostReviews.key,
      set: {
        sourceFile: next.sourceFile,
        model: next.model,
        cause: next.cause,
        status: next.status,
        notes: next.notes,
        updatedAt: next.updatedAt
      }
    })
    .run();
  return getUnknownCostReview(input.key);
}

export function listUnknownCostRepairs() {
  return db
    .select()
    .from(unknownCostReviews)
    .orderBy(asc(unknownCostReviews.key))
    .all()
    .map(toModel);
}

export function markUnknownCostRepairResolved(key: string, notes?: string) {
  return saveUnknownCostReview({
    key,
    status: "resolved",
    notes
  });
}

export function markUnknownCostRepairIgnored(key: string, notes?: string) {
  return saveUnknownCostReview({
    key,
    status: "ignored",
    notes
  });
}
