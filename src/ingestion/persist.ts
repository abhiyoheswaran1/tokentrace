import fs from "node:fs";
import path from "node:path";
import { sqlite } from "@/src/db/client";
import { calculateInteractionCost } from "@/src/lib/cost";
import { stableId } from "@/src/lib/ids";
import { inferProviderFromModel } from "@/src/lib/provider-inference";
import { estimateTokensFromText, previewText } from "@/src/lib/token-estimator";
import { NormalizedInteraction, NormalizedSession } from "./types";

export type ImportSessionResult = {
  sessionsImported: number;
  interactionsImported: number;
  toolCallsImported: number;
  warnings: string[];
};

export type ImportSessionOptions = {
  replaceSourceFile?: string;
};

function json(value: unknown) {
  return JSON.stringify(value ?? null);
}

function insertIgnore(sql: string, values: unknown[]) {
  return sqlite.prepare(sql).run(...values).changes;
}

function upsertProvider(session: NormalizedSession) {
  insertIgnore(
    "INSERT OR IGNORE INTO providers (id, name, type) VALUES (?, ?, ?)",
    [session.provider.id, session.provider.name, session.provider.type]
  );
}

function upsertTool(session: NormalizedSession) {
  insertIgnore(
    "INSERT OR IGNORE INTO tools (id, provider_id, name) VALUES (?, ?, ?)",
    [session.tool.id, session.provider.id, session.tool.name]
  );
}

function providerForTool(toolId: string) {
  return sqlite.prepare("SELECT provider_id FROM tools WHERE id = ?").get(toolId) as
    | { provider_id: string }
    | undefined;
}

function ensureProvider(providerId: string, providerName: string) {
  insertIgnore(
    "INSERT OR IGNORE INTO providers (id, name, type) VALUES (?, ?, 'llm-provider')",
    [providerId, providerName]
  );
}

function getModel(providerId: string, modelName: string) {
  return sqlite
    .prepare(
      `SELECT id, input_token_price, output_token_price, cached_input_token_price,
        cache_write_token_price, currency
       FROM models WHERE provider_id = ? AND lower(name) = lower(?)`
    )
    .get(providerId, modelName) as
    | {
        id: string;
        input_token_price: number | null;
        output_token_price: number | null;
        cached_input_token_price: number | null;
        cache_write_token_price: number | null;
        currency: string;
      }
    | undefined;
}

function ensureModel(providerId: string, modelName: string | null | undefined) {
  const name = modelName?.trim() || "unknown";
  const existing = getModel(providerId, name);
  if (existing) return existing;

  const id = stableId("model", [providerId, name]);
  insertIgnore(
    `INSERT OR IGNORE INTO models
      (id, provider_id, name, input_token_price, output_token_price, cached_input_token_price,
       cache_write_token_price, currency, raw_metadata)
     VALUES (?, ?, ?, NULL, NULL, NULL, NULL, 'USD', ?)`,
    [
      id,
      providerId,
      name,
      json({
        note: "Observed during import. Add prices on the Pricing page to enable cost calculation."
      })
    ]
  );
  return getModel(providerId, name) ?? {
    id,
    input_token_price: null,
    output_token_price: null,
    cached_input_token_price: null,
    cache_write_token_price: null,
    currency: "USD"
  };
}

function findProjectRoot(startFile: string) {
  let current = fs.statSync(startFile).isDirectory() ? startFile : path.dirname(startFile);
  const home = process.env.HOME ?? path.parse(current).root;

  while (current !== path.dirname(current)) {
    if (
      fs.existsSync(path.join(current, ".git")) ||
      fs.existsSync(path.join(current, "package.json")) ||
      fs.existsSync(path.join(current, "pyproject.toml")) ||
      fs.existsSync(path.join(current, "Cargo.toml"))
    ) {
      return current;
    }
    if (current === home) break;
    current = path.dirname(current);
  }

  return path.dirname(startFile);
}

function ensureProject(session: NormalizedSession) {
  const projectPath = session.projectPath || findProjectRoot(session.sourceFile);
  const resolved = path.resolve(projectPath);
  const name = session.projectName || path.basename(resolved) || "Unknown project";
  const existing = sqlite.prepare("SELECT id FROM projects WHERE path = ?").get(resolved) as
    | { id: string }
    | undefined;
  if (existing) return existing.id;

  const id = stableId("project", [resolved]);
  insertIgnore("INSERT OR IGNORE INTO projects (id, name, path) VALUES (?, ?, ?)", [
    id,
    name,
    resolved
  ]);
  return (
    (sqlite.prepare("SELECT id FROM projects WHERE path = ?").get(resolved) as
      | { id: string }
      | undefined)?.id ?? id
  );
}

function normalizeTokens(interaction: NormalizedInteraction) {
  const providedAnyToken = [
    interaction.inputTokens,
    interaction.outputTokens,
    interaction.cacheReadTokens,
    interaction.cacheWriteTokens,
    interaction.reasoningTokens,
    interaction.totalTokens
  ].some((value) => value != null && value > 0);
  const baseText = interaction.rawText || interaction.rawTextPreview || "";
  const estimate = estimateTokensFromText(baseText).tokens;
  const estimatedTokens = Boolean(interaction.estimatedTokens || !providedAnyToken);
  let tokenConfidence = interaction.tokenConfidence ?? "unknown";

  let inputTokens = interaction.inputTokens ?? 0;
  let outputTokens = interaction.outputTokens ?? 0;
  const cacheReadTokens = interaction.cacheReadTokens ?? 0;
  const cacheWriteTokens = interaction.cacheWriteTokens ?? 0;
  const reasoningTokens = interaction.reasoningTokens ?? 0;

  if (!providedAnyToken && estimate > 0) {
    if (interaction.role === "assistant") outputTokens = estimate;
    else inputTokens = estimate;
    if (tokenConfidence === "unknown") tokenConfidence = "low-confidence estimate";
  }

  const summed = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens + reasoningTokens;
  const totalTokens = Math.max(interaction.totalTokens ?? 0, summed);

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens,
    totalTokens,
    estimatedTokens,
    tokenConfidence
  };
}

