import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import { applyMigrations } from "@/src/db/migrate-core";
import type { ScanHealthFile, ScanHealthRun } from "@/src/lib/scan-health";

export type ScanDiffCounts = {
  filesScanned: number;
  recordsImported: number;
  imported: number;
  importedWithErrors: number;
  duplicates: number;
  ignored: number;
  unsupported: number;
  failed: number;
};

export type ScanDiff = {
  latestScanId: string | null;
  previousScanId: string | null;
  latestStartedAt: number | null;
  previousStartedAt: number | null;
  latestCompletedAt: number | null;
  previousCompletedAt: number | null;
  current: ScanDiffCounts;
  previous: ScanDiffCounts;
  delta: ScanDiffCounts;
  explanation: string | null;
};

type ScanRunRow = Pick<ScanHealthRun, "id" | "startedAt" | "completedAt" | "filesScanned" | "recordsImported">;

const emptyCounts: ScanDiffCounts = {
  filesScanned: 0,
  recordsImported: 0,
  imported: 0,
  importedWithErrors: 0,
  duplicates: 0,
  ignored: 0,
  unsupported: 0,
  failed: 0
};

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function statusCounts(files: Array<Pick<ScanHealthFile, "status">>) {
  return files.reduce<Record<string, number>>((counts, file) => {
    counts[file.status] = (counts[file.status] ?? 0) + 1;
    return counts;
  }, {});
}

function countsFromStatusCounts(
  run: Pick<ScanHealthRun, "filesScanned" | "recordsImported"> | null,
  byStatus: Record<string, number>
): ScanDiffCounts {
  return {
    filesScanned: number(run?.filesScanned),
    recordsImported: number(run?.recordsImported),
    imported: byStatus.imported ?? 0,
    importedWithErrors: byStatus.imported_with_errors ?? 0,
    duplicates: byStatus.skipped_duplicate ?? 0,
    ignored: byStatus.ignored_non_usage ?? 0,
    unsupported: byStatus.skipped_unknown ?? 0,
    failed: byStatus.failed ?? 0
  };
}

function subtractCounts(current: ScanDiffCounts, previous: ScanDiffCounts): ScanDiffCounts {
  return {
    filesScanned: current.filesScanned - previous.filesScanned,
    recordsImported: current.recordsImported - previous.recordsImported,
    imported: current.imported - previous.imported,
    importedWithErrors: current.importedWithErrors - previous.importedWithErrors,
    duplicates: current.duplicates - previous.duplicates,
    ignored: current.ignored - previous.ignored,
    unsupported: current.unsupported - previous.unsupported,
    failed: current.failed - previous.failed
  };
}

function sortScanRuns(scanRuns: ScanRunRow[]) {
  return [...scanRuns].sort((a, b) => {
    if (a.startedAt !== b.startedAt) return b.startedAt - a.startedAt;
    if ((a.completedAt ?? 0) !== (b.completedAt ?? 0)) return (b.completedAt ?? 0) - (a.completedAt ?? 0);
    return b.id.localeCompare(a.id);
  });
}

