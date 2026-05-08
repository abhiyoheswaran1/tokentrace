import fs from "node:fs/promises";
import path from "node:path";
import { sqlite } from "@/src/db/client";
import { getAppSettings } from "@/src/db/settings";
import { hashContent, stableId } from "@/src/lib/ids";
import { adapters } from "./adapters";
import { discoverFiles, expandHome, getDefaultSearchRoots } from "./discovery";
import { importSessions } from "./persist";
import { FileCandidate, IngestionAdapter } from "./types";

export type RunScanOptions = {
  folders?: string[];
  force?: boolean;
  includeDefaults?: boolean;
  storeRawMessageContent?: boolean;
};

export type RunScanResult = {
  scanRunId: string;
  filesScanned: number;
  recordsImported: number;
  warnings: string[];
  errors: string[];
};

function json(value: unknown) {
  return JSON.stringify(value ?? null);
}

function hasImportedFile(file: FileCandidate) {
  if (!file.hash) return false;
  const row = sqlite
    .prepare(
      "SELECT id FROM scan_files WHERE path = ? AND file_hash = ? AND status = 'imported' LIMIT 1"
    )
    .get(file.path, file.hash);
  return Boolean(row);
}

async function hashFile(file: FileCandidate): Promise<FileCandidate> {
  const content = await fs.readFile(file.path);
  return {
    ...file,
    hash: hashContent(content)
  };
}

async function selectAdapter(file: FileCandidate) {
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

function insertScanFile(args: {
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

export async function runScan(options: RunScanOptions = {}): Promise<RunScanResult> {
  const settings = getAppSettings();
  const explicitFolders = options.folders ?? [];
  const roots =
    options.includeDefaults === false
      ? explicitFolders.map((folder) => path.resolve(expandHome(folder)))
      : await getDefaultSearchRoots([...settings.customFolders, ...explicitFolders]);
  const candidates = await discoverFiles(roots);
  const startedAt = new Date();
  const scanRunId = stableId("scan", [startedAt.getTime(), roots.join("|")]);
  const allWarnings: string[] = [];
  const allErrors: string[] = [];
  let recordsImported = 0;
  let filesScanned = 0;

  sqlite
    .prepare(
      "INSERT INTO scan_runs (id, started_at, warnings, errors) VALUES (?, ?, '[]', '[]')"
    )
    .run(scanRunId, startedAt.getTime());

  for (const candidate of candidates) {
    filesScanned += 1;
    let file = candidate;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      file = await hashFile(candidate);
      if (!options.force && hasImportedFile(file)) {
        insertScanFile({
          scanRunId,
          file,
          parser: null,
          status: "skipped_duplicate",
          recordsImported: 0,
          warnings: ["File hash already imported. Use force rescan to parse again."],
          errors: []
        });
        continue;
      }

      const adapterChoice = await selectAdapter(file);
      warnings.push(...adapterChoice.warnings);

      if (!adapterChoice.selected) {
        insertScanFile({
          scanRunId,
          file,
          parser: null,
          status: "skipped_unknown",
          recordsImported: 0,
          warnings,
          errors: ["No parser detected a compatible format."]
        });
        continue;
      }

      const parseResult = await adapterChoice.selected.adapter.parse(file, {
        storeRawMessageContent:
          options.storeRawMessageContent ?? settings.storeRawMessageContent
      });
      warnings.push(...parseResult.warnings);
      errors.push(...parseResult.errors);
      const importResult = importSessions(parseResult.sessions);
      const tokenConfidence = parseResult.sessions
        .flatMap((session) => session.interactions)
        .reduce<Record<string, number>>((summary, interaction) => {
          const key = interaction.tokenConfidence ?? "unknown";
          summary[key] = (summary[key] ?? 0) + 1;
          return summary;
        }, {});
      warnings.push(...importResult.warnings);
      recordsImported += importResult.interactionsImported;

      insertScanFile({
        scanRunId,
        file,
        parser: adapterChoice.selected.adapter.id,
        status: errors.length ? "imported_with_errors" : "imported",
        recordsImported: importResult.interactionsImported,
        warnings,
        errors,
        rawMetadata: {
          confidence: adapterChoice.selected.confidence,
          reason: adapterChoice.selected.reason,
          tokenConfidence,
          sessionsParsed: parseResult.sessions.length,
          sessionsImported: importResult.sessionsImported,
          toolCallsImported: importResult.toolCallsImported
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown scan error";
      errors.push(message);
      insertScanFile({
        scanRunId,
        file,
        parser: null,
        status: "failed",
        recordsImported: 0,
        warnings,
        errors
      });
    }

    allWarnings.push(...warnings.map((warning) => `${candidate.path}: ${warning}`));
    allErrors.push(...errors.map((error) => `${candidate.path}: ${error}`));
  }

  sqlite
    .prepare(
      `UPDATE scan_runs
       SET completed_at = ?, files_scanned = ?, records_imported = ?, warnings = ?, errors = ?
       WHERE id = ?`
    )
    .run(
      Date.now(),
      filesScanned,
      recordsImported,
      json(allWarnings),
      json(allErrors),
      scanRunId
    );

  return {
    scanRunId,
    filesScanned,
    recordsImported,
    warnings: allWarnings,
    errors: allErrors
  };
}