function purgeSourceFileSessions(sourceFile: string) {
  const sessions = sqlite
    .prepare("SELECT id FROM sessions WHERE source_file = ?")
    .all(sourceFile) as Array<{ id: string }>;
  if (!sessions.length) return;

  const deleteToolCalls = sqlite.prepare(
    "DELETE FROM tool_calls WHERE interaction_id IN (SELECT id FROM interactions WHERE session_id = ?)"
  );
  const deleteInteractions = sqlite.prepare("DELETE FROM interactions WHERE session_id = ?");
  const deleteSession = sqlite.prepare("DELETE FROM sessions WHERE id = ?");

  for (const session of sessions) {
    deleteToolCalls.run(session.id);
    deleteInteractions.run(session.id);
    deleteSession.run(session.id);
  }
}

export function importSessions(
  sessions: NormalizedSession[],
  options: ImportSessionOptions = {}
): ImportSessionResult {
  const warnings: string[] = [];
  let sessionsImported = 0;
  let interactionsImported = 0;
  let toolCallsImported = 0;

  const transaction = sqlite.transaction((records: NormalizedSession[], replaceSourceFile?: string) => {
    if (replaceSourceFile) {
      purgeSourceFileSessions(replaceSourceFile);
    }

    for (const session of records) {
      upsertProvider(session);
      upsertTool(session);
      const providerId = providerForTool(session.tool.id)?.provider_id ?? session.provider.id;
      const projectId = ensureProject(session);
      const sessionSourceId = stableId("session-source", [
        session.tool.id,
        session.sourceFile,
        session.externalId ?? session.title
      ]);
      const sessionId = stableId("session", [sessionSourceId]);
      const insertedSession = insertIgnore(
        `INSERT OR IGNORE INTO sessions
          (id, source_id, tool_id, project_id, started_at, ended_at, title, source_file, raw_metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sessionId,
          sessionSourceId,
          session.tool.id,
          projectId,
          session.startedAt?.getTime() ?? null,
          session.endedAt?.getTime() ?? null,
          session.title ?? null,
          session.sourceFile,
          json(session.rawMetadata)
        ]
      );
      sessionsImported += insertedSession;

      for (const interaction of session.interactions) {
        const inferredProvider = inferProviderFromModel(interaction.modelName);
        const modelProviderId = inferredProvider?.id ?? providerId;
        if (inferredProvider) ensureProvider(inferredProvider.id, inferredProvider.name);
        const model = ensureModel(modelProviderId, interaction.modelName);
        const tokens = normalizeTokens(interaction);
        const cost = calculateInteractionCost(tokens, {
          inputTokenPrice: model.input_token_price,
          outputTokenPrice: model.output_token_price,
          cachedInputTokenPrice: model.cached_input_token_price,
          cacheWriteTokenPrice: model.cache_write_token_price,
          currency: model.currency
        });
        const interactionSourceId = stableId("interaction-source", [
          sessionSourceId,
          interaction.externalId,
          interaction.timestamp?.getTime(),
          interaction.role,
          interaction.rawTextPreview
        ]);
        const interactionId = stableId("interaction", [interactionSourceId]);
        const insertedInteraction = insertIgnore(
          `INSERT OR IGNORE INTO interactions
            (id, source_id, session_id, timestamp, role, model_id, input_tokens, output_tokens,
             cache_read_tokens, cache_write_tokens, reasoning_tokens, total_tokens, estimated_tokens,
             token_confidence, cost, cost_estimated, latency_ms, raw_text_preview, raw_text, raw_metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            interactionId,
            interactionSourceId,
            sessionId,
            interaction.timestamp?.getTime() ?? session.startedAt?.getTime() ?? null,
            interaction.role,
            model.id,
            tokens.inputTokens,
            tokens.outputTokens,
            tokens.cacheReadTokens,
            tokens.cacheWriteTokens,
            tokens.reasoningTokens,
            tokens.totalTokens,
            tokens.estimatedTokens ? 1 : 0,
            tokens.tokenConfidence,
            cost.amount,
            cost.status === "estimated" ? 1 : 0,
            interaction.latencyMs ?? null,
            previewText(interaction.rawTextPreview || interaction.rawText),
            interaction.rawText ?? null,
            json({
              ...(interaction.rawMetadata ?? {}),
              costStatus: cost.status,
              costExplanation: cost.explanation
            })
          ]
        );
        interactionsImported += insertedInteraction;

        for (const [index, toolCall] of (interaction.toolCalls ?? []).entries()) {
          const toolCallId = stableId("toolcall", [
            interactionId,
            toolCall.externalId ?? index,
            toolCall.name
          ]);
          toolCallsImported += insertIgnore(
            `INSERT OR IGNORE INTO tool_calls
              (id, interaction_id, name, status, duration_ms, raw_metadata)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              toolCallId,
              interactionId,
              toolCall.name,
              toolCall.status ?? null,
              toolCall.durationMs ?? null,
              json(toolCall.rawMetadata)
            ]
          );
        }
      }
    }
  });

  transaction(sessions, options.replaceSourceFile);

  return {
    sessionsImported,
    interactionsImported,
    toolCallsImported,
    warnings
  };
}
