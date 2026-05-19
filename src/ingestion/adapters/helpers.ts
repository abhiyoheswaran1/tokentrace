import fs from "node:fs/promises";
import path from "node:path";
import { NormalizedInteraction, NormalizedToolCall } from "../types";
import { previewText } from "@/src/lib/token-estimator";

export async function readTextSample(filePath: string, bytes = 64_000) {
  const handle = await fs.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(bytes);
    const { bytesRead } = await handle.read(buffer, 0, bytes, 0);
    return buffer.subarray(0, bytesRead).toString("utf8");
  } finally {
    await handle.close();
  }
}

export async function readFileText(filePath: string, maxBytes = 25 * 1024 * 1024) {
  const stat = await fs.stat(filePath);
  if (stat.size > maxBytes) {
    throw new Error(`File is larger than ${Math.round(maxBytes / 1024 / 1024)} MB.`);
  }
  return fs.readFile(filePath, "utf8");
}

export function safeJsonParse(value: string): unknown | null {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export function firstString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export function firstNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) continue;
      const normalized = /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(trimmed)
        ? trimmed.replace(/,/g, "")
        : trimmed;
      if (/^-?\d+(\.\d+)?$/.test(normalized) && Number.isFinite(Number(normalized))) {
        return Math.max(0, Math.round(Number(normalized)));
      }
    }
  }
  return null;
}

export function parseTimestamp(...values: unknown[]): Date | null {
  for (const value of values) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
    if (typeof value === "number" && Number.isFinite(value)) {
      const ms = value > 10_000_000_000 ? value : value * 1000;
      const date = new Date(ms);
      if (!Number.isNaN(date.getTime())) return date;
    }
    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      const date = /^\d+(\.\d+)?$/.test(trimmed)
        ? new Date(Number(trimmed) > 10_000_000_000 ? Number(trimmed) : Number(trimmed) * 1000)
        : new Date(trimmed);
      if (!Number.isNaN(date.getTime())) return date;
    }
  }
  return null;
}

function textFromContent(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        const object = asObject(item);
        return firstString(object?.text, object?.content, object?.input, object?.output);
      })
      .filter(Boolean)
      .join("\n");
  }
  const object = asObject(value);
  if (!object) return null;
  return firstString(object.text, object.content, object.value, object.input, object.output);
}

export function extractText(record: Record<string, unknown>): string | null {
  const message = asObject(record.message);
  const payload = asObject(record.payload);
  const response = asObject(record.response);
  return (
    textFromContent(record.text) ??
    textFromContent(record.content) ??
    textFromContent(record.prompt) ??
    textFromContent(record.completion) ??
    textFromContent(record.output) ??
    textFromContent(message?.content) ??
    textFromContent(payload?.content) ??
    textFromContent(payload?.message) ??
    textFromContent(response?.content) ??
    null
  );
}

