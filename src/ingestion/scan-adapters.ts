import fs from "node:fs/promises";
import { hashContent } from "@/src/lib/ids";
import { adapters } from "@/src/ingestion/adapters";
import { getParserOverride } from "@/src/lib/parser-overrides";
import type { FileCandidate, IngestionAdapter } from "@/src/ingestion/types";

export type AdapterSelection = {
  selected: { adapter: IngestionAdapter; confidence: number; reason?: string } | null;
  warnings: string[];
  excluded: boolean;
  excludeReason?: string;
};

export async function hashFile(file: FileCandidate): Promise<FileCandidate> {
  const content = await fs.readFile(file.path);
  return {
    ...file,
    hash: hashContent(content)
  };
}

export async function selectAdapter(file: FileCandidate): Promise<AdapterSelection> {
  const override = readOverride(file.path);
  if (override?.excluded) {
    return {
      selected: null,
      warnings: [],
      excluded: true,
      excludeReason: override.note
        ? `Skipped by user override: ${override.note}`
        : "Skipped by user override"
    };
  }

  if (override?.parserId) {
    const adapter = adapters.find((candidate) => candidate.id === override.parserId);
    if (adapter) {
      return {
        selected: { adapter, confidence: 1, reason: "Forced by user override" },
        warnings: [],
        excluded: false
      };
    }
    return {
      selected: null,
      warnings: [
        `User override names parser ${override.parserId}, which is not registered. Falling back to detection.`
      ],
      excluded: false
    };
  }

  const matches: Array<{ adapter: IngestionAdapter; confidence: number; reason?: string }> = [];
  const warnings: string[] = [];

  for (const adapter of adapters) {
    try {
      const result = await adapter.detect(file);
      if (result.detected) {
        matches.push({
          adapter,
          confidence: result.confidence,
          reason: result.reason
        });
      }
    } catch (error) {
      warnings.push(
        `${adapter.displayName} detection failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  matches.sort((a, b) => b.confidence - a.confidence);
  return { selected: matches[0] ?? null, warnings, excluded: false };
}

function readOverride(filePath: string) {
  try {
    return getParserOverride(filePath);
  } catch {
    return null;
  }
}
