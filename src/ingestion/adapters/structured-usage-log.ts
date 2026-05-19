import {
  asObject,
  firstString,
  readFileText,
  readTextSample,
  safeJsonParse
} from "./helpers";
import { buildSessionsFromRecords } from "./generic-records";
import type { AdapterParseResult, FileCandidate, IngestionAdapter } from "../types";

function slug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "local-wrapper";
}

function parseJsonl(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => safeJsonParse(line))
    .filter((item): item is Record<string, unknown> => Boolean(asObject(item)));
}

function looksStructuredUsage(record: Record<string, unknown>) {
  const usage = asObject(record.usage) ?? asObject(record.token_usage) ?? asObject(record.tokens);
  return Boolean(
    firstString(record.session_id, record.sessionId, record.conversation_id, record.thread_id) &&
      (firstString(record.model, record.model_name, record.modelName) ||
        usage ||
        record.input_tokens != null ||
        record.output_tokens != null ||
        record.cost_usd != null ||
        record.costUsd != null)
  );
}

function providerFromRecords(records: Record<string, unknown>[]) {
  const name = firstString(...records.map((record) => record.provider)) ?? "Local AI";
  return {
    id: slug(name),
    name,
    type: "llm-provider"
  };
}

function toolFromRecords(records: Record<string, unknown>[]) {
  const name = firstString(...records.map((record) => record.tool), ...records.map((record) => record.client)) ?? "Local Wrapper";
  return {
    id: slug(name),
    name
  };
}

export const structuredUsageLogAdapter: IngestionAdapter = {
  id: "structured-usage-log",
  displayName: "Structured Usage Log",
  version: 1,
  async detect(file: FileCandidate) {
    if (!/\.(jsonl|ndjson|usage|log)$/i.test(file.path)) {
      return { detected: false, confidence: 0 };
    }
    const records = parseJsonl(await readTextSample(file.path));
    const structured = records.filter(looksStructuredUsage);
    if (!structured.length) return { detected: false, confidence: 0 };
    const hasExplicitType = structured.some((record) =>
      firstString(record.type, record.event)?.toLowerCase().includes("usage")
    );
    return {
      detected: true,
      confidence: hasExplicitType ? 0.96 : 0.88,
      reason: "Line-delimited local usage records with sessions, model, usage, or cost fields."
    };
  },
  async parse(file: FileCandidate, context): Promise<AdapterParseResult> {
    const records = parseJsonl(await readFileText(file.path)).filter(looksStructuredUsage);
    if (!records.length) {
      return {
        sessions: [],
        warnings: [],
        errors: ["No structured usage records found."]
      };
    }
    return {
      sessions: buildSessionsFromRecords({
        file,
        records,
        provider: providerFromRecords(records),
        tool: toolFromRecords(records),
        storeRawMessageContent: context.storeRawMessageContent
      }),
      warnings: [],
      errors: []
    };
  }
};
