import fs from "node:fs/promises";
import path from "node:path";
import { sqlite } from "@/src/db/client";
import { getAppSettings } from "@/src/db/settings";
import { recalculateInteractionCosts, type CostRecalculationResult } from "@/src/lib/cost-recalculation";
import { hashContent, stableId } from "@/src/lib/ids";
import { importProfileForAdapter } from "@/src/lib/import-profiles";
import { nonUsageFileReason } from "@/src/ingestion/path-classifier";
import { adapters } from "./adapters";
import { discoverFilesWithIgnored, expandHome, getDefaultSearchRoots } from "./discovery";
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
  costsRecalculated: number;
  modelAliasesUpdated: number;
  unknownCostInteractions: number;
  staleNonUsageSessionsRemoved: number;
  warnings: string[];
  errors: string[];
};

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

function metadataParserVersion(value: unknown) {
  const metadata = parseMetadata(value);
  const parser = metadata.parser;
  if (!parser || typeof parser !== "object") return 1;
  const version = (parser as Record<string, unknown>).version;
  if (typeof version === "number" && Number.isFinite(version)) return version;
  if (typeof version === "string" && /^\d+$/.test(version)) return Number(version);
  return 1;
}

function hasImportedFile(file: FileCandidate, adapter: IngestionAdapter) {
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

function appendFileMessages(target: string, warnings: string[], errors: string[], allWarnings: string[], allErrors: string[]) {
  allWarnings.push(...warnings.map((warning) => `${target}: ${warning}`));
  allErrors.push(...errors.map((error) => `${target}: ${error}`));
}

function parserMetadata(adapter: IngestionAdapter) {
  return {
    id: adapter.id,
    displayName: adapter.displayName,
    source: "bundled",
    version: adapter.version ?? 1
  };
}

function purgeStaleNonUsageSessions() {
  const sessions = sqlite
    .prepare("SELECT id, source_file AS sourceFile FROM sessions")
    .all() as Array<{ id: string; sourceFile: string }>;
  const staleSessions = sessions.filter((session) => nonUsageFileReason(session.sourceFile));
  if (!staleSessions.length) return 0;

  const deleteToolCalls = sqlite.prepare(
    "DELETE FROM tool_calls WHERE interaction_id IN (SELECT id FROM interactions WHERE session_id = ?)"
  );
  const deleteInteractions = sqlite.prepare("DELETE FROM interactions WHERE session_id = ?");
  const deleteSession = sqlite.prepare("DELETE FROM sessions WHERE id = ?");

  const remove = sqlite.transaction((ids: string[]) => {
    for (const id of ids) {
      deleteToolCalls.run(id);
      deleteInteractions.run(id);
      deleteSession.run(id);
    }
  });

  remove(staleSessions.map((session) => session.id));
  return staleSessions.length;
}

export async function runScan(options: RunScanOptions = {}): Promise<RunScanResult> {
  const settings = getAppSettings();
  const explicitFolders = options.folders ?? [];
  const roots =
    options.includeDefaults === false
      ? explicitFolders.map((folder) => path.resolve(expandHome(folder)))
      : await getDefaultSearchRoots([...settings.customFolders, ...explicitFolders]);
  const discovery = await discoverFilesWithIgnored(roots, settings.importProfiles);
  const candidates = discovery.candidates;
  const startedAt = new Date();
  const scanRunId = stableId("scan", [startedAt.getTime(), roots.join("|")]);
  const allWarnings: string[] = [];
  const allErrors: string[] = [];
  let recordsImported = 0;
  let filesScanned = 0;
  const staleNonUsageSessionsRemoved = purgeStaleNonUsageSessions();
  if (staleNonUsageSessionsRemoved > 0) {
    allWarnings.push(
      `Removed ${staleNonUsageSessionsRemoved.toLocaleString()} previously imported ${
        staleNonUsageSessionsRemoved === 1 ? "session" : "sessions"
      } from paths now classified as non-usage support files.`
    );
  }

  sqlite
    .prepare(
      "INSERT INTO scan_runs (id, started_at, warnings, errors) VALUES (?, ?, '[]', '[]')"
    )
    .run(scanRunId, startedAt.getTime());

  for (const ignored of discovery.ignored) {
    filesScanned += 1;
    insertScanFile({
      scanRunId,
      file: ignored,
      parser: null,
      status: "ignored_non_usage",
      recordsImported: 0,
      warnings: [],
      errors: [],
      rawMetadata: {
        ignoreReason: ignored.ignoreReason
      }
    });
  }

  for (const candidate of candidates) {
    filesScanned += 1;
    let file = candidate;
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      file = await hashFile(candidate);
      const adapterChoice = await selectAdapter(file);
      warnings.push(...adapterChoice.warnings);

      if (!adapterChoice.selected) {
        errors.push("No parser detected a compatible format.");
        insertScanFile({
          scanRunId,
          file,
          parser: null,
          status: "skipped_unknown",
          recordsImported: 0,
          warnings,
          errors
        });
        appendFileMessages(candidate.path, warnings, errors, allWarnings, allErrors);
        continue;
      }

      if (!options.force && hasImportedFile(file, adapterChoice.selected.adapter)) {
        warnings.push("File hash already imported. Use force rescan to parse again.");
        insertScanFile({
          scanRunId,
          file,
          parser: adapterChoice.selected.adapter.id,
          status: "skipped_duplicate",
          recordsImported: 0,
          warnings,
          errors: []
        });
        appendFileMessages(candidate.path, warnings, errors, allWarnings, allErrors);
        continue;
      }

      const parseResult = await adapterChoice.selected.adapter.parse(file, {
        storeRawMessageContent:
          options.storeRawMessageContent ?? settings.storeRawMessageContent
      });
      warnings.push(...parseResult.warnings);
      errors.push(...parseResult.errors);
      const importResult = importSessions(parseResult.sessions, {
        replaceSourceFile: parseResult.sessions.length > 0 ? file.path : undefined
      });
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
          parser: parserMetadata(adapterChoice.selected.adapter),
          importProfile: importProfileForAdapter(adapterChoice.selected.adapter.id, file.path, settings.importProfiles),
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

    appendFileMessages(candidate.path, warnings, errors, allWarnings, allErrors);
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

  const recalculation: CostRecalculationResult = recalculateInteractionCosts();

  return {
    scanRunId,
    filesScanned,
    recordsImported,
    costsRecalculated: recalculation.interactionsUpdated,
    modelAliasesUpdated: recalculation.modelsUpdated,
    unknownCostInteractions: recalculation.unknownCostInteractions,
    staleNonUsageSessionsRemoved,
    warnings: allWarnings,
    errors: allErrors
  };
}
