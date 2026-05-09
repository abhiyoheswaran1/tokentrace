import path from "node:path";
import { nonUsageFileReason } from "@/src/ingestion/path-classifier";
import { IngestionAdapter } from "../types";
import { buildSessionsFromRecords } from "./generic-records";
import { asObject, fileLooksLikeJsonl, readFileText, readTextSample, safeJsonParse } from "./helpers";

export const genericJsonlAdapter: IngestionAdapter = {
  id: "generic-jsonl",
  displayName: "Generic JSONL",

  async detect(file) {
    const extension = path.extname(file.path).toLowerCase();
    if (nonUsageFileReason(file.path)) {
      return { detected: false, confidence: 0 };
    }

    if (extension === ".jsonl" || file.path.endsWith(".jsonl.gz")) {
      return { detected: true, confidence: 0.75, reason: "JSONL extension" };
    }

    if (![".log", ".txt", ""].includes(extension)) {
      return { detected: false, confidence: 0 };
    }

    const sample = await readTextSample(file.path);
    if (fileLooksLikeJsonl(sample)) {
      return { detected: true, confidence: 0.55, reason: "First lines are JSON objects" };
    }

    return { detected: false, confidence: 0 };
  },

  async parse(file, context) {
    const warnings: string[] = [];
    const errors: string[] = [];
    const text = await readFileText(file.path);
    const records: Record<string, unknown>[] = [];

    text.split(/\r?\n/).forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const parsed = safeJsonParse(trimmed);
      const object = asObject(parsed);
      if (!object) {
        warnings.push(`Line ${index + 1} is not a JSON object.`);
        return;
      }
      records.push(object);
    });

    if (!records.length) {
      errors.push("No JSON objects were parsed.");
    }

    return {
      sessions: buildSessionsFromRecords({
        file,
        records,
        provider: { id: "generic", name: "Generic", type: "local-log" },
        tool: { id: "generic-jsonl", name: "Generic JSONL" },
        storeRawMessageContent: context.storeRawMessageContent
      }),
      warnings,
      errors
    };
  }
};
