import { sqlite } from "@/src/db/client";
import { recalculateInteractionCosts } from "@/src/lib/cost-recalculation";
import {
  DEFAULT_PRICING_MANIFEST_URL,
  getBundledPricingManifest,
  normalizePricingManifest,
  type PricingManifest
} from "@/src/lib/pricing-manifest";

type RefreshOptions = {
  source?: "bundled" | "remote";
  url?: string;
  force?: boolean;
};

export type PricingRefreshResult = {
  source: "bundled" | "remote";
  url: string | null;
  checkedAt: string;
  imported: number;
  updated: number;
  skippedManual: number;
  costsRecalculated: number;
  modelAliasesUpdated: number;
  unknownCostInteractions: number;
  error: string | null;
};

const providerNames: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  mistral: "Mistral AI",
  cohere: "Cohere",
  generic: "Generic"
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

function shouldSkipRefresh(rawMetadata: unknown, force: boolean) {
  if (force) return false;
  return parseMetadata(rawMetadata).managedBy === "user";
}

async function fetchRemoteManifest(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      accept: "application/json",
      "user-agent": "TokenTrace model-rate refresh"
    }
  }).finally(() => clearTimeout(timeout));
  if (!response.ok) {
    throw new Error(`Model-rate manifest request failed with HTTP ${response.status}.`);
  }
  return normalizePricingManifest(await response.json());
}

async function loadManifest(options: RefreshOptions) {
  if (options.source === "bundled") {
    return {
      manifest: getBundledPricingManifest(),
      source: "bundled" as const,
      url: null
    };
  }

  const url =
    options.url ??
    process.env.TOKENTRACE_PRICING_MANIFEST_URL ??
    DEFAULT_PRICING_MANIFEST_URL;

  if (process.env.TOKENTRACE_DISABLE_PRICE_REFRESH === "1") {
    return {
      manifest: getBundledPricingManifest(),
      source: "bundled" as const,
      url: null
    };
  }

  return {
    manifest: await fetchRemoteManifest(url),
    source: "remote" as const,
    url
  };
}

function importManifest(manifest: PricingManifest, source: "bundled" | "remote", url: string | null, force: boolean) {
  let imported = 0;
  let updated = 0;
  let skippedManual = 0;
  const effectiveFrom = new Date(manifest.effectiveFrom).getTime();

  const transaction = sqlite.transaction(() => {
    for (const sourceRow of manifest.sources) {
      sqlite
        .prepare("INSERT OR IGNORE INTO providers (id, name, type) VALUES (?, ?, 'llm-provider')")
        .run(sourceRow.providerId, providerNames[sourceRow.providerId] ?? sourceRow.name);
    }

    for (const model of manifest.models) {
      sqlite
        .prepare("INSERT OR IGNORE INTO providers (id, name, type) VALUES (?, ?, 'llm-provider')")
        .run(model.providerId, providerNames[model.providerId] ?? model.providerId);

      const existing = sqlite
        .prepare(
          "SELECT id, raw_metadata FROM models WHERE provider_id = ? AND lower(name) = lower(?)"
        )
        .get(model.providerId, model.name) as
        | { id: string; raw_metadata: unknown }
        | undefined;

      if (existing && shouldSkipRefresh(existing.raw_metadata, force)) {
        skippedManual += 1;
        continue;
      }

      const id = existing?.id ?? model.id;
      const rawMetadata = JSON.stringify({
        managedBy: "tokentrace-pricing-manifest",
        pricingSource: manifest.name,
        pricingManifestSchemaVersion: manifest.schemaVersion,
        pricingRefreshSource: source,
        pricingManifestUrl: url,
        sourceUrl: model.sourceUrl,
        pricingCheckedAt: manifest.checkedAt,
        unit: manifest.unit,
        refreshedAt: new Date().toISOString(),
        note: "Editable public list price. Manual edits are preserved by future refreshes."
      });

      const result = sqlite
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
          model.providerId,
          model.name,
          model.inputTokenPrice,
          model.outputTokenPrice,
          model.cachedInputTokenPrice,
          model.cacheWriteTokenPrice,
          manifest.currency,
          Number.isNaN(effectiveFrom) ? Date.now() : effectiveFrom,
          rawMetadata
        );

      if (existing) updated += result.changes;
      else imported += result.changes;
    }
  });

  transaction();

  return { imported, updated, skippedManual };
}

export async function refreshPricing(options: RefreshOptions = {}): Promise<PricingRefreshResult> {
  try {
    const { manifest, source, url } = await loadManifest(options);
    const result = importManifest(manifest, source, url, Boolean(options.force));
    const recalculation = recalculateInteractionCosts();
    return {
      source,
      url,
      checkedAt: manifest.checkedAt,
      ...result,
      costsRecalculated: recalculation.interactionsUpdated,
      modelAliasesUpdated: recalculation.modelsUpdated,
      unknownCostInteractions: recalculation.unknownCostInteractions,
      error: null
    };
  } catch (error) {
    const fallback = getBundledPricingManifest();
    const result = importManifest(fallback, "bundled", null, Boolean(options.force));
    const recalculation = recalculateInteractionCosts();
    return {
      source: "bundled",
      url: null,
      checkedAt: fallback.checkedAt,
      ...result,
      costsRecalculated: recalculation.interactionsUpdated,
      modelAliasesUpdated: recalculation.modelsUpdated,
      unknownCostInteractions: recalculation.unknownCostInteractions,
      error: error instanceof Error ? error.message : "Model-rate refresh failed."
    };
  }
}
