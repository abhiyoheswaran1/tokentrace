import fs from "node:fs/promises";
import { extractModel, extractUsage, safeJsonParse } from "@/src/ingestion/adapters/helpers";
import { formatCurrency, formatTokens } from "@/src/lib/format";

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

export type StatusLineMode = "default" | "compact" | "wide";

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

export async function buildClaudeStatusLine(input: ClaudeStatusInput, options: { mode?: StatusLineMode } = {}) {
  const transcriptPath = string(input.transcript_path);
  const transcriptSummary = transcriptPath ? await summarizeClaudeTranscript(transcriptPath) : null;
  const summary = transcriptSummary ?? summarizeClaudeContext(input);
  const model = string(input.model?.display_name) ?? summary?.model ?? string(input.model?.id) ?? "Claude";
  const cost = optionalNumber(input.cost?.total_cost_usd);
  const contextUsed = optionalNumber(input.context_window?.used_percentage);
  const context = contextUsed == null ? null : `ctx ${Math.round(contextUsed)}%`;
  const costLabel = `cost ${formatCurrency(cost)}`;
  const pricing = cost == null ? "pricing repair" : "priced";

  if (!summary) {
    if (options.mode === "compact") {
      return ["TT", model, context, formatCurrency(cost), "no tok"].filter(Boolean).join(" | ");
    }
    return [
      "TokenTrace",
      model,
      context,
      costLabel,
      "no token usage yet",
      pricing
    ].filter(Boolean).join(" | ");
  }

  const usageLabel = summary.source === "transcript" ? "processed" : "current";
  const compactUsageLabel = summary.source === "transcript" ? "proc" : "current";
  if (options.mode === "compact") {
    return [
      "TT",
      model,
      context,
      formatCurrency(cost),
      `${compactUsageLabel} ${formatTokens(summary.totalTokens)} tok`,
      `cache ${formatTokens(summary.cachedTokens)}`
    ].filter(Boolean).join(" | ");
  }

  if (options.mode === "wide") {
    return [
      "TokenTrace",
      model,
      context,
      costLabel,
      pricing,
      `${usageLabel} ${formatTokens(summary.totalTokens)} tokens`,
      `input ${formatTokens(summary.inputTokens)}`,
      `output ${formatTokens(summary.outputTokens)}`,
      `cache read ${formatTokens(summary.cacheReadTokens)}`,
      `cache write ${formatTokens(summary.cacheWriteTokens)}`,
      `reasoning ${formatTokens(summary.reasoningTokens)}`
    ].filter(Boolean).join(" | ");
  }

  return [
    "TokenTrace",
    model,
    context,
    costLabel,
    `${usageLabel} ${formatTokens(summary.totalTokens)} tokens`,
    `cache ${formatTokens(summary.cachedTokens)}`,
    pricing
  ].filter(Boolean).join(" | ");
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
