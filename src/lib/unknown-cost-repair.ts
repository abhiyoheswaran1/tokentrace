import { asc, eq } from "drizzle-orm";
import { db, sqlite } from "@/src/db/client";
import { unknownCostReviews } from "@/src/db/schema";
import type { AnalyticsFilters } from "@/src/lib/analytics";
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

export type UnknownCostRepairCause =
  | "missing provider"
  | "missing model"
  | "missing pricing"
  | "missing token count"
  | "parser review"
  | "other";

export type UnknownCostRepairActionKind =
  | "set-model-rate"
  | "review-parser"
  | "view-evidence"
  | "open-focused-repair"
  | "recalculate-after-change";

export type UnknownCostRepairAction = {
  kind: UnknownCostRepairActionKind;
  label: string;
  href: string;
  description: string;
  expectedChange: string;
};

export type UnknownCostRepairWorkbenchGroup = {
  key: string;
  cause: UnknownCostRepairCause;
  sourceFile: string;
  provider: string;
  model: string;
  tool: string;
  state: UnknownCostRepairStatus;
  note: string;
  suggestedModel: string | null;
  interactions: number;
  sessions: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  reasoningTokens: number;
  review: Pick<UnknownCostReviewModel, "status" | "notes" | "createdAt" | "updatedAt">;
  suggestion: UnknownCostRepairSuggestion;
  itemHref: string;
  repairHref: string;
  sourceHref: string;
  sessionHref: string;
  sessionsHref: string;
  parserHref: string;
  pricingHref: string | null;
  primaryAction: UnknownCostRepairAction;
  secondaryActions: UnknownCostRepairAction[];
  impact: string;
  resolvedStateLabel: string;
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
  totalGroups: number;
  shownGroups: number;
  hasMoreGroups: boolean;
};

