import { sqlite } from "@/src/db/client";
import { stableId } from "./ids";

export type PricingRow = {
  id: string;
  providerId: string;
  provider: string;
  model: string;
  inputTokenPrice: number | null;
  outputTokenPrice: number | null;
  cachedInputTokenPrice: number | null;
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
        m.currency,
        m.effective_from AS effectiveFrom
       FROM models m
       JOIN providers p ON p.id = m.provider_id
       ORDER BY p.name ASC, m.name ASC`
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
        (id, provider_id, name, input_token_price, output_token_price, cached_input_token_price, currency, effective_from)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
        input_token_price = excluded.input_token_price,
        output_token_price = excluded.output_token_price,
        cached_input_token_price = excluded.cached_input_token_price,
        currency = excluded.currency,
        effective_from = excluded.effective_from`
    )
    .run(
      id,
      input.providerId,
      input.model,
      input.inputTokenPrice,
      input.outputTokenPrice,
      input.cachedInputTokenPrice,
      input.currency || "USD",
      Date.now()
    );

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
