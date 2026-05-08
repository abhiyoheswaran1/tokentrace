import { db } from "./client";
import { models, providers, settings, tools } from "./schema";

const pricingEffectiveFrom = new Date("2026-05-08T00:00:00.000Z");
const pricingCheckedAt = "2026-05-08";

type SeedModel = {
  id: string;
  providerId: string;
  name: string;
  inputTokenPrice: number | null;
  outputTokenPrice: number | null;
  cachedInputTokenPrice: number | null;
  cacheWriteTokenPrice: number | null;
  currency: string;
  rawMetadata: Record<string, unknown>;
};

function openAiModel(
  id: string,
  name: string,
  inputTokenPrice: number | null,
  outputTokenPrice: number | null,
  cachedInputTokenPrice: number | null,
  sourceUrl: string
): SeedModel {
  return {
    id,
    providerId: "openai",
    name,
    inputTokenPrice,
    outputTokenPrice,
    cachedInputTokenPrice,
    cacheWriteTokenPrice: inputTokenPrice,
    currency: "USD",
    rawMetadata: {
      pricingSource: "OpenAI public API/model pricing",
      sourceUrl,
      pricingCheckedAt,
      unit: "USD per 1M tokens",
      note: "Editable public list price seed. Verify current provider pricing before financial use."
    }
  };
}

function anthropicModel(
  id: string,
  name: string,
  inputTokenPrice: number,
  outputTokenPrice: number,
  cacheWriteTokenPrice: number,
  cachedInputTokenPrice: number
): SeedModel {
  return {
    id,
    providerId: "anthropic",
    name,
    inputTokenPrice,
    outputTokenPrice,
    cachedInputTokenPrice,
    cacheWriteTokenPrice,
    currency: "USD",
    rawMetadata: {
      pricingSource: "Anthropic Claude pricing",
      sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
      pricingCheckedAt,
      unit: "USD per 1M tokens",
      cacheWritePriceNote:
        "Uses Anthropic's 5-minute prompt cache write price. Edit this value if your usage uses 1-hour cache writes, data residency, batch, or other modifiers.",
      note: "Editable public list price seed. Verify current provider pricing before financial use."
    }
  };
}

const seedProviders = [
  { id: "openai", name: "OpenAI", type: "llm-provider" },
  { id: "anthropic", name: "Anthropic", type: "llm-provider" },
  { id: "generic", name: "Generic", type: "local-log" }
];

const seedTools = [
  { id: "codex-cli", providerId: "openai", name: "Codex CLI" },
  { id: "claude-code", providerId: "anthropic", name: "Claude Code" },
  { id: "generic-jsonl", providerId: "generic", name: "Generic JSONL" },
  { id: "generic-json", providerId: "generic", name: "Generic JSON" },
  { id: "generic-log", providerId: "generic", name: "Generic Log" }
];

const openAiPricingPage = "https://openai.com/api/pricing/";
const openAiModelsBase = "https://developers.openai.com/api/docs/models";

