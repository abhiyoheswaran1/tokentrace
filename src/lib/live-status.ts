import fs from "node:fs/promises";
import { sqlite } from "@/src/db/client";
import { extractModel, extractUsage, safeJsonParse } from "@/src/ingestion/adapters/helpers";
import { formatCurrency, formatTokens } from "@/src/lib/format";

export type LiveStatusSnapshot = {
  scope: "all" | "source-file";
  sourceFile: string | null;
  generatedAt: string;
  sessions: number;
  interactions: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
  totalCost: number | null;
  exactCost: number;
  estimatedCost: number;
  unknownCostInteractions: number;
  mostUsedTool: string;
  mostUsedModel: string;
};

export type ClaudeTranscriptSummary = {
  source: "transcript" | "context";
  model: string | null;
  interactions: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cachedTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  reasoningTokens: number;
};

type ClaudeStatusInput = {
  transcript_path?: unknown;
  model?: {
    id?: unknown;
    display_name?: unknown;
  };
  cost?: {
    total_cost_usd?: unknown;
  };
  context_window?: {
    used_percentage?: unknown;
    current_usage?: {
      input_tokens?: unknown;
      output_tokens?: unknown;
      cache_creation_input_tokens?: unknown;
      cache_read_input_tokens?: unknown;
    } | null;
  };
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function positiveInteger(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  if (typeof value === "string" && /^\d+(\.\d+)?$/.test(value.trim())) {
    return Math.max(0, Math.round(Number(value)));
  }
  return 0;
}

function string(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function sourceFilter(sourceFile?: string | null) {
  if (!sourceFile) return { sql: "", params: [] as unknown[] };
  return { sql: "WHERE s.source_file = ?", params: [sourceFile] as unknown[] };
}

function sourceAndFilter(sourceFile?: string | null) {
  if (!sourceFile) return { sql: "", params: [] as unknown[] };
  return { sql: "AND s.source_file = ?", params: [sourceFile] as unknown[] };
}

export function getLiveStatusSnapshot(options: { sourceFile?: string | null } = {}): LiveStatusSnapshot {
  const sourceFile = options.sourceFile ?? null;
  const interactionFilter = sourceFilter(sourceFile);
  const aggregate = sqlite
    .prepare(
      `SELECT
        COUNT(DISTINCT s.id) AS sessions,
        COUNT(i.id) AS interactions,
        COALESCE(SUM(i.total_tokens), 0) AS totalTokens,
        COALESCE(SUM(i.input_tokens), 0) AS inputTokens,
        COALESCE(SUM(i.output_tokens), 0) AS outputTokens,
        COALESCE(SUM(i.cache_read_tokens + i.cache_write_tokens), 0) AS cachedTokens,
        COALESCE(SUM(i.cache_read_tokens), 0) AS cacheReadTokens,
        COALESCE(SUM(i.cache_write_tokens), 0) AS cacheWriteTokens,
        COALESCE(SUM(i.reasoning_tokens), 0) AS reasoningTokens,
        COALESCE(SUM(i.cost), 0) AS totalCost,
        COALESCE(SUM(CASE WHEN i.cost_estimated = 0 AND i.cost IS NOT NULL THEN i.cost ELSE 0 END), 0) AS exactCost,
        COALESCE(SUM(CASE WHEN i.cost_estimated = 1 AND i.cost IS NOT NULL THEN i.cost ELSE 0 END), 0) AS estimatedCost,
        COALESCE(SUM(CASE WHEN i.cost IS NULL THEN 1 ELSE 0 END), 0) AS unknownCostInteractions
       FROM sessions s
       LEFT JOIN interactions i ON i.session_id = s.id
       ${interactionFilter.sql}`
    )
    .get(...interactionFilter.params) as Omit<LiveStatusSnapshot, "scope" | "sourceFile" | "generatedAt" | "mostUsedTool" | "mostUsedModel">;

  const toolFilter = sourceAndFilter(sourceFile);
  const tool = sqlite
    .prepare(
      `SELECT t.name
       FROM sessions s
       JOIN tools t ON t.id = s.tool_id
       LEFT JOIN interactions i ON i.session_id = s.id
       WHERE 1 = 1 ${toolFilter.sql}
       GROUP BY t.id
       ORDER BY COALESCE(SUM(i.total_tokens), 0) DESC, t.name ASC
       LIMIT 1`
    )
    .get(...toolFilter.params) as { name: string } | undefined;

  const modelFilter = sourceAndFilter(sourceFile);
  const model = sqlite
    .prepare(
      `SELECT m.name
       FROM sessions s
       JOIN interactions i ON i.session_id = s.id
       LEFT JOIN models m ON m.id = i.model_id
       WHERE 1 = 1 ${modelFilter.sql}
       GROUP BY m.id
       ORDER BY COALESCE(SUM(i.total_tokens), 0) DESC, m.name ASC
       LIMIT 1`
    )
    .get(...modelFilter.params) as { name: string } | undefined;

  const interactions = number(aggregate.interactions);
  return {
    scope: sourceFile ? "source-file" : "all",
    sourceFile,
    generatedAt: new Date().toISOString(),
    sessions: number(aggregate.sessions),
    interactions,
    totalTokens: number(aggregate.totalTokens),
    inputTokens: number(aggregate.inputTokens),
    outputTokens: number(aggregate.outputTokens),
    cachedTokens: number(aggregate.cachedTokens),
    cacheReadTokens: number(aggregate.cacheReadTokens),
    cacheWriteTokens: number(aggregate.cacheWriteTokens),
    reasoningTokens: number(aggregate.reasoningTokens),
    totalCost: interactions > 0 ? number(aggregate.totalCost) : null,
    exactCost: number(aggregate.exactCost),
    estimatedCost: number(aggregate.estimatedCost),
    unknownCostInteractions: number(aggregate.unknownCostInteractions),
    mostUsedTool: tool?.name ?? "None",
    mostUsedModel: model?.name ?? "None"
  };
}

export function renderLiveStatusLine(status: LiveStatusSnapshot) {
  const cost = status.totalCost == null ? "Unknown" : formatCurrency(status.totalCost);
  return [
    "TokenTrace",
    status.scope === "source-file" ? "session" : "all",
    `${formatTokens(status.totalTokens)} tokens`,
    `${formatTokens(status.cachedTokens)} cache`,
    `cost ${cost}`,
    `${status.unknownCostInteractions.toLocaleString()} unknown`
  ].join(" | ");
}

export async function summarizeClaudeTranscript(filePath: string): Promise<ClaudeTranscriptSummary | null> {
  let text: string;
  try {
    text = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }

  const summary: ClaudeTranscriptSummary = {
    source: "transcript",
    model: null,
    interactions: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    reasoningTokens: 0
  };

  for (const line of text.split(/\r?\n/)) {
    const parsed = safeJsonParse(line);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
    const record = parsed as Record<string, unknown>;
    const usage = extractUsage(record);
    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = usage.outputTokens ?? 0;
    const cacheReadTokens = usage.cacheReadTokens ?? 0;
    const cacheWriteTokens = usage.cacheWriteTokens ?? 0;
    const reasoningTokens = usage.reasoningTokens ?? 0;
    const summed = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens + reasoningTokens;
    const totalTokens = Math.max(usage.totalTokens ?? 0, summed);
    if (totalTokens <= 0) continue;

    summary.interactions += 1;
    summary.inputTokens += inputTokens;
    summary.outputTokens += outputTokens;
    summary.cacheReadTokens += cacheReadTokens;
    summary.cacheWriteTokens += cacheWriteTokens;
    summary.reasoningTokens += reasoningTokens;
    summary.cachedTokens += cacheReadTokens + cacheWriteTokens;
    summary.totalTokens += totalTokens;
    summary.model = extractModel(record) ?? summary.model;
  }

  return summary.interactions > 0 ? summary : null;
}

function summarizeClaudeContext(input: ClaudeStatusInput): ClaudeTranscriptSummary | null {
  const usage = input.context_window?.current_usage;
  if (!usage) return null;
  const inputTokens = positiveInteger(usage.input_tokens);
  const outputTokens = positiveInteger(usage.output_tokens);
  const cacheReadTokens = positiveInteger(usage.cache_read_input_tokens);
  const cacheWriteTokens = positiveInteger(usage.cache_creation_input_tokens);
  const totalTokens = inputTokens + outputTokens + cacheReadTokens + cacheWriteTokens;
  if (totalTokens <= 0) return null;
  return {
    source: "context",
    model: string(input.model?.id) ?? string(input.model?.display_name),
    interactions: 0,
    totalTokens,
    inputTokens,
    outputTokens,
    cachedTokens: cacheReadTokens + cacheWriteTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens: 0
  };
}

export async function buildClaudeStatusLine(input: ClaudeStatusInput) {
  const transcriptPath = string(input.transcript_path);
  const transcriptSummary = transcriptPath ? await summarizeClaudeTranscript(transcriptPath) : null;
  const summary = transcriptSummary ?? summarizeClaudeContext(input);
  const dbStatus = transcriptPath ? getLiveStatusSnapshot({ sourceFile: transcriptPath }) : null;
  const model = string(input.model?.display_name) ?? summary?.model ?? string(input.model?.id) ?? "Claude";
  const cost = optionalNumber(input.cost?.total_cost_usd) ?? dbStatus?.totalCost ?? null;
  const pricing =
    dbStatus && dbStatus.interactions > 0
      ? `${dbStatus.unknownCostInteractions.toLocaleString()} unknown`
      : "pricing unscanned";

  if (!summary) {
    return [
      "TokenTrace",
      model,
      "session no tokens yet",
      `cost ${formatCurrency(cost)}`,
      pricing
    ].join(" | ");
  }

  const scope = summary.source === "transcript" ? "session" : "ctx";
  return [
    "TokenTrace",
    model,
    `${scope} ${formatTokens(summary.totalTokens)} tokens`,
    `cache ${formatTokens(summary.cachedTokens)}`,
    `cost ${formatCurrency(cost)}`,
    pricing
  ].join(" | ");
}

export function claudeStatusLineSetupText(command = "tokentrace statusline claude") {
  return [
    "Add this to ~/.claude/settings.json:",
    "",
    JSON.stringify(
      {
        statusLine: {
          type: "command",
          command,
          padding: 0,
          refreshInterval: 1
        }
      },
      null,
      2
    )
  ].join("\n");
}