export type UnknownCostRepairWorkbenchOptions = {
  limit?: number;
  requiredKey?: string | null;
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

function emptyReview(key: string): UnknownCostReviewModel {
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

function interactionDateFilter(filters: AnalyticsFilters = {}, alias = "i") {
  const clauses: string[] = [];
  const params: number[] = [];
  if (typeof filters.from === "number" && Number.isFinite(filters.from)) {
    clauses.push(`${alias}.timestamp >= ?`);
    params.push(filters.from);
  }
  if (typeof filters.to === "number" && Number.isFinite(filters.to)) {
    clauses.push(`${alias}.timestamp < ?`);
    params.push(filters.to);
  }
  return {
    sql: clauses.length ? ` AND ${clauses.join(" AND ")}` : "",
    params
  };
}

export function repairItemHref(key: string) {
  return withQuery("/repair", { key });
}

function causeKey(cause: string) {
  return cause.replace(/\s+/g, "-");
}

type RepairKeyParts = Pick<UnknownCostRepairWorkbenchGroup, "cause" | "provider" | "tool" | "model" | "sourceFile">;

function encodeKeyPart(value: string) {
  return encodeURIComponent(value);
}

function decodeKeyPart(value: string) {
  return decodeURIComponent(value);
}

function repairKey(row: RepairKeyParts) {
  return `repair:v1:${[
    row.cause,
    row.provider,
    row.tool,
    row.model,
    row.sourceFile
  ].map(encodeKeyPart).join(":")}`;
}

function legacyKeyPart(value: string) {
  return value.replaceAll(":", "_").trim() || "unknown";
}

function legacyToolKeyPart(value: string) {
  return legacyKeyPart(value).toLowerCase().replace(/\s+/g, "-");
}

function legacyRepairKey(row: RepairKeyParts) {
  return [
    causeKey(row.cause),
    legacyKeyPart(row.provider),
    legacyToolKeyPart(row.tool),
    legacyKeyPart(row.model),
    row.sourceFile
  ].join(":");
}

function parseRepairKey(key: string): RepairKeyParts | null {
  if (!key.startsWith("repair:v1:")) return null;
  let parts: string[];
  try {
    parts = key.slice("repair:v1:".length).split(":").map(decodeKeyPart);
  } catch {
    return null;
  }
  if (parts.length !== 5) return null;
  const [cause, provider, tool, model, sourceFile] = parts;
  return {
    cause: cause as UnknownCostRepairCause,
    provider,
    tool,
    model,
    sourceFile
  };
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

  if (cause === "missing provider") {
    return {
      suggestedModel: null,
      confidence: "low",
      reason: "The provider reference is missing. Review local parser output before adding pricing."
    };
  }

  if (cause === "missing model" || normalizedModel === "unknown") {
    return {
      suggestedModel: null,
      confidence: "low",
      reason: "The parser did not extract a model name. Inspect parser evidence before adding pricing."
    };
  }

  if (cause === "parser review") {
    return {
      suggestedModel: null,
      confidence: "medium",
      reason: "Parser status indicates this source needs review before pricing can be trusted."
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

type RepairActionContext = Pick<
  UnknownCostRepairWorkbenchGroup,
  "cause" | "model" | "tool" | "sourceFile"
> & {
  itemHref: string;
  parserHref: string;
  pricingHref: string | null;
  sourceHref: string;
};

function repairImpact(cause: UnknownCostRepairCause) {
  if (cause === "missing pricing") {
    return "After setting the model rate and recalculating, these interactions can move from unknown cost into priced or estimated cost totals.";
  }
  if (cause === "missing model") {
    return "After parser review records a usable model name, TokenTrace can match the interaction to model rates and remove the model gap.";
  }
  if (cause === "missing token count") {
    return "After parser review recovers usable token counts, the interaction can be priced instead of staying unknown.";
  }
  if (cause === "parser review") {
    return "After parser review confirms the source shape, supported rows can be imported with clearer token and cost confidence.";
  }
  if (cause === "missing provider") {
    return "After parser review restores provider metadata, TokenTrace can route the model to the right local pricing table.";
  }
  return "After the missing metadata is corrected and recalculated, this group should leave unresolved unknown-cost repair.";
}

function resolvedStateLabel(cause: UnknownCostRepairCause) {
  if (cause === "missing pricing") return "Resolved after local pricing recalculation";
  if (cause === "missing model") return "Resolved after parser evidence is corrected";
  if (cause === "missing token count") return "Resolved after token counts are recovered";
  if (cause === "missing provider") return "Resolved after provider metadata is corrected";
  if (cause === "parser review") return "Resolved after parser review is verified";
  return "Resolved after local repair is verified";
}

function primaryRepairAction(context: RepairActionContext): UnknownCostRepairAction {
  if (context.cause === "missing pricing" && context.pricingHref) {
    return {
      kind: "set-model-rate",
      label: "Set model rate",
      href: context.pricingHref,
      description: `Add local input and output prices for ${context.model}.`,
      expectedChange: "These interactions can move from unknown cost into priced or estimated cost totals."
    };
  }

  if (context.cause === "missing token count") {
    return {
      kind: "review-parser",
      label: "Recover token counts",
      href: context.parserHref,
      description: `Inspect parser output for ${context.sourceFile}.`,
      expectedChange: "Parser review can recover usable token counts so costs can be recalculated."
    };
  }

  if (context.cause === "missing provider") {
    return {
      kind: "review-parser",
      label: "Review provider evidence",
      href: context.parserHref,
      description: `Inspect provider metadata for ${context.tool}.`,
      expectedChange: "Parser review can restore provider metadata so the model can map to pricing."
    };
  }

  if (context.cause === "missing model") {
    return {
      kind: "review-parser",
      label: "Review parser evidence",
      href: context.parserHref,
      description: `Inspect parser output for ${context.sourceFile}.`,
      expectedChange: "Parser review can recover a usable model name so pricing can be matched."
    };
  }

  if (context.cause === "parser review") {
    return {
      kind: "review-parser",
      label: "Review parser evidence",
      href: context.parserHref,
      description: `Resolve parser warnings for ${context.sourceFile}.`,
      expectedChange: "Parser review can confirm whether supported rows should import with clearer confidence."
    };
  }

  return {
    kind: "view-evidence",
    label: "View evidence",
    href: context.sourceHref,
    description: `Inspect the source sessions for ${context.model}.`,
    expectedChange: "Evidence review identifies which metadata needs correction before recalculation."
  };
}

function secondaryRepairActions(context: RepairActionContext, primary: UnknownCostRepairAction) {
  const actions: UnknownCostRepairAction[] = [
    {
      kind: "view-evidence",
      label: "View evidence",
      href: context.sourceHref,
      description: "Open the local sessions that produced this unknown-cost group.",
      expectedChange: "Evidence confirms the source rows affected by the repair."
    },
    {
      kind: "review-parser",
      label: "Review parser",
      href: context.parserHref,
      description: "Inspect parser status, warnings, and raw metadata for this source file.",
      expectedChange: "Parser review clarifies whether model, token, or provider metadata needs repair."
    },
    {
      kind: "open-focused-repair",
      label: "Open repair",
      href: context.itemHref,
      description: "Focus this repair item with its state controls and evidence links.",
      expectedChange: "The repair stays isolated while you update state, notes, or related evidence."
    },
    {
      kind: "recalculate-after-change",
      label: "Recalculate after change",
      href: "/diagnostics",
      description: "Run a local scan or pricing refresh after changing parser or rate data.",
      expectedChange: "Recalculation should reduce unresolved unknown-cost interactions."
    }
  ];

  return actions.filter((action) => action.kind !== primary.kind || action.href !== primary.href);
}

function nextNotes(input: { notes?: string; note?: string }, existingNotes: string | undefined) {
  if (input.notes !== undefined) return normalizeNote(input.notes);
  if (input.note !== undefined) return normalizeNote(input.note);
  return existingNotes ?? "";
}

function findWorkbenchGroupByKey(key: string): UnknownCostRepairWorkbenchGroup | null {
  return buildUnknownCostRepairWorkbench().groups.find((group) => (
    group.key === key || legacyRepairKey(group) === key
  )) ?? null;
}

function fallbackMetadataForKey(key: string) {
  const group = findWorkbenchGroupByKey(key);
  if (group) {
    return {
      sourceFile: group.sourceFile,
      model: group.model,
      cause: group.cause
    };
  }

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
  const authoritativeMetadata = fallbackMetadataForKey(input.key);
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

export function bulkUpdateUnknownCostRepairs(input: {
  keys: string[];
  status: UnknownCostRepairStatus;
  notes?: string;
}) {
  const uniqueKeys = Array.from(new Set(input.keys.filter((key) => typeof key === "string" && key.trim())));
  const reviews = uniqueKeys.map((key) =>
    saveUnknownCostReview({
      key,
      status: input.status,
      notes: input.notes
    })
  );
  return {
    updated: reviews.length,
    reviews
  };
}

export function buildUnknownCostRepairWorkbench(
  filters: AnalyticsFilters = {},
  options: UnknownCostRepairWorkbenchOptions = {}
): UnknownCostRepairWorkbench {
  const { pricedByProvider, displayByProviderModel } = buildPricedModelLookup();
  const reviewRows = listUnknownCostRepairs();
  const reviewsByKey = new Map(reviewRows.map((review) => [review.key, review]));
  const reviewFor = (key: string, legacyKey: string) => reviewsByKey.get(key) ?? reviewsByKey.get(legacyKey) ?? emptyReview(key);
  const dateFilter = interactionDateFilter(filters);
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
        WHEN (m.id IS NOT NULL AND p.id IS NULL) OR tool_provider.id IS NULL THEN 'missing provider'
        WHEN lower(COALESCE(m.name, 'unknown')) = 'unknown' THEN 'missing model'
        WHEN COALESCE(i.total_tokens, 0) <= 0 THEN 'missing token count'
        WHEN lower(COALESCE(m.name, 'unknown')) <> 'unknown'
          AND COALESCE(i.total_tokens, 0) > 0
          AND (m.input_token_price IS NULL OR m.output_token_price IS NULL)
          THEN 'missing pricing'
        WHEN EXISTS (
          SELECT 1
          FROM scan_files sf
          WHERE sf.path = s.source_file
            AND sf.status IN ('imported_with_errors', 'failed', 'skipped_unknown')
        )
          THEN 'parser review'
        ELSE 'other'
      END AS cause,
      COALESCE(m.name, 'unknown') AS model,
      COALESCE(p.id, tool_provider.id, 'unknown-provider') AS providerId,
      COALESCE(p.name, tool_provider.name, 'Unknown') AS provider,
      t.name AS tool,
      s.source_file AS sourceFile,
      COUNT(*) AS interactions,
      COUNT(DISTINCT s.id) AS sessions,
      COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
      COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
      COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
      COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
      COALESCE(SUM(i.reasoning_tokens), 0) AS reasoningTokens
     FROM interactions i INDEXED BY interactions_cost_repair_idx
     JOIN sessions s ON s.id = i.session_id
     JOIN tools t ON t.id = s.tool_id
     LEFT JOIN providers tool_provider ON tool_provider.id = t.provider_id
     LEFT JOIN models m ON m.id = i.model_id
     LEFT JOIN providers p ON p.id = m.provider_id
     WHERE i.cost IS NULL
      ${dateFilter.sql}
     GROUP BY cause, providerId, t.id, m.id, s.source_file
     ORDER BY
      CASE cause
        WHEN 'missing provider' THEN 0
        WHEN 'missing pricing' THEN 0
        WHEN 'missing model' THEN 1
        WHEN 'missing token count' THEN 2
        WHEN 'parser review' THEN 3
        ELSE 3
      END,
      interactions DESC,
      totalTokens DESC,
      sourceFile ASC`,
    ...dateFilter.params
  );

  const allGroups = queryRows.map((row) => {
    const cause = row.cause;
    const base = {
      cause,
      provider: row.provider,
      tool: row.tool,
      model: row.model,
      sourceFile: row.sourceFile
    };
    const key = repairKey(base);
    const legacyKey = legacyRepairKey(base);
    const review = reviewFor(key, legacyKey);
    const suggestion = aliasSuggestion({
      cause,
      model: row.model,
      providerId: row.providerId,
      pricedByProvider,
      displayByProviderModel
    });
    const parserHref = withQuery("/parser-debug", { source: row.sourceFile });
    const pricingHref = cause === "missing pricing" && row.model !== "unknown"
      ? withQuery("/pricing", { model: row.model })
      : null;
    const sourceHref = withQuery("/sessions", { source: row.sourceFile, cost: "unknown" });
    const itemHref = repairItemHref(key);
    const actionContext = {
      ...base,
      itemHref,
      parserHref,
      pricingHref,
      sourceHref
    };
    const primaryAction = primaryRepairAction(actionContext);

    return {
      key,
      ...base,
      state: review.status,
      note: review.notes,
      suggestedModel: suggestion.suggestedModel,
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
      suggestion,
      itemHref,
      repairHref: pricingHref ?? parserHref,
      sourceHref,
      sessionHref: sourceHref,
      sessionsHref: sourceHref,
      parserHref,
      pricingHref,
      primaryAction,
      secondaryActions: secondaryRepairActions(actionContext, primaryAction),
      impact: repairImpact(cause),
      resolvedStateLabel: resolvedStateLabel(cause)
    };
  });

  const summary = allGroups.reduce<UnknownCostRepairWorkbench["summary"]>(
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

  const requestedLimit = typeof options.limit === "number" && Number.isFinite(options.limit)
    ? Math.max(0, Math.floor(options.limit))
    : null;
  let groups = requestedLimit === null ? allGroups : allGroups.slice(0, requestedLimit);
  const requiredKey = options.requiredKey?.trim();

  if (requiredKey && !groups.some((group) => group.key === requiredKey || legacyRepairKey(group) === requiredKey)) {
    const requiredGroup = allGroups.find((group) => group.key === requiredKey || legacyRepairKey(group) === requiredKey);
    if (requiredGroup) {
      groups = requestedLimit === null
        ? [requiredGroup, ...groups.filter((group) => group.key !== requiredGroup.key)]
        : [requiredGroup, ...groups.filter((group) => group.key !== requiredGroup.key)].slice(0, requestedLimit);
    }
  }

  return {
    summary,
    groups,
    totalGroups: allGroups.length,
    shownGroups: groups.length,
    hasMoreGroups: groups.length < allGroups.length
  };
}
