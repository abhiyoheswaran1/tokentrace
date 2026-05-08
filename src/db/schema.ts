import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
});

export const tools = sqliteTable(
  "tools",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
  },
  (table) => ({
    providerNameIdx: uniqueIndex("tools_provider_name_idx").on(
      table.providerId,
      table.name
    )
  })
);

export const models = sqliteTable(
  "models",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    inputTokenPrice: real("input_token_price"),
    outputTokenPrice: real("output_token_price"),
    cachedInputTokenPrice: real("cached_input_token_price"),
    cacheWriteTokenPrice: real("cache_write_token_price"),
    currency: text("currency").notNull().default("USD"),
    effectiveFrom: integer("effective_from", { mode: "timestamp_ms" }),
    rawMetadata: text("raw_metadata", { mode: "json" }).$type<Record<string, unknown>>()
  },
  (table) => ({
    providerModelIdx: uniqueIndex("models_provider_name_idx").on(
      table.providerId,
      table.name
    )
  })
);

export const projects = sqliteTable(
  "projects",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    path: text("path").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date())
  },
  (table) => ({
    pathIdx: uniqueIndex("projects_path_idx").on(table.path)
  })
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    toolId: text("tool_id")
      .notNull()
      .references(() => tools.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "set null"
    }),
    startedAt: integer("started_at", { mode: "timestamp_ms" }),
    endedAt: integer("ended_at", { mode: "timestamp_ms" }),
    title: text("title"),
    sourceFile: text("source_file").notNull(),
    rawMetadata: text("raw_metadata", { mode: "json" }).$type<Record<string, unknown>>()
  },
  (table) => ({
    sourceIdx: uniqueIndex("sessions_source_id_idx").on(table.sourceId),
    toolIdx: index("sessions_tool_idx").on(table.toolId),
    projectIdx: index("sessions_project_idx").on(table.projectId),
    startedIdx: index("sessions_started_idx").on(table.startedAt)
  })
);

export const interactions = sqliteTable(
  "interactions",
  {
    id: text("id").primaryKey(),
    sourceId: text("source_id").notNull(),
    sessionId: text("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    timestamp: integer("timestamp", { mode: "timestamp_ms" }),
    role: text("role").notNull(),
    modelId: text("model_id").references(() => models.id, {
      onDelete: "set null"
    }),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    cacheReadTokens: integer("cache_read_tokens").notNull().default(0),
    cacheWriteTokens: integer("cache_write_tokens").notNull().default(0),
    reasoningTokens: integer("reasoning_tokens").notNull().default(0),
    totalTokens: integer("total_tokens").notNull().default(0),
    estimatedTokens: integer("estimated_tokens", { mode: "boolean" })
      .notNull()
      .default(false),
    tokenConfidence: text("token_confidence").notNull().default("unknown"),
    cost: real("cost"),
    costEstimated: integer("cost_estimated", { mode: "boolean" })
      .notNull()
      .default(false),
    latencyMs: integer("latency_ms"),
    rawTextPreview: text("raw_text_preview"),
    rawText: text("raw_text"),
    rawMetadata: text("raw_metadata", { mode: "json" }).$type<Record<string, unknown>>()
  },
  (table) => ({
    sourceIdx: uniqueIndex("interactions_source_id_idx").on(table.sourceId),
    sessionIdx: index("interactions_session_idx").on(table.sessionId),
    modelIdx: index("interactions_model_idx").on(table.modelId),
    timestampIdx: index("interactions_timestamp_idx").on(table.timestamp)
  })
);

export const toolCalls = sqliteTable(
  "tool_calls",
  {
    id: text("id").primaryKey(),
    interactionId: text("interaction_id")
      .notNull()
      .references(() => interactions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    status: text("status"),
    durationMs: integer("duration_ms"),
    rawMetadata: text("raw_metadata", { mode: "json" }).$type<Record<string, unknown>>()
  },
  (table) => ({
    interactionIdx: index("tool_calls_interaction_idx").on(table.interactionId)
  })
);

export const scanRuns = sqliteTable("scan_runs", {
  id: text("id").primaryKey(),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  completedAt: integer("completed_at", { mode: "timestamp_ms" }),
  filesScanned: integer("files_scanned").notNull().default(0),
  recordsImported: integer("records_imported").notNull().default(0),
  warnings: text("warnings", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
  errors: text("errors", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`)
});

export const scanFiles = sqliteTable(
  "scan_files",
  {
    id: text("id").primaryKey(),
    scanRunId: text("scan_run_id")
      .notNull()
      .references(() => scanRuns.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    modifiedTime: integer("modified_time", { mode: "timestamp_ms" }),
    sizeBytes: integer("size_bytes").notNull().default(0),
    fileHash: text("file_hash"),
    parser: text("parser"),
    status: text("status").notNull(),
    recordsImported: integer("records_imported").notNull().default(0),
    warnings: text("warnings", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    errors: text("errors", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    rawMetadata: text("raw_metadata", { mode: "json" }).$type<Record<string, unknown>>()
  },
  (table) => ({
    pathHashIdx: index("scan_files_path_hash_idx").on(table.path, table.fileHash),
    scanRunIdx: index("scan_files_run_idx").on(table.scanRunId)
  })
);

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date())
});

export const providerRelations = relations(providers, ({ many }) => ({
  tools: many(tools),
  models: many(models)
}));

export const toolRelations = relations(tools, ({ one, many }) => ({
  provider: one(providers, {
    fields: [tools.providerId],
    references: [providers.id]
  }),
  sessions: many(sessions)
}));

export const modelRelations = relations(models, ({ one, many }) => ({
  provider: one(providers, {
    fields: [models.providerId],
    references: [providers.id]
  }),
  interactions: many(interactions)
}));

export const projectRelations = relations(projects, ({ many }) => ({
  sessions: many(sessions)
}));

export const sessionRelations = relations(sessions, ({ one, many }) => ({
  tool: one(tools, {
    fields: [sessions.toolId],
    references: [tools.id]
  }),
  project: one(projects, {
    fields: [sessions.projectId],
    references: [projects.id]
  }),
  interactions: many(interactions)
}));

export const interactionRelations = relations(interactions, ({ one, many }) => ({
  session: one(sessions, {
    fields: [interactions.sessionId],
    references: [sessions.id]
  }),
  model: one(models, {
    fields: [interactions.modelId],
    references: [models.id]
  }),
  toolCalls: many(toolCalls)
}));

export type Provider = typeof providers.$inferSelect;
export type Tool = typeof tools.$inferSelect;
export type Model = typeof models.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type Interaction = typeof interactions.$inferSelect;
export type ToolCall = typeof toolCalls.$inferSelect;
export type ScanRun = typeof scanRuns.$inferSelect;
export type ScanFile = typeof scanFiles.$inferSelect;
