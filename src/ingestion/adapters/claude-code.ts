import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { isClaudeCodeUsagePath, isNonUsageClaudePath } from "@/src/ingestion/path-classifier";
import { IngestionAdapter } from "../types";
import { buildSessionsFromRecords } from "./generic-records";
import { asObject, fileLooksLikeJsonl, firstString, readFileText, readTextSample, safeJsonParse } from "./helpers";

function projectPathFromClaudeProjectFile(filePath: string) {
  const parts = filePath.split(path.sep);
  const projectsIndex = parts.lastIndexOf("projects");
  if (projectsIndex === -1 || !parts[projectsIndex + 1]) return null;
  const encoded = parts[projectsIndex + 1];
  if (!encoded.startsWith("-")) return null;
  return encoded.replace(/-/g, path.sep);
}

function flattenClaudeRecord(record: Record<string, unknown>) {
  const message = asObject(record.message);
  return {
    ...record,
    model: firstString(record.model, message?.model),
    role: record.type ?? message?.role ?? record.role
  };
}

async function readClaudeJsonlRecords(filePath: string, warnings: string[]) {
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
    records.push(flattenClaudeRecord(object));
  }

  return records;
}

export const claudeCodeAdapter: IngestionAdapter = {
  id: "claude-code",
  displayName: "Claude Code",
  version: 2,

  async detect(file) {
    const extension = path.extname(file.path).toLowerCase();
    if (isClaudeCodeUsagePath(file.path)) {
      return { detected: true, confidence: 0.95, reason: "Claude Code project transcript path" };
    }

    if (isNonUsageClaudePath(file.path)) {
      return { detected: false, confidence: 0 };
    }

    if (![".jsonl", ".json", ".log"].includes(extension)) {
      return { detected: false, confidence: 0 };
    }

    const sample = await readTextSample(file.path);
    if (/claude|anthropic|cache_creation_input_tokens|cache_read_input_tokens/i.test(sample)) {
      return { detected: true, confidence: 0.72, reason: "Claude/Anthropic fields found" };
    }
    return { detected: false, confidence: 0 };
  },

  async parse(file, context) {
    const warnings: string[] = [];
    const records: Record<string, unknown>[] = [];
    const extension = path.extname(file.path).toLowerCase();

    if (extension === ".jsonl") {
      records.push(...(await readClaudeJsonlRecords(file.path, warnings)));
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
          records.push(flattenClaudeRecord(object));
        });
      } else {
        const object = asObject(safeJsonParse(text));
        if (object) records.push(object);
      }
    }

    const projectPath = projectPathFromClaudeProjectFile(file.path);

    return {
      sessions: buildSessionsFromRecords({
        file,
        records,
        provider: { id: "anthropic", name: "Anthropic", type: "llm-provider" },
        tool: { id: "claude-code", name: "Claude Code" },
        storeRawMessageContent: context.storeRawMessageContent,
        defaultProjectPath: projectPath
      }),
      warnings,
      errors: records.length ? [] : ["No Claude Code JSON records were parsed."]
    };
  }
};
