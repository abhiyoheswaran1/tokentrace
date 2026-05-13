import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { isCodexCliUsagePath, isNonUsageCodexPath } from "@/src/ingestion/path-classifier";
import { IngestionAdapter } from "../types";
import { buildSessionsFromRecords } from "./generic-records";
import {
  asObject,
  fileLooksLikeJsonl,
  firstNumber,
  firstString,
  readFileText,
  readTextSample,
  safeJsonParse,
  sessionNameFromFile
} from "./helpers";

type CodexUsageTotal = {
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  reasoningOutputTokens: number;
  totalTokens: number;
};

type CodexSessionContext = {
  sessionId: string | null;
  cwd: string | null;
  model: string | null;
};

function flattenCodexRecord(record: Record<string, unknown>) {
  const payload = asObject(record.payload);
  const response = asObject(payload?.response) ?? asObject(record.response);
  const usage = asObject(response?.usage) ?? asObject(payload?.usage) ?? asObject(record.usage);
  const message = asObject(payload?.message) ?? asObject(record.message);
  const type = firstString(record.type, payload?.type, message?.type);

  return {
    ...record,
    ...payload,
    response,
    usage,
    model: firstString(record.model, payload?.model, response?.model),
    role: firstString(record.role, payload?.role, message?.role) ?? (type?.includes("response") ? "assistant" : undefined),
    content: record.content ?? payload?.content ?? message?.content,
    cwd: record.cwd ?? payload?.cwd,
    id: firstString(record.id, payload?.id, response?.id, message?.id),
    timestamp: record.timestamp ?? payload?.timestamp
  };
}

