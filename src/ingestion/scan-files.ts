import { sqlite } from "@/src/db/client";
import { stableId } from "@/src/lib/ids";
import type { FileCandidate, IngestionAdapter } from "@/src/ingestion/types";

function json(value: unknown) {
  return JSON.stringify(value ?? null);
}

function parseMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

export function metadataParserVersion(value: unknown) {
  const metadata = parseMetadata(value);
  const parser = metadata.parser;
  if (!parser || typeof parser !== "object") return 1;
  const version = (parser as Record<string, unknown>).version;
  if (typeof version === "number" && Number.isFinite(version)) return version;
  if (typeof version === "string" && /^\d+$/.test(version)) return Number(version);
  return 1;
}

export function hasImportedFile(file: FileCandidate, adapter: IngestionAdapter) {
  if (!file.hash) return false;
  const rows = sqlite
    .prepare(
      `SELECT raw_metadata AS rawMetadata
       FROM scan_files
       WHERE path = ? AND file_hash = ? AND status = 'imported' AND parser = ?`
    )
    .all(file.path, file.hash, adapter.id) as Array<{ rawMetadata: string | null }>;
  const currentVersion = adapter.version ?? 1;
  return rows.some((row) => metadataParserVersion(row.rawMetadata) >= currentVersion);
}

export function insertScanFile(args: {
  scanRunId: string;
  file: FileCandidate;
  parser: string | null;
  status: string;
  recordsImported: number;
  warnings: string[];
  errors: string[];
  rawMetadata?: Record<string, unknown>;
}) {
  const id = stableId("scanfile", [
    args.scanRunId,
    args.file.path,
    args.file.hash,
    args.status,
    args.parser
  ]);
  sqlite
    .prepare(
      `INSERT INTO scan_files
       (id, scan_run_id, path, modified_time, size_bytes, file_hash, parser, status,
        records_imported, warnings, errors, raw_metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      args.scanRunId,
      args.file.path,
      args.file.modifiedTime?.getTime() ?? null,
      args.file.sizeBytes,
      args.file.hash ?? null,
      args.parser,
      args.status,
      args.recordsImported,
      json(args.warnings),
      json(args.errors),
      json(args.rawMetadata ?? {})
    );
}

export function appendFileMessages(target: string, warnings: string[], errors: string[], allWarnings: string[], allErrors: string[]) {
  allWarnings.push(...warnings.map((warning) => `${target}: ${warning}`));
  allErrors.push(...errors.map((error) => `${target}: ${error}`));
}

export function parserMetadata(adapter: IngestionAdapter) {
  return {
    id: adapter.id,
    displayName: adapter.displayName,
    source: "bundled",
    version: adapter.version ?? 1
  };
}