const seedModels: SeedModel[] = [
  openAiModel("openai-gpt-5-5", "gpt-5.5", 5, 30, 0.5, openAiPricingPage),
  openAiModel("openai-gpt-5-5-pro", "gpt-5.5-pro", 30, 180, null, `${openAiModelsBase}/compare`),
  openAiModel("openai-gpt-5-4", "gpt-5.4", 2.5, 15, 0.25, openAiPricingPage),
  openAiModel("openai-gpt-5-4-mini", "gpt-5.4-mini", 0.75, 4.5, 0.075, openAiPricingPage),
  openAiModel("openai-gpt-5-4-nano", "gpt-5.4-nano", 0.2, 1.25, 0.02, `${openAiModelsBase}/gpt-5.4-nano`),
  openAiModel(
    "openai-codex-mini-latest",
    "codex-mini-latest",
    1.5,
    6,
    0.375,
    `${openAiModelsBase}/codex-mini-latest`
  ),
  openAiModel("openai-o4-mini", "o4-mini", 1.1, 4.4, 0.275, `${openAiModelsBase}/o4-mini`),
  openAiModel("openai-gpt-4-1", "gpt-4.1", 2, 8, 0.5, `${openAiModelsBase}/gpt-4.1`),
  openAiModel("openai-gpt-4-1-mini", "gpt-4.1-mini", 0.4, 1.6, 0.1, `${openAiModelsBase}/gpt-4.1-mini`),
  openAiModel("openai-gpt-4-1-nano", "gpt-4.1-nano", 0.1, 0.4, 0.025, `${openAiModelsBase}/gpt-4.1-nano`),
  openAiModel("openai-gpt-4o", "gpt-4o", 2.5, 10, 1.25, `${openAiModelsBase}/gpt-4o`),
  openAiModel("openai-gpt-4o-mini", "gpt-4o-mini", 0.15, 0.6, 0.075, `${openAiModelsBase}/gpt-4o-mini`),
  anthropicModel("anthropic-claude-opus-4-7", "claude-opus-4.7", 5, 25, 6.25, 0.5),
  anthropicModel("anthropic-claude-opus-4-7-alias", "claude-opus-4-7", 5, 25, 6.25, 0.5),
  anthropicModel("anthropic-claude-opus-4-6", "claude-opus-4.6", 5, 25, 6.25, 0.5),
  anthropicModel("anthropic-claude-opus-4-6-alias", "claude-opus-4-6", 5, 25, 6.25, 0.5),
  anthropicModel("anthropic-claude-opus-4-5", "claude-opus-4.5", 5, 25, 6.25, 0.5),
  anthropicModel("anthropic-claude-opus-4-5-alias", "claude-opus-4-5", 5, 25, 6.25, 0.5),
  anthropicModel("anthropic-claude-opus-4-1", "claude-opus-4.1", 15, 75, 18.75, 1.5),
  anthropicModel("anthropic-claude-opus-4-1-alias", "claude-opus-4-1", 15, 75, 18.75, 1.5),
  anthropicModel("anthropic-claude-opus-4", "claude-opus-4", 15, 75, 18.75, 1.5),
  anthropicModel("anthropic-claude-sonnet-4-6", "claude-sonnet-4.6", 3, 15, 3.75, 0.3),
  anthropicModel("anthropic-claude-sonnet-4-6-alias", "claude-sonnet-4-6", 3, 15, 3.75, 0.3),
  anthropicModel("anthropic-claude-sonnet-4-5", "claude-sonnet-4.5", 3, 15, 3.75, 0.3),
  anthropicModel("anthropic-claude-sonnet-4-5-alias", "claude-sonnet-4-5", 3, 15, 3.75, 0.3),
  anthropicModel("anthropic-claude-sonnet-4", "claude-sonnet-4", 3, 15, 3.75, 0.3),
  anthropicModel("anthropic-claude-sonnet-3-7", "claude-sonnet-3.7", 3, 15, 3.75, 0.3),
  anthropicModel("anthropic-claude-sonnet-3-7-alias", "claude-sonnet-3-7", 3, 15, 3.75, 0.3),
  anthropicModel("anthropic-claude-haiku-4-5", "claude-haiku-4.5", 1, 5, 1.25, 0.1),
  anthropicModel("anthropic-claude-haiku-4-5-alias", "claude-haiku-4-5", 1, 5, 1.25, 0.1),
  anthropicModel("anthropic-claude-haiku-3-5", "claude-haiku-3.5", 0.8, 4, 1, 0.08),
  anthropicModel("anthropic-claude-haiku-3-5-alias", "claude-haiku-3-5", 0.8, 4, 1, 0.08),
  anthropicModel("anthropic-claude-haiku", "claude-haiku", 0.8, 4, 1, 0.08),
  anthropicModel("anthropic-claude-haiku-3", "claude-haiku-3", 0.25, 1.25, 0.3, 0.03),
  {
    id: "generic-unknown",
    providerId: "generic",
    name: "unknown",
    inputTokenPrice: null,
    outputTokenPrice: null,
    cachedInputTokenPrice: null,
    cacheWriteTokenPrice: null,
    currency: "USD",
    rawMetadata: {
      note: "Unknown models intentionally have no default price. Add pricing when the source model is known."
    }
  }
];

export function seedDatabase() {
  for (const provider of seedProviders) {
    db.insert(providers).values(provider).onConflictDoNothing().run();
  }

  for (const tool of seedTools) {
    db.insert(tools).values(tool).onConflictDoNothing().run();
  }

  for (const model of seedModels) {
    db.insert(models)
      .values({
        ...model,
        effectiveFrom: pricingEffectiveFrom
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