function zeroImportExplanation(counts: ScanDiffCounts) {
  if (counts.recordsImported > 0) return null;
  if (counts.filesScanned === 0) return "The latest scan checked no files.";

  const blockers = counts.imported + counts.duplicates + counts.ignored + counts.unsupported + counts.failed + counts.importedWithErrors;
  if (counts.imported > 0) {
    return "The latest scan marked files as imported, but they produced no usage records.";
  }
  if (counts.duplicates > 0 && counts.ignored > 0 && counts.unsupported === 0 && counts.failed === 0 && counts.importedWithErrors === 0) {
    return "The latest scan imported nothing because files were already imported duplicates or known non-usage support files.";
  }
  if (counts.duplicates > 0 && counts.duplicates === blockers) {
    return "The latest scan imported nothing because all usage candidates were already imported duplicates.";
  }
  if (counts.ignored > 0 && counts.ignored === blockers) {
    return "The latest scan imported nothing because only known non-usage support files were found.";
  }
  if (counts.unsupported > 0 && counts.unsupported === blockers) {
    return "The latest scan imported nothing because no files matched a supported CLI usage parser.";
  }
  if (counts.failed > 0 && counts.failed === blockers) {
    return "The latest scan imported nothing because parser failures blocked imports.";
  }
  if (counts.importedWithErrors > 0 && counts.importedWithErrors === blockers) {
    return "The latest scan imported nothing because parser errors prevented complete imports.";
  }
  if (counts.importedWithErrors > 0) {
    return "The latest scan imported nothing because candidates had parser errors, duplicates, ignored support files, unsupported formats, or failures.";
  }
  return "The latest scan imported nothing because candidates were duplicates, ignored, unsupported, or failed.";
}

function buildFromRunsAndFiles(scanRuns: ScanRunRow[], scanFiles: ScanHealthFile[]): ScanDiff {
  const [latest, previous] = sortScanRuns(scanRuns);
  const current = latest
    ? countsFromStatusCounts(latest, statusCounts(scanFiles.filter((file) => file.scanRunId === latest.id)))
    : { ...emptyCounts };
  const previousCounts = previous
    ? countsFromStatusCounts(previous, statusCounts(scanFiles.filter((file) => file.scanRunId === previous.id)))
    : { ...emptyCounts };

  return {
    latestScanId: latest?.id ?? null,
    previousScanId: previous?.id ?? null,
    latestStartedAt: latest?.startedAt ?? null,
    previousStartedAt: previous?.startedAt ?? null,
    latestCompletedAt: latest?.completedAt ?? null,
    previousCompletedAt: previous?.completedAt ?? null,
    current,
    previous: previousCounts,
    delta: subtractCounts(current, previousCounts),
    explanation: latest ? zeroImportExplanation(current) : null
  };
}

function databaseUrlPath(value: string | undefined) {
  if (!value?.startsWith("file:")) return null;
  try {
    return fileURLToPath(value);
  } catch {
    return value.slice("file:".length);
  }
}

function openSqlite() {
  const dbPath = process.env.TOKENTRACE_DB
    ?? databaseUrlPath(process.env.DATABASE_URL)
    ?? path.join(process.cwd(), ".tokentrace", "tokentrace.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("busy_timeout = 10000");
  sqlite.pragma("foreign_keys = ON");
  applyMigrations(sqlite);
  return sqlite;
}

function buildFromDatabase(): ScanDiff {
  const sqlite = openSqlite();
  try {
    const runs = sqlite.prepare(
      `SELECT id, started_at AS startedAt, completed_at AS completedAt,
        files_scanned AS filesScanned, records_imported AS recordsImported
       FROM scan_runs
       ORDER BY started_at DESC, completed_at DESC, id DESC
       LIMIT 2`
    ).all() as ScanRunRow[];

    if (runs.length === 0) return buildFromRunsAndFiles([], []);

    const scanFiles = sqlite.prepare(
      `SELECT id, scan_run_id AS scanRunId, path, modified_time AS modifiedTime,
        size_bytes AS sizeBytes, parser, status, records_imported AS recordsImported,
        warnings, errors, raw_metadata AS rawMetadata
       FROM scan_files
       WHERE scan_run_id IN (${runs.map(() => "?").join(", ")})`
    ).all(...runs.map((run) => run.id)) as ScanHealthFile[];

    return buildFromRunsAndFiles(runs, scanFiles);
  } finally {
    sqlite.close();
  }
}

export function buildScanDiff(input?: {
  scanRuns?: ScanHealthRun[];
  scanFiles?: ScanHealthFile[];
}): ScanDiff {
  if (input) {
    return buildFromRunsAndFiles(input.scanRuns ?? [], input.scanFiles ?? []);
  }
  return buildFromDatabase();
}
