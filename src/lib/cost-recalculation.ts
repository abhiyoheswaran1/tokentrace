import { sqlite } from "@/src/db/client";
import { calculateInteractionCost } from "@/src/lib/cost";
import { modelNameCandidates } from "@/src/lib/model-aliases";

type ModelPriceRow = {
  id: string;
  provider_id: string;
  name: string;
  input_token_price: number | null;
  output_token_price: number | null;
  cached_input_token_price: number | null;
  cache_write_token_price: number | null;
  currency: string;
  effective_from: number | null;
  raw_metadata: unknown;
};

type InteractionPriceRow = {
  id: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  estimated_tokens: number;
  raw_metadata: unknown;
  model_id: string | null;
  provider_id: string | null;
  model_name: string | null;
  input_token_price: number | null;
  output_token_price: number | null;
  cached_input_token_price: number | null;
  cache_write_token_price: number | null;
  currency: string | null;
  alias_priced_model_id: string | null;
  alias_priced_model_name: string | null;
  alias_input_token_price: number | null;
  alias_output_token_price: number | null;
  alias_cached_input_token_price: number | null;
  alias_cache_write_token_price: number | null;
  alias_currency: string | null;
  alias_rule: string | null;
  alias_confidence: number | null;
};

export type CostRecalculationResult = {
  modelsUpdated: number;
  interactionsChecked: number;
  interactionsUpdated: number;
  unknownCostInteractions: number;
};

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function finiteNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return null;
}

function hasCompletePricing(model: Pick<ModelPriceRow, "input_token_price" | "output_token_price">) {
  return model.input_token_price != null && model.output_token_price != null;
}

function isManualModel(row: ModelPriceRow) {
  return parseMetadata(row.raw_metadata).managedBy === "user";
}

function findPricedAlias(providerId: string, modelName: string, currentModelId?: string | null) {
  for (const candidate of modelNameCandidates(modelName).slice(1)) {
    const row = sqlite
      .prepare(
        `SELECT id, provider_id, name, input_token_price, output_token_price,
          cached_input_token_price, cache_write_token_price, currency, effective_from, raw_metadata
         FROM models
         WHERE provider_id = ? AND lower(name) = lower(?)`
      )
      .get(providerId, candidate) as ModelPriceRow | undefined;

    if (row && row.id !== currentModelId && hasCompletePricing(row)) return row;
  }
  return null;
}

export function backfillModelPricingAliases() {
  const rows = sqlite
    .prepare(
      `SELECT id, provider_id, name, input_token_price, output_token_price,
        cached_input_token_price, cache_write_token_price, currency, effective_from, raw_metadata
       FROM models`
    )
    .all() as ModelPriceRow[];

  let modelsUpdated = 0;
  const update = sqlite.prepare(
    `UPDATE models
     SET input_token_price = ?,
      output_token_price = ?,
      cached_input_token_price = ?,
      cache_write_token_price = ?,
      currency = ?,
      effective_from = ?,
      raw_metadata = ?
     WHERE id = ?`
  );

  const transaction = sqlite.transaction(() => {
    for (const row of rows) {
      if (hasCompletePricing(row) || isManualModel(row)) continue;
      const alias = findPricedAlias(row.provider_id, row.name, row.id);
      if (!alias) continue;

      const metadata = {
        ...parseMetadata(row.raw_metadata),
        managedBy: "tokentrace-pricing-alias",
        pricingAliasOf: alias.name,
        pricingAliasModelId: alias.id,
        pricingAliasAppliedAt: new Date().toISOString(),
        note: "Observed model name inherited prices from a matching base model. Edit this row if the provider charges differently."
      };

      modelsUpdated += update.run(
        alias.input_token_price,
        alias.output_token_price,
        alias.cached_input_token_price,
        alias.cache_write_token_price,
        alias.currency,
        alias.effective_from,
        JSON.stringify(metadata),
        row.id
      ).changes;
    }
  });

  transaction();
  return modelsUpdated;
}

