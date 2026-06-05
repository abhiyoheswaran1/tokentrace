import type { AgentActionSurface } from "@/src/lib/agent-actions";

export type ScanCliOptions = {
  force: boolean;
  folders: string[];
  help: boolean;
  json: boolean;
};

export function scanUsage() {
  return `Usage: tokentrace scan [--force] [--json] [folder ...]

Options:
  --force       Reprocess files even when their hash already exists
  --json        Print scan summary as JSON
  -h, --help    Print scan help`;
}

export function parseScanArgs(argv: string[]): ScanCliOptions {
  const options: ScanCliOptions = {
    force: false,
    folders: [],
    help: false,
    json: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--force") {
      options.force = true;
      continue;
    }
    if (arg === "--") {
      options.folders.push(...argv.slice(index + 1));
      break;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }
    options.folders.push(arg);
  }

  return options;
}

export type ScanRunSummary = {
  scanRunId: string;
  filesScanned: number;
  recordsImported: number;
  costsRecalculated: number;
  modelAliasesUpdated: number;
  unknownCostInteractions: number;
  staleNonUsageSessionsRemoved: number;
  warnings: number;
  errors: number;
};

/**
 * Run a local scan and record the agent action, returning the exact summary
 * payload printed by `tokentrace scan --json`. Imports are dynamic so
 * importing this module never touches the local database.
 */
export async function executeScanRun(options: {
  force: boolean;
  folders: string[];
  surface?: AgentActionSurface;
}): Promise<ScanRunSummary> {
  const { runScan } = await import("@/src/ingestion/scan");
  const { safeRecordAgentAction } = await import("@/src/lib/agent-actions");

  const result = await runScan({
    force: options.force,
    folders: options.folders,
    includeDefaults: options.folders.length === 0
  });

  const summary: ScanRunSummary = {
    scanRunId: result.scanRunId,
    filesScanned: result.filesScanned,
    recordsImported: result.recordsImported,
    costsRecalculated: result.costsRecalculated,
    modelAliasesUpdated: result.modelAliasesUpdated,
    unknownCostInteractions: result.unknownCostInteractions,
    staleNonUsageSessionsRemoved: result.staleNonUsageSessionsRemoved,
    warnings: result.warnings.length,
    errors: result.errors.length
  };

  safeRecordAgentAction({
    surface: options.surface ?? "cli",
    command: "scan",
    outcome: result.errors.length ? "error" : "ok",
    summary: `imported ${result.recordsImported} records from ${result.filesScanned} files (${result.warnings.length} warnings, ${result.errors.length} errors)`,
    payload: {
      scanRunId: result.scanRunId,
      force: options.force,
      folders: options.folders.length || undefined
    }
  });

  return summary;
}
