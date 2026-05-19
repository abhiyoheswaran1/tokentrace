import { sqlite } from "@/src/db/client";
import { formatCurrency, formatTokens } from "@/src/lib/format";
import type { StatusLineMode } from "@/src/lib/claude-statusline";
export {
  buildClaudeStatusLine,
  claudeStatusLineSetupText,
  summarizeClaudeTranscript
} from "@/src/lib/claude-statusline";
export type { ClaudeTranscriptSummary, StatusLineMode } from "@/src/lib/claude-statusline";

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

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
        COUNT(*) AS interactions,
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

export function renderLiveStatusLine(status: LiveStatusSnapshot, options: { mode?: StatusLineMode } = {}) {
  const cost = status.totalCost == null ? "Unknown" : formatCurrency(status.totalCost);
  if (options.mode === "compact") {
    return [
      "TT",
      status.scope === "source-file" ? "session" : "all",
      `${formatTokens(status.totalTokens)} tok`,
      cost,
      `${status.unknownCostInteractions.toLocaleString()} unk`
    ].join(" | ");
  }

  if (options.mode === "wide") {
    return [
      "TokenTrace",
      status.scope === "source-file" ? "session" : "all",
      `${formatTokens(status.totalTokens)} tokens`,
      `input ${formatTokens(status.inputTokens)}`,
      `output ${formatTokens(status.outputTokens)}`,
      `cache read ${formatTokens(status.cacheReadTokens)}`,
      `cache write ${formatTokens(status.cacheWriteTokens)}`,
      `reasoning ${formatTokens(status.reasoningTokens)}`,
      `cost ${cost}`,
      `${status.unknownCostInteractions.toLocaleString()} unknown`
    ].join(" | ");
  }

  return [
    "TokenTrace",
    status.scope === "source-file" ? "session" : "all",
    `${formatTokens(status.totalTokens)} tokens`,
    `${formatTokens(status.cachedTokens)} cache`,
    `cost ${cost}`,
    `${status.unknownCostInteractions.toLocaleString()} unknown`
  ].join(" | ");
}
