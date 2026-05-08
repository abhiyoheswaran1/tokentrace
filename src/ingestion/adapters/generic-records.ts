import { FileCandidate, NormalizedInteraction, NormalizedSession } from "../types";
import {
  asObject,
  extractModel,
  extractRole,
  extractText,
  extractToolCalls,
  extractUsage,
  firstString,
  normalizeInteraction,
  parseTimestamp,
  sessionNameFromFile
} from "./helpers";

type BuildOptions = {
  file: FileCandidate;
  records: Record<string, unknown>[];
  provider: NormalizedSession["provider"];
  tool: NormalizedSession["tool"];
  storeRawMessageContent: boolean;
  defaultSessionId?: string;
  defaultProjectPath?: string | null;
};

function interactionExternalId(record: Record<string, unknown>, index: number) {
  const message = asObject(record.message);
  const payload = asObject(record.payload);
  const response = asObject(record.response) ?? asObject(payload?.response);
  return (
    firstString(
      record.uuid,
      record.id,
      record.message_id,
      record.messageId,
      message?.id,
      payload?.id,
      response?.id
    ) ?? `${index}`
  );
}

function sessionExternalId(record: Record<string, unknown>, fallback: string) {
  const message = asObject(record.message);
  const payload = asObject(record.payload);
  return (
    firstString(
      record.session_id,
      record.sessionId,
      record.conversation_id,
      record.conversationId,
      record.thread_id,
      record.threadId,
      message?.session_id,
      message?.sessionId,
      payload?.session_id,
      payload?.sessionId,
      payload?.conversation_id
    ) ?? fallback
  );
}

function projectPathFromRecord(record: Record<string, unknown>) {
  const payload = asObject(record.payload);
  return firstString(
    record.cwd,
    record.project_path,
    record.projectPath,
    record.repository,
    payload?.cwd,
    payload?.project_path,
    payload?.projectPath
  );
}

function titleFromRecord(record: Record<string, unknown>) {
  const payload = asObject(record.payload);
  return firstString(record.title, record.summary, payload?.title, payload?.summary);
}

function hasUsage(usage: ReturnType<typeof extractUsage>) {
  return Object.values(usage).some((value) => typeof value === "number" && value > 0);
}

function shouldKeepInteraction(record: Record<string, unknown>) {
  const usage = extractUsage(record);
  return Boolean(
    extractText(record) ||
      hasUsage(usage) ||
      extractModel(record) ||
      extractToolCalls(record).length ||
      extractRole(record) !== "unknown"
  );
}

function tuneRole(interaction: NormalizedInteraction): NormalizedInteraction {
  if (interaction.role !== "unknown") return interaction;
  if ((interaction.outputTokens ?? 0) > 0 || (interaction.reasoningTokens ?? 0) > 0) {
    return { ...interaction, role: "assistant" };
  }
  if ((interaction.inputTokens ?? 0) > 0) {
    return { ...interaction, role: "user" };
  }
  return interaction;
}

export function buildSessionsFromRecords(options: BuildOptions): NormalizedSession[] {
  const fallbackSessionId = options.defaultSessionId ?? sessionNameFromFile(options.file.path);
  const grouped = new Map<
    string,
    {
      interactions: NormalizedInteraction[];
      projectPath: string | null;
      title: string | null;
      timestamps: Date[];
      metadata: Record<string, unknown>[];
    }
  >();

  options.records.forEach((record, index) => {
    const sessionId = sessionExternalId(record, fallbackSessionId);
    const group =
      grouped.get(sessionId) ??
      {
        interactions: [],
        projectPath: options.defaultProjectPath ?? null,
        title: null,
        timestamps: [],
        metadata: []
      };

    group.projectPath = group.projectPath ?? projectPathFromRecord(record);
    group.title = group.title ?? titleFromRecord(record);
    group.metadata.push(record);

    const timestamp = parseTimestamp(
      record.timestamp,
      record.created_at,
      record.createdAt,
      record.time,
      record.ts
    );
    if (timestamp) group.timestamps.push(timestamp);

    if (shouldKeepInteraction(record)) {
      const interaction = tuneRole(
        normalizeInteraction(
          record,
          interactionExternalId(record, index),
          options.storeRawMessageContent
        )
      );
      group.interactions.push(interaction);
    }

    grouped.set(sessionId, group);
  });

  return Array.from(grouped.entries())
    .filter(([, group]) => group.interactions.length > 0)
    .map(([externalId, group]) => {
      const sorted = [...group.timestamps].sort((a, b) => a.getTime() - b.getTime());
      return {
        externalId,
        provider: options.provider,
        tool: options.tool,
        projectPath: group.projectPath,
        projectName: group.projectPath ? undefined : "Unknown project",
        startedAt: sorted[0] ?? options.file.modifiedTime,
        endedAt: sorted[sorted.length - 1] ?? options.file.modifiedTime,
        title: group.title ?? sessionNameFromFile(options.file.path),
        sourceFile: options.file.path,
        rawMetadata: {
          parserInputRecords: group.metadata.length
        },
        interactions: group.interactions
      };
    });
}