export function extractUsage(record: Record<string, unknown>) {
  const message = asObject(record.message);
  const payload = asObject(record.payload);
  const response = asObject(record.response) ?? asObject(payload?.response);
  const usage =
    asObject(record.usage) ??
    asObject(message?.usage) ??
    asObject(payload?.usage) ??
    asObject(response?.usage) ??
    asObject(record.token_usage) ??
    asObject(record.tokens);
  const inputDetails =
    asObject(usage?.input_tokens_details) ??
    asObject(usage?.prompt_tokens_details) ??
    asObject(usage?.cache);
  const outputDetails = asObject(usage?.output_tokens_details) ?? asObject(usage?.completion_tokens_details);
  const detailCacheReadTokens = firstNumber(
    inputDetails?.cached_tokens,
    inputDetails?.cachedTokens
  );
  const detailReasoningTokens = firstNumber(
    outputDetails?.reasoning_tokens,
    outputDetails?.reasoningTokens
  );

  let inputTokens = firstNumber(
    usage?.input_tokens,
    usage?.prompt_tokens,
    usage?.inputTokens,
    usage?.promptTokens,
    record.input_tokens,
    record.prompt_tokens,
    record.inputTokens,
    record.promptTokens
  );
  let outputTokens = firstNumber(
    usage?.output_tokens,
    usage?.completion_tokens,
    usage?.outputTokens,
    usage?.completionTokens,
    record.output_tokens,
    record.completion_tokens,
    record.outputTokens,
    record.completionTokens
  );
  const cacheReadTokens = firstNumber(
    usage?.cache_read_input_tokens,
    usage?.cached_input_tokens,
    usage?.cacheReadInputTokens,
    usage?.cacheReadTokens,
    usage?.cachedInputTokens,
    inputDetails?.cache_read_tokens,
    inputDetails?.cacheReadTokens,
    detailCacheReadTokens,
    record.cache_read_tokens,
    record.cached_input_tokens,
    record.cacheReadTokens,
    record.cachedInputTokens
  );
  const cacheWriteTokens = firstNumber(
    usage?.cache_creation_input_tokens,
    usage?.cache_write_input_tokens,
    usage?.cacheCreationInputTokens,
    usage?.cacheWriteInputTokens,
    usage?.cacheWriteTokens,
    inputDetails?.cache_creation_tokens,
    inputDetails?.cache_creation_input_tokens,
    inputDetails?.cache_write_tokens,
    inputDetails?.cacheCreationTokens,
    inputDetails?.cacheWriteTokens,
    record.cache_write_tokens,
    record.cache_creation_input_tokens,
    record.cacheWriteTokens,
    record.cacheCreationInputTokens
  );
  const reasoningTokens = firstNumber(
    usage?.reasoning_tokens,
    usage?.reasoningTokens,
    usage?.reasoning_output_tokens,
    usage?.reasoningOutputTokens,
    detailReasoningTokens,
    record.reasoning_tokens,
    record.reasoningTokens,
    record.reasoning_output_tokens,
    record.reasoningOutputTokens
  );
  const totalTokens = firstNumber(
    usage?.total_tokens,
    usage?.totalTokens,
    usage?.tokens,
    record.total_tokens,
    record.totalTokens
  );

  const sumParts = () =>
    (inputTokens ?? 0) +
    (outputTokens ?? 0) +
    (cacheReadTokens ?? 0) +
    (cacheWriteTokens ?? 0) +
    (reasoningTokens ?? 0);
  const cacheTokens = (cacheReadTokens ?? 0) + (cacheWriteTokens ?? 0);

  if (
    inputTokens != null &&
    cacheTokens > 0 &&
    (detailCacheReadTokens != null || (totalTokens != null && sumParts() > totalTokens))
  ) {
    inputTokens = Math.max(0, inputTokens - cacheTokens);
  }

  if (
    outputTokens != null &&
    (reasoningTokens ?? 0) > 0 &&
    (detailReasoningTokens != null || (totalTokens != null && sumParts() > totalTokens))
  ) {
    outputTokens = Math.max(0, outputTokens - (reasoningTokens ?? 0));
  }

  return {
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheWriteTokens,
    reasoningTokens,
    totalTokens:
      totalTokens ??
      (inputTokens ?? 0) +
        (outputTokens ?? 0) +
        (cacheReadTokens ?? 0) +
        (cacheWriteTokens ?? 0) +
        (reasoningTokens ?? 0)
  };
}

export function extractCostUsd(record: Record<string, unknown>) {
  const payload = asObject(record.payload);
  const usage = asObject(record.usage) ?? asObject(payload?.usage);
  const value =
    record.cost_usd ??
    record.costUsd ??
    record.cost ??
    record.total_cost_usd ??
    record.totalCostUsd ??
    usage?.cost_usd ??
    usage?.costUsd ??
    usage?.cost;
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string" && value.trim()) {
    const normalized = value.trim().replace(/^\$/, "");
    const parsed = Number(normalized);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return null;
}

export function extractModel(record: Record<string, unknown>) {
  const message = asObject(record.message);
  const payload = asObject(record.payload);
  const response = asObject(record.response) ?? asObject(payload?.response);
  return firstString(
    record.model,
    record.model_name,
    record.modelName,
    message?.model,
    payload?.model,
    response?.model
  );
}

