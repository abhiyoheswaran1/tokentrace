import path from "node:path";
import { estimateTokensFromText, previewText } from "@/src/lib/token-estimator";
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

  async detect(file) {
    const extension = path.extname(file.path).toLowerCase();
    if (![".log", ".txt", ".md", ""].includes(extension)) {
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
      const totalTokens = numberAfter(line, [/(?:total_tokens|total tokens|tokens)\s*[:=]\s*([0-9,]+)/i]);
      const reasoningTokens = numberAfter(line, [/(?:reasoning_tokens|reasoning tokens)\s*[:=]\s*([0-9,]+)/i]);
      const hasStructuredTokens =
        inputTokens != null || outputTokens != null || totalTokens != null || reasoningTokens != null;

      if (!model && !hasStructuredTokens) return;

      const timestamp =
        parseTimestamp(textAfter(line, [/^(\d{4}-\d{2}-\d{2}T[^\s]+)/, /^(\d{4}-\d{2}-\d{2} [^\]]+)/])) ??
        file.modifiedTime;

      const estimated = !hasStructuredTokens;
      const estimate = estimated ? estimateTokensFromText(line) : { tokens: 0 };
      const structuredTotal =
        totalTokens ?? (inputTokens ?? 0) + (outputTokens ?? 0) + (reasoningTokens ?? 0);
      interactions.push({
        externalId: `${currentSession}-${index}`,
        timestamp,
        role: outputTokens || reasoningTokens ? "assistant" : "unknown",
        modelName: model,
        inputTokens: inputTokens ?? (estimated ? estimate.tokens : 0),
        outputTokens: outputTokens ?? 0,
        reasoningTokens: reasoningTokens ?? 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
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
