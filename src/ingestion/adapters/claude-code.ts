import path from "node:path";
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

export const claudeCodeAdapter: IngestionAdapter = {
  id: "claude-code",
  displayName: "Claude Code",

  async detect(file) {
    const normalized = file.path.toLowerCase();
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
        const message = asObject(object.message);
        records.push({
          ...object,
          model: firstString(object.model, message?.model),
          role: object.type ?? message?.role ?? object.role
        });
      });
    } else {
      const object = asObject(safeJsonParse(text));
      if (object) records.push(object);
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
