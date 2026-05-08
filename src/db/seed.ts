import { getBundledPricingManifest } from "@/src/lib/pricing-manifest";
import { db } from "./client";
import { models, providers, settings, tools } from "./schema";

const seedProviders = [
  { id: "openai", name: "OpenAI", type: "llm-provider" },
  { id: "anthropic", name: "Anthropic", type: "llm-provider" },
  { id: "google", name: "Google", type: "llm-provider" },
  { id: "xai", name: "xAI", type: "llm-provider" },
  { id: "deepseek", name: "DeepSeek", type: "llm-provider" },
  { id: "mistral", name: "Mistral AI", type: "llm-provider" },
  { id: "cohere", name: "Cohere", type: "llm-provider" },
  { id: "generic", name: "Generic", type: "local-log" }
];

const seedTools = [
  { id: "codex-cli", providerId: "openai", name: "Codex CLI" },
  { id: "claude-code", providerId: "anthropic", name: "Claude Code" },
  { id: "generic-jsonl", providerId: "generic", name: "Generic JSONL" },
  { id: "generic-json", providerId: "generic", name: "Generic JSON" },
  { id: "generic-log", providerId: "generic", name: "Generic Log" }
];

function metadataForModel(
  model: ReturnType<typeof getBundledPricingManifest>["models"][number],
  manifest: ReturnType<typeof getBundledPricingManifest>
) {
  return {
    pricingSource: manifest.name,
    pricingManifestSchemaVersion: manifest.schemaVersion,
    managedBy: "tokentrace-pricing-manifest",
    sourceUrl: model.sourceUrl,
    pricingCheckedAt: manifest.checkedAt,
    unit: manifest.unit,
    cacheWritePriceNote:
      model.providerId === "anthropic"
        ? "Anthropic seed rows use the 5-minute prompt cache write price. Edit this value if your usage uses 1-hour cache writes, data residency, batch, or other modifiers."
        : "Cache writes use the standard input price unless the provider exposes a separate cache-write price.",
    note: "Editable public list price seed. Verify current provider pricing before financial use."
  };
}

export function seedDatabase() {
  const pricingManifest = getBundledPricingManifest();
  const effectiveFrom = new Date(pricingManifest.effectiveFrom);

  for (const provider of seedProviders) {
    db.insert(providers).values(provider).onConflictDoNothing().run();
  }

  for (const tool of seedTools) {
    db.insert(tools).values(tool).onConflictDoNothing().run();
  }

  for (const model of pricingManifest.models) {
    db.insert(models)
      .values({
        id: model.id,
        providerId: model.providerId,
        name: model.name,
        inputTokenPrice: model.inputTokenPrice,
        outputTokenPrice: model.outputTokenPrice,
        cachedInputTokenPrice: model.cachedInputTokenPrice,
        cacheWriteTokenPrice: model.cacheWriteTokenPrice,
        currency: pricingManifest.currency,
        effectiveFrom,
        rawMetadata: metadataForModel(model, pricingManifest)
      })
      .onConflictDoNothing()
      .run();
  }

  db.insert(settings)
    .values({
      key: "app",
      value: {
        customFolders: [],
        storeRawMessageContent: false
      },
      updatedAt: new Date()
    })
    .onConflictDoNothing()
    .run();
}
