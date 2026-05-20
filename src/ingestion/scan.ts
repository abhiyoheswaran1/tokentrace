import path from "node:path";
import { sqlite } from "@/src/db/client";
import { getAppSettings } from "@/src/db/settings";
import { stableId } from "@/src/lib/ids";
import { importProfileForAdapter } from "@/src/lib/import-profiles";
import { buildUnknownCostRepairWorkbench } from "@/src/lib/unknown-cost-repair";
import { snapshotRepairWorkbench } from "@/src/lib/repair-delta";
import { sourceCatalogEntryForParser } from "@/src/lib/source-catalog";
import { hashFile, selectAdapter } from "./scan-adapters";
import { discoverFilesWithIgnored, expandHome, getDefaultSearchRoots } from "./discovery";
import { importSessions } from "./persist";
import {
  appendFileMessages,
  hasImportedFile,
  insertScanFile,
  parserMetadata
} from "./scan-files";
import {
  buildRunScanResult,
  completeScanRun,
  purgeStaleNonUsageSessions,
  type RunScanResult
} from "./scan-results";

export type RunScanOptions = {
  folders?: string[];
  force?: boolean;
  includeDefaults?: boolean;
  storeRawMessageContent?: boolean;
};

export type { RunScanResult } from "./scan-results";

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
  const beforeRepairSnapshot = snapshotRepairWorkbench(buildUnknownCostRepairWorkbench());
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
          sourceCatalog: sourceCatalogEntryForParser(adapterChoice.selected.adapter.id),
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

  completeScanRun({
    scanRunId,
    filesScanned,
    recordsImported,
    warnings: allWarnings,
    errors: allErrors
  });

  return buildRunScanResult({
    scanRunId,
    filesScanned,
    recordsImported,
    staleNonUsageSessionsRemoved,
    beforeRepairSnapshot,
    warnings: allWarnings,
    errors: allErrors
  });
}
