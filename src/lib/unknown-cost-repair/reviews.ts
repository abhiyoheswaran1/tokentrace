import { asc, eq } from "drizzle-orm";
import { db } from "@/src/db/client";
import { unknownCostReviews } from "@/src/db/schema";
import { parseCauseFromKey, parseModelFromKey, parseRepairKey } from "@/src/lib/unknown-cost-repair/keys";
import type {
  UnknownCostRepairMetadata,
  UnknownCostRepairStatus,
  UnknownCostReviewModel,
  UnknownCostReviewState
} from "@/src/lib/unknown-cost-repair/types";

export type UnknownCostRepairMetadataResolver = (key: string) => Partial<UnknownCostRepairMetadata> | null | undefined;

export function normalizeStatus(value: unknown): UnknownCostRepairStatus {
  if (value === "ignored" || value === "resolved" || value === "needs-parser-review") return value;
  return "unresolved";
}

export function normalizeText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

export function normalizeNote(value: unknown) {
  return typeof value === "string" ? value.slice(0, 500) : "";
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

export function emptyReview(key: string): UnknownCostReviewModel {
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

function nextNotes(input: { notes?: string; note?: string }, existingNotes: string | undefined) {
  if (input.notes !== undefined) return normalizeNote(input.notes);
  if (input.note !== undefined) return normalizeNote(input.note);
  return existingNotes ?? "";
}

function fallbackMetadataForKey(key: string): UnknownCostRepairMetadata {
  const parsed = parseRepairKey(key);
  if (parsed) {
    return {
      sourceFile: parsed.sourceFile,
      model: parsed.model,
      cause: parsed.cause
    };
  }

  return {
    sourceFile: "",
    model: parseModelFromKey(key),
    cause: parseCauseFromKey(key)
  };
}

export function getUnknownCostReview(key: string): UnknownCostReviewModel {
  const row = db.select().from(unknownCostReviews).where(eq(unknownCostReviews.key, key)).get();
  if (row) return toModel(row);
  return emptyReview(key);
}

export function saveUnknownCostReviewWithResolver(
  input: {
    key: string;
    sourceFile?: string;
    model?: string;
    cause?: string;
    status?: UnknownCostRepairStatus;
    notes?: string;
    state?: UnknownCostReviewState;
    note?: string;
  },
  resolveMetadata?: UnknownCostRepairMetadataResolver
) {
  const existing = db.select().from(unknownCostReviews).where(eq(unknownCostReviews.key, input.key)).get();
  const now = new Date();
  const resolvedMetadata = resolveMetadata?.(input.key);
  const fallbackMetadata = fallbackMetadataForKey(input.key);
  const authoritativeMetadata = {
    sourceFile: resolvedMetadata?.sourceFile ?? fallbackMetadata.sourceFile,
    model: resolvedMetadata?.model ?? fallbackMetadata.model,
    cause: resolvedMetadata?.cause ?? fallbackMetadata.cause
  };
  const next = {
    key: input.key,
    sourceFile: normalizeText(authoritativeMetadata.sourceFile || input.sourceFile || existing?.sourceFile, 1000),
    model: normalizeText(authoritativeMetadata.model || input.model || existing?.model),
    cause: normalizeText(authoritativeMetadata.cause || input.cause || existing?.cause),
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

export function markUnknownCostRepairResolvedWithResolver(
  key: string,
  notes?: string,
  resolveMetadata?: UnknownCostRepairMetadataResolver
) {
  return saveUnknownCostReviewWithResolver({ key, status: "resolved", notes }, resolveMetadata);
}

export function markUnknownCostRepairIgnoredWithResolver(
  key: string,
  notes?: string,
  resolveMetadata?: UnknownCostRepairMetadataResolver
) {
  return saveUnknownCostReviewWithResolver({ key, status: "ignored", notes }, resolveMetadata);
}

export function bulkUpdateUnknownCostRepairsWithResolver(
  input: {
    keys: string[];
    status: UnknownCostRepairStatus;
    notes?: string;
  },
  resolveMetadata?: UnknownCostRepairMetadataResolver
) {
  const uniqueKeys = Array.from(new Set(input.keys.filter((key) => typeof key === "string" && key.trim())));
  const reviews = uniqueKeys.map((key) =>
    saveUnknownCostReviewWithResolver({
      key,
      status: input.status,
      notes: input.notes
    }, resolveMetadata)
  );
  return {
    updated: reviews.length,
    reviews
  };
}
