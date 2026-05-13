import path from "node:path";
import { estimateTokensFromText, previewText } from "@/src/lib/token-estimator";
import { nonUsageFileReason } from "@/src/ingestion/path-classifier";
import { IngestionAdapter, NormalizedInteraction } from "../types";
import { firstNumber, parseTimestamp, readFileText, readTextSample, sessionNameFromFile } from "./helpers";

function numberAfter(line: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) return firstNumber(match[1]);
  }
  return null;
}

function textAfter(line: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

export const genericLogAdapter: IngestionAdapter = {
  id: "generic-log",
  displayName: "Generic Text Log",
  version: 1,

  async detect(file) {
    const extension = path.extname(file.path).toLowerCase();
    if (![".log", ".txt", ".md", ""].includes(extension)) {
      return { detected: false, confidence: 0 };
    }

    if (nonUsageFileReason(file.path)) {
      return { detected: false, confidence: 0 };
    }

    const sample = await readTextSample(file.path);
    if (/(tokens?|prompt_tokens|completion_tokens|model|session|cost|\$[0-9.]+)/i.test(sample)) {
      return { detected: true, confidence: 0.45, reason: "Token/model/cost-like text found" };
    }

    return { detected: false, confidence: 0 };
  },

  async parse(file, context) {
    const text = await readFileText(file.path);
    const lines = text.split(/\r?\n/);
    const interactions: NormalizedInteraction[] = [];
    const warnings: string[] = [];
    let currentSession = sessionNameFromFile(file.path);
    let projectPath: string | null = null;

    lines.forEach((line, index) => {
      const session = textAfter(line, [/session(?:_id)?\s*[:=]\s*([^\s,]+)/i]);
      if (session) currentSession = session;
      projectPath =
        projectPath ?? textAfter(line, [/(?:cwd|project|path)\s*[:=]\s*(.+)$/i]);

      const model = textAfter(line, [/model\s*[:=]\s*([A-Za-z0-9_.:/-]+)/i]);
      const inputTokens = numberAfter(line, [
        /(?:input_tokens|prompt_tokens|input tokens|prompt tokens)\s*[:=]\s*([0-9,]+)/i
      ]);
      const outputTokens = numberAfter(line, [
        /(?:output_tokens|completion_tokens|output tokens|completion tokens)\s*[:=]\s*([0-9,]+)/i
      ]);
      const cacheReadTokens = numberAfter(line, [
        /(?:cache_read_input_tokens|cached_input_tokens|cache read tokens|cached tokens)\s*[:=]\s*([0-9,]+)/i
      ]);
      const cacheWriteTokens = numberAfter(line, [
        /(?:cache_creation_input_tokens|cache_write_input_tokens|cache write tokens|cache creation tokens)\s*[:=]\s*([0-9,]+)/i
      ]);
      const reasoningTokens = numberAfter(line, [
        /(?:reasoning_output_tokens|reasoning_tokens|reasoning output tokens|reasoning tokens)\s*[:=]\s*([0-9,]+)/i
      ]);
      const explicitTotalTokens = numberAfter(line, [
        /(?:total_tokens|total tokens)\s*[:=]\s*([0-9,]+)/i
      ]);
      const fallbackTotalTokens =
        inputTokens == null && outputTokens == null && cacheReadTokens == null && cacheWriteTokens == null && reasoningTokens == null
          ? numberAfter(line, [/\btokens\s*[:=]\s*([0-9,]+)/i])
          : null;
      const totalTokens = explicitTotalTokens ?? fallbackTotalTokens;
      const hasStructuredTokens =
        inputTokens != null ||
        outputTokens != null ||
        cacheReadTokens != null ||
        cacheWriteTokens != null ||
        reasoningTokens != null ||
        totalTokens != null;

      if (!model && !hasStructuredTokens) return;

      const timestamp =
        parseTimestamp(textAfter(line, [/^(\d{4}-\d{2}-\d{2}T[^\s]+)/, /^(\d{4}-\d{2}-\d{2} [^\]]+)/])) ??
        file.modifiedTime;

      const estimated = !hasStructuredTokens;
      const estimate = estimated ? estimateTokensFromText(line) : { tokens: 0 };
      let normalizedInputTokens = inputTokens ?? (estimated ? estimate.tokens : 0);
      let normalizedOutputTokens = outputTokens ?? 0;
      const normalizedCacheReadTokens = cacheReadTokens ?? 0;
      const normalizedCacheWriteTokens = cacheWriteTokens ?? 0;
      const normalizedReasoningTokens = reasoningTokens ?? 0;
      const partSum = () =>
        normalizedInputTokens +
        normalizedOutputTokens +
        normalizedCacheReadTokens +
        normalizedCacheWriteTokens +
        normalizedReasoningTokens;
      if (
        inputTokens != null &&
        totalTokens != null &&
        normalizedCacheReadTokens + normalizedCacheWriteTokens > 0 &&
        partSum() > totalTokens
      ) {
        normalizedInputTokens = Math.max(
          0,
          normalizedInputTokens - normalizedCacheReadTokens - normalizedCacheWriteTokens
        );
      }
      if (
        outputTokens != null &&
        totalTokens != null &&
        normalizedReasoningTokens > 0 &&
        partSum() > totalTokens
      ) {
        normalizedOutputTokens = Math.max(0, normalizedOutputTokens - normalizedReasoningTokens);
      }
      const structuredTotal =
        totalTokens ?? partSum();
      interactions.push({
        externalId: `${currentSession}-${index}`,
        timestamp,
        role: normalizedOutputTokens || normalizedReasoningTokens ? "assistant" : "unknown",
        modelName: model,
        inputTokens: normalizedInputTokens,
        outputTokens: normalizedOutputTokens,
        reasoningTokens: normalizedReasoningTokens,
        cacheReadTokens: normalizedCacheReadTokens,
        cacheWriteTokens: normalizedCacheWriteTokens,
        totalTokens: structuredTotal || estimate.tokens,
        estimatedTokens: estimated,
        tokenConfidence: estimated ? "low-confidence estimate" : "high-confidence estimate",
        rawText: context.storeRawMessageContent ? line : null,
        rawTextPreview: previewText(line),
        rawMetadata: {
          source: "generic-log-line",
          line: index + 1
        },
        toolCalls: []
      });
    });

    if (!interactions.length && text.trim()) {
      const estimate = estimateTokensFromText(text);
      warnings.push("No structured token lines found; created one estimated file-level interaction.");
      interactions.push({
        externalId: `${currentSession}-estimated-file`,
        timestamp: file.modifiedTime,
        role: "unknown",
        modelName: "unknown",
        inputTokens: estimate.tokens,
        outputTokens: 0,
        reasoningTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        totalTokens: estimate.tokens,
        estimatedTokens: true,
        tokenConfidence: "low-confidence estimate",
        rawText: context.storeRawMessageContent ? text : null,
        rawTextPreview: previewText(text),
        rawMetadata: { source: "generic-log-file-estimate" },
        toolCalls: []
      });
    }

    return {
      sessions: interactions.length
        ? [
            {
              externalId: currentSession,
              provider: { id: "generic", name: "Generic", type: "local-log" },
              tool: { id: "generic-log", name: "Generic Log" },
              projectPath,
              projectName: projectPath ? undefined : "Unknown project",
              startedAt: interactions[0]?.timestamp ?? file.modifiedTime,
              endedAt: interactions[interactions.length - 1]?.timestamp ?? file.modifiedTime,
              title: sessionNameFromFile(file.path),
              sourceFile: file.path,
              rawMetadata: { parser: "generic-log" },
              interactions
            }
          ]
        : [],
      warnings,
      errors: interactions.length ? [] : ["No text log records were inferred."]
    };
  }
};
