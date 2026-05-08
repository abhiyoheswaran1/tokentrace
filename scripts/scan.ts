import { runScan } from "@/src/ingestion/scan";

const args = process.argv.slice(2);
const json = args.includes("--json");
const force = args.includes("--force");
const folders = args.filter((arg) => arg !== "--force" && arg !== "--json");

const result = await runScan({
  force,
  folders,
  includeDefaults: folders.length === 0
});

const summary = {
  scanRunId: result.scanRunId,
  filesScanned: result.filesScanned,
  recordsImported: result.recordsImported,
  costsRecalculated: result.costsRecalculated,
  modelAliasesUpdated: result.modelAliasesUpdated,
  unknownCostInteractions: result.unknownCostInteractions,
  warnings: result.warnings.length,
  errors: result.errors.length
};

if (json) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("TokenTrace scan complete");
  console.log(`Files scanned: ${summary.filesScanned}`);
  console.log(`Records imported: ${summary.recordsImported}`);
  console.log(`Costs recalculated: ${summary.costsRecalculated}`);
  console.log(`Model aliases updated: ${summary.modelAliasesUpdated}`);
  console.log(`Unknown cost interactions: ${summary.unknownCostInteractions}`);
  console.log(`Warnings: ${summary.warnings}`);
  console.log(`Errors: ${summary.errors}`);
}
