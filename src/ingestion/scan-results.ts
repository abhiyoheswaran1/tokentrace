import { sqlite } from "@/src/db/client";
import { recalculateInteractionCosts } from "@/src/lib/cost-recalculation";
import { nonUsageFileReason } from "@/src/ingestion/path-classifier";

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

export function purgeStaleNonUsageSessions() {
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

export function completeScanRun({
  scanRunId,
  filesScanned,
  recordsImported,
  warnings,
  errors
}: {
  scanRunId: string;
  filesScanned: number;
  recordsImported: number;
  warnings: string[];
  errors: string[];
}) {
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
      json(warnings),
      json(errors),
      scanRunId
    );
}

export function buildRunScanResult({
  scanRunId,
  filesScanned,
  recordsImported,
  staleNonUsageSessionsRemoved,
  warnings,
  errors
}: {
  scanRunId: string;
  filesScanned: number;
  recordsImported: number;
  staleNonUsageSessionsRemoved: number;
  warnings: string[];
  errors: string[];
}): RunScanResult {
  const recalculation = recalculateInteractionCosts();

  return {
    scanRunId,
    filesScanned,
    recordsImported,
    costsRecalculated: recalculation.interactionsUpdated,
    modelAliasesUpdated: recalculation.modelsUpdated,
    unknownCostInteractions: recalculation.unknownCostInteractions,
    staleNonUsageSessionsRemoved,
    warnings,
    errors
  };
}
