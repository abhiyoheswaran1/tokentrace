import { db } from "./client";
import { models, providers, settings, tools } from "./schema";

const now = new Date("2026-01-01T00:00:00.000Z");

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

const seedModels = [
  {
    id: "openai-gpt-4-1",
    providerId: "openai",
    name: "gpt-4.1",
    inputTokenPrice: 2,
    outputTokenPrice: 8,
    cachedInputTokenPrice: 0.5,
    currency: "USD"
  },
  {
    id: "openai-gpt-4-1-mini",
    providerId: "openai",
    name: "gpt-4.1-mini",
    inputTokenPrice: 0.4,
    outputTokenPrice: 1.6,
    cachedInputTokenPrice: 0.1,
    currency: "USD"
  },
  {
    id: "openai-gpt-4o",
    providerId: "openai",
    name: "gpt-4o",
    inputTokenPrice: 2.5,
    outputTokenPrice: 10,
    cachedInputTokenPrice: 1.25,
    currency: "USD"
  },
  {
    id: "anthropic-claude-sonnet-4",
    providerId: "anthropic",
    name: "claude-sonnet-4",
    inputTokenPrice: 3,
    outputTokenPrice: 15,
    cachedInputTokenPrice: 0.3,
    currency: "USD"
  },
  {
    id: "anthropic-claude-haiku",
    providerId: "anthropic",
    name: "claude-haiku",
    inputTokenPrice: 0.8,
    outputTokenPrice: 4,
    cachedInputTokenPrice: 0.08,
    currency: "USD"
  },
  {
    id: "generic-unknown",
    providerId: "generic",
    name: "unknown",
    inputTokenPrice: null,
    outputTokenPrice: null,
    cachedInputTokenPrice: null,
    currency: "USD"
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
        effectiveFrom: now,
        rawMetadata: {
          note: "Editable placeholder price. Verify current provider pricing before financial use."
        }
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
