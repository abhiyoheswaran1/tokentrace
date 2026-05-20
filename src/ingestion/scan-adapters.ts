import fs from "node:fs/promises";
import { hashContent } from "@/src/lib/ids";
import { adapters } from "@/src/ingestion/adapters";
import type { FileCandidate, IngestionAdapter } from "@/src/ingestion/types";

export async function hashFile(file: FileCandidate): Promise<FileCandidate> {
  const content = await fs.readFile(file.path);
  return {
    ...file,
    hash: hashContent(content)
  };
}

export async function selectAdapter(file: FileCandidate) {
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
  return { selected: matches[0] ?? null, warnings };
}
