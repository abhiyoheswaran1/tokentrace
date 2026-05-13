import { parseScanArgs, scanUsage, type ScanCliOptions } from "@/src/lib/scan-cli";

const args = process.argv.slice(2);
let options: ScanCliOptions;

try {
  options = parseScanArgs(args);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Invalid scan arguments.");
  console.error(scanUsage());
  process.exit(1);
}

if (options.help) {
  console.log(scanUsage());
  process.exit(0);
}

const { runScan } = await import("@/src/ingestion/scan");

const result = await runScan({
  force: options.force,
  folders: options.folders,
  includeDefaults: options.folders.length === 0
});

const summary = {
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

if (options.json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("TokenTrace scan complete");
  console.log(`Files scanned: ${summary.filesScanned}`);
  console.log(`Records imported: ${summary.recordsImported}`);
  console.log(`Costs recalculated: ${summary.costsRecalculated}`);
  console.log(`Model aliases updated: ${summary.modelAliasesUpdated}`);
  console.log(`Unknown cost interactions: ${summary.unknownCostInteractions}`);
  console.log(`Stale support imports removed: ${summary.staleNonUsageSessionsRemoved}`);
  console.log(`Warnings: ${summary.warnings}`);
  console.log(`Errors: ${summary.errors}`);
}
