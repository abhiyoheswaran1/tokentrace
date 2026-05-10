import path from "node:path";
import { isCodexCliUsagePath, isNonUsageCodexPath } from "@/src/ingestion/path-classifier";
import { IngestionAdapter } from "../types";
import { buildSessionsFromRecords } from "./generic-records";
import { asObject, fileLooksLikeJsonl, firstString, readFileText, readTextSample, safeJsonParse } from "./helpers";

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

export const codexCliAdapter: IngestionAdapter = {
  id: "codex-cli",
  displayName: "Codex CLI",
  version: 1,

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
    const text = await readFileText(file.path);
    const extension = path.extname(file.path).toLowerCase();

    if (extension === ".jsonl" || fileLooksLikeJsonl(text)) {
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

    return {
      sessions: buildSessionsFromRecords({
        file,
        records,
        provider: { id: "openai", name: "OpenAI", type: "llm-provider" },
        tool: { id: "codex-cli", name: "Codex CLI" },
        storeRawMessageContent: context.storeRawMessageContent
      }),
      warnings,
      errors: records.length ? [] : ["No Codex CLI JSON records were parsed."]
    };
  }
};
