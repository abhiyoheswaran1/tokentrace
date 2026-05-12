import { asc, eq } from "drizzle-orm";
import { db, sqlite } from "@/src/db/client";
import { unknownCostReviews } from "@/src/db/schema";
import { modelNameCandidates } from "@/src/lib/model-aliases";

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

export type UnknownCostRepairSuggestion = {
  suggestedModel: string | null;
  confidence: "high" | "medium" | "low";
  reason: string;
};

export type UnknownCostRepairWorkbenchGroup = {
  key: string;
  cause: "missing model" | "missing pricing" | "missing token count" | "other";
  sourceFile: string;
  provider: string;
  model: string;
  tool: string;
  interactions: number;
  sessions: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  review: Pick<UnknownCostReviewModel, "status" | "notes" | "createdAt" | "updatedAt">;
  suggestion: UnknownCostRepairSuggestion;
  repairHref: string;
  sourceHref: string;
  sessionHref: string;
  parserHref: string;
  pricingHref: string | null;
};

export type UnknownCostRepairWorkbench = {
  summary: {
    unresolved: number;
    needsParserReview: number;
    ignored: number;
    resolved: number;
    totalInteractions: number;
  };
  groups: UnknownCostRepairWorkbenchGroup[];
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

function number(value: unknown) {
  return Number(value ?? 0);
}

function rows<T>(sql: string, ...params: unknown[]) {
  return sqlite.prepare(sql).all(...params) as T[];
}

function withQuery(path: string, params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
}

function keyPart(value: string) {
  return value.replaceAll(":", "_").trim() || "unknown";
}

function toolKeyPart(value: string) {
  return keyPart(value).toLowerCase().replace(/\s+/g, "-");
}

function causeKey(cause: string) {
  return cause.replace(/\s+/g, "-");
}

function repairKey(row: Pick<UnknownCostRepairWorkbenchGroup, "cause" | "provider" | "tool" | "model" | "sourceFile">) {
  return [
    causeKey(row.cause),
    keyPart(row.provider),
    toolKeyPart(row.tool),
    keyPart(row.model),
    row.sourceFile
  ].join(":");
}

function buildPricedModelLookup() {
  const pricedRows = rows<{ providerId: string; model: string }>(
    `SELECT provider_id AS providerId, name AS model
     FROM models
     WHERE input_token_price IS NOT NULL AND output_token_price IS NOT NULL`
  );
  const pricedByProvider = new Map<string, Set<string>>();
  const displayByProviderModel = new Map<string, string>();

  pricedRows.forEach((row) => {
    const normalized = row.model.toLowerCase();
    const bucket = pricedByProvider.get(row.providerId) ?? new Set<string>();
    bucket.add(normalized);
    pricedByProvider.set(row.providerId, bucket);
    displayByProviderModel.set(`${row.providerId}:${normalized}`, row.model);
  });

  return { pricedByProvider, displayByProviderModel };
}

function aliasSuggestion({
  cause,
  model,
  providerId,
  pricedByProvider,
  displayByProviderModel
}: {
  cause: UnknownCostRepairWorkbenchGroup["cause"];
  model: string;
  providerId: string;
  pricedByProvider: Map<string, Set<string>>;
  displayByProviderModel: Map<string, string>;
}): UnknownCostRepairSuggestion {
  const normalizedModel = model.trim().toLowerCase();

  if (cause === "missing model" || normalizedModel === "unknown") {
    return {
      suggestedModel: null,
      confidence: "low",
      reason: "The parser did not extract a model name. Inspect parser evidence before adding pricing."
    };
  }

  if (cause === "missing token count") {
    return {
      suggestedModel: null,
      confidence: "medium",
      reason: "The model is known, but usable token counts are missing. Review parser extraction for this source."
    };
  }

  const candidates = modelNameCandidates(model).slice(1);
  const pricedSet = pricedByProvider.get(providerId) ?? new Set<string>();
  const suggestedModel = candidates
    .map((candidate) => candidate.toLowerCase())
    .find((candidate) => pricedSet.has(candidate));

  if (suggestedModel) {
    return {
      suggestedModel: displayByProviderModel.get(`${providerId}:${suggestedModel}`) ?? suggestedModel,
      confidence: "high",
      reason: "The observed model name matches a priced model after normalizing provider or snapshot suffixes."
    };
  }

  return {
    suggestedModel: null,
    confidence: "low",
    reason: "No priced alias candidate exists yet. Add a price row or verify the model from parser evidence."
  };
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

export function buildUnknownCostRepairWorkbench(): UnknownCostRepairWorkbench {
  const { pricedByProvider, displayByProviderModel } = buildPricedModelLookup();
  const queryRows = rows<{
    cause: UnknownCostRepairWorkbenchGroup["cause"];
    model: string;
    providerId: string;
    provider: string;
    tool: string;
    sourceFile: string;
    interactions: number;
    sessions: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    cachedTokens: number;
    reasoningTokens: number;
  }>(
    `SELECT
      CASE
        WHEN lower(COALESCE(m.name, 'unknown')) = 'unknown' THEN 'missing model'
        WHEN COALESCE(i.total_tokens, 0) <= 0 THEN 'missing token count'
        WHEN lower(COALESCE(m.name, 'unknown')) <> 'unknown'
          AND COALESCE(i.total_tokens, 0) > 0
          AND (m.input_token_price IS NULL OR m.output_token_price IS NULL)
          THEN 'missing pricing'
        ELSE 'other'
      END AS cause,
      COALESCE(m.name, 'unknown') AS model,
      COALESCE(p.id, tool_provider.id) AS providerId,
      COALESCE(p.name, tool_provider.name) AS provider,
      t.name AS tool,
      s.source_file AS sourceFile,
      COUNT(i.id) AS interactions,
      COUNT(DISTINCT s.id) AS sessions,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
      COALESCE(SUM(i.reasoning_tokens), 0) AS reasoningTokens
     FROM interactions i
     JOIN sessions s ON s.id = i.session_id
     JOIN tools t ON t.id = s.tool_id
     JOIN providers tool_provider ON tool_provider.id = t.provider_id
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE i.cost IS NULL
     GROUP BY cause, providerId, t.id, m.id, s.source_file
     ORDER BY
      CASE cause
        WHEN 'missing pricing' THEN 0
        WHEN 'missing model' THEN 1
        WHEN 'missing token count' THEN 2
        ELSE 3
      END,
      interactions DESC,
      totalTokens DESC,
      sourceFile ASC`
  );

  const groups = queryRows.map((row) => {
    const cause = row.cause;
    const base = {
      cause,
      provider: row.provider,
      tool: row.tool,
      model: row.model,
      sourceFile: row.sourceFile
    };
    const key = repairKey(base);
    const review = getUnknownCostReview(key);
    const parserHref = withQuery("/parser-debug", { source: row.sourceFile });
    const pricingHref = cause === "missing pricing" && row.model !== "unknown"
      ? withQuery("/pricing", { model: row.model })
      : null;
    const sourceHref = withQuery("/sessions", { source: row.sourceFile, cost: "unknown" });

    return {
      key,
      ...base,
      interactions: number(row.interactions),
      sessions: number(row.sessions),
      totalTokens: number(row.totalTokens),
      inputTokens: number(row.inputTokens),
      outputTokens: number(row.outputTokens),
      cachedTokens: number(row.cachedTokens),
      reasoningTokens: number(row.reasoningTokens),
      review: {
        status: review.status,
        notes: review.notes,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt
      },
      suggestion: aliasSuggestion({
        cause,
        model: row.model,
        providerId: row.providerId,
        pricedByProvider,
        displayByProviderModel
      }),
      repairHref: pricingHref ?? parserHref,
      sourceHref,
      sessionHref: sourceHref,
      parserHref,
      pricingHref
    };
  });

  const summary = groups.reduce<UnknownCostRepairWorkbench["summary"]>(
    (current, group) => {
      current.totalInteractions += group.interactions;
      if (group.review.status === "needs-parser-review") current.needsParserReview += 1;
      else current[group.review.status] += 1;
      return current;
    },
    {
      unresolved: 0,
      needsParserReview: 0,
      ignored: 0,
      resolved: 0,
      totalInteractions: 0
    }
  );

  return { summary, groups };
}
