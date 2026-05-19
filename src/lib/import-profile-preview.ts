import fs from "node:fs/promises";
import path from "node:path";
import { adapters } from "@/src/ingestion/adapters";
import type { FileCandidate } from "@/src/ingestion/types";
import { readTextSample, safeJsonParse } from "@/src/ingestion/adapters/helpers";

export type ImportProfilePreview = {
  filePath: string;
  detected: boolean;
  adapterId: string | null;
  adapterName: string | null;
  confidence: number;
  reason: string | null;
  recommendedMatchers: string[];
  fields: string[];
  warnings: string[];
  errors: string[];
  preview: {
    sessions: number;
    interactions: number;
    sourceFile: string;
  };
};

function collectFields(value: unknown, prefix = "", fields = new Set<string>(), depth = 0) {
  if (!value || typeof value !== "object" || depth > 2) return fields;
  if (Array.isArray(value)) {
    value.slice(0, 3).forEach((item) => collectFields(item, prefix, fields, depth + 1));
    return fields;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
    const name = prefix ? `${prefix}.${key}` : key;
    fields.add(name);
    collectFields(item, name, fields, depth + 1);
  });
  return fields;
}

async function candidateFor(filePath: string): Promise<FileCandidate> {
  const stat = await fs.stat(filePath);
  return {
    path: filePath,
    modifiedTime: stat.mtime,
    sizeBytes: stat.size
  };
}

function fieldsFromSample(sample: string) {
  const jsonlFields = sample
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 5)
    .flatMap((line) => Array.from(collectFields(safeJsonParse(line))));
  if (jsonlFields.length) return Array.from(new Set(jsonlFields)).sort();
  return Array.from(collectFields(safeJsonParse(sample))).sort();
}

function recommendedMatchers(filePath: string) {
  const basename = path.basename(filePath);
  const extension = path.extname(filePath);
  return Array.from(new Set([extension, basename.includes("cursor") ? "cursor" : null, basename.includes("composer") ? "composer" : null].filter(Boolean) as string[]));
}

export async function buildImportProfilePreview(input: {
  filePath: string;
  storeRawMessageContent?: boolean;
}): Promise<ImportProfilePreview> {
  const file = await candidateFor(input.filePath);
  const sample = await readTextSample(input.filePath);
  const detections = await Promise.all(
    adapters.map(async (adapter) => ({
      adapter,
      result: await adapter.detect(file).catch((error) => ({
        detected: false,
        confidence: 0,
        reason: error instanceof Error ? error.message : "Detection failed."
      }))
    }))
  );
  const selected = detections
    .filter((item) => item.result.detected)
    .sort((a, b) => b.result.confidence - a.result.confidence)[0];

  if (!selected) {
    return {
      filePath: input.filePath,
      detected: false,
      adapterId: null,
      adapterName: null,
      confidence: 0,
      reason: null,
      recommendedMatchers: recommendedMatchers(input.filePath),
      fields: fieldsFromSample(sample),
      warnings: [],
      errors: ["No parser detected a compatible format."],
      preview: {
        sessions: 0,
        interactions: 0,
        sourceFile: input.filePath
      }
    };
  }

  const parseResult = await selected.adapter.parse(file, {
    storeRawMessageContent: input.storeRawMessageContent === true
  });
  return {
    filePath: input.filePath,
    detected: true,
    adapterId: selected.adapter.id,
    adapterName: selected.adapter.displayName,
    confidence: selected.result.confidence,
    reason: selected.result.reason ?? null,
    recommendedMatchers: recommendedMatchers(input.filePath),
    fields: fieldsFromSample(sample),
    warnings: parseResult.warnings,
    errors: parseResult.errors,
    preview: {
      sessions: parseResult.sessions.length,
      interactions: parseResult.sessions.reduce((count, session) => count + session.interactions.length, 0),
      sourceFile: input.filePath
    }
  };
}
