import { sqlite } from "@/src/db/client";
import { recalculateInteractionCosts } from "@/src/lib/cost-recalculation";
import { stableId } from "./ids";

export type PricingRow = {
  id: string;
  providerId: string;
  provider: string;
  model: string;
  inputTokenPrice: number | null;
  outputTokenPrice: number | null;
  cachedInputTokenPrice: number | null;
  cacheWriteTokenPrice: number | null;
  currency: string;
  effectiveFrom: number | null;
};

export function getPricingRows() {
  return sqlite
    .prepare(
      `SELECT m.id, p.id AS providerId, p.name AS provider, m.name AS model,
        m.input_token_price AS inputTokenPrice,
        m.output_token_price AS outputTokenPrice,
        m.cached_input_token_price AS cachedInputTokenPrice,
        m.cache_write_token_price AS cacheWriteTokenPrice,
        m.currency,
        m.effective_from AS effectiveFrom
       FROM models m
       JOIN providers p ON p.id = m.provider_id
       ORDER BY
        CASE p.id
          WHEN 'openai' THEN 0
          WHEN 'anthropic' THEN 1
          WHEN 'google' THEN 2
          WHEN 'xai' THEN 3
          WHEN 'deepseek' THEN 4
          WHEN 'mistral' THEN 5
          WHEN 'cohere' THEN 6
          WHEN 'generic' THEN 7
          ELSE 8
        END,
        p.name ASC,
        m.name ASC`
    )
    .all() as PricingRow[];
}

export function upsertPricing(input: {
  providerId: string;
  providerName?: string;
  model: string;
  inputTokenPrice: number | null;
  outputTokenPrice: number | null;
  cachedInputTokenPrice: number | null;
  cacheWriteTokenPrice: number | null;
  currency: string;
}) {
  const providerName = input.providerName?.trim() || input.providerId;
  sqlite
    .prepare("INSERT OR IGNORE INTO providers (id, name, type) VALUES (?, ?, 'llm-provider')")
    .run(input.providerId, providerName);

  const existing = sqlite
    .prepare("SELECT id FROM models WHERE provider_id = ? AND lower(name) = lower(?)")
    .get(input.providerId, input.model) as { id: string } | undefined;
  const id = existing?.id ?? stableId("model", [input.providerId, input.model]);

  sqlite
    .prepare(
      `INSERT INTO models
        (id, provider_id, name, input_token_price, output_token_price, cached_input_token_price,
         cache_write_token_price, currency, effective_from, raw_metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        input_token_price = excluded.input_token_price,
        output_token_price = excluded.output_token_price,
        cached_input_token_price = excluded.cached_input_token_price,
        cache_write_token_price = excluded.cache_write_token_price,
        currency = excluded.currency,
        effective_from = excluded.effective_from,
        raw_metadata = excluded.raw_metadata`
    )
    .run(
      id,
      input.providerId,
      input.model,
      input.inputTokenPrice,
      input.outputTokenPrice,
      input.cachedInputTokenPrice,
      input.cacheWriteTokenPrice,
      input.currency || "USD",
      Date.now(),
      JSON.stringify({
        managedBy: "user",
        editedAt: new Date().toISOString()
      })
    );

  recalculateInteractionCosts();
  return id;
}

export function clearImportedData() {
  sqlite.exec(`
    DELETE FROM tool_calls;
    DELETE FROM interactions;
    DELETE FROM sessions;
    DELETE FROM projects;
    DELETE FROM scan_files;
    DELETE FROM scan_runs;
  `);
}