export function extractRole(record: Record<string, unknown>): NormalizedInteraction["role"] {
  const message = asObject(record.message);
  const raw = firstString(record.role, record.type, message?.role);
  if (!raw) return "unknown";
  const normalized = raw.toLowerCase();
  if (normalized.includes("assistant") || normalized.includes("completion")) return "assistant";
  if (normalized.includes("user") || normalized.includes("prompt")) return "user";
  if (normalized.includes("system")) return "system";
  if (normalized.includes("tool")) return "tool";
  return "unknown";
}

export function extractToolCalls(record: Record<string, unknown>): NormalizedToolCall[] {
  const message = asObject(record.message);
  const payload = asObject(record.payload);
  const possible = [
    ...asArray(record.tool_calls),
    ...asArray(record.toolCalls),
    ...asArray(message?.tool_calls),
    ...asArray(payload?.tool_calls),
    ...asArray(payload?.toolCalls)
  ];

  const calls: NormalizedToolCall[] = [];
  possible.forEach((item, index) => {
    const object = asObject(item);
    if (!object) return;
    const name = firstString(object.name, object.tool, object.function_name, asObject(object.function)?.name);
    if (!name) return;
    calls.push({
      externalId: firstString(object.id, object.call_id) ?? `${index}`,
      name,
      status: firstString(object.status, object.state),
      durationMs: firstNumber(object.duration_ms, object.durationMs),
      rawMetadata: object
    });
  });
  return calls;
}

const sensitiveMetadataKeys = new Set([
  "content",
  "text",
  "prompt",
  "completion",
  "input",
  "output",
  "arguments",
  "message"
]);

export function sanitizeMetadata(value: unknown, depth = 0): unknown {
  if (value == null) return value;
  if (typeof value === "string") return previewText(value, 160);
  if (typeof value !== "object") return value;
  if (depth > 3) return "[nested metadata]";
  if (Array.isArray(value)) {
    return value.slice(0, 5).map((item) => sanitizeMetadata(item, depth + 1));
  }

  const object = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(object).map(([key, item]) => {
      if (sensitiveMetadataKeys.has(key.toLowerCase())) {
        return [key, "[redacted: raw storage disabled]"];
      }
      return [key, sanitizeMetadata(item, depth + 1)];
    })
  );
}

export function normalizeInteraction(
  record: Record<string, unknown>,
  externalId: string,
  storeRawMessageContent: boolean
): NormalizedInteraction {
  const text = extractText(record);
  const usage = extractUsage(record);
  const hasUsage = Object.values(usage).some((value) => value != null && value > 0);
  const message = asObject(record.message);
  const payload = asObject(record.payload);

  return {
    externalId,
    timestamp: parseTimestamp(record.timestamp, record.created_at, record.createdAt, record.time, record.ts),
    role: extractRole(record),
    modelName: extractModel(record),
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    cacheReadTokens: usage.cacheReadTokens,
    cacheWriteTokens: usage.cacheWriteTokens,
    reasoningTokens: usage.reasoningTokens,
    totalTokens: usage.totalTokens,
    estimatedTokens: false,
    tokenConfidence: hasUsage ? "exact" : text ? "high-confidence estimate" : "unknown",
    costUsd: extractCostUsd(record),
    costEstimated: record.cost_estimated === true || record.costEstimated === true,
    latencyMs: firstNumber(record.latency_ms, record.latencyMs, payload?.latency_ms, message?.latency_ms),
    rawText: storeRawMessageContent ? text : null,
    rawTextPreview: previewText(text),
    rawMetadata: storeRawMessageContent
      ? record
      : (sanitizeMetadata(record) as Record<string, unknown>),
    toolCalls: extractToolCalls(record).map((toolCall) => ({
      ...toolCall,
      rawMetadata: storeRawMessageContent
        ? toolCall.rawMetadata
        : (sanitizeMetadata(toolCall.rawMetadata) as Record<string, unknown>)
    }))
  };
}

export function sessionNameFromFile(filePath: string) {
  return path.basename(filePath).replace(/\.(jsonl|json|log|txt|md)$/i, "");
}

export function fileLooksLikeJsonl(sample: string) {
  const lines = sample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5);
  return lines.length > 0 && lines.every((line) => safeJsonParse(line) !== null);
}
