import { prepareCached } from "@/src/db/prepared";
import { calculateInteractionCost, type PriceConfig } from "@/src/lib/cost";

export type BackfillAliasInput = {
  providerId: string;
  observedModel: string;
  pricedModelId: string;
};

export type BackfillAliasResult = {
  alias: BackfillAliasInput;
  affectedInteractions: number;
  totalCost: number;
  dryRun: boolean;
  skippedReason: string | null;
};

type PricedModelRow = {
  input_token_price: number | null;
  output_token_price: number | null;
  cached_input_token_price: number | null;
  cache_write_token_price: number | null;
  currency: string | null;
};

type UnknownCostRow = {
  id: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  reasoning_tokens: number;
  estimated_tokens: number;
};

function loadPriceConfig(pricedModelId: string): PriceConfig | null {
  const row = prepareCached(
    `SELECT input_token_price, output_token_price, cached_input_token_price, cache_write_token_price, currency
     FROM models WHERE id = ?`
  ).get(pricedModelId) as PricedModelRow | undefined;
  if (!row) return null;
  if (row.input_token_price == null || row.output_token_price == null) return null;
  return {
    inputTokenPrice: row.input_token_price,
    outputTokenPrice: row.output_token_price,
    cachedInputTokenPrice: row.cached_input_token_price,
    cacheWriteTokenPrice: row.cache_write_token_price,
    currency: row.currency ?? "USD"
  };
}

function findObservedModelId(providerId: string, observedModel: string): string | null {
  const row = prepareCached(
    "SELECT id FROM models WHERE provider_id = ? AND name = ? LIMIT 1"
  ).get(providerId, observedModel) as { id: string } | undefined;
  return row?.id ?? null;
}

export function backfillAlias(
  alias: BackfillAliasInput,
  options: { dryRun?: boolean } = {}
): BackfillAliasResult {
  const dryRun = options.dryRun ?? false;
  const base: Omit<BackfillAliasResult, "skippedReason"> = {
    alias,
    affectedInteractions: 0,
    totalCost: 0,
    dryRun
  };

  const price = loadPriceConfig(alias.pricedModelId);
  if (!price) {
    return { ...base, skippedReason: "Aliased priced model has no complete input/output pricing." };
  }

  const observedModelId = findObservedModelId(alias.providerId, alias.observedModel);
  if (!observedModelId) {
    return {
      ...base,
      skippedReason: "No model row exists for the observed (providerId, observedModel) pair."
    };
  }

  const rows = prepareCached(
    `SELECT id, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, reasoning_tokens, estimated_tokens
     FROM interactions
     WHERE model_id = ? AND cost IS NULL`
  ).all(observedModelId) as UnknownCostRow[];

  if (rows.length === 0) {
    return { ...base, skippedReason: null };
  }

  let totalCost = 0;
  const updates: Array<{ id: string; cost: number }> = [];

  for (const row of rows) {
    const result = calculateInteractionCost(
      {
        inputTokens: Number(row.input_tokens ?? 0),
        outputTokens: Number(row.output_tokens ?? 0),
        cacheReadTokens: Number(row.cache_read_tokens ?? 0),
        cacheWriteTokens: Number(row.cache_write_tokens ?? 0),
        reasoningTokens: Number(row.reasoning_tokens ?? 0),
        estimatedTokens: Boolean(row.estimated_tokens)
      },
      price
    );
    if (result.amount == null) continue;
    updates.push({ id: row.id, cost: result.amount });
    totalCost += result.amount;
  }

  if (!dryRun && updates.length > 0) {
    const stmt = prepareCached(
      "UPDATE interactions SET cost = ?, cost_estimated = 1 WHERE id = ?"
    );
    for (const update of updates) {
      stmt.run(update.cost, update.id);
    }
  }

  return {
    alias,
    affectedInteractions: updates.length,
    totalCost,
    dryRun,
    skippedReason: null
  };
}