async function readCodexJsonlRecords(filePath: string, warnings: string[]) {
  const records: Record<string, unknown>[] = [];
  const stream = fs.createReadStream(filePath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  let index = 0;

  for await (const line of lines) {
    index += 1;
    const trimmed = line.trim();
    if (!trimmed) continue;
    const object = asObject(safeJsonParse(trimmed));
    if (!object) {
      warnings.push(`Line ${index} is not a JSON object.`);
      continue;
    }
    records.push(flattenCodexRecord(object));
  }

  return records;
}

function tokenCountUsage(record: Record<string, unknown>): CodexUsageTotal | null {
  const payload = asObject(record.payload);
  const info = asObject(payload?.info) ?? asObject(record.info);
  const usage = asObject(info?.total_token_usage);
  if (!usage) return null;

  const inputTokens = firstNumber(usage.input_tokens, usage.inputTokens) ?? 0;
  const cachedInputTokens =
    firstNumber(usage.cached_input_tokens, usage.cachedInputTokens, usage.cache_read_input_tokens) ?? 0;
  const outputTokens = firstNumber(usage.output_tokens, usage.outputTokens) ?? 0;
  const reasoningOutputTokens =
    firstNumber(usage.reasoning_output_tokens, usage.reasoningTokens, usage.reasoning_tokens) ?? 0;
  const totalTokens =
    firstNumber(usage.total_tokens, usage.totalTokens) ?? inputTokens + outputTokens;

  if (inputTokens + cachedInputTokens + outputTokens + reasoningOutputTokens + totalTokens <= 0) {
    return null;
  }

  return {
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningOutputTokens,
    totalTokens
  };
}

function codexRecordType(record: Record<string, unknown>) {
  const payload = asObject(record.payload);
  return firstString(payload?.type, record.type);
}

function updateContext(context: CodexSessionContext, record: Record<string, unknown>, fallbackSessionId: string) {
  const payload = asObject(record.payload);
  const type = codexRecordType(record);

  context.sessionId =
    firstString(record.session_id, record.sessionId, payload?.session_id, payload?.sessionId) ??
    (type === "session_meta" ? firstString(record.id, payload?.id) : null) ??
    context.sessionId ??
    fallbackSessionId;
  context.cwd = firstString(record.cwd, payload?.cwd, record.project_path, payload?.project_path) ?? context.cwd;
  context.model = firstString(record.model, payload?.model) ?? context.model;
}

function deltaFromUsage(current: CodexUsageTotal, previous: CodexUsageTotal | null): CodexUsageTotal | null {
  if (
    previous &&
    (current.inputTokens < previous.inputTokens ||
      current.cachedInputTokens < previous.cachedInputTokens ||
      current.outputTokens < previous.outputTokens ||
      current.reasoningOutputTokens < previous.reasoningOutputTokens ||
      current.totalTokens < previous.totalTokens)
  ) {
    return current;
  }

  const base = previous ?? {
    inputTokens: 0,
    cachedInputTokens: 0,
    outputTokens: 0,
    reasoningOutputTokens: 0,
    totalTokens: 0
  };
  const delta = {
    inputTokens: current.inputTokens - base.inputTokens,
    cachedInputTokens: current.cachedInputTokens - base.cachedInputTokens,
    outputTokens: current.outputTokens - base.outputTokens,
    reasoningOutputTokens: current.reasoningOutputTokens - base.reasoningOutputTokens,
    totalTokens: current.totalTokens - base.totalTokens
  };

  return delta.inputTokens +
    delta.cachedInputTokens +
    delta.outputTokens +
    delta.reasoningOutputTokens +
    delta.totalTokens >
    0
    ? delta
    : null;
}

function normalizedUsageFromDelta(delta: CodexUsageTotal) {
  const inputTokens = delta.inputTokens;
  const outputTokens = Math.max(0, delta.outputTokens - delta.reasoningOutputTokens);
  const displayedTotalWithCache = delta.totalTokens + delta.cachedInputTokens;
  const computedTotal =
    inputTokens + delta.cachedInputTokens + outputTokens + delta.reasoningOutputTokens;

  return {
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cache_read_input_tokens: delta.cachedInputTokens,
    reasoning_tokens: delta.reasoningOutputTokens,
    total_tokens: Math.max(displayedTotalWithCache, computedTotal)
  };
}

function exactTokenCountRecords(records: Record<string, unknown>[], fallbackSessionId: string) {
  const context: CodexSessionContext = {
    sessionId: null,
    cwd: null,
    model: null
  };
  const exactRecords: Record<string, unknown>[] = [];
  let previousUsage: CodexUsageTotal | null = null;

  records.forEach((record, index) => {
    updateContext(context, record, fallbackSessionId);
    const usage = tokenCountUsage(record);
    if (!usage) return;

    const delta = deltaFromUsage(usage, previousUsage);
    previousUsage = usage;
    if (!delta) return;

    const sessionId = context.sessionId ?? fallbackSessionId;
    exactRecords.push({
      type: "assistant",
      id: `token-count-${index}`,
      session_id: sessionId,
      timestamp: record.timestamp,
      role: "assistant",
      model: context.model,
      cwd: context.cwd,
      usage: normalizedUsageFromDelta(delta),
      raw_event_type: "token_count"
    });
  });

  return exactRecords;
}

export const codexCliAdapter: IngestionAdapter = {
  id: "codex-cli",
  displayName: "Codex CLI",
  version: 3,

  async detect(file) {
    const extension = path.extname(file.path).toLowerCase();
    if (isCodexCliUsagePath(file.path)) {
      return { detected: true, confidence: 0.95, reason: "Codex CLI session artifact path" };
    }

    if (isNonUsageCodexPath(file.path)) {
      return { detected: false, confidence: 0 };
    }

    if (![".jsonl", ".json", ".log"].includes(extension)) {
      return { detected: false, confidence: 0 };
    }

    const sample = await readTextSample(file.path);
    if (/codex|openai|response\.completed|response_completed|turn_context/i.test(sample)) {
      return { detected: true, confidence: 0.72, reason: "Codex/OpenAI event fields found" };
    }
    return { detected: false, confidence: 0 };
  },

  async parse(file, context) {
    const warnings: string[] = [];
    const records: Record<string, unknown>[] = [];
    const extension = path.extname(file.path).toLowerCase();

    if (extension === ".jsonl") {
      records.push(...(await readCodexJsonlRecords(file.path, warnings)));
    } else {
      const text = await readFileText(file.path);
      if (fileLooksLikeJsonl(text)) {
        text.split(/\r?\n/).forEach((line, index) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          const object = asObject(safeJsonParse(trimmed));
          if (!object) {
            warnings.push(`Line ${index + 1} is not a JSON object.`);
            return;
          }
          records.push(flattenCodexRecord(object));
        });
      } else {
        const object = asObject(safeJsonParse(text));
        if (object) records.push(flattenCodexRecord(object));
      }
    }

    const usageRecords = exactTokenCountRecords(records, sessionNameFromFile(file.path));
    const recordsForSessions = usageRecords.length ? usageRecords : records;

    return {
      sessions: buildSessionsFromRecords({
        file,
        records: recordsForSessions,
        provider: { id: "openai", name: "OpenAI", type: "llm-provider" },
        tool: { id: "codex-cli", name: "Codex CLI" },
        storeRawMessageContent: context.storeRawMessageContent
      }),
      warnings,
      errors: records.length ? [] : ["No Codex CLI JSON records were parsed."]
    };
  }
};
