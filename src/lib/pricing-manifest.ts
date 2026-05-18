import bundledPricingManifest from "@/pricing/default-model-prices.json";

export const DEFAULT_PRICING_MANIFEST_URL =
  "https://raw.githubusercontent.com/abhiyoheswaran1/tokentrace/main/pricing/default-model-prices.json";

export type PricingManifestModel = {
  id: string;
  providerId: string;
  name: string;
  inputTokenPrice: number | null;
  outputTokenPrice: number | null;
  cachedInputTokenPrice: number | null;
  cacheWriteTokenPrice: number | null;
  sourceUrl: string | null;
};

export type PricingManifest = {
  schemaVersion: number;
  name: string;
  effectiveFrom: string;
  checkedAt: string;
  currency: string;
  unit: string;
  sources: Array<{
    providerId: string;
    name: string;
    url: string;
  }>;
  models: PricingManifestModel[];
};

function nullableNumber(value: unknown) {
  if (value == null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const number = Number(trimmed);
    return Number.isFinite(number) && number >= 0 ? number : null;
  }
  return null;
}

function validModel(value: unknown): PricingManifestModel | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<PricingManifestModel>;
  if (!candidate.id || !candidate.providerId || !candidate.name) return null;
  return {
    id: String(candidate.id),
    providerId: String(candidate.providerId),
    name: String(candidate.name),
    inputTokenPrice: nullableNumber(candidate.inputTokenPrice),
    outputTokenPrice: nullableNumber(candidate.outputTokenPrice),
    cachedInputTokenPrice: nullableNumber(candidate.cachedInputTokenPrice),
    cacheWriteTokenPrice: nullableNumber(candidate.cacheWriteTokenPrice),
    sourceUrl: candidate.sourceUrl ? String(candidate.sourceUrl) : null
  };
}

export function normalizePricingManifest(value: unknown): PricingManifest {
  if (!value || typeof value !== "object") {
    throw new Error("Model-rate manifest must be a JSON object.");
  }

  const candidate = value as Partial<PricingManifest>;
  if (candidate.schemaVersion !== 1) {
    throw new Error("Unsupported model-rate manifest schema version.");
  }

  const models = Array.isArray(candidate.models)
    ? candidate.models.map(validModel).filter((model): model is PricingManifestModel => Boolean(model))
    : [];

  if (!models.length) {
    throw new Error("Model-rate manifest does not contain any valid model rows.");
  }

  return {
    schemaVersion: 1,
    name: String(candidate.name || "TokenTrace model-rate manifest"),
    effectiveFrom: String(candidate.effectiveFrom || new Date().toISOString()),
    checkedAt: String(candidate.checkedAt || new Date().toISOString().slice(0, 10)),
    currency: String(candidate.currency || "USD"),
    unit: String(candidate.unit || "USD per 1M tokens"),
    sources: Array.isArray(candidate.sources) ? candidate.sources : [],
    models
  };
}

export function getBundledPricingManifest() {
  return normalizePricingManifest(bundledPricingManifest);
}
