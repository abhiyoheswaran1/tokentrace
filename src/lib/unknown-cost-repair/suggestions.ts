import { prepareCached } from "@/src/db/prepared";
import { modelNameCandidates } from "@/src/lib/model-aliases";
import type { UnknownCostRepairSuggestion, UnknownCostRepairWorkbenchGroup } from "@/src/lib/unknown-cost-repair/types";

function rows<T>(sql: string, ...params: unknown[]) {
  return prepareCached(sql).all(...params) as T[];
}

export function buildPricedModelLookup() {
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

export function aliasSuggestion({
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