export function recalculateInteractionCosts(): CostRecalculationResult {
  const modelsUpdated = backfillModelPricingAliases();
  const interactions = sqlite
    .prepare(
      `SELECT
        i.id,
        i.input_tokens,
        i.output_tokens,
        i.cache_read_tokens,
        i.cache_write_tokens,
        i.reasoning_tokens,
        i.estimated_tokens,
        i.raw_metadata,
        i.model_id,
        m.provider_id,
        m.name AS model_name,
        m.input_token_price,
        m.output_token_price,
        m.cached_input_token_price,
        m.cache_write_token_price,
        m.currency,
        aliased.id AS alias_priced_model_id,
        aliased.name AS alias_priced_model_name,
        aliased.input_token_price AS alias_input_token_price,
        aliased.output_token_price AS alias_output_token_price,
        aliased.cached_input_token_price AS alias_cached_input_token_price,
        aliased.cache_write_token_price AS alias_cache_write_token_price,
        aliased.currency AS alias_currency,
        ma.rule AS alias_rule,
        ma.confidence AS alias_confidence
       FROM interactions i
       LEFT JOIN models m ON m.id = i.model_id
       LEFT JOIN model_aliases ma ON ma.provider_id = m.provider_id AND ma.observed_model = m.name
       LEFT JOIN models aliased ON aliased.id = ma.priced_model_id`
    )
    .all() as InteractionPriceRow[];

  let interactionsUpdated = 0;
  let unknownCostInteractions = 0;
  const update = sqlite.prepare(
    `UPDATE interactions
     SET cost = ?, cost_estimated = ?, raw_metadata = ?
     WHERE id = ?`
  );

  const transaction = sqlite.transaction(() => {
    for (const interaction of interactions) {
      const existingMetadata = parseMetadata(interaction.raw_metadata);
      const sourceCost = finiteNumber(existingMetadata.sourceCost);
      if (sourceCost != null) {
        const metadata = {
          ...existingMetadata,
          costStatus: "exact",
          costSource: "source-history",
          costExplanation: "Cost was imported from the source history record.",
          costRecalculatedAt: new Date().toISOString()
        };
        interactionsUpdated += update.run(
          sourceCost,
          0,
          JSON.stringify(metadata),
          interaction.id
        ).changes;
        continue;
      }

      const directPrice = interaction.model_id
        ? {
            inputTokenPrice: interaction.input_token_price,
            outputTokenPrice: interaction.output_token_price,
            cachedInputTokenPrice: interaction.cached_input_token_price,
            cacheWriteTokenPrice: interaction.cache_write_token_price,
            currency: interaction.currency ?? "USD"
          }
        : null;
      const directHasPricing =
        directPrice != null &&
        directPrice.inputTokenPrice != null &&
        directPrice.outputTokenPrice != null;
      const aliasPrice =
        !directHasPricing && interaction.alias_priced_model_id
          ? {
              inputTokenPrice: interaction.alias_input_token_price,
              outputTokenPrice: interaction.alias_output_token_price,
              cachedInputTokenPrice: interaction.alias_cached_input_token_price,
              cacheWriteTokenPrice: interaction.alias_cache_write_token_price,
              currency: interaction.alias_currency ?? "USD"
            }
          : null;
      const resolvedPrice = aliasPrice ?? directPrice;
      const resolvedViaAlias = aliasPrice != null;

      const cost = calculateInteractionCost(
        {
          inputTokens: interaction.input_tokens,
          outputTokens: interaction.output_tokens,
          cacheReadTokens: interaction.cache_read_tokens,
          cacheWriteTokens: interaction.cache_write_tokens,
          reasoningTokens: interaction.reasoning_tokens,
          estimatedTokens: Boolean(interaction.estimated_tokens)
        },
        resolvedPrice
      );

      if (cost.status === "unknown") unknownCostInteractions += 1;
      const metadata = {
        ...existingMetadata,
        costStatus: cost.status,
        costExplanation: resolvedViaAlias
          ? `Cost resolved via model alias (${interaction.alias_rule ?? "unknown rule"}, confidence ${interaction.alias_confidence ?? 0}) to priced model ${interaction.alias_priced_model_name}.`
          : cost.explanation,
        costRecalculatedAt: new Date().toISOString(),
        ...(resolvedViaAlias
          ? {
              costSource: "model-alias",
              aliasedPricedModel: interaction.alias_priced_model_name,
              aliasRule: interaction.alias_rule,
              aliasConfidence: interaction.alias_confidence
            }
          : {})
      };
      interactionsUpdated += update.run(
        cost.amount,
        cost.status === "estimated" || resolvedViaAlias ? 1 : 0,
        JSON.stringify(metadata),
        interaction.id
      ).changes;
    }
  });

  transaction();

  return {
    modelsUpdated,
    interactionsChecked: interactions.length,
    interactionsUpdated,
    unknownCostInteractions
  };
}
