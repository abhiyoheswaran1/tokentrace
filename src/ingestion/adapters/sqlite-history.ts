import path from "node:path";
import Database from "better-sqlite3";
import { stableId } from "@/src/lib/ids";
import { firstNumber, firstString, parseTimestamp } from "./helpers";
import type { AdapterParseResult, FileCandidate, IngestionAdapter, NormalizedInteraction } from "../types";

type SqliteTable = {
  name: string;
};

type UsageRow = Record<string, unknown>;

const usageTableNames = [
  "ai_usage_events",
  "usage_events",
  "usage",
  "token_usage",
  "chat_usage",
  "session_events",
  "messages"
];

function openReadonly(filePath: string) {
  return new Database(filePath, { readonly: true, fileMustExist: true });
}

function candidateTables(db: Database.Database) {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all() as SqliteTable[];
  return tables
    .map((table) => table.name)
    .filter((name) => usageTableNames.includes(name) || /usage|token|message|session/i.test(name));
}

function columnsFor(db: Database.Database, tableName: string) {
  const columns = db.prepare(`PRAGMA table_info(${JSON.stringify(tableName)})`).all() as Array<{ name: string }>;
  return new Set(columns.map((column) => column.name.toLowerCase()));
}

function hasUsageShape(columns: Set<string>) {
  const hasModel = columns.has("model") || columns.has("model_name");
  const hasUsage =
    columns.has("input_tokens") ||
    columns.has("prompt_tokens") ||
    columns.has("output_tokens") ||
    columns.has("completion_tokens") ||
    columns.has("total_tokens") ||
    columns.has("tokens") ||
    columns.has("cost");
  return hasModel && hasUsage;
}

function tableRows(db: Database.Database, tableName: string) {
  return db.prepare(`SELECT * FROM ${JSON.stringify(tableName)} LIMIT 50000`).all() as UsageRow[];
}

function providerId(value: string | null) {
  if (!value) return "local";
  const normalized = value.toLowerCase();
  if (normalized.includes("openai")) return "openai";
  if (normalized.includes("anthropic") || normalized.includes("claude")) return "anthropic";
  if (normalized.includes("google") || normalized.includes("gemini")) return "google";
  return normalized.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "local";
}

function roleFrom(value: string | null): NormalizedInteraction["role"] {
  const normalized = (value ?? "").toLowerCase();
  if (normalized.includes("assistant")) return "assistant";
  if (normalized.includes("user")) return "user";
  if (normalized.includes("system")) return "system";
  if (normalized.includes("tool")) return "tool";
  return "unknown";
}

function interactionFromRow(row: UsageRow): NormalizedInteraction {
  const text = firstString(row.raw_text, row.rawText, row.text, row.content, row.prompt, row.completion);
  const model = firstString(row.model, row.model_name, row.modelName);
  const inputTokens = firstNumber(row.input_tokens, row.prompt_tokens, row.inputTokens, row.promptTokens);
  const outputTokens = firstNumber(row.output_tokens, row.completion_tokens, row.outputTokens, row.completionTokens);
  const cacheReadTokens = firstNumber(row.cache_read_tokens, row.cacheReadTokens, row.cached_input_tokens);
  const cacheWriteTokens = firstNumber(row.cache_write_tokens, row.cacheWriteTokens, row.cache_creation_input_tokens);
  const reasoningTokens = firstNumber(row.reasoning_tokens, row.reasoningTokens);
  const totalTokens = firstNumber(row.total_tokens, row.totalTokens, row.tokens);
  const providedAny =
    inputTokens != null ||
    outputTokens != null ||
    cacheReadTokens != null ||
    cacheWriteTokens != null ||
    reasoningTokens != null ||
    totalTokens != null;
  const costUsd = typeof row.cost === "number" && Number.isFinite(row.cost) ? row.cost : null;

  return {
    externalId: firstString(row.id, row.event_id, row.message_id) ?? undefined,
    timestamp: parseTimestamp(row.timestamp, row.created_at, row.createdAt, row.time),
    role: roleFrom(firstString(row.role, row.type)),
    modelName: model,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens,
    totalTokens,
    estimatedTokens: !providedAny,
    tokenConfidence: providedAny ? "exact" : "unknown",
    costUsd,
    costEstimated: false,
    rawText: text,
    rawTextPreview: text,
    rawMetadata: {
      sqliteRowId: row.id ?? row.event_id ?? row.message_id ?? null,
      sourceCost: costUsd
    }
  };
}

export const sqliteHistoryAdapter: IngestionAdapter = {
  id: "sqlite-history",
  displayName: "SQLite History",
  version: 1,
  async detect(file: FileCandidate) {
    const extension = path.extname(file.path).toLowerCase();
    if (![".db", ".sqlite", ".sqlite3"].includes(extension)) {
      return { detected: false, confidence: 0 };
    }

    try {
      const db = openReadonly(file.path);
      try {
        const table = candidateTables(db).find((name) => hasUsageShape(columnsFor(db, name)));
        return table
          ? { detected: true, confidence: 0.86, reason: `SQLite usage table ${table}` }
          : { detected: false, confidence: 0 };
      } finally {
        db.close();
      }
    } catch {
      return { detected: false, confidence: 0 };
    }
  },
  async parse(file: FileCandidate): Promise<AdapterParseResult> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const db = openReadonly(file.path);
    try {
      const table = candidateTables(db).find((name) => hasUsageShape(columnsFor(db, name)));
      if (!table) {
        return { sessions: [], warnings, errors: ["No usage-shaped SQLite table found."] };
      }

      const rows = tableRows(db, table);
      const providerName = firstString(rows[0]?.provider, rows[0]?.provider_name) ?? "Local";
      const toolName = firstString(rows[0]?.tool, rows[0]?.tool_name, rows[0]?.client) ?? "SQLite History";
      const provider = {
        id: providerId(providerName),
        name: providerName,
        type: "llm-provider"
      };
      const sessions = new Map<string, UsageRow[]>();
      for (const row of rows) {
        const sessionId = firstString(row.session_id, row.sessionId, row.conversation_id, row.thread_id) ?? "sqlite-session";
        sessions.set(sessionId, [...(sessions.get(sessionId) ?? []), row]);
      }

      return {
        warnings,
        errors,
        sessions: Array.from(sessions.entries()).map(([sessionId, sessionRows]) => {
          const interactions = sessionRows.map(interactionFromRow);
          const timestamps = interactions
            .map((interaction) => interaction.timestamp?.getTime())
            .filter((value): value is number => typeof value === "number");
          const projectPath = firstString(sessionRows[0]?.project_path, sessionRows[0]?.cwd, sessionRows[0]?.workspace);
          return {
            externalId: sessionId,
            provider,
            tool: {
              id: stableId("tool", [provider.id, toolName]),
              name: toolName
            },
            projectPath,
            projectName: projectPath ? path.basename(projectPath) : "SQLite History",
            startedAt: timestamps.length ? new Date(Math.min(...timestamps)) : file.modifiedTime,
            endedAt: timestamps.length ? new Date(Math.max(...timestamps)) : file.modifiedTime,
            title: `SQLite history ${sessionId}`,
            sourceFile: file.path,
            rawMetadata: {
              adapter: "sqlite-history",
              table,
              rows: sessionRows.length
            },
            interactions
          };
        })
      };
    } finally {
      db.close();
    }
  }
};
